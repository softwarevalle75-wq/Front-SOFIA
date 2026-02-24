import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Video, AlertCircle, Check, X, CheckCircle, User, FileText, Phone, Mail } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import { Student, ManualCita } from '@/types';
import { CitaService } from '@/services/cita.service';
import { historialService } from '@/services/historialService';
import { authService } from '@/services/auth.service';
import { useTheme } from '@/components/layout/MainLayout';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ManualCitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCitaCreada: (cita: ManualCita) => void;
  estudiantes: Student[];
  initialData?: Partial<ManualCita>;
}

const TIPOS_DOCUMENTO = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'TI', label: 'Tarjeta de Identidad' },
  { value: 'RC', label: 'Registro Civil' },
  { value: 'PA', label: 'Pasaporte' },
  { value: 'NIT', label: 'NIT' },
];

const ManualCitaModal: React.FC<ManualCitaModalProps> = ({
  isOpen,
  onClose,
  onCitaCreada,
  estudiantes,
  initialData
}) => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [citasExistentes, setCitasExistentes] = useState<ManualCita[]>([]);
  const [currentStep, setCurrentStep] = useState<'usuario' | 'modalidad' | 'fecha' | 'hora' | 'estudiante' | 'confirmacion'>('usuario');
  const [formData, setFormData] = useState({
    // Datos del usuario
    usuarioNombre: '',
    usuarioTipoDocumento: 'CC',
    usuarioNumeroDocumento: '',
    usuarioCorreo: '',
    usuarioTelefono: '',
    // Datos de la cita
    estudianteId: '',
    fecha: '',
    hora: '',
    modalidad: 'presencial' as 'presencial' | 'virtual',
    motivo: ''
  });
  const [disponibilidad, setDisponibilidad] = useState<{
    fechaDisponible: boolean;
    horasDisponibles: string[];
    motivoIndisponibilidad?: string;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validacionFecha, setValidacionFecha] = useState<{
    valida: boolean;
    errores: string[];
  }>({ valida: true, errores: [] });

  useEffect(() => {
    if (isOpen) {
      cargarCitasExistentes();
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.fecha) {
      setValidacionFecha(CitaService.validarFecha(formData.fecha));
    }
  }, [formData.fecha]);

  const cargarCitasExistentes = async () => {
    try {
      const citas = await CitaService.getCitas();
      setCitasExistentes(citas);
    } catch (error) {
      console.error('Error loading citas:', error);
    }
  };

  const getEstudiantesDisponibles = () => {
    let disponibles = estudiantes.filter(e => e.modalidad === formData.modalidad);

    if (formData.fecha && formData.hora) {
      disponibles = disponibles.filter(estudiante => {
        const tieneCita = citasExistentes.some(cita => 
          cita.estudianteId === estudiante.id &&
          cita.fecha === formData.fecha &&
          cita.hora === formData.hora &&
          cita.estado !== 'cancelada'
        );
        return !tieneCita;
      });
    }

    return disponibles;
  };

  const checkDisponibilidad = async (fecha: string, modalidad: string) => {
    if (!fecha) return;
    
    try {
      const disp = await CitaService.getDisponibilidad(fecha, modalidad as 'presencial' | 'virtual');
      setDisponibilidad(disp);
    } catch (error) {
      console.error('Error checking disponibilidad:', error);
      setDisponibilidad({
        fechaDisponible: false,
        horasDisponibles: [],
        motivoIndisponibilidad: 'Error al verificar disponibilidad'
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    if (name === 'modalidad') {
      setFormData(prev => ({ ...prev, modalidad: value as 'presencial' | 'virtual', fecha: '', hora: '', estudianteId: '' }));
      setDisponibilidad(null);
    }
    
    if (name === 'fecha' && value) {
      checkDisponibilidad(value, formData.modalidad);
    }
  };

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 'usuario') {
      if (!formData.usuarioNombre.trim()) {
        newErrors.usuarioNombre = 'Debe ingresar el nombre completo';
      }
      if (!formData.usuarioTipoDocumento) {
        newErrors.usuarioTipoDocumento = 'Seleccione el tipo de documento';
      }
      if (!formData.usuarioNumeroDocumento.trim()) {
        newErrors.usuarioNumeroDocumento = 'Debe ingresar el número de documento';
      }
      if (!formData.usuarioCorreo.trim()) {
        newErrors.usuarioCorreo = 'Debe ingresar el correo electrónico';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.usuarioCorreo)) {
        newErrors.usuarioCorreo = 'Ingrese un correo válido';
      }
      if (!formData.usuarioTelefono.trim()) {
        newErrors.usuarioTelefono = 'Debe ingresar el número de celular';
      }
    }

    if (currentStep === 'estudiante') {
      if (!formData.estudianteId) {
        newErrors.estudianteId = 'Debe seleccionar un estudiante';
      }
      if (!formData.motivo.trim()) {
        newErrors.motivo = 'Debe ingresar el motivo de la cita';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (currentStep === 'usuario' && validateStep()) {
      setCurrentStep('modalidad');
    } else if (currentStep === 'modalidad' && formData.modalidad) {
      setCurrentStep('fecha');
    } else if (currentStep === 'fecha' && formData.fecha && validacionFecha.valida) {
      setCurrentStep('hora');
      checkDisponibilidad(formData.fecha, formData.modalidad);
    } else if (currentStep === 'hora' && formData.hora) {
      setCurrentStep('estudiante');
    } else if (currentStep === 'estudiante' && validateStep()) {
      setCurrentStep('confirmacion');
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 'usuario') {
      setCurrentStep('usuario');
    } else if (currentStep === 'modalidad') {
      setCurrentStep('usuario');
    } else if (currentStep === 'fecha') {
      setCurrentStep('modalidad');
    } else if (currentStep === 'hora') {
      setCurrentStep('fecha');
    } else if (currentStep === 'estudiante') {
      setCurrentStep('hora');
    } else if (currentStep === 'confirmacion') {
      setCurrentStep('estudiante');
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setLoading(true);
    try {
      const currentUser = authService.getCurrentUser();
      const estudiante = estudiantes.find(e => e.id === formData.estudianteId);
      if (!estudiante) {
        throw new Error('Estudiante no encontrado');
      }

      const nuevaCita: Omit<ManualCita, 'id' | 'createdAt'> = {
        ...formData,
        estudianteNombre: estudiante.nombre
      };

      const citaCreada = await CitaService.crearCita(nuevaCita);
      
      historialService.registrarAccion({
        adminId: currentUser?.id || 'unknown',
        adminNombre: currentUser?.nombre || 'Admin',
        accion: 'Agendar',
        entidad: 'Cita',
        entidadId: citaCreada.id,
        detalle: `${estudiante.nombre} - ${formData.fecha} ${formData.hora} (${formData.modalidad})`,
        tipo: 'agendar'
      });
      
      onCitaCreada(citaCreada);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating cita:', error);
      setErrors({ general: 'Error al crear la cita. Por favor intente nuevamente.' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      usuarioNombre: '',
      usuarioTipoDocumento: 'CC',
      usuarioNumeroDocumento: '',
      usuarioCorreo: '',
      usuarioTelefono: '',
      estudianteId: '',
      fecha: '',
      hora: '',
      modalidad: 'presencial',
      motivo: ''
    });
    setErrors({});
    setDisponibilidad(null);
    setValidacionFecha({ valida: true, errores: [] });
    setCurrentStep('usuario');
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const estudianteSeleccionado = estudiantes.find(e => e.id === formData.estudianteId);
  const estudiantesDisponibles = getEstudiantesDisponibles();

  const steps = ['usuario', 'modalidad', 'fecha', 'hora', 'estudiante', 'confirmacion'];

  const renderStepContent = () => {
    switch (currentStep) {
      case 'usuario':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-university-indigo/10 rounded-full mb-4">
                <User className="w-8 h-8 text-university-indigo" />
              </div>
              <h3 className="text-lg font-semibold text-university-indigo font-poppins">
                Datos del Usuario
              </h3>
              <p className="text-sm text-gray-600 font-opensans mt-1">
                Ingrese los datos de la persona que agenda la cita
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-university-indigo mb-2">
                Nombre Completo *
              </label>
              <input
                type="text"
                name="usuarioNombre"
                value={formData.usuarioNombre}
                onChange={handleChange}
                placeholder="Ej: Juan Pérez García"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-university-indigo font-opensans ${
                  errors.usuarioNombre ? 'border-danger' : 'border-gray-300'
                }`}
              />
              {errors.usuarioNombre && (
                <p className="text-danger text-xs mt-1">{errors.usuarioNombre}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-university-indigo mb-2">
                  Tipo de Documento *
                </label>
                <select
                  name="usuarioTipoDocumento"
                  value={formData.usuarioTipoDocumento}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-university-indigo font-opensans ${
                    errors.usuarioTipoDocumento ? 'border-danger' : 'border-gray-300'
                  }`}
                >
                  {TIPOS_DOCUMENTO.map(tipo => (
                    <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                  ))}
                </select>
                {errors.usuarioTipoDocumento && (
                  <p className="text-danger text-xs mt-1">{errors.usuarioTipoDocumento}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-university-indigo mb-2">
                  Número de Documento *
                </label>
                <input
                  type="text"
                  name="usuarioNumeroDocumento"
                  value={formData.usuarioNumeroDocumento}
                  onChange={handleChange}
                  placeholder="Ej: 12345678"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-university-indigo font-opensans ${
                    errors.usuarioNumeroDocumento ? 'border-danger' : 'border-gray-300'
                  }`}
                />
                {errors.usuarioNumeroDocumento && (
                  <p className="text-danger text-xs mt-1">{errors.usuarioNumeroDocumento}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-university-indigo mb-2">
                Correo Electrónico *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="usuarioCorreo"
                  value={formData.usuarioCorreo}
                  onChange={handleChange}
                  placeholder="correo@ejemplo.com"
                  className={`w-full pl-10 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-university-indigo font-opensans ${
                    errors.usuarioCorreo ? 'border-danger' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.usuarioCorreo && (
                <p className="text-danger text-xs mt-1">{errors.usuarioCorreo}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-university-indigo mb-2">
                Número de Celular *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  name="usuarioTelefono"
                  value={formData.usuarioTelefono}
                  onChange={handleChange}
                  placeholder="+573001234567"
                  className={`w-full pl-10 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-university-indigo font-opensans ${
                    errors.usuarioTelefono ? 'border-danger' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.usuarioTelefono && (
                <p className="text-danger text-xs mt-1">{errors.usuarioTelefono}</p>
              )}
            </div>
          </div>
        );

      case 'modalidad':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-university-indigo/10 rounded-full mb-4">
                <Calendar className="w-8 h-8 text-university-indigo" />
              </div>
              <h3 className="text-lg font-semibold text-university-indigo font-poppins">
                Seleccionar Modalidad
              </h3>
              <p className="text-sm text-gray-600 font-opensans mt-1">
                ¿Qué tipo de cita necesitas?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className={`flex flex-col items-center p-6 border-2 rounded-xl cursor-pointer transition-all hover:scale-105 ${
                formData.modalidad === 'presencial'
                  ? 'border-university-indigo bg-university-indigo/5'
                  : 'border-gray-200 hover:border-university-indigo/50'
              }`}>
                <input
                  type="radio"
                  name="modalidad"
                  value="presencial"
                  checked={formData.modalidad === 'presencial'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <Users className={`w-10 h-10 mb-3 ${formData.modalidad === 'presencial' ? 'text-university-indigo' : 'text-gray-400'}`} />
                <span className={`font-medium ${formData.modalidad === 'presencial' ? 'text-university-indigo' : 'text-gray-600'}`}>
                  Presencial
                </span>
                <span className="text-xs text-gray-500 mt-1 text-center">
                  Visitar el consultorio<br/>jurídico
                </span>
                {formData.modalidad === 'presencial' && (
                  <CheckCircle className="absolute top-2 right-2 w-5 h-5 text-university-indigo" />
                )}
              </label>
              <label className={`relative flex flex-col items-center p-6 border-2 rounded-xl cursor-pointer transition-all hover:scale-105 ${
                formData.modalidad === 'virtual'
                  ? 'border-university-yellow bg-university-yellow/5'
                  : 'border-gray-200 hover:border-university-yellow/50'
              }`}>
                <input
                  type="radio"
                  name="modalidad"
                  value="virtual"
                  checked={formData.modalidad === 'virtual'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <Video className={`w-10 h-10 mb-3 ${formData.modalidad === 'virtual' ? 'text-university-yellow' : 'text-gray-400'}`} />
                <span className={`font-medium ${formData.modalidad === 'virtual' ? 'text-university-yellow' : 'text-gray-600'}`}>
                  Virtual
                </span>
                <span className="text-xs text-gray-500 mt-1 text-center">
                  Videollamada por<br/>Google Meet
                </span>
                {formData.modalidad === 'virtual' && (
                  <CheckCircle className="absolute top-2 right-2 w-5 h-5 text-university-yellow" />
                )}
              </label>
            </div>
          </div>
        );

      case 'fecha':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-university-indigo/10 rounded-full mb-4">
                <Calendar className="w-8 h-8 text-university-indigo" />
              </div>
              <h3 className="text-lg font-semibold text-university-indigo font-poppins">
                Seleccionar Fecha
              </h3>
              <p className="text-sm text-gray-600 font-opensans mt-1">
                Modalidad: <span className="font-medium">{formData.modalidad === 'presencial' ? 'Presencial' : 'Virtual'}</span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-university-indigo mb-2">
                Fecha de la Cita *
              </label>
              <input
                type="date"
                name="fecha"
                value={formData.fecha}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-university-indigo font-opensans ${
                  errors.fecha || !validacionFecha.valida ? 'border-danger' : 'border-gray-300'
                }`}
              />
              {errors.fecha && (
                <p className="text-danger text-xs mt-1">{errors.fecha}</p>
              )}
              {!validacionFecha.valida && validacionFecha.errores.map((error, index) => (
                <p key={index} className="text-danger text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </p>
              ))}
            </div>
            {formData.fecha && validacionFecha.valida && (
              <div className={`p-4 rounded-lg border ${
                disponibilidad?.fechaDisponible 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {disponibilidad?.fechaDisponible ? (
                    <>
                      <Check className="w-5 h-5 text-green-600" />
                      <span className="text-green-700 font-medium">
                        Fecha disponible - {disponibilidad?.horasDisponibles.length} horarios
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="text-red-700 font-medium">
                        {disponibilidad?.motivoIndisponibilidad || 'Fecha no disponible'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 'hora':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-university-indigo/10 rounded-full mb-4">
                <Clock className="w-8 h-8 text-university-indigo" />
              </div>
              <h3 className="text-lg font-semibold text-university-indigo font-poppins">
                Seleccionar Hora
              </h3>
              <p className="text-sm text-gray-600 font-opensans mt-1">
                {formData.fecha && format(new Date(formData.fecha), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            </div>
            {disponibilidad?.fechaDisponible && disponibilidad.horasDisponibles.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {disponibilidad.horasDisponibles.map(hora => (
                  <button
                    key={hora}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, hora }))}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                      formData.hora === hora
                        ? 'border-university-indigo bg-university-indigo text-white shadow-md'
                        : 'border-gray-200 hover:border-university-indigo hover:bg-university-indigo/5'
                    }`}
                  >
                    <Clock className="w-4 h-4 inline mr-1" />
                    {hora}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No hay horarios disponibles para esta fecha</p>
              </div>
            )}
            {errors.hora && (
              <p className="text-danger text-xs mt-1">{errors.hora}</p>
            )}
          </div>
        );

      case 'estudiante':
        const disponiblesCount = estudiantesDisponibles.length;
        const totalModalidad = estudiantes.filter(e => e.modalidad === formData.modalidad).length;
        
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-university-indigo/10 rounded-full mb-4">
                <Users className="w-8 h-8 text-university-indigo" />
              </div>
              <h3 className="text-lg font-semibold text-university-indigo font-poppins">
                Seleccionar Estudiante
              </h3>
              <p className="text-sm text-gray-600 font-opensans mt-1">
                {formData.fecha} a las {formData.hora} - {formData.modalidad === 'presencial' ? 'Presencial' : 'Virtual'}
              </p>
            </div>
            
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} mb-4`}>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <span className="font-medium text-university-indigo">{disponiblesCount}</span> de {totalModalidad} estudiantes de modalidad {formData.modalidad} están disponibles a esta hora
              </p>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {estudiantesDisponibles.length > 0 ? (
                estudiantesDisponibles.map(estudiante => (
                  <label
                    key={estudiante.id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.estudianteId === estudiante.id
                        ? 'border-university-indigo bg-university-indigo/5'
                        : 'border-gray-200 hover:border-university-indigo/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="estudianteId"
                      value={estudiante.id}
                      checked={formData.estudianteId === estudiante.id}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-university-indigo">{estudiante.nombre}</div>
                      <div className="text-sm text-gray-500">{estudiante.documento}</div>
                    </div>
                    {formData.estudianteId === estudiante.id && (
                      <CheckCircle className="w-5 h-5 text-university-indigo" />
                    )}
                  </label>
                ))
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No hay estudiantes disponibles para esta hora</p>
                  <p className="text-sm text-gray-500 mt-1">Todos los estudiantes de esta modalidad ya tienen cita a esta hora</p>
                </div>
              )}
            </div>
            {errors.estudianteId && (
              <p className="text-danger text-xs mt-1">{errors.estudianteId}</p>
            )}

            <div>
              <label className="block text-sm font-medium text-university-indigo mb-2">
                Motivo de la Cita *
              </label>
              <textarea
                name="motivo"
                value={formData.motivo}
                onChange={handleChange}
                rows={3}
                placeholder="Describa brevemente el motivo de la consulta..."
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-university-indigo font-opensans resize-none ${
                  errors.motivo ? 'border-danger' : 'border-gray-300'
                }`}
              />
              {errors.motivo && (
                <p className="text-danger text-xs mt-1">{errors.motivo}</p>
              )}
            </div>
          </div>
        );

      case 'confirmacion':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-success/10 rounded-full mb-4">
                <Check className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-lg font-semibold text-university-indigo font-poppins mb-2">
                Confirmar Cita
              </h3>
              <p className="text-sm text-gray-600 font-opensans">
                Por favor revise los detalles antes de confirmar
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-700 border-b pb-2">Datos del Usuario</h4>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Nombre:</span>
                <span className="font-medium">{formData.usuarioNombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Documento:</span>
                <span className="font-medium">{formData.usuarioTipoDocumento} {formData.usuarioNumeroDocumento}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Correo:</span>
                <span className="font-medium">{formData.usuarioCorreo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Celular:</span>
                <span className="font-medium">{formData.usuarioTelefono}</span>
              </div>
            </div>

            <div className="bg-university-indigo/5 border border-university-indigo/20 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Estudiante:</span>
                <span className="font-medium text-university-indigo">
                  {estudianteSeleccionado?.nombre}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Fecha:</span>
                <span className="font-medium">
                  {format(new Date(formData.fecha), "d 'de' MMMM 'de' yyyy", { locale: es })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Hora:</span>
                <span className="font-medium">{formData.hora}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Modalidad:</span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  formData.modalidad === 'presencial' 
                    ? 'bg-university-indigo text-white' 
                    : 'bg-university-yellow text-university-indigo'
                }`}>
                  {formData.modalidad === 'presencial' ? 'Presencial' : 'Virtual'}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Motivo:</span>
                <p className="text-sm mt-1">{formData.motivo}</p>
              </div>
            </div>

            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-danger text-sm">{errors.general}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const getStepLabel = (step: string) => {
    switch (step) {
      case 'usuario': return 'Usuario';
      case 'modalidad': return 'Modalidad';
      case 'fecha': return 'Fecha';
      case 'hora': return 'Hora';
      case 'estudiante': return 'Estudiante';
      case 'confirmacion': return 'Confirmar';
      default: return '';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Agendar Nueva Cita"
      size="lg"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-center space-x-2">
          {steps.map((step, index) => (
            <React.Fragment key={step}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                currentStep === step
                  ? 'bg-university-indigo text-white'
                  : index < steps.indexOf(currentStep)
                  ? 'bg-success text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {index < steps.indexOf(currentStep) ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-8 h-1 ${
                  index < steps.indexOf(currentStep)
                    ? 'bg-success'
                    : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {renderStepContent()}

        <div className="flex justify-between pt-4 border-t">
          <div>
            {currentStep !== 'usuario' && (
              <Button
                variant="secondary"
                onClick={handlePrevStep}
                disabled={loading}
              >
                Anterior
              </Button>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            
            {currentStep === 'confirmacion' ? (
              <Button
                variant="primary"
                onClick={handleSubmit}
                loading={loading}
                disabled={!formData.hora || !disponibilidad?.fechaDisponible}
              >
                {loading ? 'Agendando...' : 'Confirmar Cita'}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleNextStep}
                disabled={
                  (currentStep === 'modalidad' && !formData.modalidad) ||
                  (currentStep === 'fecha' && (!formData.fecha || !validacionFecha.valida)) ||
                  (currentStep === 'hora' && (!formData.hora || !disponibilidad?.fechaDisponible)) ||
                  loading
                }
              >
                Siguiente
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ManualCitaModal;
