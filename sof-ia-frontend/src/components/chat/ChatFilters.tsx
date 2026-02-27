import React, { useState } from 'react';
import { Filter, Calendar, Tag, MessageSquare } from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { ChatFilters } from '@/types';
import { useTheme } from '@/components/layout/MainLayout';

interface ChatFiltersComponentProps {
  filters: ChatFilters;
  onFiltersChange: (filters: ChatFilters) => void;
  onApplyFilters?: () => void;
  onClearFilters?: () => void;
  loading?: boolean;
}

const ChatFiltersComponent: React.FC<ChatFiltersComponentProps> = ({
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  loading = false
}) => {
  const { isDarkMode } = useTheme();
  const [showAdvanced, setShowAdvanced] = useState(true);

  const casosLegales = [
    { value: '', label: 'Todos los casos' },
    { value: 'familia-alimentos', label: 'Familia-alimentos' },
    { value: 'laboral', label: 'Derecho Laboral' },
    { value: 'penal', label: 'Derecho Penal' },
    { value: 'civil', label: 'Derecho Civil' },
    { value: 'constitucional', label: 'Constitucional' },
    { value: 'administrativo', label: 'Derecho Administrativo' },
    { value: 'conciliacion', label: 'Conciliación' },
    { value: 'transito', label: 'Tránsito' },
    { value: 'disciplinario', label: 'Disciplinario' },
    { value: 'responsabilidad-fiscal', label: 'Responsabilidad fiscal' },
    { value: 'comercial', label: 'Derecho Comercial' },
  ];

  const handleFilterChange = (field: keyof ChatFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [field]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
    onClearFilters?.();
  };

  const applyFilters = () => {
    onApplyFilters?.();
  };

  const labelClass = isDarkMode 
    ? 'text-indigo-300' 
    : 'text-university-indigo';
    
  const selectClass = isDarkMode 
    ? 'bg-gray-700 border-gray-600 text-white' 
    : 'bg-white border-gray-300';

  return (
    <div className={`rounded-lg p-4 space-y-4 border transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gray-800 border-gray-600' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className={`w-4 h-4 ${labelClass}`} />
          <h3 className={`font-semibold font-poppins ${labelClass}`}>Filtros Avanzados</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={isDarkMode ? 'text-indigo-300 hover:text-white' : 'text-university-indigo'}
        >
          {showAdvanced ? 'Ocultar' : 'Mostrar'} filtros
        </Button>
      </div>

      <div className={`space-y-4 border-t pt-4 ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <Calendar className={`w-4 h-4 ${labelClass}`} />
          <h4 className={`font-semibold font-poppins ${labelClass}`}>Filtros por Fecha y Tipo de Caso</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${labelClass}`}>
              <Calendar className="w-4 h-4" />
              Fecha Inicio
            </label>
            <Input
              type="date"
              name="fechaInicio"
              value={filters.fechaInicio || ''}
              onChange={(e) => handleFilterChange('fechaInicio', e.target.value)}
              placeholder="Desde"
            />
          </div>

          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${labelClass}`}>
              <Calendar className="w-4 h-4" />
              Fecha Fin
            </label>
            <Input
              type="date"
              name="fechaFin"
              value={filters.fechaFin || ''}
              onChange={(e) => handleFilterChange('fechaFin', e.target.value)}
              placeholder="Hasta"
            />
          </div>

          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${labelClass}`}>
              <Tag className="w-4 h-4" />
              Tipo de Caso
            </label>
            <select
              name="casoLegal"
              value={filters.casoLegal || ''}
              onChange={(e) => handleFilterChange('casoLegal', e.target.value)}
              className={`w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-opensans ${selectClass}`}
            >
              {casosLegales.map(caso => (
                <option key={caso.value} value={caso.value}>
                  {caso.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${labelClass}`}>
              <Tag className="w-4 h-4" />
              Consultorio Jurídico
            </label>
            <Input
              name="consultorioJuridico"
              value={filters.consultorioJuridico || ''}
              onChange={(e) => handleFilterChange('consultorioJuridico', e.target.value)}
              placeholder="Ej: Derecho de Familia"
            />
          </div>
        </div>
      </div>

      {showAdvanced && (
        <div className={`space-y-4 border-t pt-4 ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <Filter className={`w-4 h-4 ${labelClass}`} />
            <h4 className={`font-semibold font-poppins ${labelClass}`}>Filtros Adicionales</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${labelClass}`}>
                <MessageSquare className="w-4 h-4" />
                Estado
              </label>
              <select
                name="estado"
                value={filters.estado || ''}
                onChange={(e) => handleFilterChange('estado', e.target.value)}
                className={`w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-opensans ${selectClass}`}
              >
                <option value="">Todos los estados</option>
                <option value="leido">Leído</option>
                <option value="no_leido">No leído</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 md:col-span-2">
            <Button
              variant="secondary"
              onClick={clearFilters}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Limpiar Filtros
            </Button>
            
            <Button
              variant="primary"
              onClick={applyFilters}
              loading={loading}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Aplicar Filtros
            </Button>
          </div>
        </div>
      )}

      {!showAdvanced && (
        <div className="flex flex-wrap gap-2">
          {filters.fechaInicio && (
            <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
              isDarkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
            }`}>
              Desde: {new Date(filters.fechaInicio).toLocaleDateString()}
            </span>
          )}
          {filters.fechaFin && (
            <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
              isDarkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
            }`}>
              Hasta: {new Date(filters.fechaFin).toLocaleDateString()}
            </span>
          )}
          {filters.casoLegal && (
            <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
              isDarkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'
            }`}>
              Caso: {filters.casoLegal.charAt(0).toUpperCase() + filters.casoLegal.slice(1)}
            </span>
          )}
          {filters.consultorioJuridico && (
            <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
              isDarkMode ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
            }`}>
              Consultorio: {filters.consultorioJuridico}
            </span>
          )}
          {filters.estado && (
            <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
              isDarkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-yellow-100 text-yellow-700'
            }`}>
              Estado: {filters.estado === 'no_leido' ? 'No leído' : 'Leído'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatFiltersComponent;
