import * as XLSX from 'xlsx';
import { ExcelImportData, ImportError, Student, UserRole, UserStatus } from '@/types';

/**
 * Servicio Mock para procesamiento y validación de archivos CSV
 * Reemplaza ExcelValidationService con procesamiento CSV nativo
 */
export class MockExcelValidationService {
  
  /**
   * Procesa archivo CSV o Excel y extrae datos
   */
  static async processExcelFile(file: File): Promise<ExcelImportData[]> {
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.csv')) {
      return this.processCSVFile(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return this.processExcelFileInternal(file);
    } else {
      throw new Error('Formato de archivo no válido. Use CSV, XLSX o XLS');
    }
  }

  /**
   * Procesa archivo CSV
   */
  private static async processCSVFile(file: File): Promise<ExcelImportData[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const processedData = this.parseCSV(text);
          resolve(processedData);
        } catch (error) {
          reject(new Error('Error al procesar el archivo CSV'));
        }
      };
      
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Procesa archivo Excel (xlsx/xls)
   */
  private static async processExcelFileInternal(file: File): Promise<ExcelImportData[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length < 2) {
            resolve([]);
            return;
          }

          const processedData = this.parseExcelData(jsonData as any[][]);
          resolve(processedData);
        } catch (error) {
          reject(new Error('Error al procesar el archivo Excel'));
        }
      };
      
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Convierte datos de Excel (array de arrays) a formato estructurado
   * Formato esperado: Nombre Completo | DOCUMENTO | CORREO | FECHA DE INICIO CONSULTORIO JURIDICO | Modalidad
   */
  private static parseExcelData(rows: string[][]): ExcelImportData[] {
    if (rows.length < 2) {
      return [];
    }

    // Obtener headers para detectar el orden de columnas
    const rawHeaders = rows[0].map(h => String(h).trim().toLowerCase());
    
    // Buscar índices de columnas por nombre
    const getColIndex = (names: string[]): number => {
      for (const name of names) {
        const idx = rawHeaders.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
        if (idx !== -1) return idx;
      }
      return -1;
    };
    
    const nameIdx = getColIndex(['nombre completo', 'nombre']);
    const docIdx = getColIndex(['cedula', 'documento', 'identificacion']);
    const correoIdx = getColIndex(['correo', 'email']);
    const fechaIdx = getColIndex([
      'fecha de inicio consultorio juridico',
      'fecha inicio consultorio juridico',
      'fecha de inicio consultorio',
      'fecha inicio consultorio',
      'fecha de inicio',
      'fecha inicio',
      'inicio consultorio',
      'inicio',
    ]);
    const modalIdx = getColIndex(['modalidad']);
    const telefonoIdx = getColIndex(['telefono', 'teléfono']);

    const importData: ExcelImportData[] = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      const rowData: Partial<ExcelImportData> = {};
      
      // Leer Nombre Completo (columna 0)
      if (nameIdx >= 0 && row[nameIdx] !== undefined) {
        const val = String(row[nameIdx]).trim();
        if (val) rowData.nombre = val;
      }
      
      // Leer DOCUMENTO (columna 1)
      if (docIdx >= 0 && row[docIdx] !== undefined) {
        const rawDoc = row[docIdx];
        if (rawDoc !== null && rawDoc !== '') {
          // Convertir a string - puede ser número (documento) o string
          let docValue: string;
          if (typeof rawDoc === 'number') {
            // Verificar si es un número de serie de Excel (entre 40000 y 55000 = años 2009-2050)
            // Los documentos de identidad típicos en Colombia son > 1,000,000
            if (rawDoc >= 40000 && rawDoc <= 55000) {
              // Es un número de serie de Excel (fecha), no un documento
              docValue = '';
            } else {
              // Es un número de documento válido
              docValue = String(rawDoc);
            }
          } else {
            docValue = String(rawDoc).trim();
          }
          if (docValue && docValue !== '-') rowData.documento = docValue;
        }
      }
      
      // Leer CORREO (columna 2)
      if (correoIdx >= 0 && row[correoIdx] !== undefined) {
        const val = String(row[correoIdx]).trim();
        if (val && val !== '-') rowData.correo = val;
      }
      
      // Leer FECHA DE INICIO (columna 3)
      if (fechaIdx >= 0 && row[fechaIdx] !== undefined) {
        const rawFecha = row[fechaIdx];
        if (rawFecha !== undefined && rawFecha !== null) {
          let fechaStr: string;
          if (typeof rawFecha === 'number') {
            // Número de serie de Excel
            fechaStr = this.convertExcelDate(rawFecha) || '';
          } else {
            fechaStr = String(rawFecha).trim();
          }
          if (fechaStr && fechaStr !== '-') {
            const parsed = this.parseFecha(fechaStr);
            if (parsed) {
              rowData.fechaInicio = parsed;
            }
          }
        }
      }
      
      // Leer Modalidad (columna 4)
      if (modalIdx >= 0 && row[modalIdx] !== undefined) {
        const val = String(row[modalIdx]).trim().toLowerCase();
        if (val) {
          rowData.modalidad = val.includes('virtual') ? 'virtual' : 'presencial';
        }
      }
      
      // Leer Teléfono (opcional)
      if (telefonoIdx >= 0 && row[telefonoIdx] !== undefined) {
        const val = String(row[telefonoIdx]).trim();
        if (val && val !== '-') {
          rowData.telefono = val;
        }
      }
      
      // Determinar estado basado en fecha de inicio
      if (rowData.fechaInicio) {
        rowData.estado = 'Activo';
      } else {
        rowData.estado = 'Inactivo';
      }
      
      // Solo añadir si tiene datos básicos
      if (rowData.nombre || rowData.documento) {
        importData.push(rowData as ExcelImportData);
      }
    }
    
    return importData;
  }

  /**
   * Convierte número de serie de Excel a fecha YYYY-MM-DD
   */
  private static convertExcelDate(excelDate: number): string | null {
    try {
      // Los números de serie de Excel empiezan el 1/1/1900
      // Ajustar por diferencia con Unix epoch
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      if (isNaN(date.getTime())) {
        return null;
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return null;
    }
  }

  /**
   * Parsea texto CSV a formato estructurado
   */
  private static parseCSV(text: string): ExcelImportData[] {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return [];
    }

    // Obtener encabezados (primera fila)
    const headers = this.parseCSVLine(lines[0]).map(h => 
      h.toLowerCase().trim().replace(/["']/g, '')
    );
    
    // Mapeo de columnas esperadas
    const columnMap: { [key: string]: keyof ExcelImportData } = {
      'nombre': 'nombre',
      'nombre completo': 'nombre',
      'cedula': 'documento',
      'documento': 'documento',
      'identificación': 'documento',
      'cédula': 'documento',
      'correo': 'correo',
      'email': 'correo',
      'teléfono': 'telefono',
      'telefono': 'telefono',
      'modalidad': 'modalidad',
      'fecha inicio consultorio jurídico': 'fechaInicio',
      'fecha inicio consultorio juridico': 'fechaInicio',
      'fecha de inicio consultorio jurídico': 'fechaInicio',
      'fecha de inicio consultorio juridico': 'fechaInicio',
      'fecha de inicio': 'fechaInicio',
      'fecha inicio': 'fechaInicio',
      'inicio consultorio': 'fechaInicio',
    };

    // Procesar filas de datos
    const importData: ExcelImportData[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVLine(lines[i]);
      if (!row || row.length === 0) continue;
      
      const rowData: Partial<ExcelImportData> = {};
      
      // Mapear cada columna
      headers.forEach((header, index) => {
        const field = columnMap[header];
        if (field && row[index] !== undefined && row[index] !== null) {
          let value = row[index].trim().replace(/["']/g, '');
          
          // Conversiones específicas
          if (field === 'modalidad' && value) {
            const modalidadStr = value.toLowerCase();
            rowData[field] = modalidadStr.includes('virtual') ? 'virtual' : 'presencial';
          } else if (field === 'fechaInicio' && value) {
            // Intentar parsear la fecha
            const parsedFecha = this.parseFecha(value);
            rowData[field] = parsedFecha || '';
          } else {
            rowData[field] = value;
          }
        }
      });
      
      // Determinar estado basado en fecha de inicio
      // Si tiene fecha de inicio → Activo, si no → Inactivo
      if (rowData.fechaInicio && rowData.fechaInicio.trim()) {
        rowData.estado = 'Activo';
      } else {
        rowData.estado = 'Inactivo';
      }
      
      // Solo añadir si tiene datos básicos
      if (rowData.nombre || rowData.documento) {
        importData.push(rowData as ExcelImportData);
      }
    }
    
    return importData;
  }

  /**
   * Parsea una línea CSV manejando comillas y comas
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  /**
   * Valida datos de importación
   */
  static validateImportData(data: ExcelImportData[]): {
    validData: ExcelImportData[];
    errors: ImportError[];
  } {
    const validData: ExcelImportData[] = [];
    const errors: ImportError[] = [];

    data.forEach((row, index) => {
      const rowErrors: string[] = [];
      const rowNum = index + 2; // +2 porque CSV empieza en 1 y tenemos encabezado

      // Validaciones requeridas
      if (!row.nombre || row.nombre.trim().length < 3) {
        rowErrors.push('El nombre es requerido y debe tener al menos 3 caracteres');
      }

      if (!row.documento || row.documento.trim().length < 5) {
        rowErrors.push('El documento es requerido y debe tener al menos 5 caracteres');
      }

      // Validación de formato de email
      if (row.correo && row.correo.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.correo.trim())) {
          rowErrors.push('El formato del correo electrónico no es válido');
        }
      }

      // Validación de teléfono (formato colombiano)
      if (row.telefono && row.telefono.trim()) {
        const phoneRegex = /^3[0-9]{9}$/;
        const cleanPhone = row.telefono.replace(/\D/g, '');
        if (!phoneRegex.test(cleanPhone)) {
          rowErrors.push('El teléfono debe tener formato colombiano (10 dígitos empezando en 3)');
        }
      }

      // Validación de fecha de inicio (opcional - si está vacía, se considera como inactivo)
      // Solo valida si hay contenido
      if (row.fechaInicio && row.fechaInicio.trim() && row.fechaInicio.trim() !== '') {
        const fechaTrimmed = row.fechaInicio.trim();
        const fechaValida = this.parseFecha(fechaTrimmed);
        if (!fechaValida) {
          rowErrors.push('La fecha de inicio tiene formato inválido. Use YYYY-MM-DD, dd/mm/yyyy o d/m/yyyy');
        }
      }

      // Si hay errores, añadirlos a la lista
      if (rowErrors.length > 0) {
        rowErrors.forEach(error => {
          errors.push({
            row: rowNum,
            field: 'general',
            message: error,
            data: row
          });
        });
      } else {
        // Determinar estado basado en fecha de inicio
        // Si tiene fecha válida → Activo, si no → Inactivo
        const fechaTrimmed = row.fechaInicio?.trim() || '';
        const fechaValida = fechaTrimmed ? this.parseFecha(fechaTrimmed) : null;
        const estado = fechaValida ? 'Activo' : 'Inactivo';
        
        // Convertir fecha al formato YYYY-MM-DD solo si es válida
        const fechaInicioConvertida = fechaValida || undefined;
        
        // Si no hay errores, limpiar y añadir a datos válidos
        const cleanRow: ExcelImportData = {
          nombre: row.nombre.trim(),
          documento: row.documento.trim(),
          correo: row.correo?.trim() || undefined,
          telefono: row.telefono?.replace(/\D/g, '') || undefined,
          modalidad: row.modalidad || 'presencial',
          fechaInicio: fechaInicioConvertida,
          estado: estado as 'Activo' | 'Inactivo'
        };
        validData.push(cleanRow);
      }
    });

    return { validData, errors };
  }

  /**
   * Convierte fecha de entrada al formato YYYY-MM-DD
   * Acepta: YYYY-MM-DD, dd/mm/yyyy, d/m/yyyy
   */
  private static parseFecha(fecha: string): string | undefined {
    // Formato YYYY-MM-DD
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(fecha)) {
      const fechaObj = new Date(fecha);
      if (!isNaN(fechaObj.getTime())) {
        return fecha;
      }
    }
    // Formato dd/mm/yyyy o d/m/yyyy
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fecha)) {
      const [d, m, y] = fecha.split('/');
      const fechaObj = new Date(`${y}-${m}-${d}`);
      if (!isNaN(fechaObj.getTime())) {
        // Asegurar formato con ceros a la izquierda
        const day = d.padStart(2, '0');
        const month = m.padStart(2, '0');
        return `${y}-${month}-${day}`;
      }
    }
    return undefined;
  }

  /**
   * Convierte datos válidos a formato Student
   */
  static convertToStudents(importData: ExcelImportData[]): Student[] {
    return importData.map((data, index) => ({
      id: `import_${Date.now()}_${index}`,
      nombre: data.nombre,
      documento: data.documento,
      correo: data.correo,
      telefono: data.telefono,
      rol: UserRole.ESTUDIANTE,
      estado: data.estado === 'Activo' ? UserStatus.ACTIVO : UserStatus.INACTIVO,
      estadoCuenta: data.estado || 'Inactivo',
      accesoCitas: data.estado === 'Activo',
      acudimientos: false,
      modalidad: data.modalidad || 'presencial',
      programa: 'Derecho',
      fechaInicio: data.fechaInicio
    }));
  }

  /**
   * Genera plantilla para descarga
   */
  private static generateTemplateData(): string[][] {
    return [
      ['Nombre Completo', 'DOCUMENTO', 'CORREO', 'FECHA DE INICIO CONSULTORIO JURIDICO', 'Modalidad', 'Telefono'],
      ['Ana María Rodríguez', '1087542210', 'ana.rodriguez@email.com', '2024-01-15', 'presencial', '3001234567'],
      ['Carlos Pérez Gómez', '1098756432', 'carlos.perez@email.com', '', 'virtual', '3009876543']
    ];
  }

  /**
   * Descarga plantilla CSV
   */
  static downloadTemplate(format: 'csv' | 'xlsx' = 'csv'): void {
    const templateData = this.generateTemplateData();
    
    if (format === 'xlsx') {
      const ws = XLSX.utils.aoa_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes');
      XLSX.writeFile(wb, 'plantilla_estudiantes.xlsx');
    } else {
      const csvContent = templateData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'plantilla_estudiantes.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }
}