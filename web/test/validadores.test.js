'use strict';
// Pruebas unitarias de las reglas de validación (node --test, sin dependencias).
const test = require('node:test');
const assert = require('node:assert/strict');
const { validarAplicacion, validarDespliegue, traducirErrorMysql, esFechaValida } = require('../src/validadores');

const appValida = { nombre: 'Pasarela de pagos', codigo: 'pagos1', fecha_lanzamiento: '2023-03-15', es_critica: 'on', costo_mensual: '1450.00' };
const despValido = { aplicacion_id: '1', entorno: 'produccion', replicas: '3', uso_cpu: '61.2', desplegado_en: '2026-09-08T22:00', notas: 'v3.0.0' };

test('aplicación válida: normaliza código y booleano', () => {
  const r = validarAplicacion(appValida);
  assert.equal(r.valido, true);
  assert.equal(r.valores.codigo, 'PAGOS1');
  assert.equal(r.valores.es_critica, true);
});

test('aplicación: checkbox ausente equivale a false', () => {
  const { es_critica, ...sinCheck } = appValida;
  assert.equal(validarAplicacion(sinCheck).valores.es_critica, false);
});

test('aplicación: rechaza código de longitud distinta a 6 o con símbolos', () => {
  assert.ok(validarAplicacion({ ...appValida, codigo: 'ABC' }).errores.codigo);
  assert.ok(validarAplicacion({ ...appValida, codigo: 'AB-C12' }).errores.codigo);
});

test('aplicación: rechaza fecha imposible y costo con tres decimales o negativo', () => {
  assert.ok(validarAplicacion({ ...appValida, fecha_lanzamiento: '2023-02-30' }).errores.fecha_lanzamiento);
  assert.ok(validarAplicacion({ ...appValida, costo_mensual: '10.555' }).errores.costo_mensual);
  assert.ok(validarAplicacion({ ...appValida, costo_mensual: '-1' }).errores.costo_mensual);
});

test('aplicación: acepta coma decimal', () => {
  assert.equal(validarAplicacion({ ...appValida, costo_mensual: '980,50' }).valores.costo_mensual, '980.50');
});

test('despliegue válido: convierte datetime-local al formato de MySQL', () => {
  const r = validarDespliegue(despValido);
  assert.equal(r.valido, true);
  assert.equal(r.valores.desplegado_en, '2026-09-08 22:00:00');
  assert.equal(r.valores.replicas, 3);
});

test('despliegue: valida enum, rangos y fecha', () => {
  const r = validarDespliegue({ ...despValido, entorno: 'staging', replicas: '0', uso_cpu: '101', desplegado_en: '2026-13-01T10:00' });
  assert.deepEqual(Object.keys(r.errores).sort(), ['desplegado_en', 'entorno', 'replicas', 'uso_cpu']);
});

test('despliegue: notas vacías se guardan como NULL', () => {
  assert.equal(validarDespliegue({ ...despValido, notas: '   ' }).valores.notas, null);
});

test('traduce errores de MySQL, incluidos los de usuario con mínimo privilegio', () => {
  assert.equal(traducirErrorMysql({ errno: 1062, message: "Duplicate entry for key 'aplicaciones.uq_aplicaciones_codigo'" }).campo, 'codigo');
  assert.equal(traducirErrorMysql({ errno: 1217 }).estado, 409);
  assert.equal(traducirErrorMysql({ errno: 1216 }).estado, 422);
  assert.equal(traducirErrorMysql({ errno: 9999 }), null);
});

test('esFechaValida detecta años bisiestos', () => {
  assert.equal(esFechaValida('2024-02-29'), true);
  assert.equal(esFechaValida('2025-02-29'), false);
});
