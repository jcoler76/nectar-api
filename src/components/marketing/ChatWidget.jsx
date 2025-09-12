import { MessageCircle, Send, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

const initialBotGreeting = "Hi! I'm here to help. Tap to get started.";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([{ role: 'bot', content: initialBotGreeting }]);
  const listRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const startConversation = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/contact-chat/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: window.location.href, source: 'marketing_chat' }),
      });
      const data = await res.json();
      if (data?.conversationId) setConversationId(data.conversationId);
      if (data?.nextPrompt)
        setMessages(prev => [...prev, { role: 'bot', content: data.nextPrompt }]);
    } catch (e) {
      setMessages(prev => [
        ...prev,
        { role: 'bot', content: 'Sorry, something went wrong starting chat.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    try {
      setLoading(true);
      if (!conversationId) await startConversation();
      const convoId = conversationId;
      const res = await fetch('/api/contact-chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convoId || conversationId, message: text }),
      });
      const data = await res.json();
      if (data?.reply) setMessages(prev => [...prev, { role: 'bot', content: data.reply }]);
    } catch (e) {
      setMessages(prev => [
        ...prev,
        { role: 'bot', content: 'Sorry, could not send your message.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && !conversationId) startConversation();
  };

  return (
    <div>
      {/* Floating button */}
      {!open && (
        <button
          onClick={toggleOpen}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-80 max-w-[92vw] bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
          <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-between">
            <div className="font-semibold">NectarStudio.ai</div>
            <button
              onClick={toggleOpen}
              className="p-1 rounded hover:bg-white/10"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div ref={listRef} className="p-3 space-y-2 flex-1 overflow-y-auto">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'} px-3 py-2 rounded-xl max-w-[85%] text-sm`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <div className="text-xs text-gray-500">Typing…</div>}
          </div>
          <div className="border-t border-gray-200 p-2 flex items-center gap-2">
            <input
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your message…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') sendMessage();
              }}
            />
            <button
              onClick={sendMessage}
              className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={loading || !input.trim()}
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
