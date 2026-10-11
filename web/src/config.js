'use strict';
/**
 * Configuración centralizada (12-factor): todo llega por variables de
 * entorno que define docker-compose.yml. Ningún secreto vive en el código.
 */
const fs = require('node:fs');

/** Lee VAR o, si existe, el archivo indicado en VAR_FILE (patrón Docker secrets). */
function leer(nombre, porDefecto) {
  const archivo = process.env[`${nombre}_FILE`];
  if (archivo && fs.existsSync(archivo)) return fs.readFileSync(archivo, 'utf8').trim();
  return process.env[nombre] ?? porDefecto;
}

/** Fecha de construcción grabada por el Dockerfile en /app/BUILD_DATE. */
function fechaConstruccion() {
  try { return fs.readFileSync(require('node:path').join(__dirname, '..', 'BUILD_DATE'), 'utf8').trim(); } catch { return 'sin dato'; }
}

module.exports = Object.freeze({
  puerto: Number(leer('PORT', 3000)),
  entorno: leer('NODE_ENV', 'development'),
  app: {
    nombre: 'Muelle',
    version: leer('APP_VERSION', '1.0.0'),
    imagen: leer('APP_IMAGE', 'muelle-web (fuera de Docker)'),
    construidaEn: leer('APP_BUILD_DATE', fechaConstruccion()),
    metaRegistros: Number(leer('META_REGISTROS', 15)),
  },
  db: {
    host: leer('DB_HOST', 'localhost'),
    port: Number(leer('DB_PORT', 3306)),
    user: leer('DB_USER', 'muelle_app'),
    password: leer('DB_PASSWORD', ''),
    database: leer('DB_NAME', 'muelle'),
  },
});
