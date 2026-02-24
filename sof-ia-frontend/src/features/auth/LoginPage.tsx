import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import Button from '@/components/common/Button';
import universityLogoWhite from '/src/assets/logos/university-logo-blanco.png';
import loginBackground from '@/assets/logos/consul.png';
import { authService } from '@/services/auth.service';
import { APP_NAME, MESSAGES } from '@/config/constants';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authService.login(email, password);
      
      if (result.requiresPasswordChange) {
        navigate('/change-password');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || MESSAGES.LOGIN.ERROR;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-cover bg-center relative overflow-hidden" style={{ backgroundImage: `url(${loginBackground})` }}>
      {/* Overlay azul frío estático */}
      <div className="min-h-screen w-full bg-blue-900/60 absolute inset-0" />

      {/* Contenido principal */}
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
        {/* Título SOF-IA */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-white font-poppins drop-shadow-lg">
            {APP_NAME}
          </h1>
        </div>

        {/* Card glassmorphism */}
        <div className="w-full max-w-md bg-black/50 backdrop-blur-md rounded-2xl border border-white/20 p-8 shadow-2xl">
          {/* Logo blanco sin círculo */}
          <div className="flex justify-center mb-6">
            <img 
              src={universityLogoWhite} 
              alt="Logo Universidad" 
              className="w-36 h-36 object-contain"
            />
          </div>

          {/* Título */}
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Iniciar Sesión
          </h2>

          {/* Mensaje de error */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Input de email */}
            <div className="mb-4">
              <label className="block text-white text-sm font-medium mb-2">
                Correo Electrónico
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5 group-hover:text-white transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ingrese su correo"
                  className="w-full bg-white/10 border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/15 hover:border-white/30"
                  required
                />
              </div>
            </div>

            {/* Input de contraseña */}
            <div className="mb-6">
              <label className="block text-white text-sm font-medium mb-2">
                Contraseña
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5 group-hover:text-white transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingrese su contraseña"
                  className="w-full bg-white/10 border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/15 hover:border-white/30"
                  required
                />
              </div>
            </div>

            {/* Botón con efecto glow */}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              className="bg-blue-500 hover:bg-blue-600 border-0 relative overflow-hidden group"
              style={{
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
              }}
            >
              <span className="relative z-10">Iniciar Sesión</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 overflow-hidden">
                <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:left-[100%] transition-all duration-700" />
              </div>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
