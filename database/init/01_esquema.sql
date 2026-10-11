-- =============================================================================
--  MUELLE · Registro de aplicaciones y despliegues
--  Script de base de datos (MySQL 8.4 LTS)
--
--  Módulo : Contenerización de Aplicaciones de Software - Unidad 2
--  Programa: Maestría en Arquitectura de Software - Politécnico Grancolombiano
--  Autor   : Alejandro De Mendoza
--
--  Modelo entidad-relación (1:N)
--
--    aplicaciones (1) ────────< (N) despliegues
--         PK id                        PK id
--                                      FK aplicacion_id → aplicaciones.id
--
--  Una aplicación puede tener muchos despliegues; cada despliegue pertenece a
--  exactamente una aplicación. La FK usa ON DELETE RESTRICT: no se puede borrar
--  una aplicación que todavía tiene despliegues (integridad referencial).
--
--  Cada tabla tiene exactamente 7 columnas. Entre ambas se usan 13 tipos de
--  datos distintos de MySQL (la FK repite por definición el tipo de la PK):
--    INT, VARCHAR, CHAR, DATE, BOOLEAN, DECIMAL, TIMESTAMP,
--    BIGINT, ENUM, SMALLINT, DOUBLE, DATETIME, TEXT
--  Nota: MySQL implementa BOOLEAN como sinónimo de TINYINT(1); por eso
--  information_schema lo reporta así.
--
--  Este archivo lo ejecuta automáticamente la imagen de base de datos la
--  primera vez que se crea el volumen (carpeta /docker-entrypoint-initdb.d).
--  También puede ejecutarse a mano:  mysql -u root -p < 01_esquema.sql
-- =============================================================================

CREATE DATABASE IF NOT EXISTS muelle
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE muelle;

-- -----------------------------------------------------------------------------
-- Tabla padre: aplicaciones
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aplicaciones (
  id                 INT UNSIGNED  NOT NULL AUTO_INCREMENT     COMMENT 'Entero: identificador',
  nombre             VARCHAR(80)   NOT NULL                    COMMENT 'Cadena variable: nombre de la aplicación',
  codigo             CHAR(6)       NOT NULL                    COMMENT 'Carácter fijo: código interno de 6 posiciones',
  fecha_lanzamiento  DATE          NOT NULL                    COMMENT 'Fecha: salida a producción',
  es_critica         BOOLEAN       NOT NULL DEFAULT FALSE      COMMENT 'Booleano: ¿es crítica para el negocio?',
  costo_mensual      DECIMAL(10,2) NOT NULL DEFAULT 0.00       COMMENT 'Decimal exacto: costo de infraestructura (USD)',
  creado_en          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Marca de tiempo: alta del registro',

  CONSTRAINT pk_aplicaciones        PRIMARY KEY (id),
  CONSTRAINT uq_aplicaciones_nombre UNIQUE (nombre),
  CONSTRAINT uq_aplicaciones_codigo UNIQUE (codigo),
  CONSTRAINT ck_aplicaciones_codigo CHECK (REGEXP_LIKE(codigo, '^[A-Z0-9]{6}$', 'c')),
  CONSTRAINT ck_aplicaciones_costo  CHECK (costo_mensual >= 0),
  CONSTRAINT ck_aplicaciones_fecha  CHECK (fecha_lanzamiento BETWEEN '2000-01-01' AND '2100-12-31')
) ENGINE = InnoDB
  COMMENT = 'Catálogo de aplicaciones contenerizadas';

-- -----------------------------------------------------------------------------
-- Tabla hija: despliegues
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS despliegues (
  id              BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT   COMMENT 'Entero largo: identificador',
  aplicacion_id   INT UNSIGNED      NOT NULL                  COMMENT 'Entero: FK hacia aplicaciones.id',
  entorno         ENUM('desarrollo','pruebas','produccion') NOT NULL COMMENT 'Enumerado: entorno de destino',
  replicas        SMALLINT UNSIGNED NOT NULL DEFAULT 1        COMMENT 'Entero corto: número de contenedores',
  uso_cpu         DOUBLE            NOT NULL DEFAULT 0        COMMENT 'Real de doble precisión: uso promedio de CPU (%)',
  desplegado_en   DATETIME          NOT NULL                  COMMENT 'Fecha y hora: momento del despliegue',
  notas           TEXT              NULL                      COMMENT 'Texto largo: versión, cambios, observaciones',

  CONSTRAINT pk_despliegues PRIMARY KEY (id),
  CONSTRAINT fk_despliegues_aplicacion
    FOREIGN KEY (aplicacion_id) REFERENCES aplicaciones (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT ck_despliegues_replicas CHECK (replicas BETWEEN 1 AND 100),
  CONSTRAINT ck_despliegues_cpu      CHECK (uso_cpu >= 0 AND uso_cpu <= 100),
  INDEX ix_despliegues_app_fecha (aplicacion_id, desplegado_en),
  INDEX ix_despliegues_entorno   (entorno)
) ENGINE = InnoDB
  COMMENT = 'Historial de despliegues por aplicación';

-- -----------------------------------------------------------------------------
-- Vista de lectura: une ambas tablas (la usa la página "Registros")
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_despliegues_detalle AS
SELECT
  d.id,
  a.codigo          AS codigo_aplicacion,
  a.nombre          AS aplicacion,
  a.es_critica,
  d.entorno,
  d.replicas,
  d.uso_cpu,
  d.desplegado_en,
  d.notas
FROM despliegues d
JOIN aplicaciones a ON a.id = d.aplicacion_id;
