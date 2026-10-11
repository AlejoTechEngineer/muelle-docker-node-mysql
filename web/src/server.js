'use strict';
/**
 * Muelle - servidor web (Node.js + Express)
 * Proceso principal del contenedor "web". Expone la interfaz gráfica, la API
 * REST y los endpoints de salud que usa el HEALTHCHECK de Docker.
 */
const path = require('node:path');
const os = require('node:os');
const express = require('express');
const config = require('./config');
const db = require('./db');

const app = express();
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', true);

// Cabeceras de seguridad básicas (todo se sirve desde el propio contenedor)
app.use((req, res, next) => {
  res.set({
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'X-Frame-Options': 'DENY',
    // Encabezado didáctico: muestra en DevTools qué contenedor respondió
    'X-Servido-Por-Contenedor': os.hostname(),
  });
  next();
});

// Bitácora mínima de peticiones (la lee "docker logs muelle-web")
app.use((req, res, next) => {
  const inicio = process.hrtime.bigint();
  res.on('finish', () => {
    if (req.path.startsWith('/static') || req.path.startsWith('/fonts') || req.path === '/health') return;
    const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms.toFixed(1)} ms)`);
  });
  next();
});

app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(express.json({ limit: '20kb' }));

// Archivos estáticos y fuentes empaquetadas en la imagen (sin CDN externo)
const cache = { maxAge: config.entorno === 'production' ? '1d' : 0 };
app.use('/static', express.static(path.join(__dirname, 'public'), cache));
for (const fuente of ['barlow-condensed', 'ibm-plex-sans', 'ibm-plex-mono']) {
  app.use(`/fonts/${fuente}`, express.static(path.dirname(require.resolve(`@fontsource/${fuente}/package.json`)), cache));
}

// Variables disponibles en todas las vistas
app.use((req, res, next) => {
  res.locals.app = config.app;
  res.locals.contenedor = os.hostname();
  res.locals.ruta = req.path;
  next();
});

// Protección CSRF sin sesiones: toda petición que modifica datos debe venir
// del mismo origen. Se usan las cabeceras que el navegador envía solo
// (Sec-Fetch-Site y Origin), que una página externa no puede falsificar.
// Herramientas como curl no envían esas cabeceras y siguen funcionando.
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const sitio = req.get('sec-fetch-site');
  const origen = req.get('origin');
  let mismoOrigen = true;
  if (sitio) mismoOrigen = sitio === 'same-origin' || sitio === 'none';
  else if (origen) {
    try { mismoOrigen = new URL(origen).host === req.get('host'); } catch { mismoOrigen = false; }
  }
  if (mismoOrigen) return next();
  console.warn(`[seguridad] Petición ${req.method} ${req.originalUrl} rechazada: origen cruzado (${origen || sitio})`);
  if (req.path.startsWith('/api')) return res.status(403).json({ error: 'Petición de otro sitio rechazada (CSRF)' });
  return res.status(403).render('error', { titulo: 'Petición rechazada', codigo: 403, detalle: 'Los datos solo se pueden modificar desde las páginas de Muelle.', aviso: null });
});

// Salud: liveness (el proceso responde) y readiness (además llega a MySQL)
app.get('/health', (req, res) => res.json({ estado: 'ok', contenedor: os.hostname(), uptime_s: Math.round(process.uptime()) }));
app.get('/ready', async (req, res) => {
  try { await db.ping(); res.json({ estado: 'listo', db: 'ok' }); }
  catch (e) { res.status(503).json({ estado: 'no-listo', db: e.code || e.message }); }
});

app.use('/api', require('./routes/api'));
app.use('/', require('./routes/paginas'));

// 404
app.use((req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Ruta no encontrada' });
  res.status(404).render('error', { titulo: 'Página no encontrada', codigo: 404, detalle: 'La dirección que escribiste no existe en Muelle.', aviso: null });
});

// Errores no controlados
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err);
  const detalle = config.entorno === 'production' ? 'Revisa los registros del contenedor con: docker logs muelle-web' : err.message;
  if (req.path.startsWith('/api')) return res.status(500).json({ error: 'Error interno', detalle });
  res.status(500).render('error', { titulo: 'Algo falló', codigo: 500, detalle, aviso: null });
});

async function iniciar() {
  await db.esperarBaseDeDatos();
  const servidor = app.listen(config.puerto, () => {
    console.log(`[web] Muelle ${config.app.version} escuchando en el puerto ${config.puerto} (contenedor ${os.hostname()})`);
  });

  // Apagado ordenado: "docker stop" envía SIGTERM; cerramos HTTP y el pool
  // antes de que Docker escale a SIGKILL (10 s por defecto).
  const apagar = (senal) => {
    console.log(`[web] ${senal} recibido: cerrando conexiones HTTP y el pool de MySQL...`);
    servidor.close(async () => {
      await db.cerrar().catch(() => {});
      console.log('[web] Apagado limpio. Hasta luego.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 8000).unref();
  };
  process.on('SIGTERM', () => apagar('SIGTERM'));
  process.on('SIGINT', () => apagar('SIGINT'));
}

if (require.main === module) {
  iniciar().catch((err) => {
    console.error('[web] No se pudo iniciar:', err.message);
    process.exit(1);
  });
}

module.exports = app;
