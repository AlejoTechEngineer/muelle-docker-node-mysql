'use strict';
/**
 * Acceso a datos. Pool de conexiones mysql2 con consultas parametrizadas
 * (protección contra inyección SQL) y reintentos al arrancar, porque en un
 * entorno de contenedores la base de datos puede tardar en estar lista.
 */
const mysql = require('mysql2/promise');
const config = require('./config');

const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true, // fechas como texto: sin conversiones de zona horaria en Node
  charset: 'utf8mb4',
  timezone: '-05:00',
});

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/** Espera a que MySQL responda (backoff exponencial, máx. ~60 s). */
async function esperarBaseDeDatos({ intentos = 12, log = console } = {}) {
  for (let i = 1; i <= intentos; i += 1) {
    try {
      await pool.query('SELECT 1');
      log.info(`[db] Conectado a ${config.db.host}:${config.db.port}/${config.db.database}`);
      return;
    } catch (err) {
      const ms = Math.min(1000 * 2 ** (i - 1), 10000);
      log.warn(`[db] Intento ${i}/${intentos} falló (${err.code || err.message}). Reintento en ${ms} ms`);
      await espera(ms);
    }
  }
  throw new Error('No fue posible conectar con la base de datos');
}

// ---------------------------------------------------------------- aplicaciones
async function listarAplicaciones() {
  const [filas] = await pool.query(
    `SELECT a.*, COUNT(d.id) AS total_despliegues
       FROM aplicaciones a
       LEFT JOIN despliegues d ON d.aplicacion_id = a.id
      GROUP BY a.id
      ORDER BY a.id`
  );
  return filas.map((f) => ({ ...f, es_critica: Boolean(f.es_critica) }));
}

async function crearAplicacion(a) {
  const [r] = await pool.execute(
    `INSERT INTO aplicaciones (nombre, codigo, fecha_lanzamiento, es_critica, costo_mensual)
     VALUES (?, ?, ?, ?, ?)`,
    [a.nombre, a.codigo, a.fecha_lanzamiento, a.es_critica, a.costo_mensual]
  );
  return r.insertId;
}

async function eliminarAplicacion(id) {
  const [r] = await pool.execute('DELETE FROM aplicaciones WHERE id = ?', [id]);
  return r.affectedRows;
}

// ----------------------------------------------------------------- despliegues
async function listarDespliegues() {
  const [filas] = await pool.query('SELECT * FROM v_despliegues_detalle ORDER BY id DESC');
  return filas.map((f) => ({ ...f, es_critica: Boolean(f.es_critica), uso_cpu: Number(f.uso_cpu) }));
}

async function crearDespliegue(d) {
  const [r] = await pool.execute(
    `INSERT INTO despliegues (aplicacion_id, entorno, replicas, uso_cpu, desplegado_en, notas)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [d.aplicacion_id, d.entorno, d.replicas, d.uso_cpu, d.desplegado_en, d.notas]
  );
  return r.insertId;
}

async function eliminarDespliegue(id) {
  const [r] = await pool.execute('DELETE FROM despliegues WHERE id = ?', [id]);
  return r.affectedRows;
}

// --------------------------------------------------------------------- métricas
async function resumen() {
  const [[fila]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM aplicaciones)                              AS aplicaciones,
       (SELECT COUNT(*) FROM despliegues)                               AS despliegues,
       (SELECT COUNT(*) FROM aplicaciones WHERE es_critica)             AS criticas,
       (SELECT COUNT(*) FROM despliegues WHERE entorno = 'produccion')  AS en_produccion,
       (SELECT COALESCE(SUM(replicas), 0) FROM despliegues)             AS contenedores,
       (SELECT ROUND(COALESCE(AVG(uso_cpu), 0), 1) FROM despliegues)    AS cpu_promedio,
       (SELECT COALESCE(SUM(costo_mensual), 0) FROM aplicaciones)       AS costo_total`
  );
  const n = (v) => Number(v);
  return {
    aplicaciones: n(fila.aplicaciones),
    despliegues: n(fila.despliegues),
    total: n(fila.aplicaciones) + n(fila.despliegues),
    criticas: n(fila.criticas),
    enProduccion: n(fila.en_produccion),
    contenedores: n(fila.contenedores),
    cpuPromedio: n(fila.cpu_promedio),
    costoTotal: n(fila.costo_total),
  };
}

/** Información del servidor de base de datos (lo que ve el otro contenedor). */
async function infoServidor() {
  const [[srv]] = await pool.query(
    `SELECT @@hostname AS hostname, VERSION() AS version, DATABASE() AS base,
            CURRENT_USER() AS usuario, @@character_set_server AS charset,
            @@time_zone AS zona_horaria, @@port AS puerto`
  );
  const [tablas] = await pool.query(
    `SELECT table_name AS tabla, table_type AS tipo, table_rows AS filas_aprox,
            ROUND((data_length + index_length) / 1024, 1) AS kb
       FROM information_schema.tables
      WHERE table_schema = DATABASE()
      ORDER BY table_type, table_name`
  );
  const [columnas] = await pool.query(
    `SELECT c.table_name AS tabla, c.column_name AS columna, c.column_type AS tipo,
            c.column_key AS llave, c.is_nullable AS nulo,
            EXISTS (SELECT 1 FROM information_schema.key_column_usage k
                     WHERE k.table_schema = c.table_schema AND k.table_name = c.table_name
                       AND k.column_name = c.column_name AND k.referenced_table_name IS NOT NULL) AS es_fk
       FROM information_schema.columns c
      WHERE c.table_schema = DATABASE() AND c.table_name IN ('aplicaciones', 'despliegues')
      ORDER BY c.table_name, c.ordinal_position`
  );
  const [permisos] = await pool.query('SHOW GRANTS FOR CURRENT_USER()');
  return {
    ...srv,
    tablas,
    columnas,
    permisos: permisos.map((p) => Object.values(p)[0]),
  };
}

async function ping() {
  await pool.query('SELECT 1');
}

async function cerrar() {
  await pool.end();
}

module.exports = {
  pool,
  esperarBaseDeDatos,
  listarAplicaciones,
  crearAplicacion,
  eliminarAplicacion,
  listarDespliegues,
  crearDespliegue,
  eliminarDespliegue,
  resumen,
  infoServidor,
  ping,
  cerrar,
};
