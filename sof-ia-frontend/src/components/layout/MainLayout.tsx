import { ReactNode, useState, createContext, useContext, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import IdleTimeoutModal from '@/components/common/IdleTimeoutModal';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { authService } from '@/services/auth.service';

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  isCollapsed: false,
  setIsCollapsed: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleDarkMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('sofia-dark-mode');
    return saved ? JSON.parse(saved) : false;
  });

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleLogout = () => {
    authService.logout();
  };

  const { showWarning, remainingTime, resetTimer } = useIdleTimeout({
    timeout: 20 * 60 * 1000, // 20 minutos
    warningTime: 60 * 1000, // 1 minuto
    onTimeout: handleLogout,
  });

  useEffect(() => {
    localStorage.setItem('sofia-dark-mode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
        <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <Sidebar />
          <div 
            className={`flex flex-col transition-all duration-300 ${
              isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
            }`}
          >
            <Header />
            <main className={`flex-1 p-4 lg:p-6 overflow-auto transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
              {children}
            </main>
          </div>
        </div>
        
        <IdleTimeoutModal
          isOpen={showWarning}
          remainingTime={remainingTime}
          onStayActive={resetTimer}
          onLogout={handleLogout}
        />
      </ThemeContext.Provider>
    </SidebarContext.Provider>
  );
}
