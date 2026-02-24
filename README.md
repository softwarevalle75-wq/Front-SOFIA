# 🎓 SOF-IA - Sistema de Gestión Administrativa del Consultorio Jurídico

<div align="center">

**Plataforma Full Stack para la Administración del Consultorio Jurídico**  
*Institución Universitaria de Colombia*

[Descripción](#-descripción-general) • [Tecnologías](#-tecnologías) • [Arquitectura](#-arquitectura) • [Características](#-características) • [Despliegue](#-despliegue-con-docker) • [Desarrollo](#-guía-de-desarrollo)

</div>

---

## 📖 Tabla de Contenidos

- [Descripción General](#-descripción-general)
- [Tecnologías](#-tecnologías)
- [Arquitectura](#-arquitectura)
- [Características](#-características)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Base de Datos](#-base-de-datos)
- [Configuración](#-configuración)
- [Despliegue con Docker](#-despliegue-con-docker)
- [Guía de Desarrollo](#-guía-de-desarrollo)

---

## 🎯 Descripción General

**SOF-IA** es una plataforma full stack desarrollada para la administración del **Consultorio Jurídico** de la Institución Universitaria de Colombia. El sistema proporciona una solución integral para la gestión de citas, estudiantes, conversaciones con chatbot, encuestas de satisfacción y notificaciones.

### Módulos Principales

| Módulo | Descripción |
|--------|-------------|
| 📊 **Dashboard** | Panel principal con estadísticas y métricas |
| 💬 **Chat History** | Historial de conversaciones del chatbot |
| 📝 **Encuestas** | Gestión de encuestas de satisfacción |
| 🎓 **Estudiantes** | Administración de estudiantes y citas |
| 📜 **Historial** | Registro de actividades y auditoría |
| 🔔 **Notificaciones** | Sistema de notificaciones en tiempo real |

---

## 🛠️ Tecnologías

### Frontend (`sof-ia-frontend`)

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 19.2.0 | Framework UI |
| TypeScript | 5.9.3 | Tipado estático |
| Vite | 7.2.4 | Build tool |
| React Router DOM | 7.13.0 | Enrutamiento |
| Tailwind CSS | 3.4.0 | Estilos |
| Axios | 1.13.4 | Cliente HTTP |
| Recharts | 3.7.0 | Gráficos |
| Lucide React | 0.563.0 | Iconos |
| date-fns | 4.1.0 | Manipulación de fechas |
| jsPDF + html2canvas | 4.1.0 + 1.4.1 | Exportación PDF |
| XLSX | 0.18.5 | Exportación Excel |

### Backend (`sof-ia-backend`)

#### API Gateway (`sof-ia-gateway`)
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Express | 4.18.2 | Framework web |
| TypeScript | 5.3.3 | Tipado estático |
| http-proxy-middleware | 2.0.6 | Proxy de solicitudes |
| Helmet | 7.1.0 | Seguridad HTTP |
| CORS | 2.8.5 | Control de acceso |

#### Servicio de Autenticación (`sof-ia-auth`)
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Express | 4.18.2 | Framework web |
| TypeScript | 5.3.3 | Tipado estático |
| Prisma | 5.10.0 | ORM |
| PostgreSQL | 16 | Base de datos |
| JWT | 9.0.2 | Autenticación |
| bcryptjs | 2.4.3 | Hash de contraseñas |
| Zod | 3.22.4 | Validación de datos |
| Nodemailer | 8.0.1 | Envío de correos |
| express-rate-limit | 7.1.5 | Control de peticiones |

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE WEB (React)                       │
│                     Puerto: 5173 (dev)                       │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway                               │
│                   Puerto: 3000                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Enrutamiento de solicitudes a microservicios        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Servicio de Autenticación                       │
│                   Puerto: 3001                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  • Autenticación y autorización (JWT)                │   │
│  │  • Gestión de usuarios y sesiones                    │   │
│  │  • Gestión de estudiantes y citas                    │   │
│  │  • Conversaciones y chatbot                          │   │
│  │  • Encuestas de satisfacción                         │   │
│  │  • Notificaciones                                    │   │
│  │  • Auditoría y métricas                              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL                                │
│                   Puerto: 5432                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  • Usuarios, sesiones, intentos de login             │   │
│  │  • Estudiantes, citas, asesoramientos                │   │
│  │  • Conversaciones, mensajes                          │   │
│  │  • Encuestas, métricas, notificaciones               │   │
│  │  • Configuración WhatsApp, webhooks                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Características

### 🔐 Sistema de Autenticación
- ✅ Login con correo y contraseña
- ✅ Tokens JWT con expiración configurable
- ✅ Control de intentos de login (máximo 5 en 15 minutos)
- ✅ Gestión de sesiones activas
- ✅ Cambio de contraseña en primer ingreso
- ✅ Validación de contraseñas segura

### 🎓 Gestión de Estudiantes
- ✅ CRUD completo de estudiantes
- ✅ Información académica (programa, semestre, modalidad)
- ✅ Estado de cuenta y acceso a citas
- ✅ Historial de citas y conversaciones

### 📅 Gestión de Citas
- ✅ Agendamiento de citas
- ✅ Modalidad presencial/virtual
- ✅ Estados: agendada, cancelada, completada
- ✅ Notificaciones automáticas (24h y 15min antes)
- ✅ Enlaces de reunión virtual

### 💬 Integración con Chatbot
- ✅ Conversaciones de WhatsApp
- ✅ Historial de mensajes
- ✅ Asesoramientos jurídicos
- ✅ Temas legales categorizados
- ✅ Configuración de webhook

### 📊 Encuestas de Satisfacción
- ✅ Calificación 1-5 estrellas
- ✅ Comentarios opcionales
- ✅ Métricas de satisfacción
- ✅ Fuente: WhatsApp/Web

### 🔔 Notificaciones
- ✅ Notificaciones en tiempo real
- ✅ Tipos: cita, recordatorio, general
- ✅ Prioridad: alta, media, baja
- ✅ Marcador de leídas/no leídas

### 📈 Métricas y Auditoría
- ✅ Métricas mensuales automáticas
- ✅ Registro de auditoría de acciones
- ✅ Estadísticas de citas y conversaciones
- ✅ Reportes exportables (PDF, Excel)

---

## 📁 Estructura del Proyecto

```
Front-Sof-IA/
├── 🌐 sof-ia-frontend/           # Aplicación React
│   ├── src/
│   │   ├── assets/               # Recursos estáticos
│   │   ├── components/           # Componentes reutilizables
│   │   │   ├── charts/           # Componentes de gráficos
│   │   │   ├── chat/             # Componentes de chat
│   │   │   ├── common/           # Componentes comunes
│   │   │   ├── dashboard/        # Componentes del dashboard
│   │   │   ├── excel/            # Componentes de exportación
│   │   │   ├── layout/           # Layouts (Sidebar, Header)
│   │   │   ├── notifications/    # Componentes de notificaciones
│   │   │   └── students/         # Componentes de estudiantes
│   │   ├── config/               # Configuraciones globales
│   │   ├── features/             # Módulos por funcionalidad
│   │   │   ├── auth/             # Autenticación
│   │   │   ├── chat-history/     # Historial de chat
│   │   │   ├── dashboard/        # Dashboard principal
│   │   │   ├── historial/        # Historial/auditoría
│   │   │   ├── notifications/    # Notificaciones
│   │   │   ├── students/         # Gestión de estudiantes
│   │   │   └── surveys/          # Encuestas
│   │   ├── hooks/                # Custom React Hooks
│   │   ├── routes/               # Configuración de rutas
│   │   ├── services/             # Servicios de API
│   │   ├── types/                # Definiciones TypeScript
│   │   └── utils/                # Funciones utilitarias
│   ├── public/
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
│
├── ⚙️ sof-ia-backend/             # Backend
│   ├── sof-ia-gateway/           # API Gateway
│   │   ├── src/
│   │   │   ├── utils/
│   │   │   ├── app.ts
│   │   │   └── server.ts
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── sof-ia-auth/              # Servicio principal
│   │   ├── src/
│   │   │   ├── config/           # Configuración
│   │   │   ├── controllers/      # Controladores
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── cita.controller.ts
│   │   │   │   ├── config-whatsapp.controller.ts
│   │   │   │   ├── conversacion.controller.ts
│   │   │   │   ├── encuesta.controller.ts
│   │   │   │   ├── estudiante.controller.ts
│   │   │   │   ├── historial.controller.ts
│   │   │   │   ├── notificacion.controller.ts
│   │   │   │   ├── stats.controller.ts
│   │   │   │   └── webhook.controller.ts
│   │   │   ├── dto/              # Objetos de transferencia
│   │   │   ├── middlewares/      # Middlewares
│   │   │   ├── routes/           # Rutas de API
│   │   │   ├── services/         # Lógica de negocio
│   │   │   └── utils/            # Utilidades
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # Esquema de base de datos
│   │   │   └── seed.ts           # Datos de prueba
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── docker-compose.yml        # Orquestación Docker
│   └── prisma.config.ts
│
├── package.json
└── README.md
```

---

## 🗄️ Base de Datos

### Modelo Entidad-Relación

El esquema de PostgreSQL incluye las siguientes entidades principales:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Usuario    │     │   Estudiante │     │     Cita     │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id           │     │ id           │     │ id           │
│ nombre       │     │ documento    │     │ estudianteId │◄────┐
│ correo       │     │ nombre       │     │ fecha        │     │
│ passwordHash │     │ programa     │     │ hora         │     │
│ rol          │     │ semestre     │     │ modalidad    │     │
│ estado       │     │ estado       │     │ estado       │     │
└──────────────┘     └──────────────┘     └──────────────┘     │
       │                    │                    │              │
       │                    │                    │              │
       ▼                    ▼                    ▼              │
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     │
│  Intento     │     │Conversacion  │────►│  Mensaje     │     │
│    Login     │     ├──────────────┤     ├──────────────┤     │
└──────────────┘     │ estudianteId │     │conversacionId│     │
                     │ temaLegal    │     │ tipo         │     │
                     │ estado       │     │ contenido    │     │
                     └──────────────┘     └──────────────┘     │
                            │                                   │
                            │                                   │
                            ▼                                   │
                     ┌──────────────┐                          │
                     │Asesoramiento │                          │
                     ├──────────────┤                          │
                     │conversacionId│                          │
                     │estudianteId  │                          │
                     │duracion      │                          │
                     └──────────────┘                          │
                            │                                   │
                            ▼                                   │
                     ┌──────────────┐                          │
                     │  Encuesta    │                          │
                     ├──────────────┤                          │
                     │conversacionId│                          │
                     │calificacion  │                          │
                     │comentario    │                          │
                     └──────────────┘                          │
                                                               │
┌──────────────┐     ┌──────────────┐                         │
│  Sesion      │     │ Notificacion │                         │
├──────────────┤     ├──────────────┤                         │
│ id           │     │ id           │                         │
│ usuarioId    │     │ estudianteId │─────────────────────────┘
│ token        │     │ tipo         │
│ expiresAt    │     │ titulo       │
│ activa       │     │ mensaje      │
└──────────────┘     │ prioridad    │
                     └──────────────┘
```

### Tablas Principales

| Tabla | Descripción |
|-------|-------------|
| `usuarios` | Usuarios del sistema (admin, estudiantes) |
| `sesiones` | Sesiones activas con tokens JWT |
| `intentos_login` | Registro de intentos de autenticación |
| `estudiantes` | Información de estudiantes |
| `citas` | Citas agendadas |
| `conversaciones` | Conversaciones del chatbot |
| `mensajes` | Mensajes de conversaciones |
| `asesoramientos` | Asesoramientos jurídicos realizados |
| `encuestas_satisfaccion` | Encuestas de satisfacción |
| `notificaciones` | Notificaciones del sistema |
| `auditoria` | Registro de auditoría de acciones |
| `metricas_mensuales` | Métricas agregadas por mes |
| `configuracion_whatsapp` | Configuración de WhatsApp Business API |
| `webhook_logs` | Logs de webhooks recibidos |
| `plantillas_mensaje` | Plantillas de mensajes predefinidos |

---

## ⚙️ Configuración

### Frontend (`.env`)

```bash
# URL del backend (API Gateway)
VITE_API_URL=http://localhost:3000/api

# URL del chatbot de WhatsApp (opcional)
VITE_CHATBOT_URL=https://web.whatsapp.com
```

### Backend - Servicio Auth (`.env`)

```bash
# Base de datos
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sofia_auth

# JWT
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES_IN=30m

# Servidor
PORT=3001

# Seguridad
MAX_LOGIN_ATTEMPTS=5
LOGIN_ATTEMPT_WINDOW_MINUTES=15
SESSION_TIMEOUT_MINUTES=30

# Validación de contraseña
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBER=true
PASSWORD_REQUIRE_SPECIAL=true

# SMTP (correo electrónico)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu_correo@gmail.com
SMTP_PASS=tu_contraseña_app
SMTP_FROM="Consultorio Jurídico SOF-IA" <tu_correo@gmail.com>
```

### Backend - API Gateway (`.env`)

```bash
# Servidor
PORT=3000

# Servicios
AUTH_SERVICE_URL=http://localhost:3001
```

---

## 🐳 Despliegue con Docker

### Servicios Docker

El `docker-compose.yml` define 3 servicios:

| Servicio | Contenedor | Puerto | Descripción |
|----------|------------|--------|-------------|
| `postgres_auth` | `sofia_postgres_auth` | 5432 | Base de datos PostgreSQL 16 |
| `sofia_auth` | `sofia_auth` | 3001 | Servicio de autenticación |
| `sofia_gateway` | `sofia_gateway` | 3000 | API Gateway |

### Comandos Docker

```bash
# Navegar al directorio del backend
cd sof-ia-backend

# Levantar toda la infraestructura (construye y ejecuta)
docker-compose up --build

# Levantar en modo detach (segundo plano)
docker-compose up -d --build

# Detener servicios
docker-compose down

# Ver logs en tiempo real
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f sofia_auth

# Reiniciar un servicio
docker-compose restart sofia_auth

# Eliminar volúmenes (¡cuidado! se pierden los datos)
docker-compose down -v
```

### Migraciones y Seed

Las migraciones y el seed se ejecutan automáticamente al iniciar el contenedor `sofia_auth`. El comando configurado es:

```bash
npx prisma db push --accept-data-loss && npx ts-node prisma/seed.ts && npm start
```

Para ejecutar manualmente:

```bash
# Dentro del contenedor
docker-compose exec sofia_auth npx prisma migrate deploy
docker-compose exec sofia_auth npx prisma db seed

# O localmente (si tienes Prisma instalado)
cd sof-ia-backend/sof-ia-auth
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

---

## 🚀 Guía de Desarrollo

### Prerrequisitos

- Node.js >= 18.x
- npm >= 9.x
- Docker y Docker Compose (para despliegue con contenedores)
- PostgreSQL 16 (para desarrollo local sin Docker)

### Instalación

#### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd Front-Sof-IA
```

#### 2. Instalar dependencias del Frontend

```bash
cd sof-ia-frontend
npm install
```

#### 3. Instalar dependencias del Backend

```bash
# API Gateway
cd sof-ia-backend/sof-ia-gateway
npm install

# Servicio de Autenticación
cd ../sof-ia-auth
npm install
```

### Scripts Disponibles

#### Frontend

```bash
cd sof-ia-frontend

# Desarrollo (inicia servidor en http://localhost:5173)
npm run dev

# Build de producción
npm run build

# Previsualizar build
npm run preview

# Linting
npm run lint
```

#### Backend - API Gateway

```bash
cd sof-ia-backend/sof-ia-gateway

# Desarrollo (auto-reload)
npm run dev

# Build
npm run build

# Producción
npm run start
```

#### Backend - Servicio Auth

```bash
cd sof-ia-backend/sof-ia-auth

# Desarrollo (auto-reload)
npm run dev

# Build
npm run build

# Producción
npm run start

# Prisma
npm run prisma:generate   # Generar cliente Prisma
npm run prisma:migrate    # Ejecutar migraciones
npm run prisma:push       # Push del esquema (desarrollo)
npm run seed              # Ejecutar seed de datos
```

### Desarrollo Local (sin Docker)

1. **Iniciar PostgreSQL localmente** (puerto 5432)

2. **Configurar variables de entorno** en `sof-ia-auth/.env`

3. **Ejecutar migraciones**:
   ```bash
   cd sof-ia-backend/sof-ia-auth
   npx prisma migrate dev
   npx prisma db seed
   ```

4. **Iniciar servicios**:
   ```bash
   # Terminal 1 - Servicio Auth
   cd sof-ia-backend/sof-ia-auth
   npm run dev

   # Terminal 2 - API Gateway
   cd sof-ia-backend/sof-ia-gateway
   npm run dev

   # Terminal 3 - Frontend
   cd sof-ia-frontend
   npm run dev
   ```

5. **Acceder a la aplicación**: http://localhost:5173

---

## 📋 Endpoints de la API

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/login` | Inicio de sesión |
| POST | `/api/auth/logout` | Cerrar sesión |
| POST | `/api/auth/first-login` | Cambio de contraseña en primer login |
| GET | `/api/auth/me` | Obtener usuario actual |
| POST | `/api/auth/refresh` | Refrescar token |

### Estudiantes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/estudiantes` | Listar estudiantes |
| GET | `/api/estudiantes/:id` | Obtener estudiante por ID |
| POST | `/api/estudiantes` | Crear estudiante |
| PUT | `/api/estudiantes/:id` | Actualizar estudiante |
| DELETE | `/api/estudiantes/:id` | Eliminar estudiante |
| GET | `/api/estudiantes/:id/citas` | Obtener citas del estudiante |

### Citas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/citas` | Listar citas |
| GET | `/api/citas/:id` | Obtener cita por ID |
| POST | `/api/citas` | Crear cita |
| PUT | `/api/citas/:id` | Actualizar cita |
| DELETE | `/api/citas/:id` | Cancelar cita |
| POST | `/api/citas/:id/completar` | Marcar cita como completada |

### Conversaciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/conversaciones` | Listar conversaciones |
| GET | `/api/conversaciones/:id` | Obtener conversación |
| GET | `/api/conversaciones/:id/mensajes` | Obtener mensajes |
| POST | `/api/conversaciones/:id/asesoramiento` | Crear asesoramiento |

### Encuestas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/encuestas` | Listar encuestas |
| GET | `/api/encuestas/stats` | Estadísticas de encuestas |
| POST | `/api/encuestas` | Crear encuesta |

### Notificaciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/notificaciones` | Listar notificaciones |
| PUT | `/api/notificaciones/:id/leer` | Marcar como leída |
| PUT | `/api/notificaciones/leer-todas` | Marcar todas como leídas |

### Estadísticas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/stats/dashboard` | Estadísticas del dashboard |
| GET | `/api/stats/mensuales` | Métricas mensuales |
| GET | `/api/stats/citas` | Estadísticas de citas |

### Webhook

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/webhook/whatsapp` | Webhook de WhatsApp |

---

## 🔒 Seguridad

### Medidas Implementadas

| Medida | Implementación |
|--------|----------------|
| **Hash de contraseñas** | bcryptjs con salt rounds |
| **Autenticación** | JWT con expiración configurable |
| **Rate Limiting** | Máximo 5 intentos de login en 15 min |
| **Validación de datos** | Zod schemas |
| **Seguridad HTTP** | Helmet headers |
| **CORS** | Control de acceso entre dominios |
| **Sesiones** | Tokens únicos con expiración |

### Políticas de Contraseña

- Longitud mínima: 8 caracteres
- Requiere mayúscula
- Requiere minúscula
- Requiere número
- Requiere carácter especial

---

## 📚 Recursos Adicionales

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Router Docs](https://reactrouter.com)
- [Express.js Docs](https://expressjs.com)
- [Prisma Docs](https://www.prisma.io/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Docker Docs](https://docs.docker.com)

---

<div align="center">

### 🎉 ¡Listo para Comenzar!

**SOF-IA** está construido con las mejores prácticas y tecnologías modernas para proporcionar una solución robusta y escalable para la gestión del Consultorio Jurídico.

---

*Documentación actualizada - Febrero 2026*

**Institución Universitaria de Colombia**

</div>
