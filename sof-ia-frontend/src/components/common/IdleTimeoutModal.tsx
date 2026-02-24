import React from 'react';
import { AlertTriangle, Clock, LogOut } from 'lucide-react';
import Button from '@components/common/Button';

interface IdleTimeoutModalProps {
  isOpen: boolean;
  remainingTime: number;
  onStayActive: () => void;
  onLogout: () => void;
}

const IdleTimeoutModal: React.FC<IdleTimeoutModalProps> = ({
  isOpen,
  remainingTime,
  onStayActive,
  onLogout,
}) => {
  if (!isOpen) return null;

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all">
        {/* Icono de advertencia */}
        <div className="flex justify-center mb-6">
          <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-full p-4">
            <AlertTriangle className="w-12 h-12 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>

        {/* Título */}
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
          Sesión por cerrar
        </h2>

        {/* Descripción */}
        <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
          Tu sesión está a punto de expirar por inactividad. ¿Deseas seguir conectado?
        </p>

        {/* Countdown */}
        <div className="flex items-center justify-center mb-6">
          <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" />
          <span className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {formatTime(remainingTime)}
          </span>
        </div>

        {/* Botones */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={onLogout}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </Button>
          <Button
            variant="primary"
            onClick={onStayActive}
            className="flex-1"
          >
            Seguir activo
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IdleTimeoutModal;
