# Datos de prueba: 5 aplicaciones y 15 despliegues

Son los mismos que carga el botón **Usar datos de ejemplo** de cada formulario (un ejemplo distinto por clic, en este orden). Con ellos la base queda con **20 registros**, por encima de los 15 que pide la actividad. En el video basta con pulsar el botón, mostrar el formulario lleno y pulsar **Guardar**: los datos viajan por el formulario igual que si se escribieran a mano.

Primero se registran las aplicaciones, porque cada despliegue necesita una aplicación existente (llave foránea).

## Tabla `aplicaciones`

| # | Nombre | Código | Lanzamiento | Crítica | Costo mensual (USD) |
|---:|---|---|---|---|---:|
| 1 | Pasarela de pagos | PAGOS1 | 2023-03-15 | Sí | 1450.00 |
| 2 | Portal de clientes | PORTAL | 2022-08-01 | Sí | 980.50 |
| 3 | Motor de recomendaciones | RECOMN | 2024-02-20 | No | 620.75 |
| 4 | Gestor de inventario | INVENT | 2021-11-05 | No | 310.00 |
| 5 | Notificaciones push | NOTIF1 | 2025-06-30 | No | 145.20 |

## Tabla `despliegues`

| # | Aplicación | Entorno | Réplicas | CPU (%) | Fecha y hora | Notas |
|---:|---|---|---:|---:|---|---|
| 1 | PAGOS1 | desarrollo | 1 | 12.5 | 2026-09-01 08:30 | v3.0.0-rc1: integración con 3-D Secure 2 |
| 2 | PAGOS1 | pruebas | 2 | 34.8 | 2026-09-03 14:10 | v3.0.0-rc2: pruebas de carga con 500 usuarios |
| 3 | PAGOS1 | producción | 6 | 61.2 | 2026-09-08 22:00 | v3.0.0: salida en ventana nocturna, despliegue canario 10 % |
| 4 | PORTAL | desarrollo | 1 | 8.4 | 2026-09-02 09:45 | v5.2.0: nuevo inicio de sesión con passkeys |
| 5 | PORTAL | pruebas | 2 | 27.9 | 2026-09-05 11:20 | v5.2.0: pruebas de accesibilidad WCAG 2.2 |
| 6 | PORTAL | producción | 4 | 48.6 | 2026-09-12 21:30 | v5.2.0: liberado al 100 % de usuarios |
| 7 | RECOMN | desarrollo | 1 | 72.3 | 2026-09-04 16:00 | v1.8.0: modelo de embeddings actualizado |
| 8 | RECOMN | pruebas | 3 | 81.0 | 2026-09-10 10:15 | v1.8.0: prueba A/B frente al modelo anterior |
| 9 | RECOMN | producción | 8 | 66.4 | 2026-09-18 23:00 | v1.8.0: escalado horizontal por demanda |
| 10 | INVENT | desarrollo | 1 | 5.1 | 2026-09-06 07:50 | v2.1.3: corrección de redondeo en existencias |
| 11 | INVENT | pruebas | 1 | 14.7 | 2026-09-09 15:35 | v2.1.3: regresión completa aprobada |
| 12 | INVENT | producción | 2 | 22.9 | 2026-09-15 20:00 | v2.1.3: sin tiempo de inactividad |
| 13 | NOTIF1 | desarrollo | 1 | 3.6 | 2026-09-11 13:05 | v0.9.0: primer prototipo con colas |
| 14 | NOTIF1 | pruebas | 2 | 19.3 | 2026-09-20 09:00 | v1.0.0: envío masivo de 10 000 mensajes |
| 15 | NOTIF1 | producción | 3 | 31.7 | 2026-09-25 22:45 | v1.0.0: primera versión estable |

## Casos de error para mostrar las validaciones

| Qué intentar | Resultado esperado |
|---|---|
| Código `ABC` (3 caracteres) | El formulario marca el campo: deben ser exactamente 6 |
| Repetir el código `PAGOS1` | "Ya existe una aplicación con ese código" (índice UNIQUE de MySQL) |
| Uso de CPU `150` | "El uso de CPU es un porcentaje entre 0 y 100" |
| Eliminar PAGOS1 desde Registros | Bloqueado: tiene despliegues (llave foránea ON DELETE RESTRICT) |
