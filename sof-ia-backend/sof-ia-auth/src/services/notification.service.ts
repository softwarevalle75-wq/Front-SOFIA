import nodemailer from 'nodemailer';
import { Cita, Estudiante } from '@prisma/client';
import { createHash } from 'crypto';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface DatosUsuario {
  nombre: string;
  tipoDocumento: string;
  numeroDocumento: string;
  correo: string;
  telefono: string;
}

export interface NotificacionData {
  cita: Cita & { estudiante: Estudiante };
  datosUsuario: DatosUsuario;
  adminCorreo: string;
  resumenConversacion?: string;
}

function buildMeetLink(cita: Cita): string {
  const base = (process.env.MEET_BASE_URL || 'https://meet.google.com').replace(/\/$/, '');
  const source = `${cita.id}-${new Date(cita.fecha).toISOString()}-${cita.hora}`;
  const hash = createHash('sha1').update(source).digest('hex').slice(0, 9);
  const token = `sofia-${hash.slice(0, 3)}-${hash.slice(3, 6)}`;
  return `${base}/${token}`;
}

export const notificationService = {
  async enviarNotificacionCita(data: NotificacionData): Promise<void> {
    const { cita, datosUsuario, adminCorreo, resumenConversacion } = data;
    const fechaFormateada = new Date(cita.fecha).toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const contenido = this.generarContenidoNotificacion(cita, datosUsuario, resumenConversacion);

    // Notificar al admin
    if (adminCorreo) {
      await this.enviarCorreo({
        to: adminCorreo,
        subject: `📅 Nueva Cita Agendada - ${cita.estudiante.nombre}`,
        html: contenido.admin,
      });
    }

    // Notificar al usuario
    if (datosUsuario.correo) {
      await this.enviarCorreo({
        to: datosUsuario.correo,
        subject: '✅ Confirmación de Cita - Consultorio Jurídico SOF-IA',
        html: contenido.usuario,
      });
    }

    // Notificar al estudiante
    if (cita.estudiante.correo) {
      await this.enviarCorreo({
        to: cita.estudiante.correo,
        subject: `📅 Nueva Cita Asignada - ${fechaFormateada}`,
        html: contenido.estudiante,
      });
    }

    console.log('✅ Notificaciones enviadas exitosamente');
  },

  generarContenidoNotificacion(cita: Cita & { estudiante: Estudiante }, datosUsuario: DatosUsuario, resumenConversacion?: string) {
    const fechaFormateada = new Date(cita.fecha).toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const esVirtual = cita.modalidad === 'VIRTUAL';
    const modalidadTexto = esVirtual ? 'VIRTUAL (Videollamada)' : 'PRESENCIAL';

    const enlaceReunion = esVirtual ? buildMeetLink(cita) : '';

    // Sección de resumen de conversación (solo para estudiante)
    const seccionResumen = resumenConversacion ? `
      <div style="background: #FEF3C7; padding: 15px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #F59E0B;">
        <h3 style="margin-top: 0; color: #F59E0B; font-size: 16px;">💬 Resumen de tu conversación con SOF-IA</h3>
        <p style="font-size: 14px; line-height: 1.6;">${resumenConversacion}</p>
      </div>
    ` : '';

    // Contenido para Admin
    const admin = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">📅 Nueva Cita Agendada</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Estudiante:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${cita.estudiante.nombre}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Documento Estudiante:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${cita.estudiante.documento}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Usuario:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${datosUsuario.nombre}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Fecha:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${fechaFormateada}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Hora:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${cita.hora}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Modalidad:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${modalidadTexto}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Motivo:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${cita.motivo || 'No especificado'}</td>
          </tr>
        </table>
        <p style="margin-top: 20px; color: #666;">Notificación enviada automáticamente por SOF-IA</p>
      </div>
    `;

    // Contenido para Usuario
    const usuario = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">✅ Tu cita ha sido confirmada</h2>
        <p>Hola <strong>${datosUsuario.nombre}</strong>,</p>
        <p>Tu cita en el Consultorio Jurídico ha sido agendada exitosamente.</p>
        
        <div style="background: #F3F4F6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #4F46E5;">📋 Detalles de tu cita</h3>
          <p><strong>📅 Fecha:</strong> ${fechaFormateada}</p>
          <p><strong>⏰ Hora:</strong> ${cita.hora}</p>
          <p><strong>🏢 Modalidad:</strong> ${modalidadTexto}</p>
          <p><strong>📝 Tipo de documento:</strong> ${datosUsuario.tipoDocumento}</p>
          <p><strong>📄 Número de documento:</strong> ${datosUsuario.numeroDocumento}</p>
          ${esVirtual && enlaceReunion ? `<p><strong>🔗 Enlace de videollamada:</strong> <a href="${enlaceReunion}" style="color: #4F46E5;">${enlaceReunion}</a></p>` : ''}
        </div>
        
        <p><strong>📍 Dirección:</strong> Consultorio Jurídico - Universidad</p>
        
        <p style="color: #666; font-size: 14px;">Por favor arrive 10 minutos antes de la hora programada.</p>
        <p style="color: #666; font-size: 14px;">Si necesitas reprogramar o cancelar, contactanos con anticipación.</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">Consultorio Jurídico SOF-IA - Universidad</p>
      </div>
    `;

    // Contenido para Estudiante
    const estudiante = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">📅 Nueva Cita Asignada</h2>
        <p>Hola <strong>${cita.estudiante.nombre}</strong>,</p>
        <p>Se ha asignado una nueva cita de atención.</p>
        
        ${seccionResumen}
        
        <div style="background: #F3F4F6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #4F46E5;">📋 Detalles de la cita</h3>
          <p><strong>📅 Fecha:</strong> ${fechaFormateada}</p>
          <p><strong>⏰ Hora:</strong> ${cita.hora}</p>
          <p><strong>🏢 Modalidad:</strong> ${modalidadTexto}</p>
          <p><strong>📝 Motivo:</strong> ${cita.motivo || 'No especificado'}</p>
          ${esVirtual && enlaceReunion ? `<p><strong>🔗 Enlace de videollamada:</strong> <a href="${enlaceReunion}" style="color: #4F46E5;">${enlaceReunion}</a></p>` : ''}
        </div>
        
        <p>Por favor confirmar asistencia.</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">Consultorio Jurídico SOF-IA - Universidad</p>
      </div>
    `;

    return { admin, usuario, estudiante };
  },

  detectarTipoCorreo(correo: string): 'MICROSOFT' | 'GMAIL' | 'OTRO' {
    const dominio = correo.toLowerCase().split('@')[1];
    
    if (dominio.includes('outlook') || dominio.includes('hotmail') || dominio.includes('live') || dominio.includes('msn')) {
      return 'MICROSOFT';
    }
    if (dominio.includes('gmail') || dominio.includes('googlemail')) {
      return 'GMAIL';
    }
    return 'OTRO';
  },

  async enviarCorreo({ to, subject, html }: { to: string; subject: string; html: string }): Promise<void> {
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Consultorio Jurídico" <noreply@consultorio.com>',
        to,
        subject,
        html,
      });
      console.log(`📧 Correo enviado a ${to}: ${info.messageId}`);
    } catch (error) {
      console.error(`❌ Error enviando correo a ${to}:`, error);
      throw error;
    }
  },

  async enviarRecordatorio24h(data: NotificacionData): Promise<void> {
    const { cita, datosUsuario } = data;
    const fechaFormateada = new Date(cita.fecha).toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F59E0B;">⏰ Recordatorio - Tu cita es mañana</h2>
        <p>Hola <strong>${datosUsuario.nombre}</strong>,</p>
        <p>Te recordamos que tienes una cita mañana:</p>
        <ul>
          <li><strong>Fecha:</strong> ${fechaFormateada}</li>
          <li><strong>Hora:</strong> ${cita.hora}</li>
          <li><strong>Modalidad:</strong> ${cita.modalidad === 'VIRTUAL' ? 'Virtual' : 'Presencial'}</li>
        </ul>
        <p>Por favor no olvides asistir.</p>
      </div>
    `;

    await this.enviarCorreo({
      to: datosUsuario.correo,
      subject: '⏰ Recordatorio: Tu cita es mañana - Consultorio Jurídico',
      html,
    });
  },

  async enviarRecordatorio15min(data: NotificacionData): Promise<void> {
    const { cita, datosUsuario } = data;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #EF4444;">🔔 Tu cita comienza en 15 minutos</h2>
        <p>Hola <strong>${datosUsuario.nombre}</strong>,</p>
        <p>Tu cita comienza en <strong>15 minutos</strong>.</p>
        <p><strong>Hora:</strong> ${cita.hora}</p>
        <p><strong>Modalidad:</strong> ${cita.modalidad === 'VIRTUAL' ? 'Virtual' : 'Presencial'}</p>
      </div>
    `;

    await this.enviarCorreo({
      to: datosUsuario.correo,
      subject: '🔔 Tu cita comienza en 15 minutos',
      html,
    });
  },

  async enviarNotificacionCancelacion(data: NotificacionData): Promise<void> {
    const { cita, datosUsuario, adminCorreo } = data;
    const fechaFormateada = new Date(cita.fecha).toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const htmlUsuario = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #EF4444;">❌ Cita Cancelada</h2>
        <p>Hola <strong>${datosUsuario.nombre}</strong>,</p>
        <p>Tu cita ha sido cancelada:</p>
        <ul>
          <li><strong>Fecha:</strong> ${fechaFormateada}</li>
          <li><strong>Hora:</strong> ${cita.hora}</li>
        </ul>
        <p>Si deseas reprogramar, por favor contactanos.</p>
      </div>
    `;

    if (datosUsuario.correo) {
      await this.enviarCorreo({
        to: datosUsuario.correo,
        subject: '❌ Cita Cancelada - Consultorio Jurídico SOF-IA',
        html: htmlUsuario,
      });
    }

    if (cita.estudiante.correo) {
      await this.enviarCorreo({
        to: cita.estudiante.correo,
        subject: '❌ Cita Cancelada',
        html: htmlUsuario,
      });
    }

    if (adminCorreo) {
      await this.enviarCorreo({
        to: adminCorreo,
        subject: '❌ Cita Cancelada',
        html: htmlUsuario,
      });
    }
  },

  async enviarNotificacionReprogramacion(data: NotificacionData, nuevaFecha: Date, nuevaHora: string): Promise<void> {
    const { cita, datosUsuario, adminCorreo } = data;
    const fechaAnterior = new Date(cita.fecha).toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const fechaNueva = nuevaFecha.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const enlaceReunion = cita.modalidad === 'VIRTUAL' ? buildMeetLink(cita) : '';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F59E0B;">📅 Cita Reprogramada</h2>
        <p>Hola <strong>${datosUsuario.nombre}</strong>,</p>
        <p>Tu cita ha sido reprogramada:</p>
        <ul>
          <li><strong>Fecha anterior:</strong> ${fechaAnterior}</li>
          <li><strong>Nueva fecha:</strong> ${fechaNueva}</li>
          <li><strong>Nueva hora:</strong> ${nuevaHora}</li>
          ${enlaceReunion ? `<li><strong>Enlace Meet:</strong> <a href="${enlaceReunion}">${enlaceReunion}</a></li>` : ''}
        </ul>
      </div>
    `;

    if (datosUsuario.correo) {
      await this.enviarCorreo({
        to: datosUsuario.correo,
        subject: '📅 Cita Reprogramada - Consultorio Jurídico SOF-IA',
        html,
      });
    }

    if (cita.estudiante.correo) {
      await this.enviarCorreo({
        to: cita.estudiante.correo,
        subject: '📅 Cita Reprogramada',
        html,
      });
    }

    if (adminCorreo) {
      await this.enviarCorreo({
        to: adminCorreo,
        subject: '📅 Cita Reprogramada',
        html,
      });
    }
  },
};

export default notificationService;
