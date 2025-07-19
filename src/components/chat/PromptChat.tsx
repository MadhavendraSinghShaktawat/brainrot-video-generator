'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Menu, X, Clock, Plus, Edit3, Trash2, Check, XIcon } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import MessageRenderer from './MessageRenderer';
import { ChatMessage } from '@/types/chat';

interface PromptChatProps {
  onVideoGenerated?: (videoUrl: string) => void;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'ai';
  message_type: 'text' | 'avatar_gallery' | 'voice_selector' | 'script_options' | 'video_preview' | 'generation_progress';
  content: string | null;
  data: Record<string, any> | null;
  sequence_number: number;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string | null;
  status: string;
  workflow_step: string;
  created_at: string;
  updated_at: string;
}

interface RecentConversation extends Conversation {
  last_message_content?: string;
  last_message_type?: string;
  last_message_at?: string;
}

export default function PromptChat({ onVideoGenerated }: PromptChatProps) {
  const { user } = useAuth();
  const [userId, setUserId] = useState<string>('');

  // Initialize userId on client side only to avoid hydration mismatch
  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
    } else {
      let id = localStorage.getItem('anonymous_user_id');
      if (!id) {
        id = 'anonymous_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('anonymous_user_id', id);
      }
      setUserId(id);
    }
  }, [user?.id]);

  const [conversations, setConversations] = useState<RecentConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle responsive design - client-side only to avoid hydration mismatch
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };

    // Only run on client side
    if (typeof window !== 'undefined') {
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Load conversations on mount - only after userId is set
  useEffect(() => {
    if (userId) {
      loadConversations();
    }
  }, [userId]);

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/conversations');
      if (response.ok) {
        const data = await response.json();
        // Extract conversations array from response object
        const conversationsArray = data.conversations || [];
        setConversations(conversationsArray);
        
        // Auto-select first conversation if none selected
        if (conversationsArray.length > 0 && !currentConversation) {
          const firstConv = conversationsArray[0];
          if (firstConv && firstConv.id) {
            await selectConversation(firstConv);
          }
        } else if (conversationsArray.length === 0) {
          // Create first conversation if none exist
          await createNewConversation();
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      // Ensure conversations is always an array even on error
      setConversations([]);
    }
  };

  const createNewConversation = async () => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Chat ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        })
      });

      if (response.ok) {
        const { conversation } = await response.json();
        if (conversation && conversation.id) {
          setCurrentConversation(conversation);
          setMessages([]);
          await addWelcomeMessageForConversation(conversation);
          if (isMobile) setSidebarOpen(false);
          return conversation; // ✅ return newly created conversation
        }
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
    return null;
  };

  const selectConversation = async (conversation: RecentConversation) => {
    if (!conversation || !conversation.id) {
      console.error('Invalid conversation provided to selectConversation:', conversation);
      return;
    }
    
    setCurrentConversation(conversation);
    await loadMessages(conversation.id);
    if (isMobile) setSidebarOpen(false);
  };

  const startEditingTitle = (conversation: RecentConversation) => {
    setEditingConversationId(conversation.id);
    setEditingTitle(conversation.title || 'Untitled Chat');
  };

  const saveConversationTitle = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitle })
      });

      if (response.ok) {
        await loadConversations();
        setEditingConversationId(null);
        setEditingTitle('');
      }
    } catch (error) {
      console.error('Error updating conversation title:', error);
    }
  };

  const cancelEditingTitle = () => {
    setEditingConversationId(null);
    setEditingTitle('');
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadConversations();
        setDeleteConfirmId(null);
        
        if (currentConversation?.id === conversationId) {
          const remaining = conversations.filter(c => c.id !== conversationId);
          if (remaining.length > 0 && remaining[0] && remaining[0].id) {
            await selectConversation(remaining[0]);
          } else {
            setCurrentConversation(null);
            setMessages([]);
            await createNewConversation();
          }
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    if (!conversationId || conversationId === 'undefined') {
      console.error('Invalid conversation ID:', conversationId);
      setMessages([]);
      return;
    }

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      if (response.ok) {
        const data = await response.json();
        // Extract messages array from response object
        const messagesArray = data.messages || [];
        setMessages(messagesArray);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      // Ensure messages is always an array even on error
      setMessages([]);
    }
  };

  const addWelcomeMessageForConversation = async (conversation: Conversation) => {
    const welcomeMessage = {
      conversation_id: conversation.id,
      sender_type: 'ai' as const,
      message_type: 'text' as const,
      content: `👋 Hi! I'm your AI video creation assistant. I can help you create viral content for TikTok, Instagram, and YouTube. What would you like to create today?

🎬 **Say things like:**
• "Generate building in public script ideas"
• "Create a video about morning routines"
• "Give me 5 startup story ideas"
• "What avatars are available?"

Let's create something amazing! 🚀`
    };

    await saveMessage(welcomeMessage);
  };

  const addWelcomeMessage = async () => {
    if (!currentConversation) return;
    await addWelcomeMessageForConversation(currentConversation);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  const saveMessage = async (messageData: Partial<Message>) => {
    if (!currentConversation) return null;

    try {
      const response = await fetch(`/api/conversations/${currentConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });

      if (response.ok) {
        const respJson = await response.json();
        const savedMessage: Message = respJson.message || respJson; // Support both {message} and raw object
        setMessages(prev => [...prev, savedMessage]);
        return savedMessage;
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
    return null;
  };

  const handleAIResponse = async (userMessage: string) => {
    if (!currentConversation || !currentConversation.id) {
      console.error('No current conversation available');
      return;
    }
    setIsLoading(true);

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationId: currentConversation.id,
          userId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        let streamDone = false;
        while (!streamDone) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Split on double newlines which delimit events
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith('data:')) continue;
            const dataStr = line.replace(/^data:\s*/, '');
            if (dataStr === '[DONE]') {
              streamDone = true;
              break;
            }
            try {
              const aiResp = JSON.parse(dataStr);
              if (!aiResp.isThinking) {
                await saveMessage({
                  conversation_id: currentConversation.id,
                  sender_type: 'ai',
                  message_type: aiResp.type || 'text',
                  content: aiResp.content,
                  data: aiResp.data || null
                });

                if (aiResp.type === 'video_preview' && aiResp.data?.videoUrl && onVideoGenerated) {
                  onVideoGenerated(aiResp.data.videoUrl);
                }
              }
            } catch (err) {
              console.error('Failed to parse SSE chunk', dataStr, err);
            }
          }
        }
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      await saveMessage({
        conversation_id: currentConversation.id,
        sender_type: 'ai',
        message_type: 'text',
        content: '❌ Sorry, I encountered an error. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    let activeConversation = currentConversation;
    if (!activeConversation || !activeConversation.id) {
      // Create a conversation on-the-fly if none exists
      activeConversation = await createNewConversation();
      if (!activeConversation) {
        console.error('Failed to create a conversation');
        return;
      }
    }

    // Save user message
    await saveMessage({
      conversation_id: activeConversation.id,
      sender_type: 'user',
      message_type: 'text',
      content: input
    });

    const userMessage = input;
    setInput('');

    // Ask AI for response
    await handleAIResponse(userMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Convert Message to ChatMessage for MessageRenderer
  const convertToChatMessage = (message: Message): ChatMessage => {
    // Safe timestamp conversion
    let timestamp = Date.now(); // Default to current time
    if (message.created_at) {
      const parsedDate = new Date(message.created_at);
      if (!isNaN(parsedDate.getTime())) {
        timestamp = parsedDate.getTime();
      }
    }

    return {
      id: message.id,
      role: message.sender_type === 'ai' ? 'assistant' : message.sender_type,
      type: message.message_type,
      content: message.content || '',
      data: message.data,
      createdAt: timestamp
    };
  };

  // Prevent hydration mismatch by not rendering until userId is set
  if (!userId) {
    return (
      <div className="flex h-full min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950">
        <div className="flex items-center justify-center w-full">
          <div className="flex items-center space-x-2 text-white">
            <div className="w-4 h-4 bg-purple-500 rounded-full animate-pulse"></div>
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-slate-900/95 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white">Chat History</h3>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-4 border-b border-white/10">
            <button
              onClick={createNewConversation}
              className="w-full flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-xl transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New Chat</span>
            </button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-2 space-y-1">
              {Array.isArray(conversations) && conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`group relative rounded-xl p-3 cursor-pointer transition-all duration-200 ${
                    currentConversation?.id === conversation.id
                      ? 'bg-purple-600/20 border border-purple-500/30 shadow-lg'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                  onClick={() => selectConversation(conversation)}
                >
                  {editingConversationId === conversation.id ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') saveConversationTitle(conversation.id);
                          if (e.key === 'Escape') cancelEditingTitle();
                        }}
                        className="flex-1 bg-slate-800 text-white px-2 py-1 rounded text-sm border border-white/20 focus:border-purple-500 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveConversationTitle(conversation.id);
                        }}
                        className="p-1 text-green-400 hover:text-green-300"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelEditingTitle();
                        }}
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ) : deleteConfirmId === conversation.id ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-red-400">Delete this chat?</span>
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conversation.id);
                          }}
                          className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                        >
                          Yes
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(null);
                          }}
                          className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <h4 className="text-white font-medium text-sm truncate pr-2">
                          {conversation.title || 'Untitled Chat'}
                        </h4>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditingTitle(conversation);
                            }}
                            className="p-1 text-white/40 hover:text-white/80 rounded"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(conversation.id);
                            }}
                            className="p-1 text-white/40 hover:text-red-400 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      {conversation.last_message_content && (
                        <p className="text-white/60 text-xs mt-1 truncate">
                          {conversation.last_message_content.length > 50
                            ? conversation.last_message_content.substring(0, 50) + '...'
                            : conversation.last_message_content}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-white/40" />
                          <span className="text-xs text-white/40">
                            {conversation.last_message_at ? 
                              new Date(conversation.last_message_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 
                              new Date(conversation.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            }
                          </span>
                        </div>
                        <span className="text-xs text-white/40 px-2 py-1 rounded-md bg-white/10">
                          {conversation.workflow_step || 'initial'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="bg-slate-900/50 backdrop-blur-xl border-b border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {currentConversation?.title || 'AI Video Assistant'}
                </h2>
                <p className="text-white/60 text-sm">
                  Create viral content with AI-powered assistance
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 p-8">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-3xl">🎬</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Welcome to AI Video Creator!</h3>
                <p className="text-white/60 max-w-md">
                  Start creating viral content for TikTok, Instagram, and YouTube. 
                  Just tell me what you want to create!
                </p>
              </div>
              <button
                onClick={addWelcomeMessage}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl transition-colors"
              >
                Get Started
              </button>
            </div>
          )}

          {Array.isArray(messages) &&
            messages.map((message, idx) => (
              <MessageRenderer
                key={`msg-${message.id ?? message.sequence_number ?? idx}`}
                message={convertToChatMessage(message)}
              />
            ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-4 max-w-xs">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <span className="text-white/60 text-sm">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-slate-900/50 backdrop-blur-xl border-t border-white/10 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe what you want to create... (e.g., 'Generate building in public script ideas')"
                className="w-full bg-slate-800/50 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 pr-12 text-white placeholder-white/40 focus:outline-none focus:border-purple-500 resize-none min-h-[44px] max-h-[120px]"
                rows={1}
                disabled={isLoading}
                maxLength={1000}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-white/40 text-white p-2 rounded-xl transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex items-center justify-between mt-2 text-xs text-white/40">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 text-[10px] bg-white/10 rounded border border-white/20">⏎</kbd>
                  <span>Send</span>
                </span>
                <span className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 text-[10px] bg-white/10 rounded border border-white/20">⇧⏎</kbd>
                  <span>New line</span>
                </span>
              </div>
              <span className={`${input.length > 800 ? 'text-yellow-400' : ''} ${input.length > 950 ? 'text-red-400' : ''}`}>
                {input.length}/1000
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 