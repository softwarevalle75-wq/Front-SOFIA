import React, { useState } from 'react';
import { Bell, User, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/auth.service';
import ChatAccessButton from '@/components/common/ChatAccessButton';
import NotificationBell from '@/components/notifications/NotificationBell';
import NotificationModal from '@/components/notifications/NotificationModal';
import { useTheme } from './MainLayout';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <>
      <header className={`border-b px-6 py-4 shadow-sm transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
      }`}>
        <div className="flex items-center justify-between">
          <div>
          </div>

          {/* Sección derecha - Usuario, notificaciones y chat */}
          <div className="flex items-center gap-4">
            {/* Botón de modo oscuro */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'hover:bg-gray-700 text-yellow-400' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title={isDarkMode ? 'Modo claro' : 'Modo oscuro'}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Sistema de notificaciones */}
            <NotificationBell onOpenHistory={() => navigate('/notificaciones')} />

            {/* Botón de acceso al chat */}
            <ChatAccessButton />

            {/* Información del usuario */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} font-opensans`}>
                  {user?.email}
                </p>
                <p className="text-xs text-yellow-600 font-poppins font-semibold">{user?.rol}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-full flex items-center justify-center shadow-md">
                <User className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />
    </>
  );
};

export default Header;
