'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Message, Conversation, RecentConversation } from '@/types/chat'

export default function ChatPage() {
  const [conversations, setConversations] = useState<RecentConversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const supabase = createClient()
    
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        loadConversations()
      }
    })
  }, [])

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/conversations')
      const data = await response.json()
      
      if (response.ok) {
        setConversations(data.conversations || [])
      } else {
        console.error('Failed to load conversations:', data.error)
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`)
      const data = await response.json()
      
      if (response.ok) {
        setMessages(data.messages || [])
      } else {
        console.error('Failed to load messages:', data.error)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const createNewConversation = async () => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Video Creation',
          initial_message: 'I want to create a video'
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setCurrentConversation(data.conversation)
        loadConversations() // Refresh the list
        loadMessages(data.conversation.id)
      } else {
        console.error('Failed to create conversation:', data.error)
      }
    } catch (error) {
      console.error('Error creating conversation:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentConversation) return

    try {
      const response = await fetch(`/api/conversations/${currentConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_type: 'user',
          message_type: 'text',
          content: newMessage
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setMessages(prev => [...prev, data.message])
        setNewMessage('')
        
        // TODO: Trigger AI response here
        // For now, just add a simple AI response
        setTimeout(() => {
          sendAIResponse()
        }, 1000)
      } else {
        console.error('Failed to send message:', data.error)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const sendAIResponse = async () => {
    if (!currentConversation) return

    try {
      const response = await fetch(`/api/conversations/${currentConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_type: 'ai',
          message_type: 'text',
          content: 'I understand you want to create a video! What topic would you like to create content about? I can help generate scripts for Instagram, TikTok, or YouTube.'
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setMessages(prev => [...prev, data.message])
      }
    } catch (error) {
      console.error('Error sending AI response:', error)
    }
  }

  const selectConversation = (conversation: RecentConversation) => {
    setCurrentConversation(conversation)
    loadMessages(conversation.id)
  }

  if (loading) return <div className="p-4">Loading...</div>

  if (!user) {
    return (
      <div className="p-4">
        <p>Please log in to use the chat system.</p>
        <a href="/login" className="text-blue-500 underline">Login</a>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      {/* Conversations Sidebar */}
      <div className="w-1/3 border-r bg-gray-50 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <button
            onClick={createNewConversation}
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
          >
            New Chat
          </button>
        </div>
        
        <div className="space-y-2">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => selectConversation(conversation)}
              className={`p-3 rounded cursor-pointer border ${
                currentConversation?.id === conversation.id
                  ? 'bg-blue-100 border-blue-300'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">{conversation.title || 'Untitled'}</div>
              <div className="text-sm text-gray-500 truncate">
                {conversation.last_message_content || 'No messages'}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Step: {conversation.workflow_step}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            {/* Chat Header */}
            <div className="border-b p-4 bg-white">
              <h3 className="font-semibold">{currentConversation.title}</h3>
              <div className="text-sm text-gray-500">
                Workflow: {currentConversation.workflow_step} | 
                Platform: {currentConversation.selected_platform || 'Not selected'}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender_type === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <div className="font-medium text-xs mb-1">
                      {message.sender_type === 'user' ? 'You' : 'AI'} • {message.message_type}
                    </div>
                    <div>{message.content}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="border-t p-4 bg-white">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={sendMessage}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation or create a new one to start chatting
          </div>
        )}
      </div>
    </div>
  )
} 