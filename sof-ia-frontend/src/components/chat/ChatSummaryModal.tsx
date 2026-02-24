import React, { useState, useEffect } from 'react';
import { Bot, User, Clock, MessageSquare, MessageCircle } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import { ChatHistory, ChatSummary } from '@/types';
import ChatConversation from './ChatConversation';
import { useTheme } from '@/components/layout/MainLayout';
import { apiService } from '@/services/api.service';
import { API_CONFIG } from '@/config/api.config';

interface ChatSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatHistory?: ChatHistory;
}

const ChatSummaryModal: React.FC<ChatSummaryModalProps> = ({
  isOpen,
  onClose,
  chatHistory
}) => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [chatSummary, setChatSummary] = useState<ChatSummary | null>(null);
  const [summaryError, setSummaryError] = useState('');
  const [activeTab, setActiveTab] = useState<'conversation' | 'summary'>('conversation');

  const generarResumen = async () => {
    if (!chatHistory) return;

    setLoading(true);
    setSummaryError('');

    try {
      const response = await apiService.get<{
        success: boolean;
        data?: {
          id: string;
          temaLegal: string;
          consultorio: string | null;
          estado: string;
          canal: string;
          resumen: string | null;
          createdAt: string;
        };
      }>(`${API_CONFIG.ENDPOINTS.CONVERSACIONES.BY_ID(chatHistory.id)}?origen=chatbot`);

      if (!response.success || !response.data) {
        setSummaryError('No fue posible cargar el resumen desde base de datos.');
        setChatSummary(null);
        return;
      }

      const realSummary: ChatSummary = {
        id: response.data.id,
        usuario: chatHistory.usuario,
        fecha: response.data.createdAt || chatHistory.fecha,
        resumen: response.data.resumen || 'Aun no hay resumen generado para esta conversacion.',
        casoLegal: response.data.temaLegal || chatHistory.momento || 'No especificado',
        tipo: response.data.canal || 'web',
        estado: response.data.estado === 'leido' ? 'leído' : 'no leído',
        consultorioJuridico: response.data.consultorio || chatHistory.consultorioJuridico,
      };

      setChatSummary(realSummary);
    } catch (error) {
      setSummaryError('Error al consultar el resumen real de la conversacion.');
      setChatSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `Hace ${diffMins} minutos`;
    if (diffHours < 24) return `Hace ${diffHours} horas`;
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    return date.toLocaleDateString('es-CO', { 
      day: 'numeric', 
      month: 'short', 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  };

  useEffect(() => {
    if (isOpen && chatHistory) {
      generarResumen();
    }
  }, [isOpen, chatHistory]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="xl">
      <div className="space-y-4">
        <div className={`flex border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
          <button
            onClick={() => setActiveTab('conversation')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'conversation'
                ? 'border-indigo-500 text-indigo-500'
                : `border-transparent ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Conversación
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'summary'
                ? 'border-indigo-500 text-indigo-500'
                : `border-transparent ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`
            }`}
          >
            <Bot className="w-4 h-4" />
            Resumen IA
          </button>
        </div>

        {chatHistory && (
          <div>
            {activeTab === 'conversation' && (
              <ChatConversation 
                userName={chatHistory.usuario}
                chatId={chatHistory.id}
              />
            )}

            {activeTab === 'summary' && (
              <div className="space-y-6">
                <div className={`border rounded-lg p-4 ${
                  isDarkMode 
                    ? 'bg-indigo-900/20 border-indigo-700' 
                    : 'bg-indigo-50 border-indigo-100'
                }`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
                        isDarkMode ? 'bg-gray-700' : 'bg-white'
                      }`}>
                        <User className={`w-5 h-5 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-opensans ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Usuario</p>
                        <p className={`font-medium font-poppins ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>{chatHistory.usuario}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
                        isDarkMode ? 'bg-gray-700' : 'bg-white'
                      }`}>
                        <Clock className={`w-5 h-5 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-opensans ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Fecha</p>
                        <p className={`font-medium font-poppins ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
                          {formatRelativeTime(chatHistory.fecha)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className={`font-semibold font-poppins mb-2 flex items-center gap-2 ${
                    isDarkMode ? 'text-indigo-300' : 'text-indigo-600'
                  }`}>
                    <MessageSquare className="w-4 h-4" />
                    Consulta Original
                  </h3>
                  <div className={`border rounded-lg p-4 ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <p className={`text-sm font-opensans italic ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      "{chatHistory.momento}: {chatHistory.mensaje}"
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-university-indigo font-poppins mb-3 flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    Resumen Generado por IA
                  </h3>
                  
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center space-y-3">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-university-indigo/10 rounded-full">
                          <Bot className="w-6 h-6 text-university-indigo animate-pulse" />
                        </div>
                        <p className="text-sm text-gray-600 font-opensans">Generando resumen...</p>
                      </div>
                    </div>
                  ) : summaryError ? (
                    <div className={`rounded-lg border px-4 py-3 text-sm ${
                      isDarkMode
                        ? 'border-red-500/40 bg-red-900/20 text-red-200'
                        : 'border-red-200 bg-red-50 text-red-700'
                    }`}>
                      {summaryError}
                    </div>
                  ) : chatSummary ? (
                    <div className="space-y-4">
                      <div className="bg-success/5 border border-success/20 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                            <Bot className="w-4 h-4 text-success" />
                          </div>
                          <div>
                            <p className="text-sm text-success font-medium mb-2">Análisis del Caso</p>
                            <p className="text-sm text-gray-700 font-opensans leading-relaxed">
                              {chatSummary.resumen}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-university-indigo/5 border border-university-indigo/20 rounded-lg p-3">
                          <p className="text-xs text-university-indigo font-medium mb-1">Complejidad</p>
                          <p className="text-sm font-medium text-university-indigo font-poppins">Media</p>
                        </div>
                        
                        <div className="bg-warning/5 border border-warning/20 rounded-lg p-3">
                          <p className="text-xs text-warning font-medium mb-1">Prioridad</p>
                          <p className="text-sm font-medium text-warning font-poppins">Normal</p>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-700 font-medium mb-2">Recomendaciones</p>
                        <ul className="text-sm text-blue-600 space-y-1">
                          <li>• Agendar cita de seguimiento con especialista</li>
                          <li>• Preparar documentación relevante</li>
                          <li>• Evaluar posibles acciones legales inmediatas</li>
                        </ul>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cerrar
          </Button>
          
          {chatSummary && (
            <Button
              variant="primary"
              onClick={() => {}}
              className="flex items-center gap-2"
            >
              <Bot className="w-4 h-4" />
              Guardar Resumen
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ChatSummaryModal;
