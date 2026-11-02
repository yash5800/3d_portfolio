let dataPromise

async function loadData() {
  if (!dataPromise) {
    dataPromise = Promise.all([
      fetch(`${import.meta.env.BASE_URL}ai/vocabulary.json`),
      fetch(`${import.meta.env.BASE_URL}ai/classifier.json`),
      fetch(`${import.meta.env.BASE_URL}ai/profile.json`),
      fetch(`${import.meta.env.BASE_URL}ai/training-data.json`),
    ]).then(async ([vocabularyResponse, classifierResponse, profileResponse, trainingResponse]) => {
      if (![vocabularyResponse, classifierResponse, profileResponse, trainingResponse].every((response) => response.ok)) {
        throw new Error('Could not load the portfolio assistant data.')
      }
      const [vocabulary, classifier, profile, trainingData] = await Promise.all([
        vocabularyResponse.json(), classifierResponse.json(), profileResponse.json(), trainingResponse.json(),
      ])
      return { vocabulary, classifier, profile, trainingData }
    })
  }
  return dataPromise
}

function preprocess(text) {
  return text.toLowerCase()
    .normalize('NFKC')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function predictIntent(question, { vocabulary, classifier, trainingData }) {
  const normalizedQuestion = preprocess(question)
  const trainedQuestion = trainingData.find((item) => preprocess(item.text) === normalizedQuestion)
  if (trainedQuestion) return { intent: trainedQuestion.intent, confidence: 1 }

  const words = preprocess(question).split(' ').filter((word) => word.length >= 2)
  const counts = new Map()
  words.forEach((word) => counts.set(word, (counts.get(word) ?? 0) + 1))

  const featureCount = vocabulary.feature_count
  const idf = vocabulary.idf ?? []
  const vector = new Float32Array(featureCount)
  for (const [word, count] of counts) {
    const index = vocabulary.vocabulary[word]
    if (index !== undefined && index < featureCount) {
      vector[index] = count * (idf[index] ?? 1)
    }
  }

  let norm = 0
  for (const value of vector) norm += value * value
  norm = Math.sqrt(norm)
  if (norm > 0) for (let index = 0; index < vector.length; index += 1) vector[index] /= norm

  const scores = classifier.classes.map((_, classIndex) => {
    let score = classifier.intercepts[classIndex] ?? 0
    const weights = classifier.coefficients[classIndex] ?? []
    for (let featureIndex = 0; featureIndex < featureCount; featureIndex += 1) {
      score += vector[featureIndex] * (weights[featureIndex] ?? 0)
    }
    return score
  })

  const maxScore = Math.max(...scores)
  const probabilities = scores.map((score) => Math.exp(score - maxScore))
  const sum = probabilities.reduce((total, value) => total + value, 0)
  const bestIndex = probabilities.reduce((best, value, index) => value > probabilities[best] ? index : best, 0)
  return {
    intent: classifier.classes[bestIndex] ?? 'DEFAULT',
    confidence: probabilities[bestIndex] / sum,
  }
}

function list(values) {
  if (!values?.length) return ''
  if (values.length === 1) return values[0]
  if (values.length === 2) return `${values[0]} and ${values[1]}`
  return `${values.slice(0, -1).join(', ')} and ${values.at(-1)}`
}

function educationText(education) {
  return education.length ? education.map((item) => {
    const years = item.start_year && item.end_year ? `${item.start_year}–${item.end_year}` : item.year ?? ''
    return [
      `${item.level ?? ''} — ${item.institution ?? ''}`,
      item.qualification && `Qualification: ${item.qualification}`,
      item.score && `Score: ${item.score}`,
      years && `Years: ${years}`,
    ].filter(Boolean).join('\n')
  }).join('\n\n') : 'Education details are not available.'
}

function experienceText(experience) {
  return experience.length ? experience.map((item) => [
    `${item.role ?? ''} at ${item.company ?? ''}`,
    item.description,
    item.responsibilities?.length && `Responsibilities: ${item.responsibilities.join(', ')}`,
    `Duration: ${item.start_date ?? 'Unknown'} to ${item.end_date ?? 'Unknown'}`,
  ].filter(Boolean).join('\n')).join('\n\n') : 'No experience details are available.'
}

function projectAnswer(question, projects) {
  const normalized = preprocess(question)
  const projectAliases = {
    'DIEC-ViT': ['diec vit'],
    'Grocery App with AI Chat': ['grocery shopping application', 'grocery app'],
    'AI WhatsApp Auto-Reply Agent': ['whatsapp ai agent', 'whatsapp'],
    'Library Management System': ['library software', 'library management'],
  }
  const project = projects.find((item) => {
    const labels = [item.name, item.id, ...(projectAliases[item.name] ?? [])]
    return labels.some((label) => label && normalized.includes(preprocess(label)))
  })
  if (!project) {
    return `Which project are you interested in? You can ask about ${projects.map((item) => item.name).join(', ')}.`
  }

  const query = preprocess(question)
  if (/\b(technologies|tech stack|frameworks|tools|languages|stack)\b/.test(query)) {
    return project.technologies?.length ? `${project.name} uses ${list(project.technologies)}.` : 'Technology info is not available.'
  }
  if (/\b(features|functionality|capabilities)\b/.test(query)) {
    return project.features?.length ? `${project.name} includes ${list(project.features)}.` : 'Feature info is not available.'
  }
  if (/\b(challenges|difficulties|problems faced|obstacles)\b/.test(query)) {
    return project.challenges?.length ? `Challenges: ${list(project.challenges)}.` : 'Challenges are not documented.'
  }
  if (/\b(problem|issue|why built|purpose)\b/.test(query)) return project.problem || 'The problem is not documented.'
  if (/\b(solution|how solved|approach)\b/.test(query)) return project.solution || 'The solution is not documented.'
  if (/\b(status|finished|completed|active|progress)\b/.test(query)) return project.status ? `${project.name} is currently marked as ${project.status}.` : 'Status is not available.'
  if (/\b(link|website|url|visit|live)\b/.test(query)) return project.url ? `Explore ${project.name} here: ${project.url}` : 'No public link is available.'
  return project.description || 'More details are not available.'
}

function answerFor(question, intent, profile) {
  const person = profile.profile ?? {}
  const projects = profile.projects ?? []
  const skills = profile.skills ?? {}

  if (/\b(contact|email|linkedin|github)\b/i.test(question)) {
    const links = [person.email, person.linkedin, person.github].filter(Boolean)
    return links.length ? `You can reach ${person.preferred_name ?? person.name} here:\n${links.join('\n')}` : 'Contact details are not available.'
  }
  if (/\b(career goal|career goals|future plan|future plans)\b/i.test(question)) {
    return profile.goals?.career_goal ?? 'Career goal details are not available.'
  }
  if (/\b(currently learning|learning now|what is he learning)\b/i.test(question)) {
    return profile.goals?.current_learning?.length ? `Currently learning: ${list(profile.goals.current_learning)}.` : 'Current learning details are not available.'
  }

  switch (intent) {
    case 'GREETING':
      return `Hey! I’m ${person.preferred_name ?? person.name}’s portfolio assistant. Ask me about projects, skills, education, experience, or interests.`
    case 'ABOUT':
      return person.summary ?? `I’m the portfolio assistant for ${person.preferred_name ?? person.name}.`
    case 'CAPABILITIES':
      return `${person.preferred_name ?? person.name} works across full stack development and AI application development. I can share details about projects, skills, education, and experience.`
    case 'CAREER_GOALS':
      return profile.goals?.career_goal ?? 'Career goal details are not available.'
    case 'CURRENT_LEARNING':
      return profile.goals?.current_learning?.length ? `Currently learning: ${list(profile.goals.current_learning)}.` : 'Current learning details are not available.'
    case 'CONTACT': {
      const links = [person.email, person.linkedin, person.github].filter(Boolean)
      return links.length ? `You can reach ${person.preferred_name ?? person.name} here:\n${links.join('\n')}` : 'Contact details are not available.'
    }
    case 'PROJECTS':
      return projects.length ? projects.map((project, index) => `${index + 1}. ${project.name} — ${project.description}`).join('\n\n') : 'No project information is currently available.'
    case 'PROJECT_DETAILS':
      return projectAnswer(question, projects)
    case 'EDUCATION':
      return educationText(profile.education ?? [])
    case 'EXPERIENCE':
      return experienceText(profile.experience ?? [])
    case 'SKILLS':
      return Object.entries(skills).filter(([, values]) => values?.length)
        .map(([category, values]) => `${category.replace(/_/g, ' ')}: ${values.join(', ')}`).join('\n\n') || 'No skills are listed.'
    case 'CERTIFICATIONS':
      return profile.certifications?.length ? profile.certifications.map((item) => `${item.name} — ${item.issuer}`).join('\n') : 'No certifications are currently listed.'
    case 'INTERESTS': {
      const details = [
        person.interests?.length && `Interests: ${person.interests.join(', ')}.`,
        person.personality?.length && `Personality: ${person.personality.join(', ')}.`,
      ].filter(Boolean)
      return details.join('\n') || 'No interests or personality details are available.'
    }
    case 'PERSONALITY':
      return person.personality?.length ? `Yaswanth describes himself as ${list(person.personality)}.` : 'Personality details are not available.'
    case 'THANKS':
      return 'You’re welcome! Feel free to ask me anything else.'
    default:
      return `I don’t have enough information to answer that yet. Try asking about ${person.preferred_name ?? person.name}’s projects, skills, education, experience, or interests.`
  }
}

export async function getPortfolioAnswer(question) {
  const data = await loadData()
  const prediction = predictIntent(question, data)
  return { ...prediction, answer: answerFor(question, prediction.intent, data.profile) }
}

export async function getSuggestedQuestions({ exclude = [], avoidIntent, count = 3 } = {}) {
  const { trainingData } = await loadData()
  const excluded = new Set(exclude.map(preprocess))
  const available = trainingData.filter((item) => {
    const key = preprocess(item.text)
    if (['GREETING', 'THANKS'].includes(item.intent) || excluded.has(key)) return false
    excluded.add(key)
    return true
  })
  const varied = avoidIntent ? available.filter((item) => item.intent !== avoidIntent) : available
  const pool = varied.length >= count ? varied : available

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]]
  }

  return pool.slice(0, count).map((item) => item.text)
}
