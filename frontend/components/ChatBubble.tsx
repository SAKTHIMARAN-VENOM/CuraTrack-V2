'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const STORAGE_KEY = 'curatrack_chat_messages';
const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm CuraBot 👋 I can help you navigate CuraTrack — ask me about uploading records, checking your dashboard, self-triage, government health schemes, or any other feature!",
  timestamp: Date.now(),
};

export function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  // Load messages from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {}
  }, []);

  // Save messages to sessionStorage
  useEffect(() => {
    if (messages.length > 1) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch {}
    }
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      setHasUnread(false);
    }
  }, [isOpen]);

  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsStreaming(true);

    // Create placeholder for assistant response
    const assistantId = generateId();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, assistantMessage]);

    // Build message history for API (exclude welcome, keep last 20)
    const apiMessages = updatedMessages
      .filter(m => m.id !== 'welcome')
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch(`${API_BASE}/api/chatbot/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            if (data.startsWith('[ERROR:')) {
              fullContent += '\n\nSorry, I encountered an error. Please try again.';
              continue;
            }
            fullContent += data;
          }
        }

        // Update the assistant message content
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId ? { ...m, content: fullContent } : m
          )
        );
      }

      if (!isOpen) {
        setHasUnread(true);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: "I'm having trouble connecting to the server. Please make sure the backend is running and try again." }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, messages, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([WELCOME_MESSAGE]);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const quickActions = [
    { label: '📋 Upload Records', text: 'How do I upload a medical record?' },
    { label: '🚨 Self-Triage', text: 'How does the self-triage feature work?' },
    { label: '🏥 Find Hospitals', text: 'How can I find nearby hospitals?' },
  ];

  return (
    <>
      {/* Chat Panel */}
      <div
        className={`fixed bottom-24 right-6 z-[60] transition-all duration-300 ease-out ${
          isOpen
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        }`}
        style={{ width: '400px', maxWidth: 'calc(100vw - 2rem)' }}
      >
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-outline-variant/20 overflow-hidden flex flex-col"
          style={{ height: 'min(520px, calc(100vh - 10rem))' }}
        >
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between shrink-0"
            style={{ background: 'linear-gradient(135deg, #006782, #2c7d99)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
              </div>
              <div>
                <h3 className="text-white font-headline font-bold text-sm">CuraBot</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-white/70 text-[10px] font-semibold">Online • CuraTrack Assistant</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Clear chat"
              >
                <span className="material-symbols-outlined text-base">delete_sweep</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close chat"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={chatBodyRef} className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-end gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mb-0.5">
                      <span className="material-symbols-outlined text-primary text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                    </div>
                  )}
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-primary text-white rounded-br-md'
                        : 'bg-surface-container-low text-on-surface border border-outline-variant/10 rounded-bl-md'
                    }`}
                  >
                    {msg.content}
                    {msg.role === 'assistant' && msg.content === '' && isStreaming && (
                      <span className="inline-flex gap-1 py-0.5">
                        <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions — only show when just the welcome message */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    setInput(action.text);
                    setTimeout(() => sendMessage(), 50);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-primary/5 border border-primary/10 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-4 pb-4 pt-2 shrink-0 border-t border-outline-variant/10">
            <div className="flex items-center gap-2 bg-surface-container-low rounded-2xl px-4 py-2 border border-outline-variant/15 focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about CuraTrack..."
                disabled={isStreaming}
                className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-outline focus:outline-none disabled:opacity-50 font-body"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isStreaming}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer"
                style={{
                  background: input.trim() && !isStreaming ? 'linear-gradient(135deg, #006782, #2c7d99)' : 'transparent',
                }}
              >
                <span className={`material-symbols-outlined text-base ${input.trim() && !isStreaming ? 'text-white' : 'text-outline'}`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  send
                </span>
              </button>
            </div>
            <p className="text-[9px] text-outline text-center mt-1.5 font-body">
              Powered by AI • Not medical advice
            </p>
          </div>
        </div>
      </div>

      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[60] w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#006782] hover:bg-[#005268] text-white flex items-center justify-center shadow-lg transition-colors cursor-pointer"
        title="Chat with CuraBot"
      >
        <span
          className="material-symbols-outlined text-white text-2xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {isOpen ? 'close' : 'chat'}
        </span>

        {/* Static unread indicator */}
        {hasUnread && !isOpen && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>
    </>
  );
}
