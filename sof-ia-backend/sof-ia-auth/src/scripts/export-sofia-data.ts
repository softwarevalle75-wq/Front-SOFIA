import 'dotenv/config';
import path from 'path';
import { promises as fs } from 'fs';
import { Client } from 'pg';

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

type StudentRowDb = {
  sourceStudentId: string;
  correo: string | null;
  nombre: string;
  telefono: string | null;
  programa: string | null;
  modalidad: string;
  estado: string;
  estadoCuenta: string;
  accesoCitas: boolean;
  acudimientos: boolean;
  fechaInicio: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type AppointmentRowDb = {
  sourceAppointmentId: string;
  sourceStudentId: string | null;
  studentCorreoRaw: string | null;
  fecha: Date | null;
  hora: string | null;
  estado: string;
  modalidad: string;
  motivo: string | null;
  usuarioNombre: string | null;
  usuarioTipoDocumento: string | null;
  usuarioNumeroDocumento: string | null;
  usuarioCorreo: string | null;
  usuarioTelefono: string | null;
  enlaceReunion: string | null;
  conversacionId: string | null;
  createdAt: Date;
  updatedAt: Date;
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

function buildPaginationSql(params: Array<string | number | Date>, limit: number | null, offset: number): string {
  let sql = '';
  if (limit !== null) {
    params.push(limit);
    sql += ` LIMIT $${params.length}`;
  }

  if (offset > 0) {
    params.push(offset);
    sql += ` OFFSET $${params.length}`;
  }

  return sql;
}

function toIso(value: Date | null | undefined): string | null {
  return value ? new Date(value).toISOString() : null;
}

async function fetchStudents(client: Client, args: Args): Promise<StudentRowDb[]> {
  const params: Array<string | number | Date> = [];
  let whereSql = '';

  if (args.since) {
    params.push(args.since);
    whereSql = `WHERE (s.creado_en >= $${params.length} OR s.actualizado_en >= $${params.length})`;
  }

  const paginationSql = buildPaginationSql(params, args.limit, args.offset);
  const sql = `
    SELECT
      s.id AS "sourceStudentId",
      s.correo AS "correo",
      s.nombre AS "nombre",
      s.telefono AS "telefono",
      s.programa AS "programa",
      s.modalidad::text AS "modalidad",
      s.estado::text AS "estado",
      s."estadoCuenta" AS "estadoCuenta",
      s."accesoCitas" AS "accesoCitas",
      s.acudimientos AS "acudimientos",
      s.fecha_inicio AS "fechaInicio",
      s.creado_en AS "createdAt",
      s.actualizado_en AS "updatedAt"
    FROM estudiantes s
    ${whereSql}
    ORDER BY s.actualizado_en ASC
    ${paginationSql}
  `;

  const result = await client.query<StudentRowDb>(sql, params);
  return result.rows;
}

async function fetchAppointments(client: Client, args: Args): Promise<AppointmentRowDb[]> {
  const params: Array<string | number | Date> = [];
  let whereSql = '';

  if (args.since) {
    params.push(args.since);
    whereSql = `WHERE (c.creado_en >= $${params.length} OR c.actualizado_en >= $${params.length})`;
  }

  const paginationSql = buildPaginationSql(params, args.limit, args.offset);
  const sql = `
    SELECT
      c.id AS "sourceAppointmentId",
      c.estudiante_id AS "sourceStudentId",
      e.correo AS "studentCorreoRaw",
      c.fecha AS "fecha",
      c.hora AS "hora",
      c.estado::text AS "estado",
      c.modalidad::text AS "modalidad",
      c.motivo AS "motivo",
      c.usuario_nombre AS "usuarioNombre",
      c.usuario_tipo_documento AS "usuarioTipoDocumento",
      c.usuario_numero_documento AS "usuarioNumeroDocumento",
      c.usuario_correo AS "usuarioCorreo",
      c.usuario_telefono AS "usuarioTelefono",
      c.enlace_reunion AS "enlaceReunion",
      c.conversacion_id AS "conversacionId",
      c.creado_en AS "createdAt",
      c.actualizado_en AS "updatedAt"
    FROM citas c
    LEFT JOIN estudiantes e ON e.id = c.estudiante_id
    ${whereSql}
    ORDER BY c.actualizado_en ASC
    ${paginationSql}
  `;

  const result = await client.query<AppointmentRowDb>(sql, params);
  return result.rows;
}

async function main(): Promise<void> {
  const args = parseArgs();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL no esta configurada');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const estudiantes = await fetchStudents(client, args);
  const citas = await fetchAppointments(client, args);

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
      sourceStudentId: student.sourceStudentId,
      correo: student.correo,
      correoNormalizado,
      nombre: student.nombre,
      telefono: student.telefono,
      programa: student.programa,
      modalidad: student.modalidad,
      estado: student.estado,
      estadoCuenta: student.estadoCuenta,
      accesoCitas: student.accesoCitas,
      acudimientos: student.acudimientos,
      fechaInicio: toIso(student.fechaInicio),
      createdAt: toIso(student.createdAt),
      updatedAt: toIso(student.updatedAt),
    };
  });

  const duplicateEmailsByNormalized: DuplicateEmailEntry[] = Array.from(emailCounter.entries())
    .filter(([, cantidad]) => cantidad > 1)
    .map(([correoNormalizado, cantidad]) => ({ correoNormalizado, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

  let appointmentsWithoutStudent = 0;
  let appointmentsWithInvalidDateTime = 0;

  const appointmentRows = citas.map((appointment) => {
    const resolvedStudentEmail = normalizeEmail(appointment.studentCorreoRaw || undefined);
    if (!appointment.sourceStudentId || !appointment.studentCorreoRaw) {
      appointmentsWithoutStudent += 1;
    }

    const fechaHora = buildFechaHoraIso(appointment.fecha, appointment.hora || null);
    if (!fechaHora.valid) {
      appointmentsWithInvalidDateTime += 1;
    }

    return {
      sourceAppointmentId: appointment.sourceAppointmentId,
      sourceStudentId: appointment.sourceStudentId,
      studentCorreoNormalizado: resolvedStudentEmail || null,
      fecha: toIso(appointment.fecha),
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
      createdAt: toIso(appointment.createdAt),
      updatedAt: toIso(appointment.updatedAt),
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

  await client.end();
}

main()
  .catch((error) => {
    console.error('Error exportando datos SOFIA:', error);
    process.exitCode = 1;
  });
