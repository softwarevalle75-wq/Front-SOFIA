import React, { useMemo, useRef, useState } from 'react';
import { Bot, Send, RotateCcw } from 'lucide-react';
import { useTheme } from '@/components/layout/MainLayout';
import Button from '@/components/common/Button';
import loginBackground from '@/assets/logos/consul.png';
import universityLogo from '@/assets/logos/university-logo-blanco.png';
import { authService } from '@/services/auth.service';
import { webchatService } from '@/services/webchat.service';

type WebchatMessage = {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
};

function buildWelcomeMessage(): WebchatMessage {
  return {
    id: 'welcome',
    sender: 'bot',
    text: 'Hola, soy SOF-IA. Escribe tu consulta juridica para iniciar.',
    timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
  };
}

const WebChatPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const user = authService.getCurrentUser();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<WebchatMessage[]>([buildWelcomeMessage()]);

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

  const handleReset = async () => {
    if (isSending) return;

    setIsSending(true);
    setError('');

    try {
      await webchatService.sendMessage({
        text: 'reset',
        displayName: user?.nombre || user?.email,
      });
    } catch {
      // Si falla el reset remoto, de todas formas reiniciamos la sesion local del chat
    } finally {
      webchatService.restartSession();
      setInput('');
      setMessages([buildWelcomeMessage()]);
      setIsSending(false);

      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      }, 0);
    }
  };

  return (
    <div className="relative h-[calc(100vh-9rem)] overflow-hidden rounded-2xl bg-white">
      <div className="relative z-10 flex h-full min-h-0 flex-col p-3 sm:p-6">
        <div
          className={`mx-auto flex h-full min-h-0 w-full max-w-4xl flex-1 flex-col overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-lg ${
            isDarkMode
              ? 'border-[#C9A227]/35 bg-[#0E164E]/55'
              : 'border-[#C9A227]/40 bg-[#0E164E]/50'
          }`}
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(14,22,78,0.84), rgba(14,22,78,0.82)), url(${loginBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="flex items-center justify-between border-b border-[#C9A227]/30 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="hidden items-center sm:flex">
                <img src={universityLogo} alt="Universitaria de Colombia" className="h-11 w-auto object-contain" />
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#C9A227]/40 bg-white/10">
                <Bot className="h-5.5 w-5.5 text-[#FFCD00]" />
              </div>
              <div>
                <h1 className="text-xl font-bold font-poppins text-white">SOF-IA</h1>
              </div>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={handleReset}
              className="h-11 border border-[#C9A227]/45 bg-[#1A1F71]/70 text-[#FFCD00] hover:bg-[#222A8A]"
            >
              <RotateCcw className="h-4 w-4" />
              Reiniciar
            </Button>
          </div>

          <div ref={scrollContainerRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[86%] rounded-xl px-4 py-3 shadow-md sm:max-w-[74%] ${
                    msg.sender === 'user'
                      ? 'bg-[#2D35A5] text-white border border-[#C9A227]/35'
                      : 'border border-white/20 bg-white/12 text-white backdrop-blur-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-base leading-relaxed font-opensans">{msg.text}</p>
                  <p className={`mt-1.5 text-xs ${msg.sender === 'user' ? 'text-[#FFE58A]' : 'text-blue-100/80'}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="rounded-xl border border-white/20 bg-white/12 px-4 py-2.5 text-base font-opensans text-blue-100">
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

          <div className="border-t border-[#C9A227]/25 px-5 py-4 sm:px-6">
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
                className="h-12 flex-1 rounded-lg border border-white/30 bg-[#0B1342]/85 px-4 text-base font-opensans text-[#F8FAFF] caret-[#FFCD00] placeholder:text-blue-100/70 focus:border-[#C9A227]/70 focus:outline-none disabled:text-blue-100/70"
              />
              <Button
                variant="primary"
                onClick={() => void handleSend()}
                disabled={!canSend}
                className="h-12 px-5 text-base bg-[#2D35A5] hover:bg-[#3D45B8] border border-[#C9A227]/45"
              >
                <Send className="h-5 w-5" />
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
