import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import Table, { TableColumn } from '@/components/common/Table';
import { ExcelImportData, ImportError } from '@/types';
import StatusBadge from '@/components/common/StatusBadge';

interface ExcelPreviewTableProps {
  data: ExcelImportData[];
  errors: ImportError[];
  onRemoveRow?: (index: number) => void;
  showErrorsOnly?: boolean;
}

const ExcelPreviewTable: React.FC<ExcelPreviewTableProps> = ({
  data,
  errors,
  onRemoveRow,
  showErrorsOnly = false
}) => {
  const [showErrors, setShowErrors] = useState(false);

  // Filtrar datos según si se muestran solo errores
  const displayData = showErrorsOnly && showErrors
    ? data.filter((_, index) => errors.some(error => error.row === index + 2))
    : data;

  // Encontrar errores para una fila específica
  const getRowErrors = (rowIndex: number) => {
    return errors.filter(error => error.row === rowIndex + 2);
  };

  // Verificar si una fila tiene errores
  const hasErrors = (rowIndex: number) => {
    return getRowErrors(rowIndex).length > 0;
  };

  // Definir columnas para la tabla
  const columns = [
    {
      key: 'estado',
      header: 'Estado',
      render: (_: any, rowIndex: number) => {
        const rowErrors = getRowErrors(rowIndex);
        if (rowErrors.length > 0) {
          return (
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-danger" />
              <span className="text-xs text-danger font-medium">Error</span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-xs text-success font-medium">Válido</span>
          </div>
        );
      }
    },
    {
      key: 'nombre',
      header: 'Nombre',
      render: (row: ExcelImportData) => (
        <div className="font-medium text-university-indigo font-poppins">
          {row.nombre || '-'}
        </div>
      )
    },
    {
      key: 'documento',
      header: 'Documento',
      render: (row: ExcelImportData) => (
        <div className="text-sm font-opensans">
          {row.documento || '-'}
        </div>
      )
    },
    {
      key: 'correo',
      header: 'Correo',
      render: (row: ExcelImportData) => (
        <div className="text-sm font-opensans">
          {row.correo || '-'}
        </div>
      )
    },
    {
      key: 'telefono',
      header: 'Teléfono',
      render: (row: ExcelImportData) => (
        <div className="text-sm font-opensans">
          {row.telefono || '-'}
        </div>
      )
    },
    {
      key: 'modalidad',
      header: 'Modalidad',
      render: (row: ExcelImportData) => (
        <StatusBadge
          status={row.modalidad === 'virtual' ? 'Virtual' : 'Presencial'}
        />
      )
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (_: any, rowIndex: number) => {
        if (onRemoveRow) {
          return (
            <button
              onClick={() => onRemoveRow(rowIndex)}
              className="text-red-500 hover:text-red-700 transition-colors"
              title="Eliminar fila"
            >
              Eliminar
            </button>
          );
        }
        return null;
      }
    }
  ];

  // Renderizar errores de una fila
  const renderRowErrors = (rowIndex: number) => {
    const rowErrors = getRowErrors(rowIndex);
    if (rowErrors.length === 0) return null;

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-danger mb-1">Errores encontrados:</p>
            <ul className="list-disc list-inside space-y-1 text-red-700">
              {rowErrors.map((error, index) => (
                <li key={index}>{error.message}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  // Estadísticas
  const validRows = data.length - new Set(errors.map(e => e.row)).size;
  const errorRows = new Set(errors.map(e => e.row)).size;

  return (
    <div className="space-y-4">
      {/* Estadísticas */}
      <div className="flex items-center justify-between bg-university-indigo/5 border border-university-indigo/20 rounded-lg p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-sm font-medium text-university-indigo font-poppins">
              {validRows} válidos
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-danger" />
            <span className="text-sm font-medium text-university-indigo font-poppins">
              {errorRows} con errores
            </span>
          </div>
          <div className="text-sm text-gray-600 font-opensans">
            Total: {data.length} filas
          </div>
        </div>

        {errorRows > 0 && (
          <button
            onClick={() => setShowErrors(!showErrors)}
            className="flex items-center gap-2 text-sm text-university-indigo hover:text-university-indigo/80 transition-colors"
          >
            {showErrors ? (
              <>
                <EyeOff className="w-4 h-4" />
                Mostrar Todos
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Mostrar Solo Errores
              </>
            )}
          </button>
        )}
      </div>

      {/* Tabla con errores expandidos */}
      <div className="space-y-2">
        {displayData.map((row, rowIndex) => {
          const originalIndex = data.indexOf(row);
          const rowHasErrors = hasErrors(originalIndex);

          return (
            <div key={originalIndex} className="space-y-2">
              <Table
                columns={columns}
                data={[row]}
                emptyMessage="No hay datos para mostrar"
                pageSize={10}
                currentPage={1}
                totalItems={1}
                onPageChange={() => {}}
              />
              
              {/* Mostrar errores debajo de cada fila con problemas */}
              {rowHasErrors && renderRowErrors(originalIndex)}
            </div>
          );
        })}
      </div>

      {/* Mensaje cuando no hay datos */}
      {displayData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {showErrorsOnly ? 'No hay filas con errores' : 'No hay datos para mostrar'}
        </div>
      )}
    </div>
  );
};

export default ExcelPreviewTable;