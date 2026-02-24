import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Download } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import ExcelUploadButton from './ExcelUploadButton';
import ExcelPreviewTable from './ExcelPreviewTable';
import { ExcelImportData, ImportError, ExcelImportResult } from '@/types';
import { MockExcelValidationService } from '@/services/mock-excelValidation.service';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (result: ExcelImportResult) => void;
  existingStudents: any[]; // Para verificar duplicados
}

const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  existingStudents = []
}) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'processing'>('upload');
  const [rawData, setRawData] = useState<ExcelImportData[]>([]);
  const [validData, setValidData] = useState<ExcelImportData[]>([]);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  /**
   * Reinicia el modal al cerrar
   */
  const handleClose = () => {
    if (!isProcessing) {
      setStep('upload');
      setRawData([]);
      setValidData([]);
      setErrors([]);
      setProcessingError(null);
      onClose();
    }
  };

  /**
   * Maneja los datos procesados del Excel
   */
  const handleDataProcessed = (data: ExcelImportData[]) => {
    setRawData(data);
    
    // Validar duplicados con estudiantes existentes
    const existingDocuments = new Set(existingStudents.map(s => s.documento));
    const dataWithDuplicates = data.map((row, index) => {
      if (existingDocuments.has(row.documento)) {
        // Marcar como duplicado
        return {
          ...row,
          _isDuplicate: true,
          _duplicateError: `El documento ${row.documento} ya está registrado`
        };
      }
      return row;
    });

    // Validar datos
    const validation = MockExcelValidationService.validateImportData(dataWithDuplicates);
    setValidData(validation.validData);
    setErrors(validation.errors);
    
    // Añadir errores de duplicados
    const duplicateErrors = dataWithDuplicates
      .filter(row => (row as any)._isDuplicate)
      .map((row, index) => ({
        row: index + 2,
        field: 'documento',
        message: (row as any)._duplicateError,
        data: row
      }));
    
    setErrors([...validation.errors, ...duplicateErrors]);
    setStep('preview');
  };

  /**
   * Elimina una fila con errores
   */
  const handleRemoveRow = (index: number) => {
    const newRawData = rawData.filter((_, i) => i !== index);
    const newValidData = validData.filter((_, i) => i !== index);
    const newErrors = errors.filter(e => e.row !== index + 2);
    
    setRawData(newRawData);
    setValidData(newValidData);
    setErrors(newErrors);
  };

  /**
   * Procesa la importación
   */
  const handleImport = async () => {
    if (validData.length === 0) {
      setProcessingError('No hay datos válidos para importar');
      return;
    }

    setIsProcessing(true);
    setStep('processing');
    setProcessingError(null);

    try {
      // Simular tiempo de procesamiento
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Convertir a formato Student
      const students = MockExcelValidationService.convertToStudents(validData);

      // Preparar resultado
      const result: ExcelImportResult = {
        totalRows: rawData.length,
        successfulImports: students.length,
        failedImports: errors.length,
        errors: errors,
        students: students
      };

      onImportComplete(result);
      handleClose();
    } catch (error) {
      setProcessingError('Error durante la importación. Por favor intenta nuevamente.');
      setStep('preview');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Renderiza el contenido según el paso actual
   */
  const renderContent = () => {
    switch (step) {
      case 'upload':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-university-indigo font-poppins mb-2">
                Importar Estudiantes desde Excel o CSV
              </h3>
              <p className="text-sm text-gray-600 font-opensans">
                Sube un archivo Excel o CSV con los datos de los estudiantes que deseas importar
              </p>
            </div>

            <ExcelUploadButton
              onDataProcessed={handleDataProcessed}
              onError={setProcessingError}
              loading={isProcessing}
            />

            {processingError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-danger mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-danger">Error</p>
                    <p className="text-sm text-red-700 mt-1">{processingError}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-university-indigo font-poppins mb-2">
                Vista Previa de Datos
              </h3>
              <p className="text-sm text-gray-600 font-opensans">
                Revisa los datos antes de confirmar la importación
              </p>
            </div>

            {/* Resumen de validación */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-success" />
                  <div>
                    <p className="font-semibold text-success font-poppins">{validData.length}</p>
                    <p className="text-sm text-green-700 font-opensans">Registros válidos</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-danger" />
                  <div>
                    <p className="font-semibold text-danger font-poppins">{errors.length}</p>
                    <p className="text-sm text-red-700 font-opensans">Registros con errores</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla de previsualización */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-university-indigo/5 border-b border-university-indigo/20 p-4">
                <h4 className="font-semibold text-university-indigo font-poppins">
                  Vista Previa de Datos
                </h4>
              </div>
              <div className="p-4">
                <ExcelPreviewTable
                  data={rawData}
                  errors={errors}
                  onRemoveRow={handleRemoveRow}
                />
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-between">
              <Button
                variant="secondary"
                onClick={() => setStep('upload')}
                disabled={isProcessing}
              >
                Volver
              </Button>
              
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={handleClose}
                  disabled={isProcessing}
                >
                  Cancelar
                </Button>
                
                <Button
                  variant="primary"
                  onClick={handleImport}
                  disabled={isProcessing || validData.length === 0}
                  loading={isProcessing}
                >
                  {isProcessing ? 'Importando...' : `Importar ${validData.length} Estudiantes`}
                </Button>
              </div>
            </div>
          </div>
        );

      case 'processing':
        return (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-university-indigo/10 rounded-full mb-4">
              <Upload className="w-8 h-8 text-university-indigo animate-bounce" />
            </div>
            <h3 className="text-lg font-semibold text-university-indigo font-poppins mb-2">
              Procesando Importación
            </h3>
            <p className="text-sm text-gray-600 font-opensans">
              Por favor espera mientras procesamos los datos...
            </p>
            
            {/* Simulación de progreso */}
            <div className="mt-6">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-university-indigo h-2 rounded-full animate-pulse" 
                     style={{ width: '70%' }} />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title=""
      size="xl"
    >
      <div className="min-h-[400px]">
        {renderContent()}
      </div>
    </Modal>
  );
};

export default ExcelImportModal;