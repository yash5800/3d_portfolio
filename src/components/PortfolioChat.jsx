import { useEffect, useRef, useState } from 'react'
import { BotAvatar } from 'bot-avatars'
import { getPortfolioAnswer, getSuggestedQuestions } from '../ai/portfolioAssistant.js'
import './portfolioChat.css'

const suggestions = ['Who are you?', 'What projects has he built?', 'What are his skills?']

function Icon({ name, size = 20 }) {
  const paths = {
    close: <path d="m6 6 12 12M18 6 6 18" />,
    arrow: <path d="M7 17 17 7M7 7h10v10" />,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

export default function PortfolioChat() {
  const [open, setOpen] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false)
  const [messages, setMessages] = useState([
    { id: 'welcome', role: 'assistant', text: 'Hi, I’m Rex AI Assistant of Yaswanth. Choose a question below to explore my work and background.' },
  ])
  const listRef = useRef(null)
  const seenSuggestions = useRef(new Set())

  useEffect(() => {
    if (open) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [open, messages, thinking, suggestions])

  useEffect(() => {
    if (!open || suggestionsLoaded) return
    setSuggestionsLoaded(true)
    getSuggestedQuestions().then((questions) => {
      questions.forEach((question) => seenSuggestions.current.add(question))
      setSuggestions(questions)
    }).catch((error) => console.error('Could not load portfolio question suggestions.', error))
  }, [open, suggestionsLoaded])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  async function sendMessage(text) {
    const question = text.trim()
    if (!question || thinking) return
    seenSuggestions.current.add(question)
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text: question }])
    setThinking(true)
    try {
      const result = await getPortfolioAnswer(question)
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: result.answer,
      }])
      const nextQuestions = await getSuggestedQuestions({
        exclude: [...seenSuggestions.current],
        avoidIntent: result.intent,
      })
      nextQuestions.forEach((nextQuestion) => seenSuggestions.current.add(nextQuestion))
      setSuggestions(nextQuestions)
    } catch (error) {
      console.error('Portfolio assistant could not run the classifier.', error)
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: 'I couldn’t start the portfolio assistant just now. Please try again in a moment.',
      }])
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className="portfolio-chat" aria-live="polite">
      {open && (
        <section className="chat-panel" role="dialog" aria-modal="false" aria-labelledby="chat-title">
          <header className="chat-header">
            <div className="chat-avatar">
              <BotAvatar type="clover" face="mouth" state={thinking ? 'working' : 'default'} size={46} shading="smooth" seed={0.23} interactive={false} theme="light" />
            </div>
            <div className="chat-heading">
              <h2 id="chat-title">Rex AI</h2>
              <span>AI applications</span>
            </div>
            <button className="chat-close" type="button" aria-label="Close chat" onClick={() => setOpen(false)}><Icon name="close" /></button>
          </header>

          <div className="chat-messages" ref={listRef} role="log" aria-label="Conversation">
            {messages.map((message) => (
              <div className={`chat-message chat-message-${message.role}`} key={message.id}>
                {message.role === 'assistant' && <BotAvatar className="message-avatar" type="clover" size={25} shading="smooth" seed={0.23} interactive={false} theme="light" />}
                <p>{message.text}</p>
              </div>
            ))}
            {thinking && <div className="chat-message chat-message-assistant chat-thinking" aria-label="Yaswanth is looking that up"><BotAvatar className="message-avatar" type="clover" state="working" size={25} shading="smooth" seed={0.23} interactive={false} theme="light" /><p><i /><i /><i /></p></div>}
            {messages.at(-1)?.role === 'assistant' && !thinking && suggestions.length > 0 && (
              <div className="chat-suggestions">
                {suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => sendMessage(suggestion)}>{suggestion}<Icon name="arrow" size={14} /></button>)}
              </div>
            )}
          </div>
        </section>
      )}

      <button className={`chat-launcher${open ? ' chat-launcher-open' : ''}`} type="button" aria-label={open ? 'Close portfolio chat' : 'Chat with Yaswanth'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <BotAvatar className="launcher-avatar" type="clover" size={43} state={thinking ? 'working' : 'default'} shading="smooth" seed={0.68} interactive={false} theme="light" />
      </button>
    </div>
  )
}
