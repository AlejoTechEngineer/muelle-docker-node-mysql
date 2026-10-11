'use strict';
/**
 * Páginas renderizadas en el servidor (EJS). Patrón POST-Redirect-GET:
 * después de guardar se redirige, así recargar la página no duplica datos.
 */
const express = require('express');
const db = require('../db');
const { infoContenedorWeb } = require('../sistema');
const { ENTORNOS, validarAplicacion, validarDespliegue, traducirErrorMysql } = require('../validadores');

const router = express.Router();

/** Mensajes permitidos en la URL (?msg=...). Nunca se refleja texto libre. */
const MENSAJES = {
  'app-guardada': { tipo: 'exito', texto: (ref) => `Aplicación ${ref} guardada en MySQL.` },
  'desp-guardado': { tipo: 'exito', texto: (ref) => `Despliegue #${ref} guardado en MySQL.` },
  'app-eliminada': { tipo: 'exito', texto: (ref) => `Aplicación ${ref} eliminada.` },
  'desp-eliminado': { tipo: 'exito', texto: (ref) => `Despliegue #${ref} eliminado.` },
  'app-con-despliegues': { tipo: 'error', texto: () => 'No se puede eliminar: la aplicación tiene despliegues. La llave foránea (ON DELETE RESTRICT) lo impide; elimina primero sus despliegues.' },
  'no-existe': { tipo: 'error', texto: () => 'Ese registro ya no existe.' },
};

function aviso(req) {
  const m = MENSAJES[req.query.msg];
  if (!m) return null;
  const ref = String(req.query.ref || '').slice(0, 40);
  return { tipo: m.tipo, texto: m.texto(ref) };
}

const ahoraLocal = () => {
  // Valor por defecto para <input type="datetime-local"> en hora de Bogotá
  const d = new Date(Date.now() - 5 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
};

// ------------------------------------------------------------------ inicio
router.get('/', async (req, res, next) => {
  try {
    const [resumen, recientes] = await Promise.all([db.resumen(), db.listarDespliegues()]);
    res.render('inicio', { titulo: 'Inicio', resumen, recientes: recientes.slice(0, 5), aviso: aviso(req) });
  } catch (e) { next(e); }
});

// ------------------------------------------------------------ aplicaciones
router.get('/aplicaciones/nueva', async (req, res, next) => {
  try {
    const resumen = await db.resumen();
    res.render('aplicacion-form', {
      titulo: 'Registrar aplicación', resumen, aviso: aviso(req), errores: {},
      valores: { nombre: '', codigo: '', fecha_lanzamiento: '', es_critica: false, costo_mensual: '' },
    });
  } catch (e) { next(e); }
});

router.post('/aplicaciones', async (req, res, next) => {
  const { valido, errores, valores } = validarAplicacion(req.body);
  try {
    if (valido) {
      await db.crearAplicacion(valores);
      return res.redirect(303, `/aplicaciones/nueva?msg=app-guardada&ref=${encodeURIComponent(valores.codigo)}`);
    }
  } catch (err) {
    const t = traducirErrorMysql(err);
    if (!t) return next(err);
    errores[t.campo || '_general'] = t.mensaje;
  }
  try {
    const resumen = await db.resumen();
    res.status(422).render('aplicacion-form', { titulo: 'Registrar aplicación', resumen, aviso: null, errores, valores });
  } catch (e) { next(e); }
});

router.post('/aplicaciones/:id/eliminar', async (req, res, next) => {
  try {
    const n = await db.eliminarAplicacion(Number(req.params.id));
    res.redirect(303, n ? `/registros?msg=app-eliminada&ref=${encodeURIComponent(req.body.codigo || req.params.id)}` : '/registros?msg=no-existe');
  } catch (err) {
    if (err.errno === 1451 || err.errno === 1217) return res.redirect(303, '/registros?msg=app-con-despliegues');
    next(err);
  }
});

// ------------------------------------------------------------- despliegues
async function datosFormDespliegue() {
  const [resumen, aplicaciones] = await Promise.all([db.resumen(), db.listarAplicaciones()]);
  return { resumen, aplicaciones, entornos: ENTORNOS };
}

router.get('/despliegues/nuevo', async (req, res, next) => {
  try {
    const datos = await datosFormDespliegue();
    res.render('despliegue-form', {
      titulo: 'Registrar despliegue', ...datos, aviso: aviso(req), errores: {},
      valores: { aplicacion_id: '', entorno: '', replicas: 1, uso_cpu: '', desplegado_en: ahoraLocal(), notas: '' },
    });
  } catch (e) { next(e); }
});

router.post('/despliegues', async (req, res, next) => {
  const { valido, errores, valores } = validarDespliegue(req.body);
  try {
    if (valido) {
      const id = await db.crearDespliegue(valores);
      return res.redirect(303, `/despliegues/nuevo?msg=desp-guardado&ref=${id}`);
    }
  } catch (err) {
    const t = traducirErrorMysql(err);
    if (!t) return next(err);
    errores[t.campo || '_general'] = t.mensaje;
  }
  try {
    const datos = await datosFormDespliegue();
    valores.desplegado_en = String(valores.desplegado_en || '').slice(0, 16).replace(' ', 'T');
    res.status(422).render('despliegue-form', { titulo: 'Registrar despliegue', ...datos, aviso: null, errores, valores });
  } catch (e) { next(e); }
});

router.post('/despliegues/:id/eliminar', async (req, res, next) => {
  try {
    const n = await db.eliminarDespliegue(Number(req.params.id));
    res.redirect(303, n ? `/registros?msg=desp-eliminado&ref=${req.params.id}` : '/registros?msg=no-existe');
  } catch (e) { next(e); }
});

// --------------------------------------------- registros (enlace diferente)
router.get('/registros', async (req, res, next) => {
  try {
    const [resumen, aplicaciones, despliegues] = await Promise.all([
      db.resumen(), db.listarAplicaciones(), db.listarDespliegues(),
    ]);
    res.render('registros', { titulo: 'Registros en MySQL', resumen, aplicaciones, despliegues, aviso: aviso(req) });
  } catch (e) { next(e); }
});

// ------------------------------------------------- evidencia de contenedores
router.get('/sistema', async (req, res, next) => {
  try {
    const [web, servidorDb, resumen] = await Promise.all([infoContenedorWeb(), db.infoServidor(), db.resumen()]);
    res.render('sistema', { titulo: 'Contenedores', web, servidorDb, resumen, aviso: null });
  } catch (e) { next(e); }
});

module.exports = router;
