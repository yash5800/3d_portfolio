#!/usr/bin/env node
/** AI Chat in Node.js - conversational AI with text responses */
const fs = require('fs');
const path = require('path');

const BASE = __dirname;
const MODEL_DIR = BASE;
const DATA_DIR = BASE;

let modelLoaded = false;
let vocabulary = {};
let idf = [];
let featureCount = 0;
let classes = [];
let coefficients = [];
let intercepts = [];

function loadModel() {
  try {
    const vocabPath = path.join(MODEL_DIR, 'vocabulary.json');
    const modelPath = path.join(MODEL_DIR, 'classifier.json');
    const profilePath = path.join(DATA_DIR, 'profile.json');

    vocabulary = JSON.parse(fs.readFileSync(vocabPath, 'utf-8'));
    featureCount = vocabulary.feature_count || Object.keys(vocabulary.vocabulary).length;

    if (vocabulary.idf && Array.isArray(vocabulary.idf)) idf = new Float32Array(vocabulary.idf);
    else idf = new Float32Array(featureCount).fill(1.0);

    const model = JSON.parse(fs.readFileSync(modelPath, 'utf-8'));
    classes = model.classes || [];
    coefficients = model.coefficients || [];
    intercepts = model.intercepts || [];

    modelLoaded = true;
    console.log(`✅ AI Chat loaded! ${classes.length} intents, ${featureCount} features`);
    console.log('');
  } catch (err) {
    console.error('❌ Error loading model:', err.message);
    process.exit(1);
  }
}

const profile = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'profile.json'), 'utf-8'));
const person = profile.profile || {};
const name = person.name || 'Yaswanth';
const projects = profile.projects || [];
const skills = profile.skills || {};
const education = profile.education || [];
const experience = profile.experience || [];
const certifications = profile.certifications || [];
const interests = person.interests || [];
const personality = person.personality || [];

// Build response strings
function buildEduText() {
  const lines = [];
  for (const e of education) {
    const level = e.level || '', inst = e.institution || '', qual = e.qualification || e.level || '',
      sc = e.score || '', sy = e.start_year || '', ey = e.end_year !== undefined ? e.end_year : e.year || '';
    let line = `${level} — ${inst}`;
    if (qual) line += `\nQualification: ${qual}`;
    if (sc) line += `\nScore: ${sc}`;
    let ys = '';
    if (sy && ey) ys = `${sy}–${ey}`;
    else if (sy) ys = `${sy}–`;
    line += `\nYears: ${ys}`;
    lines.push(line);
  }
  return lines.length ? lines.join('\n\n') : 'Education details are not available.';
}

function buildExpText() {
  const parts = [];
  for (const e of experience) {
    const role = e.role || '', company = e.company || '', desc = e.description || '',
      resp = e.responsibilities ? e.responsibilities.join(', ') : '',
      s = e.start_date || 'Unknown', e2 = e.end_date !== undefined ? e.end_date : 'Unknown';
    let p = `${role} at ${company}`;
    if (desc) p += `\n${desc}`;
    if (resp) p += `\nResponsibilities: ${resp}`;
    p += `\nDuration: ${s} to ${e2}`;
    parts.push(p);
  }
  return parts.length ? parts.join('\n\n') : 'No experience details are available.';
}

function buildSkillsText() {
  const entries = [];
  for (const [cat, vals] of Object.entries(skills)) {
    if (Array.isArray(vals) && vals.length) {
      entries.push(`${cat.replace(/_/g, ' ')}: ${vals.join(', ')}`);
    }
  }
  return entries.length ? entries.join('\n\n') : 'No skills listed.';
}

function buildCertsText() {
  return certifications.length ? certifications.map(c => `${c.name || ''} — ${c.issuer || ''}`).join('\n') : 'No certifications are currently listed.';
}

function buildInterestsText() {
  const lines = [];
  if (interests.length) lines.push(`Interests: ${interests.join(', ')}.`);
  if (personality.length) lines.push(`Personality: ${personality.join(', ')}.`);
  return lines.length ? lines.join('\n') : 'No interests or personality details available.';
}

// Intent → text response mapping
const intentResponses = {
  GREETING: `Hey! I'm ${name}'s personal portfolio assistant. You can ask me about his projects, skills, education, experience and interests.`,

  ABOUT: person.summary || `I'm the portfolio assistant for ${name}.`,

  CAPABILITIES: `I can tell you about ${name}'s background, education, technical skills, projects, internships, certifications, hobbies and career goals. You can also ask specific questions about individual projects.`,

  PROJECTS: projects.length ? projects.map((p, i) => `${i + 1}. ${p.name} — ${p.description}`).join('\n\n') : 'No project information is currently available.',

  EDUCATION: buildEduText(),

  EXPERIENCE: buildExpText(),

  SKILLS: buildSkillsText(),

  CERTIFICATIONS: buildCertsText(),

  INTERESTS: buildInterestsText(),

  THANKS: "You're welcome! Feel free to ask me anything else.",

  DEFAULT: "I don't have enough information to answer that yet. Try asking about Yaswanth's projects, skills, education, experience or interests.",
};

// Prediction
function preprocessText(t) {
  t = t.toLowerCase();
  if (t.normalize) try { t = t.normalize('NFKC'); } catch {}
  t = t.replace(/[^a-z0-9\s]/gu, ' ');
  t = t.replace(/\s+/g, ' ');
  return t.trim();
}

function predictIntent(question) {
  if (!modelLoaded) loadModel();
  const normalized = preprocessText(question);
  const words = normalized.split(' ').filter(w => w.length >= 2);
  const counts = {};
  for (const w of words) counts[w] = (counts[w] || 0) + 1;

  const vocabMap = vocabulary.vocabulary || {};
  const vector = new Float32Array(featureCount).fill(0);

  for (const [w, c] of Object.entries(counts)) {
    let wi = -1;
    for (const [ww, idx] of Object.entries(vocabMap)) { if (ww === w) { wi = idx; break; } }
    if (wi >= 0 && wi < featureCount) {
      const iv = idf[wi] !== undefined ? idf[wi] : 1.0;
      vector[wi] = c * iv;
    }
  }

  let n = 0;
  for (let i = 0; i < featureCount; i++) n += vector[i] * vector[i];
  n = Math.sqrt(n);
  if (n > 0) for (let i = 0; i < featureCount; i++) vector[i] /= n;

  const scores = new Float32Array(classes.length);
  for (let c = 0; c < classes.length; c++) {
    let s = intercepts[c] || 0;
    for (let f = 0; f < featureCount; f++) {
      const coeff = coefficients[c] ? coefficients[c][f] : 0;
      s += vector[f] * coeff;
    }
    scores[c] = s;
  }

  let mmax = -Infinity;
  for (let c = 0; c < scores.length; c++) if (scores[c] > mmax) mmax = scores[c];

  const probs = new Float32Array(scores.length);
  let se = 0;
  for (let c = 0; c < scores.length; c++) {
    probs[c] = Math.exp(scores[c] - mmax);
    se += probs[c];
  }
  for (let c = 0; c < scores.length; c++) probs[c] /= se;

  let bi = 0, bp = -Infinity;
  for (let c = 0; c < probs.length; c++) {
    if (probs[c] > bp) { bp = probs[c]; bi = c; }
  }

  return { intent: classes[bi] || 'DEFAULT', confidence: parseFloat(bp.toFixed(4)), probabilities: probs };
}

// Project details helper
function techJoin(arr) {
  if (!arr || arr.length === 0) return '';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`;
}

// Main ask function
function ask(question) {
  const result = predictIntent(question);
  const intent = result.intent;
  let answer = intentResponses[intent] || intentResponses.DEFAULT;

  // PROJECT_DETAILS special handling
  if (intent === 'PROJECT_DETAILS' && question) {
    const qLower = question.toLowerCase();
    const detectedProject = projects.find(p =>
      (p.name && qLower.includes(p.name.toLowerCase())) ||
      (p.id && qLower.includes(p.id.toLowerCase()))
    );

    if (detectedProject) {
      const title = detectedProject.name;
      const pNorm = qLower.replace(/[^a-z0-9\s]/g, '');

      let attr = null;
      if (['technologies', 'tech stack', 'frameworks', 'tools', 'languages', 'stack'].some(w => pNorm.includes(w))) attr = 'technologies';
      else if (['features', 'functionality', 'capabilities'].some(w => pNorm.includes(w))) attr = 'features';
      else if (['challenges', 'difficulties', 'problems faced', 'obstacles'].some(w => pNorm.includes(w))) attr = 'challenges';
      else if (['problem', 'issue', 'why built', 'purpose'].some(w => pNorm.includes(w))) attr = 'problem';
      else if (['solution', 'how solved', 'approach'].some(w => pNorm.includes(w))) attr = 'solution';
      else if (['status', 'finished', 'completed', 'active', 'progress'].some(w => pNorm.includes(w))) attr = 'status';
      else if (['link', 'website', 'url', 'visit', 'live'].some(w => pNorm.includes(w))) attr = 'url';

      if (attr) {
        if (attr === 'technologies') {
          const techs = detectedProject.technologies || [];
          answer = `${title} uses ${techJoin(techs)}.` || 'Technology info not available.';
        } else if (attr === 'features') {
          const features = detectedProject.features || [];
          answer = `${title} includes: ${techJoin(features)}.` || 'Features not available.';
        } else if (attr === 'challenges') {
          const challenges = detectedProject.challenges || [];
          answer = `Challenges: ${techJoin(challenges)}.` || 'Challenges not documented.';
        } else if (attr === 'problem') {
          answer = detectedProject.problem || 'Problem not documented.';
        } else if (attr === 'solution') {
          answer = detectedProject.solution || 'Solution not documented.';
        } else if (attr === 'status') {
          const s = detectedProject.status || '';
          answer = `${title} is currently marked as ${s}.` || 'Status not available.';
        } else if (attr === 'url') {
          const url = detectedProject.url || '';
          answer = url ? `Explore ${title} here: ${url}` : 'No public link available.';
        }
      } else {
        answer = "I'm not sure what you're asking about this project.";
      }
    } else {
      answer += `\n\nWhich project are you interested in? You can ask about ${projects.map(p => p.name).join(', ')} or Pixelify, DIEC-ViT, Grocery App, SanityHub, the WhatsApp AI Agent or the Library Management System.`;
    }
  }

  return { answer, intent, confidence: result.confidence };
}

// ========== ENTRY POINT ==========
if (process.argv[2] && process.argv[2].trim() && process.argv[2].trim().toLowerCase() !== 'quit') {
  // Single question mode
  loadModel();
  const q = process.argv[2].trim();
  const result = ask(q);
  console.log(`Question: ${q}`);
  console.log(`AI (${result.intent}, conf ${result.confidence.toFixed(2)}): ${result.answer}`);
} else {
  // Interactive chat mode
  loadModel();
  console.log('=== AI Chat Ready ===');
  console.log(`Portfolio assistant for: ${name}`);
  console.log('Ask me anything about Yaswanth\'s background, projects, skills, education, experience, or interests!');
  console.log('(type "quit", "exit", or "q" to stop)\n');

  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  rl.on('line', (input) => {
    const q = input.trim();
    if (!q) return;

    if (['quit', 'exit', 'q'].includes(q.toLowerCase())) {
      console.log('\nGoodbye! 👋');
      rl.close();
      return;
    }

    const result = ask(q);
    console.log(`\nAI (${result.intent}, conf ${result.confidence.toFixed(2)}): ${result.answer}\n`);
    rl.prompt();
  });

  rl.setPrompt('You: ');
  rl.prompt();
}
