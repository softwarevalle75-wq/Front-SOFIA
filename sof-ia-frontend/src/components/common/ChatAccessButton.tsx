import React from 'react';
import { MessageCircle, ExternalLink } from 'lucide-react';
import Button from '@/components/common/Button';

interface ChatAccessButtonProps {
  className?: string;
}

const ChatAccessButton: React.FC<ChatAccessButtonProps> = ({ className = '' }) => {
  const publicChatbotUrl = import.meta.env.VITE_PUBLIC_CHATBOT_URL || `${window.location.origin}/chatbot`;

  const handleOpenPublicChatbot = () => {
    window.open(publicChatbotUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Button
      variant="primary"
      onClick={handleOpenPublicChatbot}
      className={`bg-green-600 hover:bg-green-700 text-white ${className}`}
    >
      <MessageCircle className="w-4 h-4 mr-2" />
      Ir al Chat
      <ExternalLink className="w-4 h-4 ml-2" />
    </Button>
  );
};

export default ChatAccessButton;
