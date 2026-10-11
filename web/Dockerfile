# =============================================================================
#  Imagen del servidor web de Muelle (Node.js 22 + Express)
#  Construcción en dos etapas: la primera instala dependencias, la segunda
#  solo copia lo necesario para ejecutar. Resultado: imagen más pequeña y sin
#  herramientas de construcción ni caché de npm.
# =============================================================================

# ---------- Etapa 1: dependencias ------------------------------------------
FROM node:22-alpine AS dependencias
WORKDIR /app
# Se copian primero los manifiestos: si el código cambia pero las dependencias
# no, Docker reutiliza esta capa de la caché y la construcción tarda segundos.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# ---------- Etapa 2: ejecución ----------------------------------------------
FROM node:22-alpine AS ejecucion

LABEL org.opencontainers.image.title="muelle-web" \
      org.opencontainers.image.description="Servidor web Node.js de Muelle: registro de aplicaciones y despliegues" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.authors="Alejandro De Mendoza" \
      org.opencontainers.image.source="https://github.com/AlejoTechEngineer/muelle-docker-node-mysql" \
      edu.poli.modulo="Contenerizacion de Aplicaciones de Software - Unidad 2"

ENV NODE_ENV=production \
    PORT=3000 \
    APP_VERSION=1.0.0 \
    APP_IMAGE=muelle-web:1.0.0

WORKDIR /app

# Dependencias desde la etapa anterior y código de la aplicación,
# con dueño "node" (usuario sin privilegios que trae la imagen oficial)
COPY --from=dependencias --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src

# Fecha de construcción visible en la página /sistema
RUN date -u +"%Y-%m-%d %H:%M UTC" > /app/BUILD_DATE

# Nunca ejecutar como root dentro del contenedor
USER node

EXPOSE 3000

# Docker marca el contenedor como "healthy" solo si /health responde
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health >/dev/null 2>&1 || exit 1

# Forma "exec": node es el proceso principal y recibe SIGTERM de docker stop
CMD ["node", "src/server.js"]
