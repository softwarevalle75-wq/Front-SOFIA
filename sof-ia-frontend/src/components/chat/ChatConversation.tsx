import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Flag, Send, AlertTriangle } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import { ChatMessage } from '@/types';
import { useTheme } from '@/components/layout/MainLayout';
import { historialService } from '@/services/historialService';
import { authService } from '@/services/auth.service';
import { apiService } from '@/services/api.service';
import { API_CONFIG } from '@/config/api.config';

interface ChatConversationProps {
  userName?: string;
  chatId?: string;
}

const ChatConversation: React.FC<ChatConversationProps> = ({
  userName = 'Usuario',
  chatId = '1'
}) => {
  const { isDarkMode } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [otherReason, setOtherReason] = useState<string>('');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadMessages = async () => {
      setLoadingMessages(true);
      setMessagesError('');
      try {
        const response = await apiService.get<{ success: boolean; data: Array<{ id: string; tipo: string; contenido: string; createdAt: string }> }>(
          `${API_CONFIG.ENDPOINTS.CONVERSACIONES.MENSAJES(chatId)}?origen=chatbot`
        );

        if (!response.success || !Array.isArray(response.data)) {
          setMessages([]);
          setMessagesError('No fue posible cargar los mensajes de esta conversacion.');
          return;
        }

        const mappedMessages: ChatMessage[] = response.data.map((msg) => ({
          id: msg.id,
          sender: msg.tipo === 'ia' ? 'ia' : 'user',
          text: msg.contenido || '',
          timestamp: new Date(msg.createdAt).toLocaleString('es-CO'),
          isReportable: msg.tipo === 'ia',
        }));

        setMessages(mappedMessages);
      } catch (error) {
        setMessages([]);
        setMessagesError('Error al cargar mensajes desde base de datos.');
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleOpenReport = (message: ChatMessage) => {
    setSelectedMessage(message);
    setReportModalOpen(true);
    setSelectedReason('');
    setOtherReason('');
    setReportSubmitted(false);
  };

  const handleSubmitReport = () => {
    const currentUser = authService.getCurrentUser();
    
    setReportSubmitted(true);
    
    if (selectedMessage) {
      historialService.registrarAccion({
        adminId: currentUser?.id || 'unknown',
        adminNombre: currentUser?.nombre || 'Admin',
        accion: 'Reportar',
        entidad: 'Mensaje Chat',
        entidadId: selectedMessage.id,
        detalle: `Mensaje reportado: "${selectedMessage.text.substring(0, 50)}..." - Razón: ${selectedReason === 'Otro' ? otherReason : selectedReason}`,
        tipo: 'reportar'
      });
    }
    
    setTimeout(() => {
      setReportModalOpen(false);
    }, 2000);
  };

  return (
    <div className={`h-full flex flex-col rounded-lg border transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      {/* Header del chat */}
      <div className={`flex items-center justify-between p-4 border-b ${
        isDarkMode ? 'border-gray-600' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <MessageCircle className={`w-5 h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
          </div>
          <div>
            <h3 className={`font-semibold font-poppins ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {userName}
            </h3>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Chat en vivo
            </p>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${
        isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
      }`}>
        {loadingMessages && (
          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Cargando mensajes...
          </p>
        )}

        {!loadingMessages && messagesError && (
          <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
            {messagesError}
          </p>
        )}

        {!loadingMessages && !messagesError && messages.length === 0 && (
          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Esta conversacion no tiene mensajes registrados.
          </p>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 relative group ${
                message.sender === 'user'
                  ? isDarkMode 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-indigo-600 text-white'
                  : isDarkMode 
                    ? 'bg-gray-600 text-gray-100 border border-gray-500' 
                    : 'bg-white text-gray-800 border border-gray-200'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              <p className={`text-xs mt-1 ${
                message.sender === 'user' ? 'text-indigo-200' : isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {message.timestamp}
              </p>
              {message.sender === 'ia' && message.isReportable && (
                <button
                  onClick={() => handleOpenReport(message)}
                  className={`absolute -top-2 -right-2 p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100 ${
                    isDarkMode 
                      ? 'bg-red-900/80 hover:bg-red-700' 
                      : 'bg-red-100 hover:bg-red-200'
                  }`}
                  title="Reportar mensaje como inapropiado"
                >
                  <Flag className={`w-3 h-3 ${
                    isDarkMode ? 'text-red-300' : 'text-red-600'
                  }`} />
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de mensaje */}
      <div className={`p-4 border-t ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Escribe un mensaje..."
            className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
          />
          <Button className="px-4">
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Modal de reporte */}
      <Modal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="Reportar Mensaje"
        size="sm"
      >
        {reportSubmitted ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-green-600" />
            </div>
            <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              Mensaje reportado exitosamente
            </p>
          </div>
        ) : (
          <>
            <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              ¿Por qué deseas reportar este mensaje?
            </p>
            <div className="space-y-2 mb-4">
              {['Contenido inapropiado', 'Spam', 'Información falsa', 'Otro'].map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="text-indigo-600"
                  />
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{reason}</span>
                </label>
              ))}
            </div>
            {selectedReason === 'Otro' && (
              <textarea
                placeholder="Especifica el motivo..."
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border mb-4 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                rows={3}
              />
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setReportModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleSubmitReport}>
                Reportar
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default ChatConversation;
