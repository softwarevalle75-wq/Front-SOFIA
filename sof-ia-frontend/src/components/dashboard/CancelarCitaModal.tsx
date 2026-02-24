import React, { useState } from 'react';
import { XCircle, AlertTriangle } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import { ManualCita } from '@/types';
import { CitaService } from '@/services/cita.service';
import { historialService } from '@/services/historialService';
import { authService } from '@/services/auth.service';
import { useTheme } from '@/components/layout/MainLayout';

interface CancelarCitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  cita: ManualCita | null;
  onCitaCancelada: () => void;
}

const CancelarCitaModal: React.FC<CancelarCitaModalProps> = ({
  isOpen,
  onClose,
  cita,
  onCitaCancelada
}) => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const handleCancelar = async () => {
    if (!motivo.trim()) {
      setError('Por favor ingresa un motivo para cancelar la cita');
      return;
    }

    if (!cita) return;

    setLoading(true);
    try {
      const currentUser = authService.getCurrentUser();
      
      await CitaService.cancelarCita(cita.id, motivo);
      
      historialService.registrarAccion({
        adminId: currentUser?.id || 'unknown',
        adminNombre: currentUser?.nombre || 'Admin',
        accion: 'Cancelar',
        entidad: 'Cita',
        entidadId: cita.id,
        detalle: `${cita.estudianteNombre} - ${cita.fecha} ${cita.hora} - Motivo: ${motivo}`,
        tipo: 'cancelar'
      });
      
      onCitaCancelada();
      onClose();
      setMotivo('');
      setError('');
    } catch (err) {
      setError('Error al cancelar la cita. Intenta de nuevo.');
      console.error('Error cancelling cita:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMotivo('');
    setError('');
    onClose();
  };

  if (!cita) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Cancelar Cita" size="md">
      <div className="space-y-4">
        <div className={`p-4 rounded-lg border ${
          isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            <XCircle className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
              isDarkMode ? 'text-red-400' : 'text-red-600'
            }`} />
            <div>
              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                ¿Estás seguro de cancelar esta cita?
              </p>
              <div className={`mt-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <p><strong>Estudiante:</strong> {cita.estudianteNombre}</p>
                <p><strong>Fecha:</strong> {cita.fecha} a las {cita.hora}</p>
                <p><strong>Modalidad:</strong> {cita.modalidad === 'presencial' ? 'Presencial' : 'Virtual'}</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Motivo de cancelación <span className="text-red-500">*</span>
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ingresa el motivo por el cual se cancela esta cita..."
            className={`w-full px-3 py-2 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
            rows={3}
          />
          {error && (
            <p className="text-red-500 text-sm mt-1">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleCancelar} disabled={loading}>
            {loading ? 'Cancelando...' : 'Confirmar Cancelación'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CancelarCitaModal;
