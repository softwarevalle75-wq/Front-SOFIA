import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertCircle, Check } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import { ManualCita } from '@/types';
import { CitaService } from '@/services/cita.service';
import { historialService } from '@/services/historialService';
import { authService } from '@/services/auth.service';
import { useTheme } from '@/components/layout/MainLayout';

interface ReprogramarCitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  cita: ManualCita | null;
  onCitaReprogramada: () => void;
}

const ReprogramarCitaModal: React.FC<ReprogramarCitaModalProps> = ({
  isOpen,
  onClose,
  cita,
  onCitaReprogramada
}) => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [loadingDisponibilidad, setLoadingDisponibilidad] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevaHora, setNuevaHora] = useState('');
  const [disponibilidad, setDisponibilidad] = useState<{
    fechaDisponible: boolean;
    horasDisponibles: string[];
    motivoIndisponibilidad?: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (nuevaFecha && cita) {
      checkDisponibilidad();
    }
  }, [nuevaFecha]);

  const checkDisponibilidad = async () => {
    if (!nuevaFecha || !cita) return;

    setLoadingDisponibilidad(true);
    try {
      const disp = await CitaService.getDisponibilidad(nuevaFecha, cita.modalidad);
      setDisponibilidad(disp);
    } catch (err) {
      console.error('Error checking disponibilidad:', err);
    } finally {
      setLoadingDisponibilidad(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!nuevaFecha) {
      newErrors.fecha = 'La fecha es requerida';
    }
    if (!nuevaHora) {
      newErrors.hora = 'La hora es requerida';
    }

    if (disponibilidad && !disponibilidad.fechaDisponible) {
      newErrors.general = disponibilidad.motivoIndisponibilidad || 'Fecha no disponible';
    }

    if (nuevaFecha && nuevaHora && disponibilidad && !disponibilidad.horasDisponibles.includes(nuevaHora)) {
      newErrors.hora = 'La hora seleccionada no está disponible';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReprogramar = async () => {
    if (!cita || !validateForm()) return;

    setLoading(true);
    try {
      const currentUser = authService.getCurrentUser();
      const fechaAnterior = `${cita.fecha} ${cita.hora}`;

      const citaReprogramada = await CitaService.reasignarCita(cita.id, nuevaFecha, nuevaHora);
      
      historialService.registrarAccion({
        adminId: currentUser?.id || 'unknown',
        adminNombre: currentUser?.nombre || 'Admin',
        accion: 'Reprogramar',
        entidad: 'Cita',
        entidadId: cita.id,
        detalle: `${cita.estudianteNombre} - De ${fechaAnterior} a ${nuevaFecha} ${nuevaHora}`,
        tipo: 'reprogramar'
      });
      
      onCitaReprogramada();
      onClose();
      resetForm();
    } catch (err) {
      setError('Error al reprogramar la cita. Intenta de nuevo.');
      console.error('Error reprogramando cita:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNuevaFecha('');
    setNuevaHora('');
    setDisponibilidad(null);
    setError('');
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!cita) return null;

  const hoy = new Date().toISOString().split('T')[0];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reprogramar Cita" size="md">
      <div className="space-y-4">
        <div className={`p-4 rounded-lg border ${
          isDarkMode ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            <Clock className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
              isDarkMode ? 'text-amber-400' : 'text-amber-600'
            }`} />
            <div>
              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Reprogramar cita
              </p>
              <div className={`mt-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <p><strong>Estudiante:</strong> {cita.estudianteNombre}</p>
                <p><strong>Fecha actual:</strong> {cita.fecha} a las {cita.hora}</p>
                <p><strong>Modalidad:</strong> {cita.modalidad === 'presencial' ? 'Presencial' : 'Virtual'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Nueva Fecha <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={nuevaFecha}
              onChange={(e) => setNuevaFecha(e.target.value)}
              min={hoy}
              className={`w-full px-3 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              } ${errors.fecha ? 'border-red-500' : ''}`}
            />
            {errors.fecha && (
              <p className="text-red-500 text-xs mt-1">{errors.fecha}</p>
            )}
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Nueva Hora <span className="text-red-500">*</span>
            </label>
            <select
              value={nuevaHora}
              onChange={(e) => setNuevaHora(e.target.value)}
              disabled={!disponibilidad || !disponibilidad.fechaDisponible}
              className={`w-full px-3 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              } ${errors.hora ? 'border-red-500' : ''}`}
            >
              <option value="">Seleccionar hora</option>
              {disponibilidad?.horasDisponibles.map(hora => (
                <option key={hora} value={hora}>{hora}</option>
              ))}
            </select>
            {errors.hora && (
              <p className="text-red-500 text-xs mt-1">{errors.hora}</p>
            )}
          </div>
        </div>

        {loadingDisponibilidad && (
          <div className="flex items-center justify-center py-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
            <span className={`ml-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Verificando disponibilidad...
            </span>
          </div>
        )}

        {disponibilidad && !disponibilidad.fechaDisponible && (
          <div className={`p-3 rounded-lg border ${
            isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              <AlertCircle className={`w-5 h-5 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
              <span className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                {disponibilidad.motivoIndisponibilidad || 'Fecha no disponible'}
              </span>
            </div>
          </div>
        )}

        {disponibilidad && disponibilidad.fechaDisponible && nuevaFecha && (
          <div className={`p-3 rounded-lg border ${
            isDarkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center gap-2">
              <Check className={`w-5 h-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
              <span className={`text-sm ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                Fecha disponible. Selecciona una hora.
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className={`p-3 rounded-lg border ${
            isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'
          }`}>
            <span className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
              {error}
            </span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleReprogramar} disabled={loading || loadingDisponibilidad}>
            {loading ? 'Reprogramando...' : 'Confirmar Reprogramación'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ReprogramarCitaModal;
