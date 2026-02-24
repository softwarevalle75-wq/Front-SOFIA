import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LockOpen, Shield } from 'lucide-react';
import Button from '@/components/common/Button';
import { authService } from '@/services/auth.service';
import { APP_NAME } from '@/config/constants';
import { API_CONFIG } from '@/config/api.config';

const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [passwordActual, setPasswordActual] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (nuevaPassword !== confirmarPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (nuevaPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);

    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.CHANGE_PASSWORD}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          passwordActual,
          nuevaPassword,
          confirmarPassword,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Error al cambiar la contraseña');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-cover bg-center relative overflow-hidden" style={{ backgroundImage: 'url(/src/assets/logos/consul.png)' }}>
      <div className="min-h-screen w-full bg-blue-900/60 absolute inset-0" />

      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-white font-poppins drop-shadow-lg">
            {APP_NAME}
          </h1>
        </div>

        <div className="w-full max-w-md bg-black/50 backdrop-blur-md rounded-2xl border border-white/20 p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <Shield className="w-20 h-20 text-yellow-400" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2 text-center">
            Cambio de Contraseña
          </h2>
          <p className="text-white/60 text-sm mb-6 text-center">
            Es su primer ingreso. Debe cambiar su contraseña.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
              <p className="text-sm text-green-200">Contraseña cambiada exitosamente. Redirigiendo...</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-white text-sm font-medium mb-2">
                Contraseña Actual
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5 group-hover:text-white transition-colors" />
                <input
                  type="password"
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  placeholder="Ingrese su contraseña actual"
                  className="w-full bg-white/10 border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300 hover:bg-white/15 hover:border-white/30"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-white text-sm font-medium mb-2">
                Nueva Contraseña
              </label>
              <div className="relative group">
                <LockOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5 group-hover:text-white transition-colors" />
                <input
                  type="password"
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  placeholder="Ingrese nueva contraseña"
                  className="w-full bg-white/10 border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300 hover:bg-white/15 hover:border-white/30"
                  required
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-white text-sm font-medium mb-2">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5 group-hover:text-white transition-colors" />
                <input
                  type="password"
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  placeholder="Confirme nueva contraseña"
                  className="w-full bg-white/10 border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300 hover:bg-white/15 hover:border-white/30"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              className="bg-yellow-500 hover:bg-yellow-600 border-0"
            >
              Cambiar Contraseña
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
