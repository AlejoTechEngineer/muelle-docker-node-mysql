'use strict';
/**
 * Validación del lado del servidor. Es la fuente de verdad: el navegador
 * también valida (HTML5), pero nunca se confía solo en el cliente.
 * Las reglas replican las restricciones CHECK de la base de datos.
 */

const ENTORNOS = Object.freeze(['desarrollo', 'pruebas', 'produccion']);

const texto = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());

function esFechaValida(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const f = new Date(Date.UTC(y, m - 1, d));
  return f.getUTCFullYear() === y && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

/** Acepta checkbox HTML ("on"), JSON (true/false) y texto ("true", "1", "si"). */
function aBooleano(v) {
  if (typeof v === 'boolean') return v;
  return ['on', 'true', '1', 'si', 'sí'].includes(texto(v).toLowerCase());
}

function validarAplicacion(entrada = {}) {
  const errores = {};
  const nombre = texto(entrada.nombre);
  const codigo = texto(entrada.codigo).toUpperCase();
  const fecha = texto(entrada.fecha_lanzamiento);
  const costoTxt = texto(entrada.costo_mensual).replace(',', '.');

  if (nombre.length < 3 || nombre.length > 80) errores.nombre = 'Escribe un nombre de 3 a 80 caracteres.';

  if (!/^[A-Z0-9]{6}$/.test(codigo)) errores.codigo = 'El código debe tener exactamente 6 letras o números, por ejemplo PAGOS1.';

  if (!esFechaValida(fecha)) errores.fecha_lanzamiento = 'Elige una fecha válida.';
  else if (fecha < '2000-01-01' || fecha > '2100-12-31') errores.fecha_lanzamiento = 'La fecha debe estar entre el año 2000 y el 2100.';

  const costo = Number(costoTxt);
  if (costoTxt === '' || !Number.isFinite(costo)) errores.costo_mensual = 'Escribe el costo mensual en dólares, por ejemplo 120.50.';
  else if (costo < 0 || costo > 99999999.99) errores.costo_mensual = 'El costo debe estar entre 0 y 99.999.999,99.';
  else if (!/^\d+(\.\d{1,2})?$/.test(costoTxt)) errores.costo_mensual = 'Usa máximo dos decimales.';

  return {
    errores,
    valido: Object.keys(errores).length === 0,
    valores: {
      nombre,
      codigo,
      fecha_lanzamiento: fecha,
      es_critica: aBooleano(entrada.es_critica),
      costo_mensual: costoTxt === '' ? '' : costoTxt,
    },
  };
}

function validarDespliegue(entrada = {}) {
  const errores = {};
  const aplicacionId = Number(texto(entrada.aplicacion_id));
  const entorno = texto(entrada.entorno);
  const replicasTxt = texto(entrada.replicas);
  const cpuTxt = texto(entrada.uso_cpu).replace(',', '.');
  // datetime-local envía "AAAA-MM-DDTHH:MM"; MySQL espera "AAAA-MM-DD HH:MM:SS"
  let fechaHora = texto(entrada.desplegado_en).replace('T', ' ');
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(fechaHora)) fechaHora += ':00';
  const notas = texto(entrada.notas);

  if (!Number.isInteger(aplicacionId) || aplicacionId < 1) errores.aplicacion_id = 'Elige la aplicación que se desplegó.';

  if (!ENTORNOS.includes(entorno)) errores.entorno = 'Elige desarrollo, pruebas o producción.';

  const replicas = Number(replicasTxt);
  if (!/^\d+$/.test(replicasTxt) || replicas < 1 || replicas > 100) errores.replicas = 'Las réplicas deben ser un número entero entre 1 y 100.';

  const cpu = Number(cpuTxt);
  if (cpuTxt === '' || !Number.isFinite(cpu) || cpu < 0 || cpu > 100) errores.uso_cpu = 'El uso de CPU es un porcentaje entre 0 y 100.';

  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(fechaHora);
  if (!m || !esFechaValida(m[1]) || Number(m[2]) > 23 || Number(m[3]) > 59 || Number(m[4]) > 59) {
    errores.desplegado_en = 'Elige la fecha y la hora del despliegue.';
  }

  if (notas.length > 2000) errores.notas = 'Las notas admiten hasta 2000 caracteres.';

  return {
    errores,
    valido: Object.keys(errores).length === 0,
    valores: {
      aplicacion_id: Number.isInteger(aplicacionId) ? aplicacionId : '',
      entorno,
      replicas: replicasTxt === '' ? '' : replicas,
      uso_cpu: cpuTxt === '' ? '' : cpu,
      desplegado_en: fechaHora,
      notas: notas || null,
    },
  };
}

/** Traduce errores de MySQL a mensajes accionables para la persona usuaria. */
function traducirErrorMysql(err) {
  switch (err && err.errno) {
    case 1062: {
      const campo = /uq_aplicaciones_(\w+)/.exec(err.message);
      const nombres = { nombre: 'nombre', codigo: 'código' };
      return { estado: 409, campo: campo ? campo[1] : null, mensaje: `Ya existe una aplicación con ese ${campo ? nombres[campo[1]] : 'valor'}. Usa otro.` };
    }
    // 1451/1452 llevan el detalle de la FK; 1217/1216 son las mismas fallas
    // cuando el usuario (con mínimo privilegio) no puede ver ese detalle.
    case 1451:
    case 1217:
      return { estado: 409, mensaje: 'Esta aplicación tiene despliegues registrados. Elimina primero sus despliegues: la llave foránea protege la integridad de los datos.' };
    case 1452:
    case 1216:
      return { estado: 422, campo: 'aplicacion_id', mensaje: 'La aplicación elegida no existe. Regístrala primero.' };
    case 3819:
      return { estado: 422, mensaje: 'Un valor no cumple las reglas de la base de datos (restricción CHECK).' };
    default:
      return null;
  }
}

module.exports = { ENTORNOS, validarAplicacion, validarDespliegue, traducirErrorMysql, esFechaValida, aBooleano };
