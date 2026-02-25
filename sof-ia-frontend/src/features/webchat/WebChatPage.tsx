import React, { useMemo, useRef, useState } from 'react';
import { Bot, Send, RotateCcw } from 'lucide-react';
import { useTheme } from '@/components/layout/MainLayout';
import Button from '@/components/common/Button';
import loginBackground from '@/assets/logos/consul.png';
import { authService } from '@/services/auth.service';
import { webchatService } from '@/services/webchat.service';

type WebchatMessage = {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
};

const quickPrompts = ['Hola', 'laboral', 'soporte', 'reset'];

const WebChatPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const user = authService.getCurrentUser();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<WebchatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Hola, soy SOF-IA. Escribe tu consulta juridica para iniciar.',
      timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);

  const pushMessage = (sender: 'user' | 'bot', text: string) => {
    const timestamp = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      {
        id: `${sender}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        sender,
        text,
        timestamp,
      },
    ]);

    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }, 0);
  };

  const handleSend = async (forcedText?: string) => {
    const text = (forcedText ?? input).trim();
    if (!text || isSending) return;

    setError('');
    setIsSending(true);
    if (!forcedText) setInput('');
    pushMessage('user', text);

    try {
      const botMessages = await webchatService.sendMessage({
        text,
        displayName: user?.nombre || user?.email,
      });

      if (botMessages.length === 0) {
        pushMessage('bot', 'No recibi una respuesta del asistente. Intenta de nuevo en unos segundos.');
      } else {
        botMessages.forEach((msg) => pushMessage('bot', msg));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al conectar con el chatbot.';
      setError(message);
      pushMessage('bot', 'Ocurrio un problema al procesar tu mensaje. Intenta nuevamente.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="relative min-h-[calc(100vh-9rem)] overflow-hidden rounded-2xl"
      style={{
        backgroundImage: `url(${loginBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-blue-900/65" />

      <div className="relative z-10 flex h-full min-h-[calc(100vh-9rem)] flex-col p-3 sm:p-6">
        <div
          className={`mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden rounded-2xl border backdrop-blur-md ${
            isDarkMode
              ? 'border-white/20 bg-gray-900/35'
              : 'border-white/30 bg-black/35'
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/20 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold font-poppins text-white">Chatbot Web SOF-IA</h1>
                <p className="text-sm font-opensans text-blue-100">Mismo flujo conversacional de Telegram</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSend('reset')}
              className="border border-white/25 bg-white/10 text-white hover:bg-white/20"
            >
              <RotateCcw className="h-4 w-4" />
              Reiniciar
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-white/20 px-4 py-3 sm:px-6">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                disabled={isSending}
                className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-opensans text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div ref={scrollContainerRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-md sm:max-w-[75%] ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'border border-white/20 bg-white/15 text-white backdrop-blur-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm font-opensans">{msg.text}</p>
                  <p className={`mt-1 text-[11px] ${msg.sender === 'user' ? 'text-indigo-200' : 'text-blue-100/80'}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-white/20 bg-white/15 px-4 py-2 text-sm font-opensans text-blue-100">
                  SOF-IA esta escribiendo...
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="px-4 pb-2 text-sm font-opensans text-red-200 sm:px-6">
              {error}
            </div>
          )}

          <div className="border-t border-white/20 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                disabled={isSending}
                placeholder="Escribe tu mensaje para el chatbot..."
                className="h-11 flex-1 rounded-xl border border-white/30 bg-white/15 px-4 text-sm font-opensans text-white placeholder:text-blue-100/70 focus:border-blue-300 focus:outline-none"
              />
              <Button
                variant="primary"
                onClick={() => void handleSend()}
                disabled={!canSend}
                className="h-11 px-4"
              >
                <Send className="h-4 w-4" />
                Enviar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebChatPage;
