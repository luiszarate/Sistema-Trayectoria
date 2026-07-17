export interface Carrera {
  id: number;
  clave: string;
  nombre: string;
}

export interface PlanEstudios {
  id: number;
  nombre: string;
  vigente: boolean;
}

export interface PlanMateria {
  id: number;
  materia_cve: string;
  materia_nombre: string;
  nivel: number | null;
  creditos: number | null;
  caracter: string;
}

export interface ImportLog {
  id: number;
  tipo: string;
  nombre_archivo: string;
  fecha: string;
  filas_totales: number;
  filas_insertadas: number;
  filas_actualizadas: number;
  filas_rechazadas: number;
  errores: { fila: number; error: string }[];
}

export interface AlumnoListItem {
  cve_uaslp: string;
  nombre: string;
  sexo: string;
  carrera: string;
  cohorte: number;
  situacion: string | null;
}

export interface KardexItem {
  materia_cve: string;
  materia_nombre: string;
  ciclo: string;
  tipo_examen: string | null;
  calificacion_numerica: number | null;
  codigo_calificacion: string | null;
  creditos: number | null;
  fecha_cal: string | null;
  resultado: string;
}

export interface AvanceMateria {
  materia_cve: string;
  materia_nombre: string;
  nivel: number | null;
  creditos: number | null;
  caracter: string;
  acreditada: boolean;
}

export interface TrayectoriaOut {
  cve_uaslp: string;
  nombre: string;
  carrera: string;
  plan: string | null;
  cohorte: number;
  situacion: string | null;
  tutor: string;
  creditos_plan: number;
  creditos_acreditados: number;
  porcentaje_avance: number;
  semestres_cursados: number;
  kardex: KardexItem[];
  avance_por_materia: AvanceMateria[];
}

export interface ResumenCohorte {
  cohorte: number;
  alumnos_cohorte: number;
  abandono: number;
  retencion: number | null;
  titulados: number;
  pasantes: number;
  titulados_pct_cohorte: number | null;
  titulados_pct_retenidos: number | null;
  egresados: number;
  egresados_pct_cohorte: number | null;
  egresados_pct_retenidos: number | null;
  reprobadas_0: number;
  reprobadas_1a3: number;
  reprobadas_4mas: number;
  reprobadas_0_pct: number | null;
  reprobadas_1a3_pct: number | null;
  reprobadas_4mas_pct: number | null;
}

export interface RetencionAlumno {
  cve_uaslp: string;
  cohorte: number;
  situacion: string | null;
  semestres_cursados: number;
  rezago_aproximado: number | null;
  ciclos: Record<string, number>;
}

export interface RetencionMatriz {
  ciclos: string[];
  inscritos_por_ciclo: Record<string, number>;
  alumnos: RetencionAlumno[];
}

export interface AprobacionMateria {
  ciclo: string;
  materia_cve: string;
  materia_nombre: string;
  inscritos: number;
  por_tipo_examen: Record<string, number>;
  pct_aprobados_ordinario: number | null;
  pct_aprobados: number | null;
}

export interface PromedioMateria {
  ciclo: string;
  materia_cve: string;
  materia_nombre: string;
  promedio: number | null;
  pct_alumnos_con_calificacion_numerica: number | null;
  pct_reprobacion: number | null;
}

export interface TitulacionCohorte {
  cohorte: number;
  modalidades: Record<string, number>;
  total: number;
}

export interface EgresoCohorte {
  cohorte: number;
  promedio_semestres: number | null;
  distribucion: Record<string, number>;
}

export interface TipoExamen {
  id: number;
  clave: string;
  nombre: string;
  es_ordinario: boolean;
}

export interface SituacionAcademica {
  id: number;
  clave: string;
  nombre: string;
  es_activo: boolean;
  es_desercion: boolean;
  es_egreso: boolean;
}

export interface CodigoCalificacion {
  id: number;
  clave: string;
  nombre: string;
  resultado: string;
}
