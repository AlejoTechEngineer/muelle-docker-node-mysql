'use strict';
/* Muelle: comportamiento del navegador (sin dependencias). */

// Datos de ejemplo para registrar 5 aplicaciones y 15 despliegues sin teclear
// todo. Cada clic llena el formulario con el siguiente ejemplo; la persona
// igual tiene que pulsar "Guardar", así que el flujo real se conserva.
const EJEMPLOS = {
  aplicacion: [
    { nombre: 'Pasarela de pagos', codigo: 'PAGOS1', fecha_lanzamiento: '2023-03-15', es_critica: true, costo_mensual: '1450.00' },
    { nombre: 'Portal de clientes', codigo: 'PORTAL', fecha_lanzamiento: '2022-08-01', es_critica: true, costo_mensual: '980.50' },
    { nombre: 'Motor de recomendaciones', codigo: 'RECOMN', fecha_lanzamiento: '2024-02-20', es_critica: false, costo_mensual: '620.75' },
    { nombre: 'Gestor de inventario', codigo: 'INVENT', fecha_lanzamiento: '2021-11-05', es_critica: false, costo_mensual: '310.00' },
    { nombre: 'Notificaciones push', codigo: 'NOTIF1', fecha_lanzamiento: '2025-06-30', es_critica: false, costo_mensual: '145.20' },
  ],
  despliegue: [
    { app: 'PAGOS1', entorno: 'desarrollo', replicas: 1, uso_cpu: 12.5, desplegado_en: '2026-09-01T08:30', notas: 'v3.0.0-rc1: integración con 3-D Secure 2' },
    { app: 'PAGOS1', entorno: 'pruebas', replicas: 2, uso_cpu: 34.8, desplegado_en: '2026-09-03T14:10', notas: 'v3.0.0-rc2: pruebas de carga con 500 usuarios' },
    { app: 'PAGOS1', entorno: 'produccion', replicas: 6, uso_cpu: 61.2, desplegado_en: '2026-09-08T22:00', notas: 'v3.0.0: salida en ventana nocturna, despliegue canario 10 %' },
    { app: 'PORTAL', entorno: 'desarrollo', replicas: 1, uso_cpu: 8.4, desplegado_en: '2026-09-02T09:45', notas: 'v5.2.0: nuevo inicio de sesión con passkeys' },
    { app: 'PORTAL', entorno: 'pruebas', replicas: 2, uso_cpu: 27.9, desplegado_en: '2026-09-05T11:20', notas: 'v5.2.0: pruebas de accesibilidad WCAG 2.2' },
    { app: 'PORTAL', entorno: 'produccion', replicas: 4, uso_cpu: 48.6, desplegado_en: '2026-09-12T21:30', notas: 'v5.2.0: liberado al 100 % de usuarios' },
    { app: 'RECOMN', entorno: 'desarrollo', replicas: 1, uso_cpu: 72.3, desplegado_en: '2026-09-04T16:00', notas: 'v1.8.0: modelo de embeddings actualizado' },
    { app: 'RECOMN', entorno: 'pruebas', replicas: 3, uso_cpu: 81.0, desplegado_en: '2026-09-10T10:15', notas: 'v1.8.0: prueba A/B frente al modelo anterior' },
    { app: 'RECOMN', entorno: 'produccion', replicas: 8, uso_cpu: 66.4, desplegado_en: '2026-09-18T23:00', notas: 'v1.8.0: escalado horizontal por demanda' },
    { app: 'INVENT', entorno: 'desarrollo', replicas: 1, uso_cpu: 5.1, desplegado_en: '2026-09-06T07:50', notas: 'v2.1.3: corrección de redondeo en existencias' },
    { app: 'INVENT', entorno: 'pruebas', replicas: 1, uso_cpu: 14.7, desplegado_en: '2026-09-09T15:35', notas: 'v2.1.3: regresión completa aprobada' },
    { app: 'INVENT', entorno: 'produccion', replicas: 2, uso_cpu: 22.9, desplegado_en: '2026-09-15T20:00', notas: 'v2.1.3: sin tiempo de inactividad' },
    { app: 'NOTIF1', entorno: 'desarrollo', replicas: 1, uso_cpu: 3.6, desplegado_en: '2026-09-11T13:05', notas: 'v0.9.0: primer prototipo con colas' },
    { app: 'NOTIF1', entorno: 'pruebas', replicas: 2, uso_cpu: 19.3, desplegado_en: '2026-09-20T09:00', notas: 'v1.0.0: envío masivo de 10 000 mensajes' },
    { app: 'NOTIF1', entorno: 'produccion', replicas: 3, uso_cpu: 31.7, desplegado_en: '2026-09-25T22:45', notas: 'v1.0.0: primera versión estable' },
  ],
};

function siguienteIndice(tipo, total) {
  const clave = `muelle-ejemplo-${tipo}`;
  let i = 0;
  try { i = Number(sessionStorage.getItem(clave) || 0); } catch { /* sin almacenamiento */ }
  try { sessionStorage.setItem(clave, String((i + 1) % total)); } catch { /* sin almacenamiento */ }
  return i % total;
}

function autocompletar(tipo) {
  const form = document.querySelector(`[data-formulario="${tipo}"]`);
  if (!form) return;
  const lista = EJEMPLOS[tipo];
  const e = lista[siguienteIndice(tipo, lista.length)];

  if (tipo === 'aplicacion') {
    form.nombre.value = e.nombre;
    form.codigo.value = e.codigo;
    form.fecha_lanzamiento.value = e.fecha_lanzamiento;
    form.es_critica.checked = e.es_critica;
    form.costo_mensual.value = e.costo_mensual;
  } else {
    const opcion = [...form.aplicacion_id.options].find((o) => o.dataset.codigo === e.app);
    form.aplicacion_id.value = opcion ? opcion.value : form.aplicacion_id.options[1]?.value || '';
    const radio = form.querySelector(`input[name="entorno"][value="${e.entorno}"]`);
    if (radio) radio.checked = true;
    form.replicas.value = e.replicas;
    form.uso_cpu.value = e.uso_cpu;
    form.desplegado_en.value = e.desplegado_en;
    form.notas.value = e.notas;
  }
  form.querySelector('button[type="submit"]').focus();
}

document.addEventListener('click', (ev) => {
  const auto = ev.target.closest('[data-autocompletar]');
  if (auto) autocompletar(auto.dataset.autocompletar);

  const cerrar = ev.target.closest('[data-cerrar-aviso]');
  if (cerrar) cerrar.closest('.aviso').remove();
});

// Confirmación antes de eliminar
document.addEventListener('submit', (ev) => {
  const msg = ev.target.dataset.confirmar;
  if (msg && !window.confirm(msg)) ev.preventDefault();
});

// Código siempre en mayúsculas mientras se escribe
document.addEventListener('input', (ev) => {
  if (ev.target.id === 'codigo') {
    const pos = ev.target.selectionStart;
    ev.target.value = ev.target.value.toUpperCase();
    ev.target.setSelectionRange(pos, pos);
  }
});

// Filtro de filas en la página de registros
const filtro = document.querySelector('[data-filtro]');
if (filtro) {
  filtro.addEventListener('input', () => {
    const q = filtro.value.trim().toLowerCase();
    document.querySelectorAll('[data-filtrable] tbody tr').forEach((tr) => {
      tr.hidden = q !== '' && !tr.textContent.toLowerCase().includes(q);
    });
  });
}

// Los avisos de éxito se retiran solos; se limpia la URL para que recargar no los repita
const aviso = document.querySelector('.aviso--exito');
if (aviso) {
  setTimeout(() => aviso.remove(), 6000);
  if (window.history.replaceState) window.history.replaceState(null, '', window.location.pathname);
}
