import React from 'react';
import { MessageCircle, ExternalLink } from 'lucide-react';
import Button from '@/components/common/Button';

interface ChatAccessButtonProps {
  className?: string;
}

const ChatAccessButton: React.FC<ChatAccessButtonProps> = ({ className = '' }) => {
  const publicChatbotUrl = 'https://universitariadecolombia.edu.co/consultorio-juridico';

  const openExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Button
      variant="primary"
      onClick={() => openExternalLink(publicChatbotUrl)}
      className={`group rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-600 via-indigo-600 to-sky-500 text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:from-indigo-700 hover:via-indigo-700 hover:to-sky-600 hover:shadow-lg dark:border-sky-400/30 dark:from-indigo-600 dark:via-indigo-600 dark:to-sky-500 ${className}`}
    >
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
        <MessageCircle className="h-3.5 w-3.5" />
      </span>
      <span className="font-semibold tracking-wide">Ir al Chat</span>
      <ExternalLink className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
    </Button>
  );
};

export default ChatAccessButton;
