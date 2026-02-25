import React, { useState } from 'react';
import { MessageCircle, ExternalLink, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import { CHATBOT_CONFIG } from '@/config/constants';

interface ChatAccessButtonProps {
  className?: string;
}

const ChatAccessButton: React.FC<ChatAccessButtonProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const telegramUrl = import.meta.env.VITE_TELEGRAM_BOT_URL || CHATBOT_CONFIG.TELEGRAM_URL;

  const handleOpenTelegram = () => {
    window.open(telegramUrl, '_blank', 'noopener,noreferrer');
    setIsModalOpen(false);
  };

  const handleOpenWebchat = () => {
    navigate('/webchat');
    setIsModalOpen(false);
  };

  return (
    <>
      <Button
        variant="primary"
        onClick={() => setIsModalOpen(true)}
        className={`bg-green-600 hover:bg-green-700 text-white ${className}`}
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        Ir al Chat
        <ExternalLink className="w-4 h-4 ml-2" />
      </Button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Selecciona canal de chat"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 font-opensans dark:text-gray-300">
            ¿Quieres ir al chatbot web o abrir el bot en Telegram?
          </p>

          <button
            onClick={handleOpenWebchat}
            className="w-full rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-left transition hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-indigo-600/90 p-2 text-white">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold font-poppins text-indigo-700 dark:text-indigo-200">Chatbot Web</p>
                <p className="text-xs font-opensans text-indigo-600 dark:text-indigo-300">Abrir chat integrado en SOF-IA</p>
              </div>
            </div>
          </button>

          <button
            onClick={handleOpenTelegram}
            className="w-full rounded-xl border border-blue-200 bg-blue-50 p-4 text-left transition hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-900/30 dark:hover:bg-blue-900/50"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-sky-500 p-2 text-white">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold font-poppins text-blue-700 dark:text-blue-200">Telegram</p>
                <p className="text-xs font-opensans text-blue-600 dark:text-blue-300">Abrir @ValleSoftwareBot</p>
              </div>
            </div>
          </button>
        </div>
      </Modal>
    </>
  );
};

export default ChatAccessButton;
