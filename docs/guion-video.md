# Guion del video

Duración objetivo: **22 a 25 minutos**. Cada bloque indica qué mostrar, qué decir y qué criterio de la rúbrica cubre. Las frases de narración son una guía; dilas con tus palabras.

## Antes de grabar

1. Sube el volumen del micrófono y cierra notificaciones. Graba a 1080p con OBS Studio o con la grabadora de Xbox Game Bar (`Win + Alt + R`).
2. Aumenta la fuente de la terminal a 16 o 18 puntos para que los comandos se lean en el video.
3. Si ya tienes Docker Desktop instalado, la rúbrica pide mostrar la instalación. Tienes dos caminos: desinstalarlo y volver a instalarlo (ojo: se pierden imágenes y volúmenes locales), o grabar la instalación en otro equipo o en una máquina virtual con Windows 11.
4. Deja abierta la carpeta del proyecto en VS Code y una terminal de PowerShell en la raíz del repositorio.
5. Base de datos vacía para la demostración: `docker compose down -v` si ya habías hecho pruebas.

## Mapa de la rúbrica

| Criterio (puntaje) | Dónde se cubre |
|---|---|
| Comandos Docker, mínimo 30, con arquitectura y usos (70) | Bloques 2, 3, 5 y 8: 62 ejecuciones de 47 comandos distintos |
| Despliegue web con BD, interfaz UX/UI y relación de tablas (70) | Bloques 4, 6 y 7 |
| Pruebas: 15 datos persistentes, explicando cada paso (30) | Bloques 6, 7 y 8: 20 registros y prueba de destrucción de contenedores |

## Bloques

### 0. Presentación (0:00 a 1:00)

Muestra tu cámara o una diapositiva con nombre, módulo y tutor.

> "En este video instalo Docker Desktop, recorro más de 40 comandos explicando la arquitectura de Docker y despliego Muelle: una aplicación web en Node.js con una base de datos MySQL, cada una en su propio contenedor. Al final demuestro que los datos persisten aunque los contenedores se destruyan."

### 1. Instalación de Docker Desktop (1:00 a 4:00) · Comandos

1. Descarga el instalador desde docker.com (Docker Desktop for Windows).
2. Ejecútalo y deja marcada la opción de usar **WSL 2**. Explica por qué: los contenedores Linux necesitan un kernel Linux, y WSL 2 lo provee dentro de Windows.
3. Reinicia si lo pide, acepta los términos y abre Docker Desktop. Muestra el indicador de motor en ejecución.
4. En PowerShell: `docker version` y `docker info`.

> "Fíjense que `docker version` muestra dos bloques: Client y Server. El cliente es la CLI que uso; el servidor es el daemon `dockerd`. Se comunican por una API REST. Toda la arquitectura de Docker parte de esa separación."

### 2. Arquitectura y registro (4:00 a 6:00) · Comandos

Abre `docs/comandos-docker.md` y muestra el primer diagrama: cliente, daemon, registro y objetos; namespaces para aislar y cgroups para limitar recursos.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\demo-comandos.ps1 -Seccion 1
```

Pasos 1 a 6: `version`, `info`, `context ls`, `search`, `pull hello-world`, `run --rm hello-world`. Lee en voz alta el mensaje de hello-world: describe exactamente el recorrido cliente → daemon → registro → contenedor.

### 3. Crear y eliminar imagen y contenedor (6:00 a 12:00) · Comandos · Actividad punto 1

Muestra `demo-imagen/Dockerfile` (tres líneas) y continúa con el script, pasos 7 a 42:

- **Crear imagen:** `docker build`, `images`, `history` (cada instrucción es una capa), `image inspect`, `tag`.
- **Ciclo de vida:** `create` (estado Created en `ps -a`), `start`, abre `http://localhost:8081` en el navegador, `logs`, `exec`, `top`, `stats`, `port`, `pause` (recarga el navegador: no responde), `unpause`, `rename`, `restart`, `cp`, `diff`, `inspect`.
- **Eliminar:** `stop` (SIGTERM), `rm`; luego `run -d`, `kill` (SIGKILL) y `rm` para comparar; por último `rmi` para **eliminar la imagen**.
- **Volúmenes y redes:** create, ls, inspect, rm de cada uno; cierra con `system df`.

> "Diferencia clave: `stop` le pide al proceso que termine y le da 10 segundos; `kill` lo termina de inmediato. Más adelante verán que mi aplicación aprovecha ese SIGTERM para cerrar sus conexiones con orden."

### 4. Recorrido por el código (12:00 a 15:00) · Despliegue web

En VS Code, muestra en este orden:

1. `database/init/01_esquema.sql`: dos tablas de 7 columnas, 13 tipos de datos distintos, la llave foránea `aplicacion_id` con `ON DELETE RESTRICT`, restricciones CHECK y la vista. Muestra el diagrama entidad-relación del README.
2. `database/Dockerfile`: parte de `mysql:8.4`, copia la configuración y los scripts a `/docker-entrypoint-initdb.d`, define el HEALTHCHECK.
3. `database/init/02_privilegios.sh`: mínimo privilegio para el usuario de la app.
4. `web/Dockerfile`: dos etapas, usuario `node` sin privilegios, HEALTHCHECK y forma exec del CMD.
5. `docker-compose.yml`: dos servicios, red interna sin puertos publicados para MySQL, volumen con nombre, `depends_on` con `service_healthy`, sistema de archivos de solo lectura y límites de CPU y memoria.

### 5. Construir y desplegar (15:00 a 17:00) · Comandos · Actividad puntos 2 y 3

```powershell
.\scripts\demo-comandos.ps1 -Seccion 2
```

Construye las dos imágenes, levanta el stack y espera a que `docker compose ps` muestre ambos servicios como `healthy`. En los logs de `db` señala la ejecución de `01_esquema.sql` y `02_privilegios.sh`. `SHOW TABLES` confirma el esquema; `exec web id` confirma que la app no corre como root.

### 6. La aplicación y el ingreso de datos (17:00 a 21:00) · Despliegue web · Pruebas · Actividad puntos 4 y 5

1. Abre `http://localhost:8080`. Señala el indicador **Contenedor** en la barra superior: es el ID del contenedor que respondió. El patio muestra 0 de 15.
2. **Registrar aplicación:** muestra una validación fallida (código `ABC`), luego **Usar datos de ejemplo** y **Guardar aplicación**. Repite hasta las 5 aplicaciones. Explica la tabla lateral con los tipos de cada columna.
3. **Registrar despliegue:** guarda los 15 despliegues con el mismo botón. Comenta la lista de aplicaciones (viene de la tabla padre) y el selector de entorno (el ENUM).
4. Vuelve a Inicio: el patio pasa a "meta de 15 registros cumplida" con 20 registros.

> Consejo: puedes acelerar al doble la parte repetitiva en la edición, pero deja a velocidad normal al menos la primera aplicación y el primer despliegue.

### 7. El enlace de consulta y la evidencia de contenedores (21:00 a 23:00) · Pruebas · Despliegue web

1. Abre **Registros**: es el enlace diferente donde se lee lo que hay en MySQL. Filtra por `produccion`.
2. Intenta **Eliminar** PAGOS1: la llave foránea lo impide. Esto demuestra la relación entre tablas en vivo.
3. Abre **Contenedores** y ponlo al lado de `docker ps`: los ID coinciden con los hostname de la página. Muestra `/.dockerenv`, el usuario `node`, el límite de memoria de 256 MB que viene de cgroups, la IP de `db` resuelta por el DNS de Docker y los permisos limitados.
4. Opcional: `http://localhost:8080/api/despliegues` para ver los mismos datos en JSON.

### 8. Persistencia (23:00 a 24:30) · Pruebas

```powershell
.\scripts\demo-comandos.ps1 -Seccion 3
```

Cuenta los registros, detiene `web` (muestra el mensaje de SIGTERM en los logs), destruye todo con `docker compose down`, muestra que no queda ningún contenedor pero sí el volumen, levanta contenedores nuevos y vuelve a contar: los mismos 20 registros. Recarga **Registros** en el navegador: el ID del contenedor cambió y los datos siguen ahí.

> "Los contenedores son desechables; el estado vive en el volumen. Por eso puedo destruir y recrear la aplicación sin perder información."

### 9. Cierre (24:30 a 25:00)

Resume: imagen de base de datos propia, imagen de servidor web propia, despliegue orquestado, más de 15 datos persistentes y más de 30 comandos. Menciona el repositorio de GitHub.

## Publicación

Sube el video a YouTube con visibilidad **Pública**, como exige la entrega (la opción "No listado" puede no considerarse pública). Título sugerido: *Contenerización con Docker: Node.js + MySQL, Muelle. Maestría en Arquitectura de Software, Politécnico Grancolombiano*. En la descripción pega el enlace del repositorio y una tabla de contenidos con los minutos de cada bloque.
