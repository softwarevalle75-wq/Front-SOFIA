import React from 'react';
import { Calendar, Users, Video, XCircle } from 'lucide-react';
import { CitasStats } from '@/types';
import { useTheme } from '@/components/layout/MainLayout';

interface CitasBreakdownCardProps {
  stats: CitasStats;
  loading?: boolean;
}

const CitasBreakdownCard: React.FC<CitasBreakdownCardProps> = ({ 
  stats, 
  loading = false 
}) => {
  const { isDarkMode } = useTheme();
  const porcentajePresencial = Math.round((stats.agendadas.presencial / stats.agendadas.total) * 100);
  const porcentajeVirtual = Math.round((stats.agendadas.virtual / stats.agendadas.total) * 100);

  return (
    <div className={`rounded-lg shadow-md border p-6 transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-100'
    }`}>
      <div className="flex items-center justify-between mb-4">
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
              Resumen de citas agendadas
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className={`h-20 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}></div>
          <div className={`h-16 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm font-medium font-opensans ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Citas Agendadas
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold font-poppins ${
                  isDarkMode ? 'text-indigo-300' : 'text-indigo-600'
                }`}>
                  {stats.agendadas.total.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                  <span className={isDarkMode ? 'text-gray-300' : 'text-indigo-600'}>Presencial</span>
                </div>
                <div className="text-right">
                  <span className={`font-bold font-poppins ${
                    isDarkMode ? 'text-indigo-300' : 'text-indigo-600'
                  }`}>
                    {stats.agendadas.presencial.toLocaleString()}
                  </span>
                  <span className={`ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>({porcentajePresencial}%)</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className={isDarkMode ? 'text-gray-300' : 'text-indigo-600'}>Virtual</span>
                </div>
                <div className="text-right">
                  <span className={`font-bold font-poppins ${
                    isDarkMode ? 'text-indigo-300' : 'text-indigo-600'
                  }`}>
                    {stats.agendadas.virtual.toLocaleString()}
                  </span>
                  <span className={`ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>({porcentajeVirtual}%)</span>
                </div>
              </div>

              <div className={`w-full rounded-full h-2 mt-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div className="flex h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600"
                    style={{ width: `${porcentajePresencial}%` }}
                  />
                  <div 
                    className="bg-yellow-500"
                    style={{ width: `${porcentajeVirtual}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={`border-t pt-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isDarkMode ? 'bg-red-900/30' : 'bg-red-100'
                }`}>
                  <XCircle className={`w-4 h-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
                </div>
                <div>
                  <span className={`text-sm font-opensans ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Citas Canceladas</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xl font-bold font-poppins ${
                      isDarkMode ? 'text-red-400' : 'text-red-600'
                    }`}>
                      {stats.canceladas.toLocaleString()}
                    </span>
                    <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      ({Math.round((stats.canceladas / (stats.agendadas.total + stats.canceladas)) * 100)}% del total)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className={`text-center p-3 rounded-lg ${
              isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-50'
            }`}>
              <Users className={`w-5 h-5 mx-auto mb-1 ${
                isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
              }`} />
              <div className={`text-sm font-medium font-opensans ${
                isDarkMode ? 'text-indigo-300' : 'text-indigo-600'
              }`}>
                Tasa Agendamiento
              </div>
              <div className={`text-xs font-opensans ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {Math.round((stats.agendadas.total / (stats.agendadas.total + stats.canceladas)) * 100)}%
              </div>
            </div>
            
            <div className={`text-center p-3 rounded-lg ${
              isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'
            }`}>
              <Video className={`w-5 h-5 mx-auto mb-1 ${
                isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
              }`} />
              <div className={`text-sm font-medium font-opensans ${
                isDarkMode ? 'text-yellow-300' : 'text-indigo-600'
              }`}>
                Preferencia Virtual
              </div>
              <div className={`text-xs font-opensans ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {porcentajeVirtual}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitasBreakdownCard;
