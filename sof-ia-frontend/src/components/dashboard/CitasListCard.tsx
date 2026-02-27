import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Video, XCircle, CheckCircle, Plus, Edit, FileSpreadsheet, FileText, Camera } from 'lucide-react';
import Button from '@/components/common/Button';
import { ManualCita } from '@/types';
import { CitaService } from '@/services/cita.service';
import { historialService } from '@/services/historialService';
import { authService } from '@/services/auth.service';
import { exportService } from '@/services/exportService';
import { useTheme } from '@/components/layout/MainLayout';

interface CitasListCardProps {
  loading?: boolean;
  onAgendarNueva?: () => void;
  onCancelarCita?: (cita: ManualCita) => void;
  onReprogramarCita?: (cita: ManualCita) => void;
  refreshKey?: number;
}

const CitasListCard: React.FC<CitasListCardProps> = ({ 
  loading = false,
  onAgendarNueva,
  onCancelarCita,
  onReprogramarCita,
  refreshKey = 0
}) => {
  const { isDarkMode } = useTheme();
  const [citas, setCitas] = useState<ManualCita[]>([]);
  const [loadingCitas, setLoadingCitas] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'agendada' | 'cancelada' | 'completada'>('todas');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;

  useEffect(() => {
    cargarCitas();
  }, [refreshKey]);

  const cargarCitas = async () => {
    setLoadingCitas(true);
    try {
      const data = await CitaService.getCitas({ origen: 'sistema' });
      setCitas(data);
    } catch (error) {
      console.error('Error loading citas:', error);
    } finally {
      setLoadingCitas(false);
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'agendada':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelada':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'completada':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEstadoBadge = (estado: string) => {
    const estilos: Record<string, string> = {
      agendada: 'bg-green-100 text-green-800',
      cancelada: 'bg-red-100 text-red-800',
      completada: 'bg-blue-100 text-blue-800'
    };
    const labels: Record<string, string> = {
      agendada: 'Agendada',
      cancelada: 'Cancelada',
      completada: 'Completada'
    };
    return (
      <span className={`inline-flex items-center rounded-full text-xs font-medium px-2 py-1 ${estilos[estado] || 'bg-gray-100 text-gray-800'}`}>
        {labels[estado] || estado}
      </span>
    );
  };

  const getModalidadIcon = (modalidad: string) => {
    return modalidad === 'presencial' 
      ? <Users className="w-4 h-4" />
      : <Video className="w-4 h-4" />;
  };

  const handleExportExcel = () => {
    const data = citasFiltradas.map(c => ({
      Usuario: c.usuarioNombre || 'Usuario no registrado',
      Estudiante: c.estudianteNombre,
      'Fecha y hora de la cita': `${c.fecha} ${c.hora}`,
      Modalidad: c.modalidad === 'presencial' ? 'Presencial' : 'Virtual',
      Estado: c.estado === 'agendada' ? 'Agendada' : c.estado === 'cancelada' ? 'Cancelada' : 'Completada',
      Motivo: c.motivo
    }));
    exportService.toExcel(data, 'citas', 'Citas');
    
    const currentUser = authService.getCurrentUser();
    historialService.registrarAccion({
      adminId: currentUser?.id || 'unknown',
      adminNombre: currentUser?.nombre || 'Admin',
      accion: 'Exportar',
      entidad: 'Cita',
      detalle: `Exportó ${citasFiltradas.length} citas a Excel`,
      tipo: 'exportar'
    });
  };

  const handleExportPDF = () => {
    const data = citasFiltradas.map(c => ({
      Usuario: c.usuarioNombre || 'Usuario no registrado',
      Estudiante: c.estudianteNombre,
      'Fecha y hora de la cita': `${c.fecha} ${c.hora}`,
      Modalidad: c.modalidad,
      Estado: c.estado,
      Motivo: c.motivo
    }));
    exportService.toPDF(data, 'citas', 'Lista de Citas - SOF-IA');
    
    const currentUser = authService.getCurrentUser();
    historialService.registrarAccion({
      adminId: currentUser?.id || 'unknown',
      adminNombre: currentUser?.nombre || 'Admin',
      accion: 'Exportar',
      entidad: 'Cita',
      detalle: `Exportó ${citasFiltradas.length} citas a PDF`,
      tipo: 'exportar'
    });
  };

  const handleExportPNG = () => {
    const element = document.getElementById('citas-list');
    if (element) {
      exportService.toPNGElement(element, 'citas');
      
      const currentUser = authService.getCurrentUser();
      historialService.registrarAccion({
        adminId: currentUser?.id || 'unknown',
        adminNombre: currentUser?.nombre || 'Admin',
        accion: 'Exportar',
        entidad: 'Cita',
        detalle: 'Exportó lista de citas a PNG',
        tipo: 'exportar'
      });
    }
  };

  const citasFiltradas = citas.filter(cita => {
    if (filtroEstado === 'todas') return true;
    return cita.estado === filtroEstado;
  });

  const totalItems = citasFiltradas.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const paginatedCitas = citasFiltradas.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroEstado, refreshKey]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div id="citas-list" className={`rounded-lg shadow-md border p-6 transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-100'
    }`}>
      <div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isDarkMode ? 'bg-indigo-900/50' : 'bg-indigo-100'
          }`}>
            <Calendar className={`w-5 h-5 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`} />
          </div>
          <div>
            <h3 className={`font-semibold font-poppins text-lg ${
              isDarkMode ? 'text-white' : 'text-indigo-600'
            }`}>
              Gestión de Citas
            </h3>
            <p className={`text-sm font-opensans ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Lista de citas agendadas
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <div className="flex flex-wrap gap-2 md:justify-end">
            <Button variant="primary" size="sm" onClick={onAgendarNueva} aria-label="Crear nueva cita">
              <Plus className="w-4 h-4" />
              Nueva Cita
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportExcel}
              title="Exportar lista de citas a Excel"
              aria-label="Exportar lista de citas a Excel"
              className="min-w-[136px]"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Excel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportPDF}
              title="Exportar lista de citas a PDF"
              aria-label="Exportar lista de citas a PDF"
              className="min-w-[128px]"
            >
              <FileText className="w-4 h-4" />
              Exportar PDF
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportPNG}
              title="Exportar lista de citas a imagen"
              aria-label="Exportar lista de citas a imagen"
              className="min-w-[146px]"
            >
              <Camera className="w-4 h-4" />
              Exportar imagen
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setFiltroEstado('todas')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filtroEstado === 'todas'
              ? isDarkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white'
              : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFiltroEstado('agendada')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filtroEstado === 'agendada'
              ? isDarkMode ? 'bg-green-600 text-white' : 'bg-green-600 text-white'
              : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Agendadas
        </button>
        <button
          onClick={() => setFiltroEstado('cancelada')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filtroEstado === 'cancelada'
              ? isDarkMode ? 'bg-red-600 text-white' : 'bg-red-600 text-white'
              : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Canceladas
        </button>
      </div>

      {loadingCitas ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-16 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`} />
          ))}
        </div>
      ) : citasFiltradas.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            No hay citas {filtroEstado !== 'todas' ? filtroEstado === 'agendada' ? 'agendadas' : 'canceladas' : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedCitas.map(cita => (
            <div 
              key={cita.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700/50 border-gray-600' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  cita.estado === 'agendada' 
                    ? isDarkMode ? 'bg-green-900/30' : 'bg-green-100'
                    : cita.estado === 'cancelada'
                    ? isDarkMode ? 'bg-red-900/30' : 'bg-red-100'
                    : isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'
                }`}>
                  {getEstadoIcon(cita.estado)}
                </div>
                <div>
                  <div className={`font-medium font-poppins ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    Usuario: {cita.usuarioNombre || 'Usuario no registrado'}
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Estudiante asignado: {cita.estudianteNombre}
                  </div>
                  <div className={`text-sm flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Calendar className="w-3 h-3" />
                    {cita.fecha} a las {cita.hora}
                    <span className="mx-1">•</span>
                    <span className="flex items-center gap-1">
                      {getModalidadIcon(cita.modalidad)}
                      {cita.modalidad === 'presencial' ? 'Presencial' : 'Virtual'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getEstadoBadge(cita.estado)}
                {cita.estado === 'agendada' && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => onReprogramarCita?.(cita)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDarkMode 
                          ? 'text-gray-400 hover:bg-gray-600 hover:text-white' 
                          : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                      }`}
                      title="Reprogramar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onCancelarCita?.(cita)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDarkMode 
                          ? 'text-red-400 hover:bg-red-900/30' 
                          : 'text-red-500 hover:bg-red-50'
                      }`}
                      title="Cancelar"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {totalItems > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between">
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Mostrando {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, totalItems)} de {totalItems} citas
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 text-sm rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDarkMode
                      ? 'border-indigo-500 text-indigo-300 hover:bg-indigo-600/20'
                      : 'border-indigo-300 text-indigo-700 hover:bg-indigo-50'
                  }`}
                >
                  Anterior
                </button>
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  className={`px-3 py-1 text-sm rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDarkMode
                      ? 'border-indigo-500 text-indigo-300 hover:bg-indigo-600/20'
                      : 'border-indigo-300 text-indigo-700 hover:bg-indigo-50'
                  }`}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CitasListCard;
