# =============================================================================
#  Recorrido guiado de comandos Docker para el video (Windows PowerShell)
#
#  Uso (desde la raíz del repositorio):
#    .\scripts\demo-comandos.ps1              todas las secciones
#    .\scripts\demo-comandos.ps1 -Seccion 1   fundamentos: imágenes, contenedores, volúmenes, redes
#    .\scripts\demo-comandos.ps1 -Seccion 2   despliegue de Muelle con Docker Compose
#    .\scripts\demo-comandos.ps1 -Seccion 3   prueba de persistencia
#
#  Si PowerShell bloquea el script, habilítalo solo para esta sesión:
#    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#
#  Cada paso muestra el componente de la arquitectura, la explicación y el
#  comando; con Enter se ejecuta, con "s" se salta y con "q" se sale.
# =============================================================================
param([string]$Seccion = 'todas')

$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location (Split-Path $PSScriptRoot -Parent)

$lineas = Get-Content (Join-Path $PSScriptRoot 'comandos.tsv') -Encoding UTF8 |
  Where-Object { $_ -and -not $_.StartsWith('#') }

$n = 0
foreach ($linea in $lineas) {
  $p = $linea.Split('|', 4)
  if ($Seccion -ne 'todas' -and $p[0] -ne $Seccion) { continue }
  $n++
  Write-Host ''
  Write-Host ('[{0:D2}] {1}' -f $n, $p[1]) -ForegroundColor Yellow
  Write-Host ('     {0}' -f $p[3]) -ForegroundColor DarkGray
  Write-Host ('PS> {0}' -f $p[2]) -ForegroundColor Cyan
  $r = Read-Host 'Enter = ejecutar, s = saltar, q = salir'
  if ($r -eq 'q') { break }
  if ($r -eq 's') { continue }
  Invoke-Expression $p[2]
}

Write-Host ''
Write-Host ('Recorrido terminado: {0} comandos mostrados.' -f $n) -ForegroundColor Green
