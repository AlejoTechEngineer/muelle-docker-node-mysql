# =============================================================================
#  Imagen de base de datos relacional de Muelle
#  Base: MySQL 8.4 LTS (imagen oficial)
#  Agrega: configuración propia + script de esquema + mínimo privilegio
# =============================================================================
FROM mysql:8.4

LABEL org.opencontainers.image.title="muelle-db" \
      org.opencontainers.image.description="MySQL 8.4 con el esquema aplicaciones/despliegues de Muelle" \
      org.opencontainers.image.authors="Alejandro De Mendoza" \
      org.opencontainers.image.source="https://github.com/AlejoTechEngineer/muelle-docker-node-mysql" \
      edu.poli.modulo="Contenerizacion de Aplicaciones de Software - Unidad 2"

# Nombre de la base que creará el entrypoint oficial
ENV MYSQL_DATABASE=muelle

# Configuración del servidor (charset, zona horaria, modo estricto)
COPY conf/muelle.cnf /etc/mysql/conf.d/muelle.cnf

# Scripts que el entrypoint ejecuta en orden alfabético la PRIMERA vez
# que arranca con un volumen vacío
COPY init/ /docker-entrypoint-initdb.d/

# Sano = el servidor acepta conexiones TCP con el usuario de la app y el
# esquema ya existe (durante la inicialización MySQL corre sin red, así que
# el chequeo falla hasta que todo está listo)
HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=12 \
  CMD mysql -h 127.0.0.1 -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "SELECT 1 FROM muelle.despliegues LIMIT 1" >/dev/null 2>&1 || exit 1

EXPOSE 3306
