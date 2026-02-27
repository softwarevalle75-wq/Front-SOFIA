import React, { useMemo, useState } from 'react';
import { MessageCircle, ExternalLink, Send, X } from 'lucide-react';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import { CHATBOT_CONFIG } from '@/config/constants';

interface ChatAccessButtonProps {
  className?: string;
}

const ChatAccessButton: React.FC<ChatAccessButtonProps> = ({ className = '' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const publicChatbotUrl = useMemo(
    () => import.meta.env.VITE_PUBLIC_CHATBOT_URL || `${window.location.origin}/chatbot`,
    [],
  );

  const telegramBotUrl = useMemo(
    () => import.meta.env.VITE_TELEGRAM_BOT_URL || CHATBOT_CONFIG.TELEGRAM_URL,
    [],
  );

  const openExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsModalOpen(false);
  };

  const modalFooter = (
    <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
      <X className="h-4 w-4" />
      Cerrar
    </Button>
  );

  return (
    <>
      <Button
        variant="primary"
        onClick={() => setIsModalOpen(true)}
        className={`bg-green-600 hover:bg-green-700 text-white ${className}`}
      >
        <MessageCircle className="h-4 w-4" />
        Ir al Chat
        <ExternalLink className="h-4 w-4" />
      </Button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Selecciona un canal" footer={modalFooter} size="md">
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">Elige como quieres continuar la conversacion con SOF-IA.</p>

          <Button
            variant="primary"
            onClick={() => openExternalLink(publicChatbotUrl)}
            className="w-full justify-between bg-indigo-600 hover:bg-indigo-700"
          >
            <span className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Ir al chatbot web
            </span>
            <ExternalLink className="h-4 w-4" />
          </Button>

          <Button
            variant="secondary"
            onClick={() => openExternalLink(telegramBotUrl)}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Ir a Telegram
            </span>
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default ChatAccessButton;
