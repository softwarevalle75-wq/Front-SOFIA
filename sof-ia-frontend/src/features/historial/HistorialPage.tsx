import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Calendar, User, FileText, Plus, Edit, Trash2, CalendarPlus, CalendarX, Download, Upload, Flag, FileSpreadsheet } from 'lucide-react';
import Card from '@/components/common/Card';
import SearchBar from '@/components/common/SearchBar';
import Button from '@/components/common/Button';
import Table, { TableColumn } from '@/components/common/Table';
import { HistorialAccion } from '@/types';
import { historialService } from '@/services/historialService';
import { authService } from '@/services/auth.service';
import { exportService } from '@/services/exportService';
import { useTheme } from '@/components/layout/MainLayout';

const HistorialPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [historial, setHistorial] = useState<HistorialAccion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(500);
  const [totalItems, setTotalItems] = useState(0);
  const [mostrarTodo, setMostrarTodo] = useState(false);

  const cargarHistorial = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!authService.isAuthenticated()) {
        navigate('/login');
        return;
      }
      const data = await historialService.getHistorial({ limit: 2000 });
      setHistorial(data);
      setTotalItems(data.length);
    } catch (err: any) {
      console.error('Error al cargar historial:', err);
      if (err.response?.status === 401) {
        authService.logout();
        navigate('/login');
        return;
      }
      setError('Error al cargar el historial. Intenta de nuevo.');
      setHistorial([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, [navigate]);

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'crear':
        return <Plus className="w-4 h-4 text-green-500" />;
      case 'editar':
        return <Edit className="w-4 h-4 text-blue-500" />;
      case 'eliminar':
        return <Trash2 className="w-4 h-4 text-red-500" />;
      case 'agendar':
        return <CalendarPlus className="w-4 h-4 text-amber-500" />;
      case 'reprogramar':
        return <Calendar className="w-4 h-4 text-amber-500" />;
      case 'cancelar':
        return <CalendarX className="w-4 h-4 text-red-500" />;
      case 'importar':
        return <Upload className="w-4 h-4 text-purple-500" />;
      case 'exportar':
        return <Download className="w-4 h-4 text-indigo-500" />;
      case 'reportar':
        return <Flag className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTipoBadge = (tipo: string) => {
    const estilos: Record<string, string> = {
      crear: 'bg-green-100 text-green-800',
      editar: 'bg-blue-100 text-blue-800',
      eliminar: 'bg-red-100 text-red-800',
      agendar: 'bg-amber-100 text-amber-800',
      reprogramar: 'bg-orange-100 text-orange-800',
      cancelar: 'bg-red-100 text-red-800',
      importar: 'bg-purple-100 text-purple-800',
      exportar: 'bg-indigo-100 text-indigo-800',
      reportar: 'bg-red-100 text-red-800'
    };

    const labels: Record<string, string> = {
      crear: 'Crear',
      editar: 'Editar',
      eliminar: 'Eliminar',
      agendar: 'Agendar',
      reprogramar: 'Reprogramar',
      cancelar: 'Cancelar',
      importar: 'Importar',
      exportar: 'Exportar',
      reportar: 'Reportar'
    };

    return (
      <span className={`inline-flex items-center rounded-full text-xs font-medium px-2 py-1 ${estilos[tipo] || 'bg-gray-100 text-gray-800'}`}>
        {labels[tipo] || tipo}
      </span>
    );
  };

  const formatFecha = (fechaISO: string) => {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRelativeTime = (fechaISO: string) => {
    const fecha = new Date(fechaISO);
    const ahora = new Date();
    const diffMs = ahora.getTime() - fecha.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    return formatFecha(fechaISO);
  };

  const historialFiltrado = historial.filter(h => {
    const matchesSearch = !searchQuery || 
      h.adminNombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.detalle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.entidad.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTipo = !filtroTipo || h.tipo === filtroTipo;
    
    return matchesSearch && matchesTipo;
  });

  const handleExportExcel = () => {
    // Exportar TODO el historial (sin filtros)
    const data = historial.map(h => ({
      Fecha: new Date(h.fecha).toLocaleString('es-CO'),
      Admin: h.adminNombre,
      Acción: h.accion,
      Entidad: h.entidad,
      Detalle: h.detalle
    }));
    exportService.toExcel(data, 'historial_todo', 'Historial Completo');
    
    historialService.registrarAccion({
      adminId: authService.getCurrentUser()?.id || 'unknown',
      adminNombre: authService.getCurrentUser()?.nombre || 'Admin',
      accion: 'Exportar',
      entidad: 'Historial',
      detalle: `Exportó TODO el historial (${historial.length} acciones) a Excel`,
      tipo: 'exportar'
    });
  };

  const handleExportPDF = () => {
    // Exportar TODO el historial (sin filtros)
    const data = historial.map(h => ({
      Fecha: new Date(h.fecha).toLocaleString('es-CO'),
      Admin: h.adminNombre,
      Acción: h.accion,
      Entidad: h.entidad,
      Detalle: h.detalle
    }));
    exportService.toPDF(data, 'historial_todo', 'Historial Completo de Acciones - SOF-IA');
    
    historialService.registrarAccion({
      adminId: authService.getCurrentUser()?.id || 'unknown',
      adminNombre: authService.getCurrentUser()?.nombre || 'Admin',
      accion: 'Exportar',
      entidad: 'Historial',
      detalle: `Exportó TODO el historial (${historial.length} acciones) a PDF`,
      tipo: 'exportar'
    });
  };

  const handleToggleVerTodo = () => {
    setMostrarTodo(!mostrarTodo);
    setCurrentPage(1);
  };

  const columns: TableColumn<HistorialAccion>[] = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (item: HistorialAccion) => (
        <div>
          <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            {formatFecha(item.fecha)}
          </div>
        </div>
      )
    },
    {
      key: 'admin',
      header: 'Admin',
      render: (item: HistorialAccion) => (
        <div className="flex items-center gap-2">
          <User className={`w-4 h-4 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            {item.adminNombre}
          </span>
        </div>
      )
    },
    {
      key: 'tipo',
      header: 'Acción',
      render: (item: HistorialAccion) => (
        <div className="flex items-center gap-2">
          {getTipoIcon(item.tipo)}
          {getTipoBadge(item.tipo)}
        </div>
      )
    },
    {
      key: 'entidad',
      header: 'Entidad',
      render: (item: HistorialAccion) => (
        <span className={`text-sm font-medium ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
          {item.entidad}
        </span>
      )
    },
    {
      key: 'detalle',
      header: 'Detalle',
      render: (item: HistorialAccion) => (
        <div className={`text-sm max-w-4xl ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {item.detalle}
        </div>
      )
    }
  ];

  const tiposAccion = [
    { value: '', label: 'Todos' },
    { value: 'crear', label: 'Crear' },
    { value: 'editar', label: 'Editar' },
    { value: 'eliminar', label: 'Eliminar' },
    { value: 'agendar', label: 'Agendar' },
    { value: 'reprogramar', label: 'Reprogramar' },
    { value: 'cancelar', label: 'Cancelar' },
    { value: 'importar', label: 'Importar' },
    { value: 'exportar', label: 'Exportar' },
    { value: 'reportar', label: 'Reportar' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold font-poppins ${isDarkMode ? 'text-white' : 'text-university-indigo'}`}>
            Historial de Acciones
          </h1>
          <p className={`mt-1 font-opensans ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Registro de todas las acciones realizadas por administradores
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={mostrarTodo ? 'primary' : 'secondary'}
            size="sm"
            onClick={handleToggleVerTodo}
            className="flex items-center gap-1"
          >
            <Filter className="w-4 h-4" />
            {mostrarTodo ? `Ocultar (${historialFiltrado.length})` : `Ver todo (${historialFiltrado.length})`}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportExcel}
            className="flex items-center gap-1"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportPDF}
            className="flex items-center gap-1"
          >
            <FileText className="w-4 h-4" />
            PDF
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <SearchBar
              placeholder="Buscar por admin, detalle o entidad..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className={`px-3 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-800'
              }`}
            >
              {tiposAccion.map(tipo => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
            <Button 
              variant="secondary" 
              size="sm" 
              className="mt-2"
              onClick={cargarHistorial}
            >
              Reintentar
            </Button>
          </div>
        )}

        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`h-16 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
            ))}
          </div>
        ) : historialFiltrado.length === 0 ? (
          <div className="text-center py-12">
            <FileText className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {searchQuery || filtroTipo ? 'No se encontraron resultados' : 'No hay acciones registradas'}
            </p>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              {searchQuery || filtroTipo 
                ? 'Intenta con otros filtros de búsqueda' 
                : 'Las acciones del admin aparecerán aquí'}
            </p>
          </div>
        ) : (
          <div id="historial-table">
            <Table
              columns={columns}
              data={historialFiltrado}
              pageSize={mostrarTodo ? historialFiltrado.length : pageSize}
              currentPage={1}
              totalItems={historialFiltrado.length}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export default HistorialPage;
