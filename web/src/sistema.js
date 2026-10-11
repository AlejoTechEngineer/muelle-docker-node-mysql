'use strict';
/**
 * Evidencia de ejecución en contenedor. Reúne lo que el proceso Node "ve"
 * desde adentro: el hostname (Docker lo iguala al ID corto del contenedor),
 * el archivo /.dockerenv, los límites de cgroups y la resolución DNS del
 * servicio "db" en la red interna de Docker.
 */
const fs = require('node:fs');
const os = require('node:os');
const dns = require('node:dns').promises;
const config = require('./config');

const leerArchivo = (ruta) => {
  try { return fs.readFileSync(ruta, 'utf8').trim(); } catch { return null; }
};

function limiteMemoria() {
  // cgroups v2 (Docker Desktop moderno) y v1 como respaldo
  const v2 = leerArchivo('/sys/fs/cgroup/memory.max');
  const v1 = leerArchivo('/sys/fs/cgroup/memory/memory.limit_in_bytes');
  const crudo = v2 ?? v1;
  if (!crudo || crudo === 'max' || Number(crudo) > 2 ** 60) return 'sin límite';
  return `${Math.round(Number(crudo) / 1024 / 1024)} MB`;
}

function limiteCpu() {
  const v2 = leerArchivo('/sys/fs/cgroup/cpu.max'); // "100000 100000" o "max 100000"
  if (!v2) return 'sin dato';
  const [cuota, periodo] = v2.split(' ');
  return cuota === 'max' ? 'sin límite' : `${(Number(cuota) / Number(periodo)).toFixed(2)} CPU`;
}

const mb = (b) => `${(b / 1024 / 1024).toFixed(1)} MB`;

function duracion(seg) {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = Math.floor(seg % 60);
  return [h && `${h} h`, (h || m) && `${m} min`, `${s} s`].filter(Boolean).join(' ');
}

async function infoContenedorWeb() {
  let ipDb = 'no resuelve';
  try { ipDb = (await dns.lookup(config.db.host)).address; } catch { /* fuera de Docker */ }

  const enDocker = fs.existsSync('/.dockerenv');
  const uid = typeof process.getuid === 'function' ? process.getuid() : null;

  return {
    enDocker,
    hostname: os.hostname(),
    imagen: config.app.imagen,
    version: config.app.version,
    construidaEn: config.app.construidaEn,
    node: process.version,
    so: `${os.type()} ${os.release()} (${process.arch})`,
    pid: process.pid,
    usuario: uid === null ? 'sin dato' : `${os.userInfo().username} (uid ${uid})`,
    activoDesde: duracion(process.uptime()),
    memoriaProceso: mb(process.memoryUsage().rss),
    limiteMemoria: limiteMemoria(),
    limiteCpu: limiteCpu(),
    ipsContenedor: Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address),
    servicioDb: `${config.db.host}:${config.db.port}`,
    ipDb,
    entorno: config.entorno,
  };
}

module.exports = { infoContenedorWeb };
