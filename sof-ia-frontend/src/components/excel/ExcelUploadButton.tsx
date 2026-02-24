import React, { useRef, useState } from 'react';
import { Upload, FileText, Download } from 'lucide-react';
import Button from '@/components/common/Button';
import { MockExcelValidationService } from '@/services/mock-excelValidation.service';
import { ExcelImportData } from '@/types';

interface ExcelUploadButtonProps {
  onDataProcessed: (data: ExcelImportData[]) => void;
  onError: (error: string) => void;
  loading?: boolean;
}

const ExcelUploadButton: React.FC<ExcelUploadButtonProps> = ({ 
  onDataProcessed, 
  onError, 
  loading = false 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  /**
   * Maneja la selección de archivo
   */
  const handleFileSelect = async (file: File) => {
    const fileName = file.name.toLowerCase();
    
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      onError('Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV válido');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      onError('El archivo no puede superar los 5MB');
      return;
    }

    try {
      const data = await MockExcelValidationService.processExcelFile(file);
      
      if (data.length === 0) {
        onError('El archivo no contiene datos válidos o está vacío');
        return;
      }

      onDataProcessed(data);
    } catch (error) {
      onError('Error al procesar el archivo. Verifica que el formato sea correcto');
    }
  };

  /**
   * Maneja el cambio de input
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  /**
   * Maneja drag & drop
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Área de arrastrar y soltar */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${isDragOver 
            ? 'border-university-indigo bg-university-indigo/5' 
            : 'border-gray-300 hover:border-university-indigo/50'
          }
          ${loading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !loading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleInputChange}
          className="hidden"
          disabled={loading}
        />

        <div className="flex flex-col items-center space-y-4">
          <div className={`
            p-4 rounded-full transition-all duration-200
            ${isDragOver ? 'bg-university-indigo text-white' : 'bg-university-indigo/10 text-university-indigo'}
          `}>
            <Upload className="w-8 h-8" />
          </div>

          <div>
            <p className="text-lg font-semibold text-university-indigo font-poppins">
              {loading ? 'Procesando...' : 'Arrastra tu archivo Excel o CSV aquí'}
            </p>
            <p className="text-sm text-gray-500 font-opensans mt-1">
              o haz clic para seleccionarlo
            </p>
          </div>

          <div className="text-xs text-gray-400 font-opensans">
            Formatos admitidos: .xlsx, .xls, .csv (Máx. 5MB)
          </div>
        </div>
      </div>

      {/* Botones de descarga de plantilla */}
      <div className="flex justify-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => MockExcelValidationService.downloadTemplate('csv')}
          className="flex items-center gap-2 text-university-indigo"
        >
          <Download className="w-4 h-4" />
          Plantilla CSV
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => MockExcelValidationService.downloadTemplate('xlsx')}
          className="flex items-center gap-2 text-university-indigo"
        >
          <Download className="w-4 h-4" />
          Plantilla Excel
        </Button>
      </div>

      {/* Instrucciones de formato */}
      <div className="bg-university-indigo/5 border border-university-indigo/20 rounded-lg p-4">
        <h4 className="font-semibold text-university-indigo font-poppins mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Formato Requerido
        </h4>
        <div className="text-sm text-gray-600 font-opensans space-y-1">
          <p><strong>Columnas Requeridas:</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>Nombre Completo:</strong> Nombre completo del estudiante</li>
            <li><strong>DOCUMENTO:</strong> Número de identificación</li>
            <li><strong>CORREO:</strong> Correo electrónico</li>
          </ul>
          <p><strong>Columnas Opcionales:</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>FECHA DE INICIO CONSULTORIO JURIDICO:</strong> Fecha en formato YYYY-MM-DD, dd/mm/yyyy o d/m/yyyy (dejar vacío para inactivos)</li>
            <li><strong>Modalidad:</strong> "presencial" o "virtual"</li>
            <li><strong>Telefono:</strong> Teléfono celular (10 dígitos)</li>
          </ul>
          <p className="text-xs text-gray-500 mt-2">
            <strong>Nota:</strong> Si incluye fecha de inicio, el estudiante se creará como Activo. Si deja la fecha vacía, se creará como Inactivo.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExcelUploadButton;