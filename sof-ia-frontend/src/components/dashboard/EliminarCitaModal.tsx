import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import { ManualCita } from '@/types';
import { CitaService } from '@/services/cita.service';
import { historialService } from '@/services/historialService';
import { authService } from '@/services/auth.service';
import { useTheme } from '@/components/layout/MainLayout';

interface EliminarCitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  cita: ManualCita | null;
  onCitaEliminada: () => void;
}

const EliminarCitaModal: React.FC<EliminarCitaModalProps> = ({
  isOpen,
  onClose,
  cita,
  onCitaEliminada,
}) => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEliminar = async () => {
    if (!cita) return;

    setLoading(true);
    setError('');

    try {
      const currentUser = authService.getCurrentUser();

      await CitaService.eliminarCita(cita.id);

      historialService.registrarAccion({
        adminId: currentUser?.id || 'unknown',
        adminNombre: currentUser?.nombre || 'Admin',
        accion: 'Eliminar',
        entidad: 'Cita',
        entidadId: cita.id,
        detalle: `${cita.estudianteNombre} - ${cita.fecha} ${cita.hora}`,
        tipo: 'eliminar',
      });

      onCitaEliminada();
      onClose();
    } catch (err) {
      setError('Error al eliminar la cita. Intenta de nuevo.');
      console.error('Error deleting cita:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!cita) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar Cita" size="md">
      <div className="space-y-4">
        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-start gap-3">
            <Trash2 className={`w-6 h-6 flex-shrink-0 mt-0.5 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
            <div>
              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                ¿Eliminar definitivamente esta cita?
              </p>
              <div className={`mt-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <p><strong>Estudiante:</strong> {cita.estudianteNombre}</p>
                <p><strong>Fecha:</strong> {cita.fecha} a las {cita.hora}</p>
                <p><strong>Modalidad:</strong> {cita.modalidad === 'presencial' ? 'Presencial' : 'Virtual'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${isDarkMode ? 'bg-yellow-900/20 text-yellow-200 border border-yellow-800' : 'bg-yellow-50 text-yellow-900 border border-yellow-200'}`}>
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          Esta acción no se puede deshacer.
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleEliminar} disabled={loading}>
            {loading ? 'Eliminando...' : 'Eliminar Cita'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EliminarCitaModal;
