import React, { useState, useEffect } from 'react';
import Input from '@components/common/Input';
import Button from '@components/common/Button';
import { Student, UserRole, UserStatus } from '@types';
import { useTheme } from '@components/layout/MainLayout';

interface StudentFormProps {
  student: Student | null;
  onSubmit: (student: Student | Omit<Student, 'id'>) => void;
  onCancel: () => void;
}

const StudentForm: React.FC<StudentFormProps> = ({ student, onSubmit, onCancel }) => {
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState<Partial<Student>>({
    nombre: '',
    documento: '',
    correo: '',
    telefono: '',
    rol: UserRole.ESTUDIANTE,
    estado: UserStatus.ACTIVO,
    accesoCitas: true,
    acudimientos: false,
    modalidad: 'presencial',
    fechaInicio: undefined
  });
  
  const [tieneTiempoConsultorio, setTieneTiempoConsultorio] = useState<boolean>(
    !!student?.fechaInicio
  );

  useEffect(() => {
    if (student) {
      const fechaFormateada = student.fechaInicio 
        ? new Date(student.fechaInicio).toISOString().split('T')[0]
        : undefined;
      
      setFormData({
        ...student,
        fechaInicio: fechaFormateada
      });
      setTieneTiempoConsultorio(!!student.fechaInicio);
    }
  }, [student]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleToggleTiempoConsultorio = (checked: boolean) => {
    setTieneTiempoConsultorio(checked);
    if (checked) {
      setFormData(prev => ({
        ...prev,
        fechaInicio: new Date().toISOString().split('T')[0],
        accesoCitas: true
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        fechaInicio: undefined,
        accesoCitas: false
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const datosAEnviar = {
      ...formData,
      fechaInicio: formData.fechaInicio 
        ? new Date(formData.fechaInicio).toISOString()
        : undefined,
    };
    
    onSubmit(datosAEnviar as Student);
  };

  const labelClass = `block text-sm font-medium mb-1 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`;
  const selectClass = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-opensans ${
    isDarkMode 
      ? 'bg-gray-700 border-gray-600 text-white' 
      : 'bg-white border-gray-300 text-gray-900'
  }`;
  const inputClass = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-opensans ${
    isDarkMode 
      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
  }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nombre Completo"
        name="nombre"
        value={formData.nombre ?? ''}
        onChange={handleChange}
        placeholder="Ingrese el nombre completo"
        required
      />

      <Input
        label="Documento de Identidad"
        name="documento"
        type="number"
        value={formData.documento ?? ''}
        onChange={handleChange}
        placeholder="12345678"
        required
      />

      <Input
        label="Correo Electrónico"
        name="correo"
        type="email"
        value={formData.correo ?? ''}
        onChange={handleChange}
        placeholder="correo@estudiante.edu.co"
        required
      />

      {/* Toggle ¿Ya tiene tiempo en consultorio jurídico? */}
      <div className="flex items-center gap-3 py-2">
        <input
          type="checkbox"
          id="tieneTiempoConsultorio"
          checked={tieneTiempoConsultorio}
          onChange={(e) => handleToggleTiempoConsultorio(e.target.checked)}
          className={`w-5 h-5 rounded focus:ring-indigo-500 ${
            isDarkMode ? 'bg-gray-700 border-gray-500' : 'bg-white border-gray-300'
          }`}
        />
        <label htmlFor="tieneTiempoConsultorio" className={`text-sm font-medium ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
          ¿Ya tiene tiempo en el consultorio jurídico?
        </label>
      </div>

      {/* Campo de fecha de inicio */}
      {tieneTiempoConsultorio && (
        <Input
          label="Fecha de Inicio en el Consultorio"
          name="fechaInicio"
          type="date"
          value={formData.fechaInicio ?? ''}
          onChange={handleChange}
        />
      )}

      <Input
        label="Teléfono"
        name="telefono"
        value={formData.telefono ?? ''}
        onChange={handleChange}
        placeholder="3001234567"
      />

      <div>
        <label className={labelClass}>Modalidad</label>
        <select
          name="modalidad"
          value={formData.modalidad}
          onChange={handleChange}
          className={selectClass}
          required
        >
          <option value="presencial">Presencial</option>
          <option value="virtual">Virtual</option>
        </select>
      </div>

      <div>
        <label className={labelClass}>Estado</label>
        <select
          name="estado"
          value={formData.estado === 'Activo' || formData.estado === 'ACTIVO' ? 'ACTIVO' : 'INACTIVO'}
          onChange={handleChange}
          className={selectClass}
          required
        >
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="accesoCitas"
            name="accesoCitas"
            checked={formData.accesoCitas}
            onChange={handleChange}
            className={`w-4 h-4 rounded focus:ring-indigo-500 ${
              isDarkMode ? 'bg-gray-700 border-gray-500' : 'bg-white border-gray-300'
            }`}
          />
          <label htmlFor="accesoCitas" className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Acceso a Citas
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="acudimientos"
            name="acudimientos"
            checked={formData.acudimientos}
            onChange={handleChange}
            className={`w-4 h-4 rounded focus:ring-indigo-500 ${
              isDarkMode ? 'bg-gray-700 border-gray-500' : 'bg-white border-gray-300'
            }`}
          />
          <label htmlFor="acudimientos" className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Acudimientos
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary">
          {student ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
};

export default StudentForm;
