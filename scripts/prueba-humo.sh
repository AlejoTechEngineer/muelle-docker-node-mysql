#!/usr/bin/env bash
# =============================================================================
#  Prueba de humo de Muelle (end-to-end contra los contenedores en ejecución)
#
#  Uso:   ./scripts/prueba-humo.sh [URL_BASE]        (por defecto http://localhost:8080)
#
#  Qué verifica:
#    1. Salud del contenedor web (/health) y conexión a MySQL (/ready)
#    2. Inserta 5 aplicaciones y 15 despliegues por la API (20 registros)
#    3. Validaciones: rechaza datos inválidos (422) y duplicados (409)
#    4. Integridad referencial: FK impide despliegues huérfanos y borrar
#       una aplicación con despliegues
#    5. Lee de nuevo y confirma que al menos 15 registros quedaron persistidos
#
#  OJO: escribe datos reales. Para el video, ingresa los datos por la interfaz
#  web; este script es para validar la solución. Para reiniciar la base:
#    docker compose down -v && docker compose up -d
#  Requiere: bash y curl (Linux, macOS o Git Bash en Windows).
# =============================================================================
set -uo pipefail

BASE="${1:-http://localhost:8080}"
OK=0; FALLOS=0

verde() { printf '\033[32m%s\033[0m\n' "$*"; }
rojo()  { printf '\033[31m%s\033[0m\n' "$*"; }

comprobar() { # descripcion  esperado  obtenido
  if [[ "$2" == "$3" ]]; then verde "  ok   $1 ($3)"; OK=$((OK+1));
  else rojo "  FALLO $1: se esperaba $2 y llegó $3"; FALLOS=$((FALLOS+1)); fi
}

post() { # ruta json -> imprime código HTTP
  curl -s -o /tmp/muelle_resp.json -w '%{http_code}' -X POST "$BASE$1" \
       -H 'Content-Type: application/json' -d "$2"
}

id_de_respuesta() { grep -o '"id":[0-9]*' /tmp/muelle_resp.json | head -1 | cut -d: -f2; }

echo "Probando Muelle en $BASE"
echo "1) Salud"
comprobar "GET /health" 200 "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/health")"
comprobar "GET /ready (MySQL alcanzable)" 200 "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/ready")"

echo "2) Cinco aplicaciones"
SUF=$(date +%s | tail -c 3)   # sufijo para poder correr el script más de una vez
declare -A APP
while IFS='|' read -r nombre codigo fecha critica costo; do
  codigo="${codigo:0:4}${SUF}"
  c=$(post /api/aplicaciones "{\"nombre\":\"$nombre $SUF\",\"codigo\":\"$codigo\",\"fecha_lanzamiento\":\"$fecha\",\"es_critica\":$critica,\"costo_mensual\":\"$costo\"}")
  comprobar "POST aplicación $codigo" 201 "$c"
  APP[$codigo]=$(id_de_respuesta)
done <<'DATOS'
Pasarela de pagos|PAGO|2023-03-15|true|1450.00
Portal de clientes|PORT|2022-08-01|true|980.50
Motor de recomendaciones|RECO|2024-02-20|false|620.75
Gestor de inventario|INVE|2021-11-05|false|310.00
Notificaciones push|NOTI|2025-06-30|false|145.20
DATOS

echo "3) Quince despliegues"
while IFS='|' read -r pref entorno replicas cpu fecha notas; do
  app_id="${APP[${pref}${SUF}]}"
  c=$(post /api/despliegues "{\"aplicacion_id\":$app_id,\"entorno\":\"$entorno\",\"replicas\":$replicas,\"uso_cpu\":$cpu,\"desplegado_en\":\"$fecha\",\"notas\":\"$notas\"}")
  comprobar "POST despliegue $pref/$entorno" 201 "$c"
done <<'DATOS'
PAGO|desarrollo|1|12.5|2026-09-01T08:30|v3.0.0-rc1
PAGO|pruebas|2|34.8|2026-09-03T14:10|v3.0.0-rc2
PAGO|produccion|6|61.2|2026-09-08T22:00|v3.0.0
PORT|desarrollo|1|8.4|2026-09-02T09:45|v5.2.0
PORT|pruebas|2|27.9|2026-09-05T11:20|v5.2.0
PORT|produccion|4|48.6|2026-09-12T21:30|v5.2.0
RECO|desarrollo|1|72.3|2026-09-04T16:00|v1.8.0
RECO|pruebas|3|81.0|2026-09-10T10:15|v1.8.0
RECO|produccion|8|66.4|2026-09-18T23:00|v1.8.0
INVE|desarrollo|1|5.1|2026-09-06T07:50|v2.1.3
INVE|pruebas|1|14.7|2026-09-09T15:35|v2.1.3
INVE|produccion|2|22.9|2026-09-15T20:00|v2.1.3
NOTI|desarrollo|1|3.6|2026-09-11T13:05|v0.9.0
NOTI|pruebas|2|19.3|2026-09-20T09:00|v1.0.0
NOTI|produccion|3|31.7|2026-09-25T22:45|v1.0.0
DATOS

echo "4) Validaciones e integridad referencial"
comprobar "Código de 4 caracteres se rechaza" 422 "$(post /api/aplicaciones '{"nombre":"Prueba","codigo":"ABCD","fecha_lanzamiento":"2024-01-01","es_critica":false,"costo_mensual":"10"}')"
comprobar "Código duplicado se rechaza" 409 "$(post /api/aplicaciones "{\"nombre\":\"Otra $SUF\",\"codigo\":\"PAGO${SUF}\",\"fecha_lanzamiento\":\"2024-01-01\",\"es_critica\":false,\"costo_mensual\":\"10\"}")"
comprobar "CPU de 150 % se rechaza" 422 "$(post /api/despliegues "{\"aplicacion_id\":${APP[PAGO$SUF]},\"entorno\":\"pruebas\",\"replicas\":1,\"uso_cpu\":150,\"desplegado_en\":\"2026-09-01T08:00\"}")"
comprobar "Despliegue huérfano (FK) se rechaza" 422 "$(post /api/despliegues '{"aplicacion_id":999999,"entorno":"pruebas","replicas":1,"uso_cpu":10,"desplegado_en":"2026-09-01T08:00"}')"
comprobar "Borrar aplicación con despliegues (RESTRICT)" 409 "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$BASE/api/aplicaciones/${APP[PAGO$SUF]}")"

echo "5) Persistencia: lectura desde MySQL"
TOTAL=$(curl -s "$BASE/api/resumen" | grep -o '"total":[0-9]*' | cut -d: -f2)
if [[ "${TOTAL:-0}" -ge 15 ]]; then verde "  ok   $TOTAL registros persistidos (meta: 15)"; OK=$((OK+1));
else rojo "  FALLO solo hay ${TOTAL:-0} registros"; FALLOS=$((FALLOS+1)); fi
comprobar "GET /registros" 200 "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/registros")"

echo
echo "Resultado: $OK pruebas superadas, $FALLOS fallidas."
[[ $FALLOS -eq 0 ]]
