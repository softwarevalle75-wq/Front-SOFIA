import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, User, Upload, CheckCircle, Calendar, FileSpreadsheet, FileText, Camera } from 'lucide-react';
import Card from '@components/common/Card';
import Table, { TableColumn } from '@components/common/Table';
import SearchBar from '@components/common/SearchBar';
import StatusBadge from '@components/common/StatusBadge';
import Button from '@components/common/Button';
import Modal from '@components/common/Modal';
import { Student, UserRole, UserStatus, ExcelImportResult } from '@types';
import StudentForm from './components/StudentForm';
import ExcelImportModal from '@components/excel/ExcelImportModal';
import { studentService } from '@services/studentService';
import { historialService } from '@services/historialService';
import { authService } from '@services/auth.service';
import { exportService } from '@services/exportService';
import { useTheme } from '@components/layout/MainLayout';

/**
 * Página de Gestión de Estudiantes del Consultorio Jurídico (CRUD Simplificado)
 * Solo se crean estudiantes, sin rol selection, sin proximity alerts
 */
const StudentsPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const [importResult, setImportResult] = useState<ExcelImportResult | null>(null);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  /**
   * Cargar estudiantes desde el servicio
   */
  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await studentService.getStudents();
      setStudents(data);
      setTotalItems(data.length);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  // Funciones CRUD
  const handleCreateStudent = async (studentData: Omit<Student, 'id'>) => {
    try {
      const currentUser = authService.getCurrentUser();
      const newStudent = await studentService.createStudent(studentData);
      setStudents(prevStudents => [...prevStudents, newStudent]);
      setTotalItems(prevTotal => prevTotal + 1);
      setIsCreateModalOpen(false);
      
      historialService.registrarAccion({
        adminId: currentUser?.id || 'unknown',
        adminNombre: currentUser?.nombre || 'Admin',
        accion: 'Crear',
        entidad: 'Estudiante',
        entidadId: newStudent.id,
        detalle: newStudent.nombre,
        tipo: 'crear'
      });
    } catch (error: any) {
      console.error('Error creating student:', error);
      alert(error.message || 'Error al crear el estudiante. Por favor intente de nuevo.');
    }
  };

  const handleEditStudent = async (studentData: Student) => {
    try {
      const currentUser = authService.getCurrentUser();
      const updatedStudent = await studentService.updateStudent(studentData.id, studentData);
      
      setStudents(prevStudents => prevStudents.map(student => 
        student.id === updatedStudent.id ? updatedStudent : student
      ));
      setIsEditModalOpen(false);
      setSelectedStudent(null);
      
      historialService.registrarAccion({
        adminId: currentUser?.id || 'unknown',
        adminNombre: currentUser?.nombre || 'Admin',
        accion: 'Editar',
        entidad: 'Estudiante',
        entidadId: updatedStudent.id,
        detalle: updatedStudent.nombre,
        tipo: 'editar'
      });
    } catch (error: any) {
      console.error('Error updating student:', error);
      alert(error.message || 'Error al actualizar el estudiante. Por favor intente de nuevo.');
    }
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      const currentUser = authService.getCurrentUser();
      const studentToDeleteData = students.find(s => s.id === id);
      await studentService.deleteStudent(id);
      setStudents(students.filter(student => student.id !== id));
      setTotalItems(totalItems - 1);
      setIsDeleteModalOpen(false);
      setStudentToDelete(null);
      
      if (studentToDeleteData) {
        historialService.registrarAccion({
          adminId: currentUser?.id || 'unknown',
          adminNombre: currentUser?.nombre || 'Admin',
          accion: 'Eliminar',
          entidad: 'Estudiante',
          entidadId: id,
          detalle: studentToDeleteData.nombre,
          tipo: 'eliminar'
        });
      }
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  };

  const handleDeleteAllStudents = async () => {
    const confirmar = window.confirm(`¿Está seguro que desea eliminar todos los ${students.length} estudiantes? Esta acción no se puede deshacer.`);
    if (!confirmar) return;
    
    try {
      const currentUser = authService.getCurrentUser();
      const resultado = await studentService.deleteAllStudents();
      setStudents([]);
      setTotalItems(0);
      
      historialService.registrarAccion({
        adminId: currentUser?.id || 'unknown',
        adminNombre: currentUser?.nombre || 'Admin',
        accion: 'Eliminar',
        entidad: 'Estudiante',
        detalle: `Se eliminaron ${resultado.eliminados} estudiantes`,
        tipo: 'eliminar'
      });
      
      alert(`Se eliminaron ${resultado.eliminados} estudiantes correctamente`);
    } catch (error) {
      console.error('Error deleting all students:', error);
      alert('Error al eliminar los estudiantes');
    }
  };

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
  };

  /**
   * Maneja la importación desde Excel
   */
  const handleExcelImportComplete = async (result: ExcelImportResult) => {
    const currentUser = authService.getCurrentUser();
    setImportResult(result);
    
    // Enviar estudiantes al backend para persistir en la base de datos
    let estudiantesDelBackend: any[] = [];
    if (result.students.length > 0) {
      try {
        const response = await studentService.importarEstudiantes(result.students.map(s => ({
          documento: s.documento,
          nombre: s.nombre,
          correo: s.correo,
          telefono: s.telefono,
          programa: s.programa,
          modalidad: s.modalidad?.toUpperCase(),
          fechaInicio: s.fechaInicio,
        })));
        estudiantesDelBackend = response.estudiantesCreados || [];
      } catch (error) {
        console.error('Error al guardar estudiantes en el backend:', error);
      }
    }
    
    // Verificar si se guardaron correctamente
    if (estudiantesDelBackend.length === 0 && result.successfulImports > 0) {
      console.error('Los estudiantes no se guardaron correctamente en el backend');
    }
    
    // Añadir estudiantes del backend (con IDs reales) a la lista
    // Mapear al formato que espera el frontend
    const estudiantesFormateados = estudiantesDelBackend.map(est => ({
      id: est.id,
      nombre: est.nombre,
      documento: est.documento,
      correo: est.correo,
      telefono: est.telefono,
      programa: est.programa,
      modalidad: est.modalidad?.toLowerCase() || 'presencial',
      estado: est.estado?.toLowerCase() === 'activo' ? 'activo' : 'inactivo',
      accesoCitas: est.accesoCitas ?? true,
      rol: 'estudiante' as const,
      fechaCreacion: est.creadoEn,
      fechaInicio: est.fechaInicio,
    }));
    
    setStudents(prevStudents => [...prevStudents, ...estudiantesFormateados]);
    setTotalItems(prevTotal => prevTotal + result.successfulImports);
    
    // Cerrar modal
    setIsExcelImportModalOpen(false);
    
    // Registrar en historial
    if (result.successfulImports > 0) {
      historialService.registrarAccion({
        adminId: currentUser?.id || 'unknown',
        adminNombre: currentUser?.nombre || 'Admin',
        accion: 'Importar',
        entidad: 'Estudiante',
        detalle: `${result.successfulImports} estudiantes importados desde Excel`,
        tipo: 'importar'
      });
    }
    
    // Mostrar notificación de éxito
    setTimeout(() => {
      const message = result.successfulImports > 0 
        ? `✅ Se importaron exitosamente ${result.successfulImports} estudiantes`
        : 'No se importaron nuevos estudiantes';
      
      if (result.errors.length > 0) {
        console.warn(`${result.errors.length} registros tuvieron errores y no fueron importados`);
      }
      
      setImportResult(null); // Limpiar resultado
    }, 100);
  };

  useEffect(() => {
    loadStudents();
  }, []);

  // Filtrar estudiantes según búsqueda
  const filteredStudents = students.filter(student =>
    student.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.documento.includes(searchQuery) ||
    (student.correo && student.correo.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Definir columnas de la tabla (sin columna de rol)
  const columns: TableColumn<Student>[] = [
    {
      key: 'nombre',
      header: 'Nombre',
      render: (student: Student) => (
        <div>
          <div className={`font-semibold font-poppins ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
            {student.nombre}
          </div>
          <div className={`text-sm font-opensans ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{student.documento}</div>
        </div>
      )
    },
    {
      key: 'correo',
      header: 'Correo Electrónico',
      render: (student: Student) => (
        <div className="text-sm font-opensans">{student.correo || 'No registrado'}</div>
      )
    },
    {
      key: 'telefono',
      header: 'Teléfono',
      render: (student: Student) => (
        <div className="text-sm font-opensans">{student.telefono || 'No registrado'}</div>
      )
    },
    {
      key: 'modalidad',
      header: 'Modalidad',
      render: (student: Student) => (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full text-xs font-medium px-2 py-1 ${
            student.modalidad === 'presencial' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
          }`}>
            {student.modalidad === 'presencial' ? 'Presencial' : 'Virtual'}
          </span>
        </div>
      )
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (student: Student) => (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full text-xs font-medium px-2 py-1 ${
            student.estado?.toUpperCase() === 'ACTIVO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {student.estado?.toUpperCase() === 'ACTIVO' ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      )
    },
    {
      key: 'fechaInicio',
      header: 'Fecha de Ingreso',
      render: (student: Student) => {
        const fechaFormateada = student.fechaInicio
          ? new Date(student.fechaInicio).toISOString().split('T')[0]
          : null;
        return (
          <div className={`text-sm font-opensans ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {fechaFormateada || 'No registrada'}
          </div>
        );
      }
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (student: Student) => (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleViewStudent(student)}
            className="p-2"
          >
            <User className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSelectedStudent(student);
              setIsEditModalOpen(true);
            }}
            className="p-2"
          >
            <Edit className="w-4 h-4" />
          </Button>
          {student.rol !== UserRole.ADMINISTRADOR && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setStudentToDelete(student);
                setIsDeleteModalOpen(true);
              }}
              className="p-2"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )
    }
  ];

  const handleExportExcel = () => {
    const data = students.map(s => {
      const fechaFormateada = s.fechaInicio 
        ? new Date(s.fechaInicio).toISOString().split('T')[0]
        : s.fechaCreacion 
          ? new Date(s.fechaCreacion).toISOString().split('T')[0]
          : '';
      return {
        Nombre: s.nombre,
        Documento: s.documento,
        Correo: s.correo || '',
        Teléfono: s.telefono || '',
        Modalidad: s.modalidad === 'presencial' ? 'Presencial' : 'Virtual',
        Estado: s.estado?.toUpperCase() === 'ACTIVO' ? 'Activo' : 'Inactivo',
        'Fecha de Ingreso': fechaFormateada
      };
    });
    exportService.toExcel(data, 'estudiantes', 'Estudiantes');
    
    const currentUser = authService.getCurrentUser();
    historialService.registrarAccion({
      adminId: currentUser?.id || 'unknown',
      adminNombre: currentUser?.nombre || 'Admin',
      accion: 'Exportar',
      entidad: 'Estudiante',
      detalle: `Exportó ${students.length} estudiantes a Excel`,
      tipo: 'exportar'
    });
  };

  const handleExportPDF = () => {
    const data = students.map(s => {
      const fechaFormateada = s.fechaInicio 
        ? new Date(s.fechaInicio).toISOString().split('T')[0]
        : s.fechaCreacion 
          ? new Date(s.fechaCreacion).toISOString().split('T')[0]
          : '';
      return {
        Nombre: s.nombre,
        Documento: s.documento,
        Correo: s.correo || '',
        Modalidad: s.modalidad,
        Estado: s.estado?.toUpperCase() === 'ACTIVO' ? 'Activo' : 'Inactivo',
        'Fecha de Ingreso': fechaFormateada
      };
    });
    exportService.toPDF(data, 'estudiantes', 'Lista de Estudiantes - Consultorio Jurídico');
    
    const currentUser = authService.getCurrentUser();
    historialService.registrarAccion({
      adminId: currentUser?.id || 'unknown',
      adminNombre: currentUser?.nombre || 'Admin',
      accion: 'Exportar',
      entidad: 'Estudiante',
      detalle: `Exportó ${students.length} estudiantes a PDF`,
      tipo: 'exportar'
    });
  };

  const handleExportPNG = () => {
    const element = document.getElementById('students-table');
    if (element) {
      exportService.toPNGElement(element, 'estudiantes');
      
      const currentUser = authService.getCurrentUser();
      historialService.registrarAccion({
        adminId: currentUser?.id || 'unknown',
        adminNombre: currentUser?.nombre || 'Admin',
        accion: 'Exportar',
        entidad: 'Estudiante',
        detalle: 'Exportó tabla de estudiantes a PNG',
        tipo: 'exportar'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Título de la página */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold font-poppins ${isDarkMode ? 'text-white' : 'text-indigo-600'}`}>Gestión de Estudiantes</h1>
          <p className={`mt-1 font-opensans ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Administración de estudiantes del consultorio jurídico</p>
        </div>
        <div className="flex gap-2">
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
            <FileText className="w-4 h-4" />
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

      {/* Tarjeta de estadísticas */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4">
            <div className={`text-3xl font-bold font-poppins ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>{students.length}</div>
            <div className={`text-sm font-opensans ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total de Estudiantes</div>
          </div>
          <div className="text-center p-4">
            <div className={`text-3xl font-bold font-poppins ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
              {students.filter(s => s.estado?.toUpperCase() === 'ACTIVO').length}
            </div>
            <div className={`text-sm font-opensans ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Estudiantes Activos</div>
          </div>
          <div className="text-center p-4">
            <div className={`text-3xl font-bold font-poppins ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
              {students.filter(s => s.modalidad === 'presencial').length}
            </div>
            <div className={`text-sm font-opensans ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Modalidad Presencial</div>
          </div>
          <div className="text-center p-4">
            <div className={`text-3xl font-bold font-poppins ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
              {students.filter(s => s.modalidad === 'virtual').length}
            </div>
            <div className={`text-sm font-opensans ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Modalidad Virtual</div>
          </div>
        </div>
      </Card>

      {/* Barra de herramientas */}
      <Card>
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Buscador */}
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
              placeholder="Buscar por nombre, documento o correo..."
            />
          </div>
          
          {/* Botones de acción */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsExcelImportModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Importar CSV
            </Button>
            
            {students.length > 0 && (
              <Button
                variant="danger"
                onClick={handleDeleteAllStudents}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar Todos ({students.length})
              </Button>
            )}
            
            <Button
              variant="accent"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Crear Nuevo Estudiante
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabla de estudiantes */}
      <Card>
        <div id="students-table">
          <Table
            columns={columns}
            data={filteredStudents}
            loading={loading}
            emptyMessage="No se encontraron estudiantes"
            pageSize={pageSize}
            currentPage={currentPage}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onRowClick={handleViewStudent}
          />
        </div>
      </Card>

      {/* Modal para crear estudiante */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Crear Nuevo Estudiante"
      >
        <StudentForm
          student={null}
          onSubmit={handleCreateStudent}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>

      {/* Modal para editar estudiante */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Estudiante"
      >
        <StudentForm
          student={selectedStudent}
          onSubmit={handleEditStudent}
          onCancel={() => setIsEditModalOpen(false)}
        />
      </Modal>

      {/* Modal de confirmación para eliminar */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirmar Eliminación"
      >
        <div className="p-6">
          <p className={`mb-4 font-opensans ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            ¿Está seguro que desea eliminar al estudiante <strong>{studentToDelete?.nombre}</strong>?
          </p>
          <p className={`text-sm mb-6 font-opensans ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => studentToDelete && handleDeleteStudent(studentToDelete.id)}
            >
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de importación Excel */}
      <ExcelImportModal
        isOpen={isExcelImportModalOpen}
        onClose={() => setIsExcelImportModalOpen(false)}
        onImportComplete={handleExcelImportComplete}
        existingStudents={students}
      />

      {/* Modal de resultados de importación */}
      {importResult && (
        <Modal
          isOpen={!!importResult}
          onClose={() => setImportResult(null)}
          title="Resultados de la Importación"
        >
          <div className="p-6 space-y-6">
            {/* Resumen */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-success/10 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h3 className={`text-lg font-semibold font-poppins mb-2 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
                Importación Completada
              </h3>
              <p className={`text-sm font-opensans ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Proceso finalizado con los siguientes resultados
              </p>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-university-indigo font-poppins">
                  {importResult.totalRows}
                </div>
                <div className="text-sm text-gray-600 font-opensans">Total Filas</div>
              </div>
              
              <div className="text-center p-4 bg-success/10 rounded-lg">
                <div className="text-2xl font-bold text-success font-poppins">
                  {importResult.successfulImports}
                </div>
                <div className="text-sm text-success font-opensans">Importados</div>
              </div>
              
              <div className="text-center p-4 bg-danger/10 rounded-lg">
                <div className="text-2xl font-bold text-danger font-poppins">
                  {importResult.failedImports}
                </div>
                <div className="text-sm text-danger font-opensans">Con Errores</div>
              </div>
            </div>

            {/* Detalles de errores */}
            {importResult.errors.length > 0 && (
              <div className={`border rounded-lg p-4 ${isDarkMode ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-200'}`}>
                <h4 className={`font-semibold font-poppins mb-2 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  Advertencias
                </h4>
                <p className={`text-sm font-opensans ${isDarkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                  {importResult.errors.length} registros no pudieron importarse debido a errores de formato o datos duplicados.
                </p>
                <details className="mt-3">
                  <summary className="text-sm font-medium text-yellow-700 cursor-pointer">
                    Ver detalles de errores
                  </summary>
                  <div className="mt-2 text-xs space-y-1 max-h-32 overflow-y-auto">
                    {importResult.errors.slice(0, 10).map((error, index) => (
                      <div key={index} className="text-yellow-700">
                        Fila {error.row}: {error.message}
                      </div>
                    ))}
                    {importResult.errors.length > 10 && (
                      <div className="text-yellow-600 italic">
                        ... y {importResult.errors.length - 10} errores más
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setImportResult(null)}
              >
                Cerrar
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setImportResult(null);
                  // Recargar la lista para mostrar los nuevos estudiantes
                  loadStudents();
                }}
              >
                Ver Estudiantes
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StudentsPage;