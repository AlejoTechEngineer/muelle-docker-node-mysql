#!/usr/bin/env bash
# =============================================================================
#  Recorrido guiado de comandos Docker para el video (Linux, macOS, Git Bash)
#
#  Uso (desde la raíz del repositorio):
#    ./scripts/demo-comandos.sh          todas las secciones
#    ./scripts/demo-comandos.sh 1        fundamentos: imágenes, contenedores, volúmenes, redes
#    ./scripts/demo-comandos.sh 2        despliegue de Muelle con Docker Compose
#    ./scripts/demo-comandos.sh 3        prueba de persistencia
#
#  Cada paso muestra el componente de la arquitectura, la explicación y el
#  comando; con Enter se ejecuta, con "s" se salta y con "q" se sale.
#  Los comandos están en scripts/comandos.tsv (una sola fuente para bash y PowerShell).
# =============================================================================
set -u
SECCION="${1:-todas}"
cd "$(dirname "$0")/.." || exit 1

n=0
while IFS='|' read -r sec componente comando explicacion <&3; do
  [[ -z "$sec" || "$sec" == \#* ]] && continue
  [[ "$SECCION" != "todas" && "$sec" != "$SECCION" ]] && continue
  n=$((n + 1))
  printf '\n\033[1;33m[%02d] %s\033[0m\n' "$n" "$componente"
  printf '\033[90m     %s\033[0m\n' "$explicacion"
  printf '\033[1;36m$ %s\033[0m\n' "$comando"
  read -r -p "Enter = ejecutar, s = saltar, q = salir: " r
  [[ "$r" == "q" ]] && break
  [[ "$r" == "s" ]] && continue
  eval "$comando"
done 3< scripts/comandos.tsv

printf '\n\033[1;32mRecorrido terminado: %d comandos mostrados.\033[0m\n' "$n"
