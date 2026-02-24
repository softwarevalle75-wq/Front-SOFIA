import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const webhookController = {
  async verify(req: Request, res: Response) {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      // Obtener token de verificación de la configuración
      const config = await prisma.configuracionWhatsApp.findFirst();
      const verifyToken = config?.webhookVerifyToken || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

      if (mode === 'subscribe' && token === verifyToken) {
        console.log('Webhook verificado correctamente');
        res.status(200).send(challenge);
      } else {
        console.log('Token de verificación incorrecto');
        res.status(403).json({ success: false, message: 'Token de verificación incorrecto' });
      }
    } catch (error) {
      console.error('Error en verificación de webhook:', error);
      res.status(500).json({ success: false, message: 'Error al verificar webhook' });
    }
  },

  async receive(req: Request, res: Response) {
    try {
      const body = req.body;

      // Registrar el webhook para debugging
      await prisma.webhookLog.create({
        data: {
          tipo: body.entry?.[0]?.changes?.[0]?.value?.messages ? 'message' : 'notification',
          payload: body,
          processed: false
        }
      });

      // Responder rápidamente a WhatsApp
      res.status(200).json({ success: true });

      // Procesar el mensaje en segundo plano
      procesarMensajeWhatsApp(body);
    } catch (error) {
      console.error('Error receive webhook:', error);
      res.status(200).json({ success: true }); // Siempre responder 200 a WhatsApp
    }
  }
};

async function procesarMensajeWhatsApp(body: any) {
  try {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) return;

    const from = message.from; // Número de teléfono del usuario
    const messageText = message.text?.body || '';
    const timestamp = new Date(parseInt(message.timestamp) * 1000);

    // Buscar o crear estudiante por número de teléfono
    let estudiante = await prisma.estudiante.findFirst({
      where: { telefono: from }
    });

    // Crear conversación si no existe una activa
    let conversacion = await prisma.conversacion.findFirst({
      where: {
        estudianteId: estudiante?.id,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!conversacion) {
      conversacion = await prisma.conversacion.create({
        data: {
          estudianteId: estudiante?.id,
          temaLegal: 'Consulta general',
          canal: 'whatsapp',
          primerMensaje: messageText,
          estado: 'no_leido'
        }
      });
    }

    // Guardar mensaje del usuario
    await prisma.mensaje.create({
      data: {
        conversacionId: conversacion.id,
        tipo: 'usuario',
        contenido: messageText
      }
    });

    // Aquí tu compañero integrará el chatbot
    // const respuesta = await chatbotProcesar(messageText);
    
    // Ejemplo de respuesta automática (placeholder)
    const respuesta = "Gracias por contactarnos. Un asesor te atenderá pronto. ¿En qué tema legal podemos ayudarte?";

    // Guardar respuesta del bot
    await prisma.mensaje.create({
      data: {
        conversacionId: conversacion.id,
        tipo: 'ia',
        contenido: respuesta
      }
    });

    // Enviar respuesta a WhatsApp
    await enviarMensajeWhatsApp(from, respuesta);

    // Marcar webhook como procesado
    await prisma.webhookLog.updateMany({
      where: { payload: body },
      data: { processed: true }
    });

  } catch (error) {
    console.error('Error procesando mensaje de WhatsApp:', error);
  }
}

async function enviarMensajeWhatsApp(to: string, mensaje: string) {
  try {
    const config = await prisma.configuracionWhatsApp.findFirst();
    
    if (!config?.phoneNumberId || !config?.tokenAcceso) {
      console.log('WhatsApp no configurado, respuesta no enviada');
      return;
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.tokenAcceso}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: mensaje }
        })
      }
    );

    const data = await response.json();
    console.log('Mensaje enviado a WhatsApp:', data);
  } catch (error) {
    console.error('Error enviando mensaje a WhatsApp:', error);
  }
}
