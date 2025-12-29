'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './ToastContainer'
import axios from 'axios'
import { getApiUrl } from '../utils/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  actions?: Array<{
    type: string
    label: string
    data: any
  }>
}

export default function AIAssistant() {
  const { token } = useAuth()
  const { showSuccess, showError } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AI assistant. I can help you create promotions, analyze performance, send notifications, and automate your venue operations. What would you like to do?",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await processAICommand(input, token)
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        actions: response.actions
      }

      setMessages(prev => [...prev, assistantMessage])

      // Execute actions if any
      if (response.actions && response.actions.length > 0) {
        for (const action of response.actions) {
          await executeAction(action)
        }
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I encountered an error: ${error.message}. Please try again or rephrase your request.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      showError('Failed to process request')
    } finally {
      setLoading(false)
    }
  }

  const processAICommand = async (command: string, token: string | null) => {
    if (!token) throw new Error('Not authenticated')

    const apiUrl = getApiUrl()
    const lowerCommand = command.toLowerCase()

    // Natural language processing
    if (lowerCommand.includes('create') || lowerCommand.includes('make') || lowerCommand.includes('generate')) {
      if (lowerCommand.includes('promotion') || lowerCommand.includes('deal') || lowerCommand.includes('special')) {
        // Extract details from command
        const discountMatch = command.match(/(\d+)%|(\d+)\s*percent/)
        const discount = discountMatch ? parseInt(discountMatch[1] || discountMatch[2]) : 20
        
        const typeMatch = command.match(/happy\s*hour|weekend|special|event/i)
        const type = typeMatch ? typeMatch[0].toLowerCase().replace(' ', '-') : 'special'

        // Get venue ID
        const venuesRes = await axios.get(`${apiUrl}/venues`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const venueId = Array.isArray(venuesRes.data) 
          ? venuesRes.data[0]?._id 
          : venuesRes.data?.venues?.[0]?._id

        if (!venueId) throw new Error('Venue not found')

        // Create promotion
        const promoRes = await axios.post(
          `${apiUrl}/promotions`,
          {
            title: extractTitle(command) || `${discount}% Off ${type === 'happy-hour' ? 'Happy Hour' : 'Special'}`,
            description: extractDescription(command) || `Enjoy ${discount}% off during this special promotion`,
            discount,
            type,
            venueId,
            isActive: true
          },
          { headers: { Authorization: `Bearer ${token}` } }
        )

        return {
          message: `✅ I've created a ${discount}% off ${type} promotion for you! It's now active and visible to customers.`,
          actions: [{
            type: 'promotion-created',
            label: 'View Promotion',
            data: { promotionId: promoRes.data.promotion._id }
          }]
        }
      }
    }

    if (lowerCommand.includes('suggest') || lowerCommand.includes('recommend') || lowerCommand.includes('idea')) {
      const venuesRes = await axios.get(`${apiUrl}/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const venueId = Array.isArray(venuesRes.data) 
        ? venuesRes.data[0]?._id 
        : venuesRes.data?.venues?.[0]?._id

      if (!venueId) throw new Error('Venue not found')

      const suggestionsRes = await axios.get(`${apiUrl}/ai-automation/suggestions?venueId=${venueId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const suggestions = suggestionsRes.data.suggestions || []
      if (suggestions.length === 0) {
        return {
          message: "I don't have any suggestions right now, but I'm analyzing your data. Check back soon!"
        }
      }

      const topSuggestion = suggestions[0]
      return {
        message: `💡 Here's my top suggestion: **${topSuggestion.title}**\n\n${topSuggestion.description}\n\nWould you like me to create this promotion automatically?`,
        actions: [{
          type: 'auto-post-suggestion',
          label: 'Yes, Create It',
          data: { suggestion: topSuggestion, venueId }
        }, {
          type: 'view-all-suggestions',
          label: 'View All Suggestions',
          data: { suggestions }
        }]
      }
    }

    if (lowerCommand.includes('auto') || lowerCommand.includes('automate') || lowerCommand.includes('enable')) {
      const venuesRes = await axios.get(`${apiUrl}/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const venueId = Array.isArray(venuesRes.data) 
        ? venuesRes.data[0]?._id 
        : venuesRes.data?.venues?.[0]?._id

      if (!venueId) throw new Error('Venue not found')

      const result = await axios.post(
        `${apiUrl}/ai-automation/process-all`,
        { venueId, threshold: 0.85 },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const { autoPosted, pending } = result.data
      let message = `🤖 I've processed your automation requests:\n\n`
      
      if (autoPosted.length > 0) {
        message += `✅ **${autoPosted.length} promotions** were automatically created and posted!\n\n`
      }
      
      if (pending.length > 0) {
        message += `📋 **${pending.length} suggestions** are pending your review.`
      }

      return { message }
    }

    if (lowerCommand.includes('analytics') || lowerCommand.includes('performance') || lowerCommand.includes('stats')) {
      return {
        message: "📊 I can help you analyze your venue's performance. Here are some insights:\n\n• Check your analytics dashboard for detailed metrics\n• I can suggest optimal promotion times based on your data\n• View your earnings and redemption rates\n\nWould you like me to generate specific insights?"
      }
    }

    // Default response
    return {
      message: "I can help you with:\n\n• Creating promotions\n• Getting AI suggestions\n• Automating operations\n• Analyzing performance\n• Sending notifications\n\nTry saying: 'Create a 20% happy hour promotion' or 'Give me suggestions'"
    }
  }

  const executeAction = async (action: any) => {
    if (!token) return

    try {
      if (action.type === 'auto-post-suggestion') {
        const { suggestion, venueId } = action.data
        const apiUrl = getApiUrl()
        
        await axios.post(
          `${apiUrl}/ai-automation/auto-post`,
          { venueId, suggestion },
          { headers: { Authorization: `Bearer ${token}` } }
        )

        showSuccess('Promotion created and posted automatically!')
      }
    } catch (error: any) {
      showError(error.message || 'Failed to execute action')
    }
  }

  const extractTitle = (command: string): string | null => {
    // Try to extract a title from quotes or after "called" or "named"
    const quoteMatch = command.match(/"([^"]+)"/)
    if (quoteMatch) return quoteMatch[1]

    const calledMatch = command.match(/(?:called|named|titled)\s+([^.!?]+)/i)
    if (calledMatch) return calledMatch[1].trim()

    return null
  }

  const extractDescription = (command: string): string | null => {
    const descMatch = command.match(/(?:description|about|for)\s+([^.!?]+)/i)
    return descMatch ? descMatch[1].trim() : null
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-500 text-black rounded-full shadow-lg hover:bg-primary-400 transition-all flex items-center justify-center z-50 group"
        aria-label="Open AI Assistant"
      >
        <Sparkles className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-black border-2 border-primary-500/50 rounded-xl shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-primary-500/20">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary-500">AI Assistant</h3>
            <p className="text-xs text-primary-400/70">Always here to help</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1.5 hover:bg-primary-500/10 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-primary-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-primary-500 text-black'
                  : 'bg-black/40 border border-primary-500/20 text-primary-300'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              {message.actions && message.actions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.actions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => executeAction(action)}
                      className="w-full text-left px-3 py-2 bg-primary-500/20 hover:bg-primary-500/30 rounded text-xs text-primary-500 transition-colors"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-black/40 border border-primary-500/20 rounded-lg p-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-primary-500/20">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Ask me anything..."
            className="flex-1 px-3 py-2 bg-black/60 border border-primary-500/30 rounded-lg text-sm text-primary-500 placeholder-primary-600/70 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-primary-500 text-black rounded-lg hover:bg-primary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-primary-400/50 mt-2 text-center">
          Try: "Create a 20% happy hour promotion" or "Give me suggestions"
        </p>
      </div>
    </div>
  )
}

