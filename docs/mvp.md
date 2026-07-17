# MVP local — Sistema de Trayectoria Escolar

MVP dockerizado que reemplaza funcionalmente el Excel `UASLP-TrayectoriaEscolar2026.xlsx`:
carga por CSV, informes web y exportación a Excel. La conexión directa a las
bases de datos institucionales queda para una fase posterior (ver
`docs/diseno-conceptual.md`).

## Cómo correrlo

```bash
docker compose up --build
```

- API: http://localhost:8000/docs (documentación interactiva de FastAPI)
- Web: http://localhost:5173

Al iniciar, el backend aplica las migraciones y siembra los catálogos
(tipos de examen, situaciones académicas, modalidades de titulación, códigos
de calificación) con los valores observados en el Excel original.

## Formato de los CSV de entrada

Tres archivos, con las mismas columnas que las hojas del Excel original
(en `/data/ejemplos` hay un ejemplo generado a partir del propio archivo).

### `plan_estudios.csv`

```
carrera, plan, cve_materia, nombre_materia, nivel, creditos, caracter, vigente
```

`caracter` ∈ `obligatoria`, `optativa-extractiva`, `optativa-transformacion`,
`optativa-otros`. `vigente` es `true`/`false` (por defecto `true` si se omite)
y determina el plan que se asigna automáticamente a un alumno nuevo de esa
carrera al importar `alumnos.csv`; solo debe haber **un** plan vigente por
carrera. Un mismo archivo puede describir varios planes/carreras.

### `alumnos.csv`

```
cve_uaslp, cve_larga, nombre, sexo, generacion, tutor, fecha_egreso,
fecha_pasante, situacion, fecha_titulacion, opcion_titulacion
```

`situacion` debe coincidir con una clave del catálogo `SituacionAcademica`
(INSCRITO, NO INSCRITO, PASANTE, TITULADO, BAJA TEMPORAL, BAJA DEFINITIVA,
BAJA ACADÉMICA, CAMBIO DE FACULTAD). Se importa **por carrera**: en la vista
"Importar CSV" se indica la clave de la carrera (p. ej. `INGENIERIA`) junto
con el archivo.

### `kardex.csv`

```
cve_uaslp, creditos, cve_materia, materia, calificacion, fecha_cal,
tipo_examen, semestre
```

`calificacion` puede ser numérica (0–100) o un código del catálogo
`CodigoCalificacion` (AC, NP, NA, SA, LR, ET, ER, EE). `tipo_examen` debe
existir en el catálogo `TipoExamen`. `semestre` tiene el formato
`AAAA-AAAA/I` o `/II`.

**Orden de carga recomendado**: 1) plan de estudios, 2) alumnos (crea la
"trayectoria" del alumno en la carrera), 3) kardex (requiere que la
trayectoria ya exista).

Todas las cargas son **idempotentes**: volver a importar el mismo archivo
actualiza los registros existentes en vez de duplicarlos. Las filas
inválidas se listan en la bitácora (vista "Bitácora de cargas") con el
motivo del rechazo; el resto de la importación continúa.

## Definiciones de los indicadores

Todas las fórmulas viven en `backend/app/services/indicadores.py`, con
referencias a cómo se verificaron contra el archivo original. En particular,
las fórmulas de retención, titulados y egresados (con respecto a la cohorte
y con respecto a los alumnos retenidos) fueron verificadas cifra por cifra
contra la hoja `Resumen` del Excel.

Otras métricas (rezago aproximado por semestre, distribución de materias
reprobadas) son aproximaciones razonables, documentadas como tales en el
código, pendientes de validar con Secretaría Académica — ver
`docs/diseno-conceptual.md`, sección 14.

## Verificación contra el Excel original

El MVP se probó de extremo a extremo importando los tres CSV generados a
partir del propio `UASLP-TrayectoriaEscolar2026.xlsx` (129 filas de plan de
estudios, 741 alumnos, 47,157 registros de kardex — **100% aceptadas, 0
rechazadas**) y comparando los informes calculados contra las hojas
originales.

**Coinciden exactamente** (cohorte 2015, contra la hoja `Resumen`):
alumnos de la cohorte (56), abandono (22), retención (60.71%), titulados
(26), pasantes (7), titulados % cohorte (46.43%), titulados % retenidos
(76.47%), egresados % cohorte (58.93%), egresados % retenidos (97.06%). El
hallazgo clave de esta verificación: "retenido" en el Excel no significa
"no dado de baja definitiva" — significa "situación actual INSCRITO,
PASANTE o TITULADO"; situaciones como NO INSCRITO o BAJA TEMPORAL también
cuentan como abandono para este indicador. Esto ya quedó reflejado en
`indicadores.py`.

También coincide el desglose de titulación por modalidad (hoja
`Titulación`), con una diferencia: el sistema reporta un titulado más que
el pivote original porque detecta una modalidad
("PUBLICACIÓN DE ARTÍCULO CIENTÍFICO") que existe en `Datos Alumnos` pero
nunca se agregó como columna a la tabla dinámica manual del Excel — un
ejemplo concreto del tipo de fragilidad que motiva este proyecto.

**Discrepancias documentadas, pendientes de validar con Secretaría
Académica** (ver también `docs/diseno-conceptual.md`, sección 14):

- **Distribución de materias reprobadas** (0 / 1–3 / 4+): ni "materias
  distintas reprobadas según el kardex" ni el campo crudo
  `materias_reprobadas` de `Datos Alumnos` reproducen exactamente la
  distribución de la hoja `Resumen`. La definición exacta usada en el
  Excel no está documentada en las columnas disponibles.
- **Semestres para egresar**: el promedio y la distribución por cohorte se
  acercan pero no coinciden exactamente contra la hoja `Egreso` (el total
  de egresados por cohorte sí coincide). La aproximación actual cuenta
  ciclos con actividad en el kardex; el Excel probablemente cuenta
  semestres de calendario transcurridos, incluyendo posibles pausas.

## Generar los CSV de ejemplo desde el Excel original

Los archivos en `/data/ejemplos` ya están generados. Para regenerarlos:

```bash
python3 -c "
import openpyxl, csv
# ver backend/app o el historial de este repositorio para el script completo
"
```

(el script de extracción usado para generar los ejemplos no se incluye como
parte del sistema — es una utilidad de una sola vez para la migración
inicial del archivo actual).
