import React, { useState, useEffect } from 'react';
import { Eye, Download, Trash2, AlertTriangle } from 'lucide-react';
import Card from '@/components/common/Card';
import SearchBar from '@/components/common/SearchBar';
import StatusBadge from '@/components/common/StatusBadge';
import Table, { TableColumn } from '@/components/common/Table';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import ChatFilters from '@/components/chat/ChatFilters';
import ChatSummaryModal from '@/components/chat/ChatSummaryModal';
import { ChatHistory, ChatFilters as ChatFiltersType } from '@/types';
import { useTheme } from '@/components/layout/MainLayout';
import { apiService } from '@/services/api.service';
import { API_CONFIG } from '@/config/api.config';

interface ConversacionAPI {
  id: string;
  temaLegal: string;
  consultorio: string | null;
  estado: string;
  canal: string;
  primerMensaje: string | null;
  resumen: string | null;
  createdAt: string;
  estudiante?: {
    id: string;
    nombre: string;
    documento: string;
  };
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const ChatHistoryPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  
  const [chatHistory, setChatHistory] = useState<ConversacionAPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ChatFiltersType>({});
  const [selectedChat, setSelectedChat] = useState<ChatHistory | undefined>(undefined);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<ConversacionAPI | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  });

  const loadConversaciones = async (
    page = 1,
    options?: {
      search?: string;
      filters?: ChatFiltersType;
    }
  ) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const activeSearch = options?.search ?? searchQuery;
      const activeFilters = options?.filters ?? filters;

      const params = new URLSearchParams();
      params.append('origen', 'chatbot');
      params.append('page', page.toString());
      params.append('pageSize', pagination.pageSize.toString());
      
      if (activeSearch) params.append('search', activeSearch);
      if (activeFilters.estado) params.append('estado', activeFilters.estado);
      if (activeFilters.casoLegal) params.append('tipoCaso', activeFilters.casoLegal);
      if (activeFilters.consultorioJuridico) params.append('consultorioJuridico', activeFilters.consultorioJuridico);
      if (activeFilters.fechaInicio) params.append('fechaInicio', activeFilters.fechaInicio);
      if (activeFilters.fechaFin) params.append('fechaFin', activeFilters.fechaFin);

      const response = await apiService.get<{
        success: boolean;
        data: ConversacionAPI[];
        pagination: PaginationInfo;
      }>(`${API_CONFIG.ENDPOINTS.CONVERSACIONES.BASE}?${params}`);

      if (response.success && response.data) {
        setChatHistory(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        setChatHistory([]);
        setErrorMessage('No fue posible obtener conversaciones desde la base de datos.');
      }
    } catch (error) {
      console.error('Error loading conversaciones:', error);
      setChatHistory([]);
      setErrorMessage('Error de conexion con el backend. Verifica que sof-ia-auth este corriendo.');
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersChange = (newFilters: ChatFiltersType) => {
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    loadConversaciones(1, { filters });
  };

  const handleClearFilters = () => {
    const emptyFilters: ChatFiltersType = {};
    setFilters(emptyFilters);
    loadConversaciones(1, { filters: emptyFilters });
  };

  const handleViewSummary = (chat: ConversacionAPI) => {
    const chatHistoryItem: ChatHistory = {
      id: chat.id,
      usuario: chat.estudiante?.nombre || 'Usuario',
      fecha: chat.createdAt,
      momento: chat.temaLegal,
      mensaje: chat.primerMensaje || '',
      estado: chat.estado === 'leido' ? 'leído' : 'no leído',
      consultorioJuridico: chat.consultorio || undefined
    };
    setSelectedChat(chatHistoryItem);
    setIsSummaryModalOpen(true);
  };

  const handleDeleteConversation = async (chat: ConversacionAPI) => {
    setChatToDelete(chat);
  };

  const confirmDeleteConversation = async () => {
    if (!chatToDelete) return;
    setIsDeleting(true);

    try {
      const response = await apiService.delete<{ success: boolean; message?: string }>(
        `${API_CONFIG.ENDPOINTS.CONVERSACIONES.BY_ID(chatToDelete.id)}?origen=chatbot`,
      );

      if (!response.success) {
        setErrorMessage(response.message || 'No fue posible eliminar la consulta.');
        return;
      }

      setChatHistory((prev) => prev.filter((item) => item.id !== chatToDelete.id));
      setChatToDelete(null);
    } catch (_error) {
      setErrorMessage('Error al eliminar la consulta. Intenta nuevamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    return date.toLocaleDateString('es-CO', { 
      day: 'numeric', 
      month: 'short', 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  };

  const getCanalIcon = (canal: string) => {
    return canal === 'whatsapp' ? '📱' : '💬';
  };

  useEffect(() => {
    loadConversaciones();
  }, []);

  const columns: TableColumn<ConversacionAPI>[] = [
    {
      key: 'usuario',
      header: 'Usuario',
      render: (chat: ConversacionAPI) => (
        <div>
          <div className={`font-semibold font-poppins ${isDarkMode ? 'text-indigo-300' : 'text-university-indigo'}`}>
            {chat.estudiante?.nombre || 'Usuario'}
          </div>
          <div className={`text-xs font-opensans ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {formatRelativeTime(chat.createdAt)} {getCanalIcon(chat.canal)}
          </div>
        </div>
      )
    },
    {
      key: 'temaLegal',
      header: 'Consulta',
      render: (chat: ConversacionAPI) => (
        <div className={`text-sm font-opensans max-w-xs truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
          {chat.temaLegal}
        </div>
      )
    },
    {
      key: 'consultorio',
      header: 'Consultorio',
      render: (chat: ConversacionAPI) => (
        <div className="text-sm">
          {chat.consultorio ? (
            <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
              isDarkMode 
                ? 'bg-indigo-900/50 text-indigo-300' 
                : 'bg-indigo-100 text-indigo-700'
            }`}>
              {chat.consultorio}
            </span>
          ) : (
            <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>No especificado</span>
          )}
        </div>
      )
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (chat: ConversacionAPI) => (
        <StatusBadge
          status={chat.estado === 'leido' ? 'Leído' : 'No leído'}
        />
      )
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (chat: ConversacionAPI) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleViewSummary(chat)}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'text-indigo-400 hover:bg-gray-700' 
                : 'text-university-indigo hover:bg-indigo-50'
            }`}
            title="Ver resumen"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'text-gray-400 hover:bg-gray-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Descargar chat"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteConversation(chat)}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode
                ? 'text-red-300 hover:bg-red-900/30'
                : 'text-red-600 hover:bg-red-50'
            }`}
            title="Eliminar consulta"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold font-poppins ${isDarkMode ? 'text-white' : 'text-indigo-600'}`}>
          Historial de Chats
        </h1>
        <p className={`mt-1 font-opensans ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Administra y visualiza el historial de conversaciones
        </p>
      </div>

      <ChatFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        loading={loading}
      />

      <Card>
        <SearchBar
          value={searchQuery}
          onChange={(value) => setSearchQuery(value)}
          placeholder="Buscar por usuario, consulta o mensaje..."
        />
      </Card>

      <Card>
        {errorMessage && (
          <div className={`mb-4 rounded-lg border px-4 py-3 text-sm font-opensans ${
            isDarkMode
              ? 'border-red-500/40 bg-red-900/20 text-red-200'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {errorMessage}
          </div>
        )}
        <Table
          columns={columns}
          data={chatHistory}
          loading={loading}
          emptyMessage="No se encontraron conversaciones con los filtros aplicados"
          pageSize={pagination.pageSize}
          currentPage={pagination.page}
          totalItems={pagination.total}
          onPageChange={(page) => loadConversaciones(page)}
          serverSidePagination
        />
      </Card>

      <ChatSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        chatHistory={selectedChat}
      />

      <Modal
        isOpen={Boolean(chatToDelete)}
        onClose={() => !isDeleting && setChatToDelete(null)}
        title="Confirmar eliminación"
        size="sm"
        closeOnOverlayClick={!isDeleting}
        footer={(
          <>
            <Button
              variant="secondary"
              onClick={() => setChatToDelete(null)}
              disabled={isDeleting}
            >
              Conservar consulta
            </Button>
            <Button
              variant="danger"
              onClick={confirmDeleteConversation}
              loading={isDeleting}
              disabled={isDeleting}
            >
              Eliminar consulta
            </Button>
          </>
        )}
      >
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 rounded-full p-2 ${isDarkMode ? 'bg-red-900/30' : 'bg-red-100'}`}>
            <AlertTriangle className={`w-5 h-5 ${isDarkMode ? 'text-red-300' : 'text-red-600'}`} />
          </div>
          <div className="space-y-2">
            <p className={isDarkMode ? 'text-gray-100' : 'text-gray-900'}>
              Vas a eliminar la consulta de <span className="font-semibold">{chatToDelete?.estudiante?.nombre || 'Usuario'}</span>.
            </p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Esta acción es permanente y no se puede deshacer.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ChatHistoryPage;
