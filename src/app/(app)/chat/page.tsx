'use client';

import { useState, useRef } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';
import { startNewChat, sendMessage } from '@/app/actions';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
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

  const handleStart = async (text: string) => {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      const chatId = await startNewChat('Startup Idea Analysis');
      if (chatId.startsWith('ERROR:')) {
        alert("Detailed Server Error: " + chatId);
        setLoading(false);
        return;
      }
      // Fire off message and navigate
      await sendMessage(chatId, text);
      router.push(`/chat/${chatId}`);
    } catch (error: any) {
      alert(error.message || 'Error occurred');
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleStart(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="main-area">
      <div className="chat-container">
        <div className="welcome-screen">
          <img src="/logo.png" alt="Innodex Logo" className="welcome-logo" />
          <h1 className="welcome-title">Innodex</h1>
          <p className="welcome-subtitle">
            Your AI-powered startup feasibility partner. Let's evaluate, stress-test, and sharpen your startup idea through data-driven analysis.
          </p>
          <div className="suggested-prompts">
            <div className="prompt-card" onClick={() => handleStart("I want to build an AI platform for legal document review.")}>
              <h4>AI for Legal Tech</h4>
              <p>Analyze idea: AI platform for legal document review.</p>
            </div>
            <div className="prompt-card" onClick={() => handleStart("How can I monetize a consumer fintech app for teenagers?")}>
              <h4>Monetize Fintech App</h4>
              <p>Map monetization archetypes.</p>
            </div>
            <div className="prompt-card" onClick={() => handleStart("Stress test my idea of an AR navigation app.")}>
              <h4>Stress Test</h4>
              <p>Devil's Advocate Mode.</p>
            </div>
          </div>
        </div>
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
            {loading ? <div className="dot" style={{width: 4, height: 4}} /> : <Send size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
}
