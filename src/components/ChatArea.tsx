'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export default function ChatArea({ chatId, initialMessages }: { chatId: string, initialMessages: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const router = useRouter();

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Your browser does not support voice input.');
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev ? prev + ' ' + transcript : transcript);
      };
      recognition.onend = () => setIsListening(false);
      recognition.start();
      setIsListening(true);
      recognitionRef.current = recognition;
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, streamingContent, scrollToBottom]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    // Optimistic update — add user message immediately
    const tempId = Date.now().toString();
    setMessages(prev => [...prev, { id: tempId, role: 'user', content: userText }]);
    setLoading(true);
    setStreamingContent('');

    try {
      // Use the streaming endpoint for real-time token display
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, content: userText })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Request failed' }));
        alert(errData.error || 'Failed to send message');
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        alert('Streaming not supported');
        setLoading(false);
        return;
      }

      let accumulated = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.token) {
                accumulated += data.token;
                setStreamingContent(accumulated);
              }

              if (data.error) {
                alert(data.error);
                setLoading(false);
                setStreamingContent('');
                return;
              }

              if (data.done) {
                // Finalize: move streaming content into messages array
                const finalContent = accumulated;
                const msgId = data.msgId || Date.now().toString();
                setStreamingContent('');
                setMessages(prev => [...prev, { id: msgId, role: 'model', content: finalContent }]);
                router.refresh(); // refresh sidebar titles
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      }
    } catch (error: any) {
      alert(error.message || 'Network error');
    } finally {
      setLoading(false);
      setStreamingContent('');
    }
  };

  // Sync state when props change (after server action revalidates)
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Basic markdown parser for display
  const renderMarkdown = (text: string) => {
    // Avoid double rendering errors. For simplicity, just handle double and single asterisks.
    // Replace markdown headings, bold, italic
    let html = text
      .replace(/### (.*?)\n/g, '<h3>$1</h3>')
      .replace(/## (.*?)\n/g, '<h2>$1</h2>')
      .replace(/# (.*?)\n/g, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');

    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className="main-area">
      <div className="chat-container">
        {messages.length === 0 && !loading ? (
          <div className="welcome-screen">
            <img src="/logo.png" alt="Innodex Logo" className="welcome-logo" />
            <h1 className="welcome-title">Innodex</h1>
            <p className="welcome-subtitle">
              Your AI-powered startup feasibility partner. Let&apos;s evaluate, stress-test, and sharpen your startup idea through data-driven analysis.
            </p>
            <div className="suggested-prompts">
              <div className="prompt-card" onClick={() => setInput("I want to build an AI platform for legal document review.")}>
                <h4>AI for Legal Tech</h4>
                <p>Analyze idea: AI platform for legal document review.</p>
              </div>
              <div className="prompt-card" onClick={() => setInput("How can I monetize a consumer fintech app for teenagers?")}>
                <h4>Monetize Fintech App</h4>
                <p>Map monetization archetypes.</p>
              </div>
              <div className="prompt-card" onClick={() => setInput("Stress test my idea of an AR navigation app.")}>
                <h4>Stress Test</h4>
                <p>Devil&apos;s Advocate Mode.</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <div key={msg.id} className={`message-wrapper ${msg.role}`}>
                <div className={`message ${msg.role}`}>
                  <div className="message-header">
                    {msg.role === 'user' ? 'You' : 'Innodex'}
                  </div>
                  {renderMarkdown(msg.content)}
                </div>
              </div>
            ))}

            {/* Streaming response — shows tokens as they arrive */}
            {loading && streamingContent && (
              <div className="message-wrapper model">
                <div className="message model">
                  <div className="message-header">Innodex</div>
                  {renderMarkdown(streamingContent)}
                  <span className="streaming-cursor">▊</span>
                </div>
              </div>
            )}

            {/* Typing dots — shown while waiting for first token */}
            {loading && !streamingContent && (
              <div className="message-wrapper model">
                <div className="message model">
                  <div className="typing-indicator">
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <form className="input-container" onSubmit={handleSubmit}>
          <textarea
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your startup idea (e.g. what problem it solves, and who it is for)..."
            rows={1}
            disabled={loading}
          />
          <button 
            type="button" 
            className={`mic-btn ${isListening ? 'listening' : ''}`}
            onClick={toggleListening}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <button type="submit" className="send-btn" disabled={!input.trim() || loading}>
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
