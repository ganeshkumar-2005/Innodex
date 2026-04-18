'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';
import { sendMessage } from '@/app/actions';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export default function ChatArea({ chatId, initialMessages }: { chatId: string, initialMessages: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    // Optimistic update
    const tempId = Date.now().toString();
    setMessages(prev => [...prev, { id: tempId, role: 'user', content: userText }]);
    setLoading(true);

    try {
      await sendMessage(chatId, userText);
      // Data revalidation will update root layout, but since we are handling state locally we should wait for a refresh or manually fetch.
      // Easiest is to reload the window or let Next.js Server Components refresh we can just let Next.js Server actions revalidatePath handle the refresh,
      // but standard approach is to let the page reload the messages, or we just rely on parent component passing down messages? 
      // If we rely on parent, we should not have local state.
      // Let's rely on Next.js revalidatePath which will trigger a re-render of the server component and pass new initialMessages.
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
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
        {messages.length === 0 ? (
          <div className="welcome-screen">
            <img src="/logo.png" alt="Innodex Logo" className="welcome-logo" />
            <h1 className="welcome-title">Innodex</h1>
            <p className="welcome-subtitle">
              Your AI-powered startup feasibility partner. Let's evaluate, stress-test, and sharpen your startup idea through data-driven analysis.
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
                <p>Devil's Advocate Mode.</p>
              </div>
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`message-wrapper ${msg.role}`}>
              <div className={`message ${msg.role}`}>
                <div className="message-header">
                  {msg.role === 'user' ? 'You' : 'Innodex'}
                </div>
                {renderMarkdown(msg.content)}
              </div>
            </div>
          ))
        )}
        
        {loading && (
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
