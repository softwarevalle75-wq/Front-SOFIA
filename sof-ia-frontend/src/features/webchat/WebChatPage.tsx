import React, { useEffect, useMemo, useRef, useState } from 'react';
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

interface WebChatPageProps {
  publicMode?: boolean;
}

function buildWelcomeMessage(): WebchatMessage {
  return {
    id: 'welcome',
    sender: 'bot',
    text: 'Hola, soy SOF-IA. Escribe tu consulta juridica para iniciar.',
    timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
  };
}

const WebChatPage: React.FC<WebChatPageProps> = ({ publicMode = false }) => {
  const { isDarkMode } = useTheme();
  const user = authService.getCurrentUser();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<WebchatMessage[]>([buildWelcomeMessage()]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);

  const focusInput = () => {
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      inputRef.current.focus({ preventScroll: true });
      const length = inputRef.current.value.length;
      inputRef.current.setSelectionRange(length, length);
    });
  };

  useEffect(() => {
    focusInput();
  }, []);

  useEffect(() => {
    if (!isSending) focusInput();
  }, [isSending]);

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

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isSending) return;

    setError('');
    setIsSending(true);
    setInput('');
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
      focusInput();
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
      // Ignore remote reset failure.
    } finally {
      webchatService.restartSession();
      setInput('');
      setMessages([buildWelcomeMessage()]);
      setIsSending(false);
      focusInput();

      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      }, 0);
    }
  };

  const containerClass = publicMode
    ? 'relative h-screen overflow-hidden bg-white'
    : 'relative h-[calc(100vh-9rem)] overflow-hidden rounded-2xl bg-white';

  return (
    <div className={containerClass}>
      <div className="relative z-10 flex h-full min-h-0 flex-col p-3 sm:p-6">
        <div
          className={`mx-auto flex h-full min-h-0 w-full max-w-4xl flex-1 flex-col overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-lg ${
            isDarkMode ? 'border-[#C9A227]/35 bg-[#0E164E]/55' : 'border-[#C9A227]/40 bg-[#0E164E]/50'
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
                <Bot className="h-5 w-5 text-[#FFCD00]" />
              </div>
              <h1 className="text-xl font-bold font-poppins text-white">SOF-IA</h1>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={handleReset}
              onMouseDown={(event) => event.preventDefault()}
              className="group h-11 rounded-xl border border-[#C9A227]/45 bg-gradient-to-r from-[#1A1F71]/95 to-[#2D35A5]/95 px-4 text-[#FFCD00] shadow-[0_8px_20px_rgba(9,13,44,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:from-[#222A8A] hover:to-[#3D45B8] hover:text-[#FFE58A] focus-visible:ring-2 focus-visible:ring-[#C9A227]/70"
            >
              <RotateCcw className="h-4 w-4 transition-transform duration-200 group-hover:-rotate-12" />
              Reiniciar
            </Button>
          </div>

          <div ref={scrollContainerRef} className="webchat-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[86%] rounded-xl px-4 py-3 shadow-md sm:max-w-[74%] ${
                    msg.sender === 'user'
                      ? 'border border-[#C9A227]/35 bg-[#2D35A5] text-white'
                      : 'border border-white/20 bg-white/12 text-white backdrop-blur-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-base leading-relaxed font-opensans">{msg.text}</p>
                  <p className={`mt-1.5 text-xs ${msg.sender === 'user' ? 'text-[#FFE58A]' : 'text-blue-100/80'}`}>{msg.timestamp}</p>
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

          {error && <div className="px-4 pb-2 text-sm font-opensans text-red-200 sm:px-6">{error}</div>}

          <div className="border-t border-[#C9A227]/25 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
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
                onMouseDown={(event) => event.preventDefault()}
                disabled={!canSend}
                className="h-12 border border-[#C9A227]/45 bg-[#2D35A5] px-5 text-base hover:bg-[#3D45B8]"
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
