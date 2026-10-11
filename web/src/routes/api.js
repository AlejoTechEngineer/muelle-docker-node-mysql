'use strict';
/**
 * API REST en JSON. Útil para probar con curl o Postman durante el video y
 * para el script de pruebas automatizadas (scripts/prueba-humo.sh).
 */
const express = require('express');
const db = require('../db');
const { infoContenedorWeb } = require('../sistema');
const { validarAplicacion, validarDespliegue, traducirErrorMysql } = require('../validadores');

const router = express.Router();

const envolver = (fn) => (req, res, next) => fn(req, res).catch((err) => {
  const t = traducirErrorMysql(err);
  if (t) return res.status(t.estado).json({ error: t.mensaje, campo: t.campo || undefined });
  return next(err);
});

router.get('/resumen', envolver(async (req, res) => res.json(await db.resumen())));

router.get('/aplicaciones', envolver(async (req, res) => res.json(await db.listarAplicaciones())));
router.post('/aplicaciones', envolver(async (req, res) => {
  const { valido, errores, valores } = validarAplicacion(req.body);
  if (!valido) return res.status(422).json({ error: 'Datos inválidos', errores });
  const id = await db.crearAplicacion(valores);
  res.status(201).location(`/api/aplicaciones/${id}`).json({ id, ...valores });
}));
router.delete('/aplicaciones/:id', envolver(async (req, res) => {
  const n = await db.eliminarAplicacion(Number(req.params.id));
  return n ? res.status(204).end() : res.status(404).json({ error: 'No existe' });
}));

router.get('/despliegues', envolver(async (req, res) => res.json(await db.listarDespliegues())));
router.post('/despliegues', envolver(async (req, res) => {
  const { valido, errores, valores } = validarDespliegue(req.body);
  if (!valido) return res.status(422).json({ error: 'Datos inválidos', errores });
  const id = await db.crearDespliegue(valores);
  res.status(201).location(`/api/despliegues/${id}`).json({ id, ...valores });
}));
router.delete('/despliegues/:id', envolver(async (req, res) => {
  const n = await db.eliminarDespliegue(Number(req.params.id));
  return n ? res.status(204).end() : res.status(404).json({ error: 'No existe' });
}));

router.get('/sistema', envolver(async (req, res) => {
  const [web, servidorDb] = await Promise.all([infoContenedorWeb(), db.infoServidor()]);
  res.json({ contenedorWeb: web, contenedorDb: servidorDb });
}));

module.exports = router;
