import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import Card from '@/components/common/Card';
import { SurveyStats } from '@/types';
import { useTheme } from '@/components/layout/MainLayout';
import { apiService } from '@/services/api.service';
import { API_CONFIG } from '@/config/api.config';

interface EncuestaStats {
  calificacionPromedio: number;
  totalEncuestas: number;
  distribucion: Record<number, number>;
  comentarios: Array<{
    usuario: string;
    calificacion: number;
    comentario: string;
  }>;
}

const SurveysPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [stats, setStats] = useState<SurveyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadSurveyStats();
  }, []);

  const loadSurveyStats = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await apiService.get<{
        success: boolean;
        data: EncuestaStats;
      }>(API_CONFIG.ENDPOINTS.ENCUESTAS.STATS, { origen: 'chatbot' });

      if (response.success && response.data) {
        setStats({
          calificacionPromedio: response.data.calificacionPromedio,
          totalEncuestas: response.data.totalEncuestas,
          distribucion: response.data.distribucion,
          comentarios: response.data.comentarios || []
        });
      } else {
        setStats({
          calificacionPromedio: 0,
          totalEncuestas: 0,
          distribucion: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          comentarios: [],
        });
        setErrorMessage('No fue posible cargar los resultados de encuestas desde base de datos.');
      }
    } catch (error) {
      console.error('Error loading survey stats:', error);
      setStats({
        calificacionPromedio: 0,
        totalEncuestas: 0,
        distribucion: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        comentarios: [],
      });
      setErrorMessage('Error de conexión al cargar encuestas. Verifica el backend.');
    } finally {
      setLoading(false);
    }
  };

  const calcularPorcentaje = (count: number): string => {
    if (!stats) return '0';
    return ((count / stats.totalEncuestas) * 100).toFixed(0);
  };

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className={`h-8 rounded w-1/3 mb-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`h-48 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}></div>
            <div className={`h-48 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}></div>
          </div>
        </div>
      </div>
    );
  }

  const encuestasRespondidas = stats.totalEncuestas;
  const encuestasTotales = encuestasRespondidas;
  const porcentajeRespondidas = encuestasTotales > 0
    ? ((encuestasRespondidas / encuestasTotales) * 100).toFixed(0)
    : '0';

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Pantalla de resultados de Encuestas de Satisfacción
        </h1>
        <p className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Análisis de satisfacción del servicio
        </p>
        {errorMessage && (
          <div className={`mt-3 rounded-lg border px-4 py-3 text-sm ${
            isDarkMode
              ? 'border-red-500/40 bg-red-900/20 text-red-200'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {errorMessage}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Calificación promedio del servicio">
          <div className="text-center py-6">
            <div className={`text-6xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.calificacionPromedio}
            </div>
            <div className="flex items-center justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-6 h-6 ${
                    star <= Math.round(stats.calificacionPromedio)
                      ? 'fill-yellow-400 text-yellow-400'
                      : isDarkMode ? 'text-gray-600' : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>de 5</p>
          </div>
        </Card>

        <Card title="Distribución de Calificaciones">
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-20">
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{rating}</span>
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                </div>
                <div className={`flex-1 rounded-full h-4 overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div
                    className="h-full bg-yellow-400 rounded-full"
                    style={{ width: `${calcularPorcentaje(stats.distribucion[rating] || 0)}%` }}
                  />
                </div>
                <span className={`text-xs w-12 text-right ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {calcularPorcentaje(stats.distribucion[rating] || 0)}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Resumen de Respuestas">
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                {encuestasRespondidas}
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Encuestas respondidas ({porcentajeRespondidas}%)
              </div>
            </div>
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {encuestasTotales - encuestasRespondidas}
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Encuestas no respondidas ({(100 - parseFloat(porcentajeRespondidas)).toFixed(0)}%)
              </div>
            </div>
          </div>
        </Card>

        <Card title="Comentarios Recientes">
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {stats.comentarios && stats.comentarios.length > 0 ? (
              stats.comentarios.map((comentario, index) => (
                <div key={index} className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isDarkMode ? 'bg-indigo-700' : 'bg-indigo-600'
                    }`}>
                      <span className="text-white text-sm font-bold">
                        {comentario.usuario.charAt(0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${
                            star <= comentario.calificacion
                              ? 'fill-yellow-400 text-yellow-400'
                              : isDarkMode ? 'text-gray-600' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {comentario.comentario}
                  </p>
                </div>
              ))
            ) : (
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No hay comentarios aún
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SurveysPage;
