import 'dotenv/config';
import path from 'path';
import { promises as fs } from 'fs';
import prisma from '../config/prisma';

type Args = {
  dryRun: boolean;
  since: Date | null;
  limit: number | null;
  offset: number;
};

type DuplicateEmailEntry = {
  correoNormalizado: string;
  cantidad: number;
};

type ExportSummary = {
  totalStudentsExported: number;
  totalAppointmentsExported: number;
  studentsMissingEmail: number;
  duplicateEmailsByNormalized: DuplicateEmailEntry[];
  appointmentsWithoutStudent: number;
  appointmentsWithInvalidDateTime: number;
  sinceApplied: string | null;
};

const BOGOTA_OFFSET = '-05:00';

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  return value.toLowerCase() === 'true';
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Parametro numerico invalido: ${value}`);
  }
  return parsed;
}

function parseSince(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`SINCE invalido. Debe ser timestamp ISO: ${value}`);
  }
  return parsed;
}

function normalizeEmail(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

function datePartInBogota(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value || '1970';
  const month = parts.find((p) => p.type === 'month')?.value || '01';
  const day = parts.find((p) => p.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
}

function normalizeHora(value: string | null | undefined): string | null {
  const raw = (value || '').trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hh = Number.parseInt(match[1], 10);
  const mm = Number.parseInt(match[2], 10);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function buildFechaHoraIso(fecha: Date | null, hora: string | null | undefined): { value: string | null; valid: boolean } {
  if (!fecha) {
    return { value: null, valid: false };
  }

  const datePart = datePartInBogota(fecha);
  const horaNormalizada = normalizeHora(hora);
  if (!horaNormalizada) {
    return { value: null, valid: false };
  }

  const candidate = `${datePart}T${horaNormalizada}:00${BOGOTA_OFFSET}`;
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) {
    return { value: null, valid: false };
  }

  return { value: candidate, valid: true };
}

function parseArgs(): Args {
  return {
    dryRun: parseBoolean(process.env.DRY_RUN, true),
    since: parseSince(process.env.SINCE),
    limit: parseNumber(process.env.LIMIT),
    offset: parseNumber(process.env.OFFSET) || 0,
  };
}

async function ensureExportDir(exportDir: string): Promise<void> {
  await fs.mkdir(exportDir, { recursive: true });
}

function buildWhereClause(since: Date | null): Record<string, unknown> {
  if (!since) return {};
  return {
    OR: [
      { creadoEn: { gte: since } },
      { actualizadoEn: { gte: since } },
    ],
  };
}

async function main(): Promise<void> {
  const args = parseArgs();
  const where = buildWhereClause(args.since);

  const estudiantes = await prisma.estudiante.findMany({
    where,
    orderBy: { actualizadoEn: 'asc' },
    ...(args.limit ? { take: args.limit } : {}),
    ...(args.offset ? { skip: args.offset } : {}),
  });

  const citas = await prisma.cita.findMany({
    where,
    include: {
      estudiante: {
        select: {
          id: true,
          correo: true,
        },
      },
    },
    orderBy: { actualizadoEn: 'asc' },
    ...(args.limit ? { take: args.limit } : {}),
    ...(args.offset ? { skip: args.offset } : {}),
  });

  const emailCounter = new Map<string, number>();
  let studentsMissingEmail = 0;

  const studentRows = estudiantes.map((student) => {
    const correoRaw = student.correo;
    const correoNormalizado = normalizeEmail(correoRaw);

    if (!correoNormalizado) {
      studentsMissingEmail += 1;
    } else {
      emailCounter.set(correoNormalizado, (emailCounter.get(correoNormalizado) || 0) + 1);
    }

    return {
      sourceStudentId: student.id,
      correo: correoRaw,
      correoNormalizado,
      nombre: student.nombre,
      telefono: student.telefono,
      programa: student.programa,
      modalidad: student.modalidad,
      estado: student.estado,
      estadoCuenta: student.estadoCuenta,
      accesoCitas: student.accesoCitas,
      acudimientos: student.acudimientos,
      fechaInicio: student.fechaInicio ? student.fechaInicio.toISOString() : null,
      createdAt: student.creadoEn.toISOString(),
      updatedAt: student.actualizadoEn.toISOString(),
    };
  });

  const duplicateEmailsByNormalized: DuplicateEmailEntry[] = Array.from(emailCounter.entries())
    .filter(([, cantidad]) => cantidad > 1)
    .map(([correoNormalizado, cantidad]) => ({ correoNormalizado, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

  let appointmentsWithoutStudent = 0;
  let appointmentsWithInvalidDateTime = 0;

  const appointmentRows = citas.map((appointment) => {
    const resolvedStudentEmail = normalizeEmail(appointment.estudiante?.correo || undefined);
    if (!appointment.estudiante) {
      appointmentsWithoutStudent += 1;
    }

    const fechaHora = buildFechaHoraIso(appointment.fecha, appointment.hora);
    if (!fechaHora.valid) {
      appointmentsWithInvalidDateTime += 1;
    }

    return {
      sourceAppointmentId: appointment.id,
      sourceStudentId: appointment.estudianteId,
      studentCorreoNormalizado: resolvedStudentEmail || null,
      fecha: appointment.fecha ? appointment.fecha.toISOString() : null,
      hora: appointment.hora,
      fechaHoraISO: fechaHora.value,
      estado: appointment.estado,
      modalidad: appointment.modalidad,
      motivo: appointment.motivo,
      usuarioNombre: appointment.usuarioNombre,
      usuarioTipoDocumento: appointment.usuarioTipoDocumento,
      usuarioNumeroDocumento: appointment.usuarioNumeroDocumento,
      usuarioCorreo: appointment.usuarioCorreo,
      usuarioTelefono: appointment.usuarioTelefono,
      enlaceReunion: appointment.enlaceReunion,
      conversacionId: appointment.conversacionId,
      origen: 'SOFIA',
      createdAt: appointment.creadoEn.toISOString(),
      updatedAt: appointment.actualizadoEn.toISOString(),
    };
  });

  const summary: ExportSummary = {
    totalStudentsExported: studentRows.length,
    totalAppointmentsExported: appointmentRows.length,
    studentsMissingEmail,
    duplicateEmailsByNormalized,
    appointmentsWithoutStudent,
    appointmentsWithInvalidDateTime,
    sinceApplied: args.since ? args.since.toISOString() : null,
  };

  const exportDir = path.resolve(process.cwd(), 'exports');
  const studentsFile = path.join(exportDir, 'sofia_estudiantes.jsonl');
  const appointmentsFile = path.join(exportDir, 'sofia_citas.jsonl');
  const summaryFile = path.join(exportDir, 'sofia_export_summary.json');

  if (args.dryRun) {
    console.log('DRY_RUN=true, no se escriben archivos.');
  } else {
    await ensureExportDir(exportDir);

    const studentsJsonl = `${studentRows.map((row) => JSON.stringify(row)).join('\n')}\n`;
    const appointmentsJsonl = `${appointmentRows.map((row) => JSON.stringify(row)).join('\n')}\n`;

    await fs.writeFile(studentsFile, studentsJsonl, 'utf8');
    await fs.writeFile(appointmentsFile, appointmentsJsonl, 'utf8');
    await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2), 'utf8');

    console.log(`Archivo generado: ${studentsFile}`);
    console.log(`Archivo generado: ${appointmentsFile}`);
    console.log(`Archivo generado: ${summaryFile}`);
  }

  console.log('Resumen de exportacion:');
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error('Error exportando datos SOFIA:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
