import React, { useState, useEffect } from 'react';
import { Users, FileText, Calendar, XCircle, AlertCircle, CheckCircle, Award, FileSpreadsheet, FileText as FileTextIcon, Camera } from 'lucide-react';
import StatCard from '@components/common/StatCard';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import LineChart from '@components/charts/SimpleLineChart';
import BarChart from '@components/charts/SimpleBarChart';
import CitasListCard from '@components/dashboard/CitasListCard';
import ManualCitaModal from '@components/dashboard/ManualCitaModal';
import CancelarCitaModal from '@components/dashboard/CancelarCitaModal';
import ReprogramarCitaModal from '@components/dashboard/ReprogramarCitaModal';
import universityLogoWhite from '/src/assets/logos/university-logo-blanco.png';
import { DashboardStats, SystemStatus, SystemAlert, ManualCita, Student } from '../../types';
import { useTheme } from '@components/layout/MainLayout';
import { dashboardService } from '@services/dashboardService';
import { studentService } from '@services/studentService';
import { exportService } from '@services/exportService';
import { historialService } from '@services/historialService';
import { authService } from '@services/auth.service';

/**
 * Página del Dashboard Principal
 * Muestra estadísticas generales del sistema y gestión de citas
 */
const DashboardPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  
  // Estados para las estadísticas
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [usageData, setUsageData] = useState<Array<{ name: string; consultas: number }>>([]);
  const [growthData, setGrowthData] = useState<Array<{ name: string; value: number }>>([]);
  const [modalityData, setModalityData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [satisfactionData, setSatisfactionData] = useState<Array<{ name: string; rating: number }>>([]);

  // Estados para gestión de citas
  const [isManualCitaModalOpen, setIsManualCitaModalOpen] = useState(false);
  const [isCancelarModalOpen, setIsCancelarModalOpen] = useState(false);
  const [isReprogramarModalOpen, setIsReprogramarModalOpen] = useState(false);
  const [citaSeleccionada, setCitaSeleccionada] = useState<ManualCita | null>(null);
  const [estudiantes, setEstudiantes] = useState<Student[]>([]);
  const [refreshCitas, setRefreshCitas] = useState(0);

  // Estado/alertas sin datos demo
  const [systemAlerts] = useState<SystemAlert[]>([]);
  const systemStatus: SystemStatus = {
    operativo: !dashboardError,
    tiempoRespuesta: 0,
    incidencias: systemAlerts.length,
  };

  /**
   * Carga estadísticas del dashboard
   */
  const loadDashboardData = async () => {
    setLoadingStats(true);
    setDashboardError('');
    try {
      const [dashboardStats, chartStats, growthStats, modalityStats, satisfactionStats] = await Promise.all([
        dashboardService.getDashboardStats(selectedPeriod),
        dashboardService.getChartData(selectedPeriod),
        dashboardService.getGrowthData(selectedPeriod),
        dashboardService.getModalityDistribution(),
        dashboardService.getSatisfactionData()
      ]);
      
      setStats(dashboardStats);
      
      // Transformar datos para los gráficos
      const transformedUsageData = chartStats.map(stat => ({
        name: new Date(stat.date).toLocaleDateString('es', { month: 'short' }),
        consultas: stat.value
      }));
      setUsageData(transformedUsageData);
      setGrowthData(growthStats);
      setModalityData(modalityStats);
      setSatisfactionData(satisfactionStats);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setDashboardError('No fue posible cargar el dashboard desde base de datos. Intenta recargar en unos segundos.');
      setStats({
        totalUsers: 0,
        activeUsers: 0,
        totalConsultations: 0,
        pendingAppointments: 0,
        cancelledAppointments: 0,
        totalRevenue: 0,
        averageConsultationDuration: 0,
        consultationCount: 0,
        appointmentCount: 0,
        userCount: 0,
        activityChange: 0,
        appointmentsChange: 0,
        satisfactionRate: 0,
        retentionRate: 0,
        newUsersThisMonth: 0,
        revenueThisMonth: 0,
      });
      setUsageData([]);
      setGrowthData([]);
      setModalityData([]);
      setSatisfactionData([]);
    } finally {
      setLoadingStats(false);
    }
  };

  /**
   * Efecto para cargar datos al montar el componente y cambiar período
   */
  useEffect(() => {
    loadDashboardData();
    loadEstudiantes();
  }, [selectedPeriod]);

  const loadEstudiantes = async () => {
    try {
      const data = await studentService.getStudents();
      setEstudiantes(data);
    } catch (error) {
      console.error('Error loading estudiantes:', error);
    }
  };

  const handleNuevaCita = () => {
    setCitaSeleccionada(null);
    setIsManualCitaModalOpen(true);
  };

  const handleCitaCreada = () => {
    setRefreshCitas(prev => prev + 1);
  };

  const handleCancelarCita = (cita: ManualCita) => {
    setCitaSeleccionada(cita);
    setIsCancelarModalOpen(true);
  };

  const handleReprogramarCita = (cita: ManualCita) => {
    setCitaSeleccionada(cita);
    setIsReprogramarModalOpen(true);
  };

  const handleCitaCancelada = () => {
    setRefreshCitas(prev => prev + 1);
  };

  const handleCitaReprogramada = () => {
    setRefreshCitas(prev => prev + 1);
  };

  const handleExportExcel = () => {
    if (!stats) return;
    const data = [
      { Métrica: 'Total Usuarios', Valor: stats.totalUsers },
      { Métrica: 'Usuarios Activos', Valor: stats.activeUsers },
      { Métrica: 'Total Consultas', Valor: stats.totalConsultations },
      { Métrica: 'Citas Agendadas', Valor: stats.pendingAppointments },
      { Métrica: 'Citas Canceladas', Valor: stats.cancelledAppointments },
      { Métrica: 'Tasa de Satisfacción', Valor: `${stats.satisfactionRate}%` },
      { Métrica: 'Tasa de Retención', Valor: `${stats.retentionRate}%` },
    ];
    exportService.toExcel(data, 'dashboard_estadisticas', 'Estadísticas');
    
    const currentUser = authService.getCurrentUser();
    historialService.registrarAccion({
      adminId: currentUser?.id || 'unknown',
      adminNombre: currentUser?.nombre || 'Admin',
      accion: 'Exportar',
      entidad: 'Dashboard',
      detalle: 'Exportó estadísticas del dashboard a Excel',
      tipo: 'exportar'
    });
  };

  const handleExportPDF = () => {
    if (!stats) return;
    const data = [
      { Métrica: 'Total Usuarios', Valor: stats.totalUsers },
      { Métrica: 'Usuarios Activos', Valor: stats.activeUsers },
      { Métrica: 'Total Consultas', Valor: stats.totalConsultations },
      { Métrica: 'Citas Agendadas', Valor: stats.pendingAppointments },
      { Métrica: 'Citas Canceladas', Valor: stats.cancelledAppointments },
      { Métrica: 'Tasa de Satisfacción', Valor: `${stats.satisfactionRate}%` },
      { Métrica: 'Tasa de Retención', Valor: `${stats.retentionRate}%` },
    ];
    exportService.toPDF(data, 'dashboard_estadisticas', 'Estadísticas del Dashboard - SOF-IA');
    
    const currentUser = authService.getCurrentUser();
    historialService.registrarAccion({
      adminId: currentUser?.id || 'unknown',
      adminNombre: currentUser?.nombre || 'Admin',
      accion: 'Exportar',
      entidad: 'Dashboard',
      detalle: 'Exportó estadísticas del dashboard a PDF',
      tipo: 'exportar'
    });
  };

  const handleExportPNG = () => {
    const element = document.getElementById('dashboard-content');
    if (element) {
      exportService.toPNGElement(element, 'dashboard');
      
      const currentUser = authService.getCurrentUser();
      historialService.registrarAccion({
        adminId: currentUser?.id || 'unknown',
        adminNombre: currentUser?.nombre || 'Admin',
        accion: 'Exportar',
        entidad: 'Dashboard',
        detalle: 'Exportó dashboard a PNG',
        tipo: 'exportar'
      });
    }
  };

  if (loadingStats || !stats) {
    return (
      <div id="dashboard-content" className="space-y-6">
        <div className="animate-pulse">
          <div className={`h-8 rounded w-1/3 mb-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {[1,2,3].map(i => (
              <div key={i} className={`rounded-lg shadow-sm p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className={`h-4 rounded w-3/4 mb-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                <div className={`h-8 rounded w-1/2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="dashboard-content" className="space-y-6">
      {/* Banner central de SOF-IA */}
      {dashboardError && (
        <div className={`rounded-lg border px-4 py-3 text-sm font-opensans ${
          isDarkMode
            ? 'border-red-500/40 bg-red-900/20 text-red-200'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {dashboardError}
        </div>
      )}

      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-700 rounded-2xl p-8 shadow-lg">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 flex items-center justify-center">
              <img 
                src={universityLogoWhite} 
                alt="Logo Universidad" 
                className="w-20 h-20 object-contain"
              />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white font-poppins">BIENVENIDO A SOF-IA</h2>
              <p className="text-indigo-200 mt-1 font-opensans">Sistema de Gestión del Consultorio Jurídico</p>
              <p className="text-indigo-300 text-sm mt-2 font-opensans">Tu asistente inteligente para la administración académica</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white font-poppins">{stats.totalUsers}</div>
              <div className="text-indigo-200 text-sm font-opensans">Usuarios</div>
            </div>
            <div className="w-px h-12 bg-white/20"></div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white font-poppins">{stats.totalConsultations}</div>
              <div className="text-indigo-200 text-sm font-opensans">Consultas</div>
            </div>
            <div className="w-px h-12 bg-white/20"></div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white font-poppins">{stats.pendingAppointments}</div>
              <div className="text-indigo-200 text-sm font-opensans">Citas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Selector de período y título */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={`text-2xl font-bold font-poppins ${isDarkMode ? 'text-white' : 'text-university-indigo'}`}>Panel de Control</h1>
          <p className={`mt-1 font-opensans ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Resumen general del sistema</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4 sm:mt-0">
          <div className={`flex items-center space-x-2 rounded-lg p-1 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <button
              onClick={() => setSelectedPeriod('week')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedPeriod === 'week'
                  ? isDarkMode 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'bg-white text-blue-600 shadow-sm'
                  : isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setSelectedPeriod('month')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedPeriod === 'month'
                  ? isDarkMode 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'bg-white text-blue-600 shadow-sm'
                  : isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => setSelectedPeriod('year')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedPeriod === 'year'
                  ? isDarkMode 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'bg-white text-blue-600 shadow-sm'
                  : isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Año
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportExcel}
              className="flex items-center gap-1"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportPDF}
              className="flex items-center gap-1"
            >
              <FileTextIcon className="w-4 h-4" />
              PDF
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportPNG}
              className="flex items-center gap-1"
            >
              <Camera className="w-4 h-4" />
              Imagen
            </Button>
          </div>
        </div>
      </div>

      {/* Tarjetas de estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Usuarios Registrados"
          value={stats.totalUsers.toLocaleString()}
          icon={Users}
          iconColor={isDarkMode ? "text-gray-800" : "text-white"}
          iconBgColor={isDarkMode ? "bg-indigo-700" : "bg-indigo-500"}
          subtitle="Estudiantes y administradores activos"
          trend={{ value: stats.activityChange, isPositive: true }}
        />
        
        <StatCard
          title="Total de Consultas Realizadas"
          value={stats.totalConsultations.toLocaleString()}
          icon={FileText}
          iconColor={isDarkMode ? "text-gray-800" : "text-white"}
          iconBgColor={isDarkMode ? "bg-green-700" : "bg-green-500"}
          subtitle="Consultas jurídicas atendidas"
          trend={{ value: stats.activityChange, isPositive: true }}
        />
        
        <StatCard
          title="Citas Agendadas"
          value={stats.pendingAppointments.toLocaleString()}
          icon={Calendar}
          iconColor={isDarkMode ? "text-gray-800" : "text-white"}
          iconBgColor={isDarkMode ? "bg-amber-700" : "bg-amber-500"}
          subtitle={
            <div className="flex gap-4 mt-1">
              <span className={isDarkMode ? "text-green-400" : "text-green-600"}>
                📍 {modalityData.find(m => m.name === 'Presencial')?.value.toLocaleString() || 0} presencial
              </span>
              <span className={isDarkMode ? "text-blue-400" : "text-blue-600"}>
                💻 {modalityData.find(m => m.name === 'Virtual')?.value.toLocaleString() || 0} virtual
              </span>
            </div>
          }
          trend={{ value: stats.appointmentsChange, isPositive: true }}
        />

        <StatCard
          title="Citas Canceladas"
          value={stats.cancelledAppointments.toLocaleString()}
          icon={XCircle}
          iconColor={isDarkMode ? "text-gray-800" : "text-white"}
          iconBgColor={isDarkMode ? "bg-red-700" : "bg-red-500"}
          subtitle="Citas canceladas por usuarios"
          trend={{ value: Math.abs(stats.appointmentsChange), isPositive: stats.appointmentsChange >= 0 }}
        />
      </div>

      {/* Gestión de Citas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CitasListCard 
            onAgendarNueva={handleNuevaCita}
            onCancelarCita={handleCancelarCita}
            onReprogramarCita={handleReprogramarCita}
            refreshKey={refreshCitas}
          />
        </div>
        
        {/* Tarjeta lateral con stats de citas */}
        <div id="dashboard-content" className="space-y-6">
          <div className={`rounded-lg shadow-md border p-6 transition-colors ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
          }`}>
            <h3 className={`font-semibold font-poppins mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Resumen de Citas
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Agendadas</span>
                </div>
                <span className={`font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {stats.pendingAppointments}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Canceladas</span>
                </div>
                <span className={`font-bold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                  {stats.cancelledAppointments}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Total</span>
                <span className={`font-bold text-lg ${
                  isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                }`}>
                  {stats.pendingAppointments + stats.cancelledAppointments}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de uso del sistema */}
        <Card 
          title="Uso del Sistema (Consultas)" 
          subtitle="Consultas mensuales - Últimos 30 días"
        >
          <LineChart
            data={usageData}
            height={250}
            color="#1A1F71"
          />
        </Card>

        {/* Gráfico de crecimiento de usuarios */}
        <Card 
          title="Crecimiento de Usuarios" 
          subtitle="Nuevos usuarios registrados"
        >
        <BarChart
            data={growthData}
            height={250}
            color="#C9A227"
          />
        </Card>
      </div>

      {/* Gráficos adicionales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de distribución por modalidad */}
        <Card title="Distribución por Modalidad" subtitle="Presencial vs Virtual">
          <div className="space-y-4">
            {modalityData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: isDarkMode ? '#ffffff' : item.color }}
                  />
                  <span className={`font-medium font-poppins ${isDarkMode ? 'text-white' : 'text-indigo-600'}`}>{item.name}</span>
                </div>
                <div className="text-right">
                  <div className={`font-bold font-poppins ${isDarkMode ? 'text-white' : 'text-indigo-600'}`}>{item.value.toLocaleString()}</div>
                  <div className={`text-sm font-opensans ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {((item.value / stats.totalUsers) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
            {/* Barra visual de progreso */}
            <div className={`w-full rounded-full h-3 mt-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div className="flex h-3 rounded-full overflow-hidden">
                {modalityData.map((item, index) => (
                  <div
                    key={index}
                    className="h-full"
                    style={{
                      backgroundColor: isDarkMode ? '#ffffff' : item.color,
                      width: `${(item.value / stats.totalUsers) * 100}%`
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Gráfico de tasa de satisfacción */}
        <Card title="Tasa de Satisfacción" subtitle="Calificación promedio mensual (1-5)">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-university-yellow" />
                <span className="font-medium text-university-indigo font-poppins">Promedio General</span>
              </div>
              <div className="text-2xl font-bold text-university-indigo font-poppins">
                {(satisfactionData.reduce((acc, item) => acc + item.rating, 0) / satisfactionData.length).toFixed(1)}
                <span className="text-sm text-gray-500 font-opensans">/5.0</span>
              </div>
            </div>
            
            {/* Barras de calificación */}
            {satisfactionData.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="w-8 text-sm font-medium text-gray-600 font-opensans">{item.name}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-university-yellow h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(item.rating / 5) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-sm font-medium text-university-indigo font-poppins text-right">
                  {item.rating}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Estado del sistema y alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estado del sistema */}
        <Card title="Estado del Sistema">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {systemStatus.operativo ? (
                  <CheckCircle className="w-6 h-6 text-success" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-danger" />
                )}
                <span className="font-medium text-university-indigo font-poppins">
                  {systemStatus.operativo ? 'Operativo' : 'Fuera de servicio'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-t">
              <span className="text-sm text-gray-600 font-opensans">Tiempo Promedio de Respuesta IA</span>
              <span className="font-medium text-university-indigo font-poppins">
                {systemStatus.tiempoRespuesta > 0 ? `${systemStatus.tiempoRespuesta}s` : 'N/D'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-t">
              <span className="text-sm text-gray-600 font-opensans">Incidencias</span>
              <span className="font-medium text-university-indigo font-poppins">{systemStatus.incidencias}</span>
            </div>

            <div className="pt-2 border-t">
              <p className="text-xs text-gray-500 font-opensans">Ninguna incidencia reportada</p>
            </div>
          </div>
        </Card>

        {/* Alertas del sistema */}
        <Card title="Alertas del Sistema">
          {systemAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success" />
              <p className="font-opensans">No hay alertas activas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {systemAlerts.map((alert, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    alert.tipo === 'error' ? 'bg-red-50 border border-red-200' :
                    alert.tipo === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                    alert.tipo === 'info' ? 'bg-blue-50 border border-blue-200' :
                    'bg-green-50 border border-green-200'
                  }`}
                >
                  <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    alert.tipo === 'error' ? 'text-danger' :
                    alert.tipo === 'warning' ? 'text-warning' :
                    alert.tipo === 'info' ? 'text-info' :
                    'text-success'
                  }`} />
                  <p className="text-sm font-opensans">{alert.mensaje}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Modales de Citas */}
      <ManualCitaModal
        isOpen={isManualCitaModalOpen}
        onClose={() => setIsManualCitaModalOpen(false)}
        onCitaCreada={handleCitaCreada}
        estudiantes={estudiantes}
      />

      <CancelarCitaModal
        isOpen={isCancelarModalOpen}
        onClose={() => setIsCancelarModalOpen(false)}
        cita={citaSeleccionada}
        onCitaCancelada={handleCitaCancelada}
      />

      <ReprogramarCitaModal
        isOpen={isReprogramarModalOpen}
        onClose={() => setIsReprogramarModalOpen(false)}
        cita={citaSeleccionada}
        onCitaReprogramada={handleCitaReprogramada}
      />
    </div>
  );
};

export default DashboardPage;
