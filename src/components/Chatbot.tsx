'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useChatbot } from '@/context/ChatbotContext'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

const Chatbot = () => {
  const { isChatbotOpen, setIsChatbotOpen, chatbotMode, setChatbotMode } = useChatbot()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [userInfoProvided, setUserInfoProvided] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [position, setPosition] = useState({ x: 20, y: 20 })
  const [size, setSize] = useState({ width: 400, height: 600 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const synthesisRef = useRef<SpeechSynthesis | null>(null)

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = 'en-US'
        
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          setInputValue(transcript)
          handleSendMessage(transcript)
        }
        
        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
        }
      }
      
      synthesisRef.current = window.speechSynthesis
    }
  }, [])

  // Initialize session and welcome message
  useEffect(() => {
    if (isChatbotOpen && messages.length === 0) {
      // Generate unique session ID
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setSessionId(newSessionId)

      let welcomeText = "Welcome to your Mizel Safety Training Advisor! I'm powered by AI and have deep knowledge from our comprehensive training materials, safety documents, and industry expertise. I can help you understand safety requirements, OSHA regulations, best practices, and guide you to the right training solutions. How can I help you today?"
      
      if (chatbotMode === 'manager') {
        welcomeText = "Welcome! I'm your Enterprise Training Solutions Advisor. I can help you explore our comprehensive enterprise training programs, including custom training solutions, Learning Management System integration, and bulk pricing options. What type of enterprise training solutions are you looking for? Are you interested in custom programs, LMS integration, or volume training for your organization?"
      }
      
      const welcomeMessage: Message = {
        id: 'welcome',
        text: welcomeText,
        isUser: false,
        timestamp: new Date()
      }
      setMessages([welcomeMessage])

      // Save welcome message to session
      saveMessageToSession(newSessionId, welcomeText, false)
    }
  }, [isChatbotOpen, chatbotMode])

  // Handle course search mode
  useEffect(() => {
    if (isChatbotOpen && chatbotMode === 'course-search') {
      const searchQuery = sessionStorage.getItem('courseSearchQuery')
      if (searchQuery) {
        setInputValue(searchQuery)
        handleSendMessage(searchQuery)
        sessionStorage.removeItem('courseSearchQuery')
        setChatbotMode('default')
      }
    }
  }, [isChatbotOpen, chatbotMode])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const speak = (text: string) => {
    if (synthesisRef.current) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.1
      utterance.pitch = 0.8
      
      // Try to find Australian voice
      const voices = synthesisRef.current.getVoices()
      const australianVoice = voices.find(voice => 
        voice.lang.includes('en-AU') || voice.name.includes('Australian')
      )
      
      if (australianVoice) {
        utterance.voice = australianVoice
      }
      
      synthesisRef.current.speak(utterance)
    }
  }

  const saveMessageToSession = async (sessionId: string, message: string, isUserMessage: boolean, email?: string, name?: string) => {
    try {
      const sourcePage = window.location.pathname
      await fetch('/api/chat-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          email,
          name,
          message,
          isUserMessage,
          sourcePage,
          chatMode: chatbotMode
        })
      })
    } catch (error) {
      console.error('Error saving message to session:', error)
    }
  }

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || inputValue.trim()
    if (!text) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    // Save user message to session
    if (sessionId) {
      await saveMessageToSession(sessionId, text, true, email || undefined, name || undefined)
    }

    try {
      // Track course search for analytics
      fetch('/api/course-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: text,
          email: email || null,
          mode: chatbotMode
        })
      }).catch(err => console.error('Analytics tracking error:', err))

      // Use OpenAI with Pinecone RAG for intelligent responses
      const chatMessages = messages.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text
      }))

      // Add the current user message
      chatMessages.push({
        role: 'user',
        content: text
      })

      const response = await fetch('/api/openai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: chatMessages,
          query: text
        })
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      let aiResponseText = data.reply || "I'm sorry, I couldn't generate a response."

      // Add source information if available
      if (data.sources && data.sources.length > 0) {
        const uniqueSources = Array.from(new Set(data.sources.map((s: any) => s.fileName)))
        if (uniqueSources.length > 0 && uniqueSources.length <= 3) {
          aiResponseText += `\n\n*Reference materials: ${uniqueSources.slice(0, 3).join(', ')}*`
        }
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponseText,
        isUser: false,
        timestamp: new Date()
      }

      setTimeout(async () => {
        setMessages(prev => [...prev, aiResponse])
        setIsTyping(false)
        speak(aiResponse.text)
        
        // Save AI response to session
        if (sessionId) {
          await saveMessageToSession(sessionId, aiResponse.text, false, email || undefined, name || undefined)
        }
      }, 1000)

    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I'm having trouble processing your request right now. Please try again.",
        isUser: false,
        timestamp: new Date()
      }
      
      setTimeout(async () => {
        setMessages(prev => [...prev, errorMessage])
        setIsTyping(false)
        
        // Save error message to session
        if (sessionId) {
          await saveMessageToSession(sessionId, errorMessage.text, false, email || undefined, name || undefined)
        }
      }, 1000)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleUserInfoSubmit = async () => {
    if (sessionId) {
      try {
        await fetch('/api/chat-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            email: email || null,
            name: name || null,
            sourcePage: window.location.pathname,
            chatMode: chatbotMode
          })
        })
        console.log('User info captured successfully:', { email, name })
        setUserInfoProvided(true)
      } catch (error) {
        console.error('Error capturing user info:', error)
      }
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value
    setEmail(newEmail)
    
    // Auto-submit user info when email looks valid
    if (newEmail && newEmail.includes('@') && newEmail.includes('.') && sessionId) {
      setTimeout(() => {
        handleUserInfoSubmit()
      }, 1000) // Wait 1 second after user stops typing
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
  }

  const startVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start()
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('drag-handle')) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      })
    }
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
    if (isResizing) {
      const newWidth = resizeStart.width + (e.clientX - resizeStart.x)
      const newHeight = resizeStart.height + (e.clientY - resizeStart.y)
      setSize({
        width: Math.max(300, newWidth),
        height: Math.max(400, newHeight)
      })
    }
  }, [isDragging, isResizing, dragStart, resizeStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
  }, [])

  const handleResizeStart = (e: React.MouseEvent) => {
    setIsResizing(true)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    })
  }

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp])

  if (!isChatbotOpen) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={() => setIsChatbotOpen(true)}
          className="relative bg-white p-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100"
        >
          {/* Modern M Logo */}
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-2xl">M</span>
          </div>
          {/* Subtle glow effect */}
          <div className="absolute inset-0 w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl opacity-20 blur-sm"></div>
        </button>
      </div>
    )
  }

  return (
    <div
      ref={chatRef}
      className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-xl flex flex-col"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`
      }}
    >
      {/* Header */}
      <div 
        className="bg-blue-600 text-white p-4 rounded-t-lg cursor-move drag-handle flex justify-between items-center"
        onMouseDown={handleMouseDown}
      >
        <div>
          <h3 className="text-2xl font-bold">Mizel Safety Advisor</h3>
        </div>
        <button
          onClick={() => setIsChatbotOpen(false)}
          className="text-white hover:text-gray-200 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.isUser
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className={`text-base leading-relaxed ${message.isUser ? 'text-white' : 'text-gray-900'} markdown-content`}>
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({children}) => <p className="mb-3 last:mb-0">{children}</p>,
                    ul: ({children}) => <ul className="list-disc ml-5 mb-3 space-y-1">{children}</ul>,
                    ol: ({children}) => <ol className="list-decimal ml-5 mb-3 space-y-1">{children}</ol>,
                    li: ({children}) => <li className="mb-1">{children}</li>,
                    strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                    em: ({children}) => <em className="italic">{children}</em>,
                    h1: ({children}) => <h1 className="text-xl font-bold mb-2 mt-4 first:mt-0">{children}</h1>,
                    h2: ({children}) => <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
                    h3: ({children}) => <h3 className="text-base font-semibold mb-2 mt-2 first:mt-0">{children}</h3>,
                    code: ({children}) => <code className={`${message.isUser ? 'bg-blue-700' : 'bg-gray-200'} px-1 rounded text-sm`}>{children}</code>,
                    blockquote: ({children}) => <blockquote className="border-l-4 border-gray-400 pl-3 italic my-2">{children}</blockquote>,
                  }}
                >
                  {message.text}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* User Information Capture */}
      <div className="p-4 border-t border-gray-200">
        <label className="block text-lg font-medium text-gray-700 mb-3">
          {userInfoProvided ? 'Contact information captured ✓' : 'Help us follow up with you (optional)'}
        </label>
        
        {!userInfoProvided ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Name (optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="Your name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Email (optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="your.email@company.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <p className="text-xs text-gray-500">
              Providing your information helps us follow up with relevant training opportunities.
            </p>
          </div>
        ) : (
          <div className="text-sm text-green-600">
            <p>Thank you{name ? `, ${name}` : ''}! We'll follow up with you soon.</p>
            {email && <p>Email: {email}</p>}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about safety training..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={startVoiceInput}
            className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            title="Voice Input"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim()}
            className="relative px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md"
          >
            {/* Modern M Logo */}
            <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-blue-800 rounded-md flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">M</span>
            </div>
          </button>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-300 hover:bg-gray-400"
        onMouseDown={handleResizeStart}
      />
    </div>
  )
}

export default Chatbot