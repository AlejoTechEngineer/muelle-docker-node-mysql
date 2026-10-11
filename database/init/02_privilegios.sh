#!/bin/bash
# =============================================================================
#  Principio de mínimo privilegio
#  La imagen oficial de MySQL le da ALL PRIVILEGES sobre la base al usuario de
#  la aplicación (MYSQL_USER). Aquí se los recortamos a lo que la app web
#  necesita: leer, insertar, actualizar y borrar filas. La app NO puede hacer
#  DROP, ALTER ni CREATE, aunque alguien comprometa sus credenciales.
#
#  El entrypoint oficial ejecuta este archivo una sola vez, cuando el volumen
#  de datos está vacío. Como lo carga con "source", no se usa "set -u" para no
#  alterar el comportamiento del entrypoint.
# =============================================================================

echo "[muelle] Aplicando mínimo privilegio a '${MYSQL_USER}'@'%' sobre ${MYSQL_DATABASE}"

SQL_PRIVILEGIOS="
REVOKE ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.* FROM '${MYSQL_USER}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, SHOW VIEW ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;"

if declare -F docker_process_sql >/dev/null; then
  # Función del entrypoint oficial: usa la clave de root sin exponerla
  docker_process_sql <<< "$SQL_PRIVILEGIOS"
else
  mysql --protocol=socket -uroot -p"${MYSQL_ROOT_PASSWORD}" <<< "$SQL_PRIVILEGIOS"
fi

echo "[muelle] Privilegios aplicados."
