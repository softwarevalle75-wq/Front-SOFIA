import React from 'react';
import { MessageCircle, ExternalLink } from 'lucide-react';
import Button from '@/components/common/Button';

interface ChatAccessButtonProps {
  className?: string;
}

/**
 * Componente de botón para acceder al chatbot de WhatsApp
 * Abre el chat en nueva pestaña
 */
const ChatAccessButton: React.FC<ChatAccessButtonProps> = ({ className = "" }) => {
  const handleChatAccess = () => {
    // Abrir en nueva pestaña
    window.open(
      import.meta.env.VITE_CHATBOT_URL || CHATBOT_CONFIG.WHATSAPP_URL, 
      '_blank'
    );
  };

  return (
    <Button 
      variant="primary" 
      onClick={handleChatAccess}
      className={`bg-green-600 hover:bg-green-700 text-white ${className}`}
    >
      <MessageCircle className="w-4 h-4 mr-2" />
      Ir al Chat
      <ExternalLink className="w-4 h-4 ml-2" />
    </Button>
  );
};

// Importar la configuración del chatbot
import { CHATBOT_CONFIG } from '@/config/constants';

export default ChatAccessButton;