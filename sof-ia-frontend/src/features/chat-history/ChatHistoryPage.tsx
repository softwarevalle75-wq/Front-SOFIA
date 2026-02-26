import React, { useState, useEffect } from 'react';
import { Eye, Download, Filter } from 'lucide-react';
import Card from '@/components/common/Card';
import SearchBar from '@/components/common/SearchBar';
import StatusBadge from '@/components/common/StatusBadge';
import Table, { TableColumn } from '@/components/common/Table';
import Button from '@/components/common/Button';
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
  const [mostrarTodo, setMostrarTodo] = useState(false);
  const [filteredHistory, setFilteredHistory] = useState<ConversacionAPI[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 500,
    total: 0,
    totalPages: 0
  });

  const loadConversaciones = async (page = 1) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const params = new URLSearchParams();
      params.append('origen', 'chatbot');
      params.append('page', page.toString());
      params.append('pageSize', mostrarTodo ? '1000' : pagination.pageSize.toString());
      
      if (searchQuery) params.append('search', searchQuery);
      if (filters.estado) params.append('estado', filters.estado);
      if (filters.casoLegal) params.append('canal', filters.casoLegal);
      if (filters.fechaInicio) params.append('fechaInicio', filters.fechaInicio);
      if (filters.fechaFin) params.append('fechaFin', filters.fechaFin);

      const response = await apiService.get<{
        success: boolean;
        data: ConversacionAPI[];
        pagination: PaginationInfo;
      }>(`${API_CONFIG.ENDPOINTS.CONVERSACIONES.BASE}?${params}`);

      if (response.success && response.data) {
        setChatHistory(response.data);
        setFilteredHistory(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        setChatHistory([]);
        setFilteredHistory([]);
        setErrorMessage('No fue posible obtener conversaciones desde la base de datos.');
      }
    } catch (error) {
      console.error('Error loading conversaciones:', error);
      setChatHistory([]);
      setFilteredHistory([]);
      setErrorMessage('Error de conexion con el backend. Verifica que sof-ia-auth este corriendo.');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let filtered = [...chatHistory];

    if (searchQuery) {
      filtered = filtered.filter(chat => 
        chat.temaLegal.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.estudiante?.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (chat.primerMensaje && chat.primerMensaje.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (chat.consultorio && chat.consultorio.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (filters.casoLegal) {
      filtered = filtered.filter(chat => chat.canal === filters.casoLegal);
    }

    if (filters.consultorioJuridico) {
      filtered = filtered.filter(chat => 
        chat.consultorio?.toLowerCase().includes(filters.consultorioJuridico!.toLowerCase())
      );
    }

    if (filters.estado) {
      filtered = filtered.filter(chat => chat.estado === filters.estado);
    }

    setFilteredHistory(filtered);
  };

  const handleFiltersChange = (newFilters: ChatFiltersType) => {
    setFilters(newFilters);
  };

  const handleToggleVerTodo = () => {
    setMostrarTodo(!mostrarTodo);
    loadConversaciones(1);
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

  useEffect(() => {
    aplicarFiltros();
  }, [searchQuery, filters, chatHistory]);

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
        loading={loading}
      />

      <Card>
        <SearchBar
          value={searchQuery}
          onChange={(value) => setSearchQuery(value)}
          placeholder="Buscar por usuario, consulta o mensaje..."
        />
      </Card>

      <div className="flex justify-end mb-2">
        <Button
          variant={mostrarTodo ? 'primary' : 'secondary'}
          size="sm"
          onClick={handleToggleVerTodo}
          className="flex items-center gap-1"
        >
          <Filter className="w-4 h-4" />
          {mostrarTodo ? `Ocultar (${filteredHistory.length})` : `Ver todo (${filteredHistory.length})`}
        </Button>
      </div>

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
          data={filteredHistory}
          loading={loading}
          emptyMessage="No se encontraron conversaciones con los filtros aplicados"
          pageSize={mostrarTodo ? filteredHistory.length : pagination.pageSize}
          currentPage={1}
          totalItems={pagination.total}
          onPageChange={(page) => loadConversaciones(page)}
        />
      </Card>

      <ChatSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        chatHistory={selectedChat}
      />
    </div>
  );
};

export default ChatHistoryPage;
