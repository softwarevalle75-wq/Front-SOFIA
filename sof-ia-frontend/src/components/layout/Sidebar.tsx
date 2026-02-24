import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  ClipboardList, 
  GraduationCap,
  History,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { authService } from '@/services/auth.service';
import { useSidebar, useTheme } from './MainLayout';
import universityLogoWhite from '@/assets/logos/university-logo-blanco.png';
import sidebarBackground from '@/assets/logos/consul.png';

interface MenuItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

const Sidebar: React.FC = () => {
  const { isCollapsed, setIsCollapsed } = useSidebar();
  useTheme();

  const menuItems: MenuItem[] = [
    { name: 'Inicio', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Historial de Chats', path: '/chat-history', icon: MessageSquare },
    { name: 'Encuestas de Satisfacción', path: '/surveys', icon: ClipboardList },
    { name: 'Gestión de Estudiantes', path: '/students', icon: GraduationCap },
    { name: 'Historial', path: '/historial', icon: History },
  ];

  const handleLogout = () => {
    authService.logout();
  };

  return (
    <>
      {/* Sidebar para Desktop - Collapsible */}
      <div 
        className={`hidden lg:flex lg:flex-col fixed left-0 top-0 h-screen text-white shadow-2xl z-50 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(30, 58, 138, 0.85), rgba(30, 58, 138, 0.95)), url(${sidebarBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Header del Sidebar */}
        <div className={`py-6 border-b border-white/20 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          <div className={`flex ${isCollapsed ? 'flex-col' : 'flex-col items-center'}`}>
            {/* Botón toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="absolute -right-4 top-1/2 transform -translate-y-1/2 bg-indigo-500 rounded-full p-2.5 shadow-lg hover:bg-indigo-400 transition-all duration-200 border-2 border-white"
              style={{ zIndex: 60 }}
            >
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5 text-white" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-white" />
              )}
            </button>

            {/* Logo blanco */}
            <img 
              src={universityLogoWhite} 
              alt="Logo Universidad" 
              className={`object-contain transition-all duration-300 ${isCollapsed ? 'w-12 h-12' : 'w-20 h-20'}`}
            />

            {/* Título SOF-IA */}
            {!isCollapsed && (
              <h1 className="font-bold text-3xl text-white font-poppins mt-2">SOF-IA</h1>
            )}
          </div>
        </div>

        {/* Menú de navegación */}
        <nav className={`flex-1 py-6 space-y-2 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center rounded-lg transition-all duration-200 ${
                    isCollapsed 
                      ? 'justify-center py-3' 
                      : 'gap-3 px-4 py-3'
                  } ${
                    isActive
                      ? 'bg-yellow-500/80 text-indigo-900 shadow-lg font-semibold'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                  }`
                }
                title={isCollapsed ? item.name : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium font-opensans truncate">{item.name}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Botón de logout */}
        <div className={`border-t border-white/20 ${isCollapsed ? 'px-2' : 'p-4'}`}>
          <button
            onClick={handleLogout}
            className={`flex items-center rounded-lg w-full text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200 ${
              isCollapsed ? 'justify-center py-3' : 'gap-3 px-4 py-3'
            }`}
            title={isCollapsed ? 'Salir' : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && (
              <span className="text-sm font-medium font-opensans">Salir</span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <button
          className="p-3 bg-indigo-600 text-white rounded-lg shadow-lg"
          onClick={() => {
            const mobileSidebar = document.getElementById('mobile-sidebar');
            const mainContent = document.getElementById('main-content');
            if (mobileSidebar) {
              mobileSidebar.classList.toggle('hidden');
            }
            if (mainContent) {
              mainContent.classList.toggle('overflow-hidden');
            }
          }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Sidebar */}
        <div 
          id="mobile-sidebar"
          className="lg:hidden fixed inset-0 z-50 hidden"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(30, 58, 138, 0.9), rgba(30, 58, 138, 0.98)), url(${sidebarBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => {
            const mobileSidebar = document.getElementById('mobile-sidebar');
            const mainContent = document.getElementById('main-content');
            if (mobileSidebar) {
              mobileSidebar.classList.add('hidden');
            }
            if (mainContent) {
              mainContent.classList.remove('overflow-hidden');
            }
          }}
        ></div>
        
        <div className="absolute left-0 top-0 h-full w-64 text-white shadow-2xl">
          <div className="py-6 border-b border-white/20">
            <div className="flex items-center justify-between px-4">
              <div className="flex flex-col items-center flex-1">
                <h1 className="font-bold text-2xl text-white font-poppins mb-4">SOF-IA</h1>
                <img 
                  src={universityLogoWhite} 
                  alt="Logo Universidad" 
                  className="w-16 h-16 object-contain"
                />
              </div>
              
              <button
                onClick={() => {
                  const mobileSidebar = document.getElementById('mobile-sidebar');
                  const mainContent = document.getElementById('main-content');
                  if (mobileSidebar) {
                    mobileSidebar.classList.add('hidden');
                  }
                  if (mainContent) {
                    mainContent.classList.remove('overflow-hidden');
                  }
                }}
                className="p-2 text-white/80 hover:text-white absolute top-4 right-4"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    const mobileSidebar = document.getElementById('mobile-sidebar');
                    const mainContent = document.getElementById('main-content');
                    if (mobileSidebar) {
                      mobileSidebar.classList.add('hidden');
                    }
                    if (mainContent) {
                      mainContent.classList.remove('overflow-hidden');
                    }
                  }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-yellow-500/80 text-indigo-900 shadow-lg font-semibold'
                        : 'text-white/90 hover:bg-white/10 hover:text-white hover:translate-x-1'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium font-opensans">{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/20">
            <button
              onClick={() => {
                const mobileSidebar = document.getElementById('mobile-sidebar');
                const mainContent = document.getElementById('main-content');
                if (mobileSidebar) {
                  mobileSidebar.classList.add('hidden');
                }
                if (mainContent) {
                  mainContent.classList.remove('overflow-hidden');
                }
                handleLogout();
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200 hover:translate-x-1"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium font-opensans">Salir</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
