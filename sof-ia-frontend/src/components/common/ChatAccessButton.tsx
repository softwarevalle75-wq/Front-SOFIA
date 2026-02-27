import React, { useMemo, useState } from 'react';
import { MessageCircle, ExternalLink, X, Globe } from 'lucide-react';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import { CHATBOT_CONFIG } from '@/config/constants';

interface ChatAccessButtonProps {
  className?: string;
}

const TelegramIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    <path
      d="M17.9 7.78L15.95 17.06C15.81 17.72 15.45 17.88 14.89 17.56L11.88 15.34L10.42 16.74C10.25 16.91 10.11 17.05 9.79 17.05L10 14.02L15.51 9.04C15.75 8.82 15.46 8.69 15.14 8.9L8.33 13.19L5.4 12.27C4.76 12.07 4.75 11.63 5.53 11.32L16.94 6.92C17.47 6.73 17.94 7.04 17.9 7.78Z"
      fill="white"
    />
  </svg>
);

interface ChannelCardProps {
  title: string;
  helper: string;
  icon: React.ReactNode;
  onClick: () => void;
  styleType: 'web' | 'telegram';
}

const ChannelCard: React.FC<ChannelCardProps> = ({
  title,
  helper,
  icon,
  onClick,
  styleType,
}) => {
  const styleByType = {
    web: {
      container:
        'border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-sky-50 hover:border-indigo-400 hover:shadow-indigo-100 dark:border-indigo-800/70 dark:from-indigo-950/50 dark:via-gray-900 dark:to-slate-900 dark:hover:border-indigo-500',
      iconWrap: 'bg-indigo-600 text-white dark:bg-indigo-500',
      badge:
        'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-900/70 dark:text-indigo-300 dark:ring-indigo-700/60',
      action:
        'text-indigo-700 group-hover:text-indigo-800 dark:text-indigo-300 dark:group-hover:text-indigo-200',
    },
    telegram: {
      container:
        'border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 hover:border-sky-400 hover:shadow-sky-100 dark:border-sky-800/70 dark:from-sky-950/50 dark:via-gray-900 dark:to-slate-900 dark:hover:border-sky-500',
      iconWrap: 'bg-sky-500 text-white dark:bg-sky-500',
      badge:
        'bg-sky-100 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-900/70 dark:text-sky-300 dark:ring-sky-700/60',
      action:
        'text-sky-700 group-hover:text-sky-800 dark:text-sky-300 dark:group-hover:text-sky-200',
    },
  } as const;

  const styles = styleByType[styleType];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${styles.container}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-lg shadow-sm ${styles.iconWrap}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">{helper}</p>
          </div>
        </div>
        <ExternalLink className={`h-4 w-4 ${styles.action}`} />
      </div>
    </button>
  );
};

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
        className={`group rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-600 via-indigo-600 to-sky-500 text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:from-indigo-700 hover:via-indigo-700 hover:to-sky-600 hover:shadow-lg dark:border-sky-400/30 dark:from-indigo-600 dark:via-indigo-600 dark:to-sky-500 ${className}`}
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
          <MessageCircle className="h-3.5 w-3.5" />
        </span>
        <span className="font-semibold tracking-wide">Ir al Chat</span>
        <ExternalLink className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </Button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Selecciona un canal" footer={modalFooter} size="md">
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">Elige una opcion para continuar.</p>

          <ChannelCard
            title="Chat Web"
            helper="Abrir en navegador"
            icon={<Globe className="h-5 w-5" />}
            onClick={() => openExternalLink(publicChatbotUrl)}
            styleType="web"
          />

          <ChannelCard
            title="Telegram"
            helper="Abrir en la app"
            icon={<TelegramIcon className="h-5 w-5" />}
            onClick={() => openExternalLink(telegramBotUrl)}
            styleType="telegram"
          />
        </div>
      </Modal>
    </>
  );
};

export default ChatAccessButton;
