
-- ==========================================
-- 🐄 BASE DE DATOS: LA ESTANCIA GUAYABA
-- Ejecutar UNA VEZ en pgAdmin 4 (DB vacía)
-- ==========================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. ENUMS (idempotentes)
DO $$ BEGIN CREATE TYPE estado_bovino AS ENUM ('activo','disponible','vendido','cuarentena','preñez','fallecido'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tipo_salud AS ENUM ('vacuna','desparasitacion','chequeo','tratamiento'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE estado_salud AS ENUM ('pendiente','aplicado','cancelado','reprogramado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE estado_reproduccion AS ENUM ('confirmada','evaluacion','aborto','parto_realizado','descartada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. TABLAS
CREATE TABLE IF NOT EXISTS bovinos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), chip VARCHAR(50) UNIQUE NOT NULL, nombre VARCHAR(100), raza VARCHAR(50),
  sexo VARCHAR(10) CHECK (sexo IN ('Macho','Hembra')), nacimiento DATE, peso_inicial DECIMAL(6,2) CHECK (peso_inicial >= 0),
  peso_actual DECIMAL(6,2) CHECK (peso_actual >= 0), potrero VARCHAR(50), estado estado_bovino DEFAULT 'activo',
  precio DECIMAL(10,2) DEFAULT 0.00, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS salud (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), animal_id UUID NOT NULL REFERENCES bovinos(id) ON DELETE CASCADE,
  tipo tipo_salud NOT NULL, fecha DATE NOT NULL, proxima_fecha DATE, veterinario VARCHAR(100), estado estado_salud DEFAULT 'pendiente',
  notas TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS reproduccion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), hembra_id UUID NOT NULL REFERENCES bovinos(id) ON DELETE CASCADE,
  padre_id UUID REFERENCES bovinos(id) ON DELETE SET NULL, fecha_inseminacion DATE NOT NULL,
  dias_gestacion INT CHECK (dias_gestacion BETWEEN 0 AND 283), parto_estimado DATE, estado estado_reproduccion DEFAULT 'confirmada',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS finanzas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lote VARCHAR(50) NOT NULL, mes INT CHECK (mes BETWEEN 1 AND 12),
  anio INT CHECK (anio >= 2020), ingresos DECIMAL(12,2) DEFAULT 0.00, egresos DECIMAL(12,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, CONSTRAINT uq_lote UNIQUE (lote, mes, anio)
);
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) DEFAULT 'gestor', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. ÍNDICES & VISTA DASHBOARD
CREATE INDEX IF NOT EXISTS idx_chip ON bovinos(chip);
CREATE INDEX IF NOT EXISTS idx_estado_bov ON bovinos(estado);
CREATE INDEX IF NOT EXISTS idx_salud_prox ON salud(proxima_fecha) WHERE estado = 'pendiente';
CREATE INDEX IF NOT EXISTS idx_reprod_parto ON reproduccion(parto_estimado) WHERE estado IN ('confirmada','evaluacion');
DROP MATERIALIZED VIEW IF EXISTS v_dashboard_kpis CASCADE;
CREATE MATERIALIZED VIEW v_dashboard_kpis AS
SELECT
  (SELECT COUNT(*) FROM bovinos WHERE estado = 'activo') AS activas,
  (SELECT COUNT(*) FROM bovinos WHERE estado = 'disponible') AS disponibles,
  (SELECT COUNT(*) FROM salud WHERE estado = 'pendiente') AS pendientes,
  (SELECT COUNT(*) FROM reproduccion WHERE estado IN ('confirmada','evaluacion')) AS inseminaciones,
  (SELECT COALESCE(SUM(ingresos - egresos), 0) FROM finanzas) AS margen;

-- 5. DATOS INICIALES (SEED)
INSERT INTO usuarios (email, password_hash, rol) VALUES
  ('admin@estanciaguayaba.bo', crypt('Admin2026!', gen_salt('bf')), 'admin'),
  ('trabajador@estanciaguayaba.bo', crypt('Trabajador2026!', gen_salt('bf')), 'gestor')
ON CONFLICT (email) DO NOTHING;

INSERT INTO bovinos (chip, nombre, raza, sexo, nacimiento, peso_inicial, peso_actual, potrero, estado, precio) VALUES
  ('BR-001','Guayabo','Nelore','Macho','2023-05-10',320.50,410.00,'Norte','disponible',4500.00),
  ('BR-002','Luna','Brahman','Hembra','2023-08-15',280.00,350.50,'Sur','preñez',5200.00),
  ('BR-003','Toro','Gyr','Macho','2022-11-20',450.00,580.00,'Este','activo',0.00),
  ('BR-004','Estrella','Brangus','Hembra','2024-01-10',250.00,290.00,'Norte','disponible',4800.00),
  ('BR-005','Puma','Nelore','Macho','2023-03-05',310.00,395.00,'Oeste','cuarentena',4200.00),
  ('BR-006','Mimosa','Brahman','Hembra','2022-09-12',290.00,360.00,'Sur','vendido',0.00),
  ('BR-007','Canelo','Gyr','Macho','2023-07-22',270.00,310.50,'Este','activo',0.00),
  ('BR-008','Selva','Brangus','Hembra','2024-02-18',240.00,265.00,'Norte','disponible',5000.00)
ON CONFLICT (chip) DO NOTHING;

INSERT INTO salud (animal_id, tipo, fecha, proxima_fecha, veterinario, estado, notas)
SELECT id, 'vacuna', '2024-10-01', '2025-04-01', 'Dr. Ramírez', 'pendiente', 'Aftosa' FROM bovinos WHERE chip='BR-002';
INSERT INTO salud (animal_id, tipo, fecha, proxima_fecha, veterinario, estado, notas)
SELECT id, 'desparasitacion', '2024-09-15', '2025-03-15', 'Dra. Morales', 'aplicado', 'Ivermectina' FROM bovinos WHERE chip='BR-003';
INSERT INTO salud (animal_id, tipo, fecha, proxima_fecha, veterinario, estado, notas)
SELECT id, 'chequeo', '2024-10-10', '2024-10-20', 'Dr. Ramírez', 'pendiente', 'Cuarentena' FROM bovinos WHERE chip='BR-005';

INSERT INTO reproduccion (hembra_id, padre_id, fecha_inseminacion, dias_gestacion, parto_estimado, estado)
SELECT h.id, p.id, '2024-07-10', 85, '2025-04-19', 'confirmada'
FROM bovinos h JOIN bovinos p ON p.chip='BR-003' WHERE h.chip='BR-002';

INSERT INTO finanzas (lote, mes, anio, ingresos, egresos) VALUES
  ('Lote A', 8, 2024, 16500.00, 6800.00), ('Lote A', 9, 2024, 14000.00, 5500.00),
  ('Lote B', 8, 2024, 11000.00, 4800.00), ('Lote B', 9, 2024, 12800.00, 5200.00)
ON CONFLICT (lote, mes, anio) DO NOTHING;

-- 6. ROLES & PERMISOS ESTRICTOS
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'estancia_admin') THEN CREATE ROLE estancia_admin LOGIN PASSWORD 'AdminDB2026!'; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'estancia_trabajador') THEN CREATE ROLE estancia_trabajador LOGIN PASSWORD 'TrabDB2026!'; END IF; END $$;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO estancia_admin, estancia_trabajador;

-- ADMIN: acceso total
GRANT ALL ON ALL TABLES IN SCHEMA public TO estancia_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO estancia_admin;

-- TRABAJADOR: solo inventario, salud, reproducción (crear/editar/ver)
GRANT SELECT, INSERT, UPDATE ON bovinos, salud, reproduccion TO estancia_trabajador;
GRANT SELECT ON v_dashboard_kpis TO estancia_trabajador;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO estancia_trabajador;

-- 7. REFRESH FINAL
REFRESH MATERIALIZED VIEW v_dashboard_kpis;
-- consulta
SELECT * FROM v_dashboard_kpis;
SELECT COUNT(*) FROM bovinos; -- Debe devolver 8
--- consultar usuarios 
SELECT id, email, password_hash, rol, created_at 
FROM usuarios 
ORDER BY created_at;
--------
-- ==========================================
-- 🐄 SCRIPT DE CONSULTAS POR MÓDULO
-- DB: LA ESTANCIA GUAYABA (PostgreSQL)
-- ✅ Ejecuta CADA BLOQUE por separado
-- ==========================================

-- 📦 1. INVENTARIO (Bovinos)
-- ==========================================
-- Ver todos los registros ordenados por creación
SELECT * FROM bovinos ORDER BY created_at DESC;

-- Conteo por estado (activo, disponible, vendido, etc.)
SELECT estado, COUNT(*) AS cantidad 
FROM bovinos 
GROUP BY estado 
ORDER BY cantidad DESC;

-- Vista rápida de campos críticos para auditoría
SELECT chip, nombre, raza, sexo, peso_inicial, peso_actual, potrero, estado, precio
FROM bovinos
ORDER BY chip;

-- Verificar si hay chips duplicados (debería devolver 0)
SELECT chip, COUNT(*) 
FROM bovinos 
GROUP BY chip 
HAVING COUNT(*) > 1;


-- 🩺 2. SALUD
-- ==========================================
-- Todos los registros ordenados por fecha
SELECT * FROM salud ORDER BY fecha DESC;

-- Unir con bovino para ver nombre/chip en lugar de UUIDs
SELECT 
  b.chip AS chip_bovino, 
  b.nombre AS nombre_bovino,
  s.tipo, s.fecha, s.proxima_fecha, s.veterinario, s.estado, s.notas
FROM salud s
JOIN bovinos b ON s.animal_id = b.id
ORDER BY s.fecha DESC;

-- Resumen por tipo y estado
SELECT tipo, estado, COUNT(*) AS cantidad
FROM salud
GROUP BY tipo, estado
ORDER BY tipo;

-- Ver registros pendientes que necesitan acción
SELECT b.chip, b.nombre, s.tipo, s.proxima_fecha
FROM salud s
JOIN bovinos b ON s.animal_id = b.id
WHERE s.estado = 'pendiente' AND s.proxima_fecha IS NOT NULL
ORDER BY s.proxima_fecha ASC;


-- 🤰 3. REPRODUCCIÓN
-- ==========================================
-- Todos los registros
SELECT * FROM reproduccion ORDER BY fecha_inseminacion DESC;

-- Unir hembra + padre + datos reproductivos
SELECT 
  h.chip AS chip_hembra, h.nombre AS nombre_hembra,
  p.chip AS chip_padre,  p.nombre AS nombre_padre,
  r.fecha_inseminacion, r.dias_gestacion, r.parto_estimado, r.estado
FROM reproduccion r
JOIN bovinos h ON r.hembra_id = h.id
LEFT JOIN bovinos p ON r.padre_id = p.id  -- LEFT por si padre_id es NULL
ORDER BY r.parto_estimado ASC;

-- Conteo por estado reproductivo
SELECT estado, COUNT(*) AS cantidad
FROM reproduccion
GROUP BY estado;


-- 💰 4. FINANZAS
-- ==========================================
-- Todos los registros
SELECT * FROM finanzas ORDER BY anio DESC, mes DESC;

-- Cálculo de balance por período
SELECT 
  lote, mes, anio, 
  ingresos, egresos, 
  (ingresos - egresos) AS balance
FROM finanzas
ORDER BY anio DESC, mes DESC;

-- Acumulado por lote
SELECT lote, SUM(ingresos) AS total_ingresos, SUM(egresos) AS total_egresos
FROM finanzas
GROUP BY lote
ORDER BY lote;


-- 📊 5. DASHBOARD (KPIs)
-- ==========================================
-- Actualizar la vista si acabas de hacer INSERT/UPDATE/DELETE
REFRESH MATERIALIZED VIEW v_dashboard_kpis;

-- Ver los indicadores
SELECT * FROM v_dashboard_kpis;


-- 🔍 TIPS DE VERIFICACIÓN DE INTEGRIDAD
-- ==========================================
-- 1. ¿Las Foreign Keys funcionan? Prueba este INSERT (debe fallar por ID inexistente):
-- INSERT INTO salud (animal_id, tipo, fecha) VALUES ('00000000-0000-0000-0000-000000000000', 'vacuna', CURRENT_DATE);

-- 2. ¿Los índices se usan? Revisa el plan de ejecución:
EXPLAIN ANALYZE SELECT * FROM bovinos WHERE chip = 'BR-001';

-- 3. ¿Hay registros huérfanos? (No debería devolver nada)
SELECT s.id FROM salud s LEFT JOIN bovinos b ON s.animal_id = b.id WHERE b.id IS NULL;
SELECT r.id FROM reproduccion r LEFT JOIN bovinos b ON r.hembra_id = b.id WHERE b.id IS NULL;
------ creacion
CREATE TABLE IF NOT EXISTS gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote TEXT NOT NULL,
  mes INTEGER NOT NULL,
  anio INTEGER NOT NULL,
  categoria TEXT NOT NULL,
  descripcion TEXT,
  monto NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);
GRANT ALL ON gastos TO estancia_admin;
---- metodo de pago en la pagina ---
-- ==========================================
-- 🛡️ MÓDULO DE VENTAS + PROTECCIÓN ANTI-DOBLE COBRO (CAMPOS OPTIMIZADOS)
-- ==========================================

-- 1. ENUM métodos de pago (idempotente)
DO $$ BEGIN 
  CREATE TYPE metodo_pago AS ENUM ('efectivo', 'transferencia', 'cheque', 'letra', 'qr'); 
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Tabla `ventas` con longitudes realistas
CREATE TABLE IF NOT EXISTS ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key VARCHAR(64) UNIQUE,                -- Clave única por intento de clic (hash/UUID)
  animal_id UUID NOT NULL REFERENCES bovinos(id) ON DELETE RESTRICT,
  comprador_nombre VARCHAR(40) NOT NULL,             -- ✅ Ajustado a 40
  comprador_documento VARCHAR(20),                   -- CI/DNI/RUC/NIT (máx ~18 dígitos)
  comprador_telefono VARCHAR(20),                    -- Formato internacional: +591 71234567
  comprador_email VARCHAR(100),                      -- Estándar seguro RFC
  comprador_finca VARCHAR(60),                       -- Nombre de finca/hato comercial
  fecha_venta DATE NOT NULL DEFAULT CURRENT_DATE,
  precio_venta DECIMAL(10,2) NOT NULL CHECK (precio_venta > 0),
  metodo_pago metodo_pago NOT NULL,
  estado_pago VARCHAR(15) DEFAULT 'pendiente',       -- pendiente | pagado | parcial | cancelado
  referencia_contrato VARCHAR(40),                   -- Nº factura, contrato o remito
  notas TEXT,
  creado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 🔍 Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_ventas_animal ON ventas(animal_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha_venta DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_doc ON ventas(comprador_documento);

-- 🚫 Evita 2 ventas activas del MISMO animal (índice parcial)
CREATE UNIQUE INDEX IF NOT EXISTS uq_animal_venta_activa ON ventas(animal_id) 
WHERE estado_pago <> 'cancelado';

-- 🔐 Permisos (alineados a tus roles existentes)
GRANT ALL ON ventas TO estancia_admin;
GRANT SELECT, INSERT, UPDATE ON ventas TO estancia_trabajador;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO estancia_trabajador;

-- ⚙️ Trigger 1: Al crear venta → marca bovino como 'vendido'
CREATE OR REPLACE FUNCTION fn_venta_insert() RETURNS TRIGGER AS $$
BEGIN
  UPDATE bovinos SET estado = 'vendido', updated_at = CURRENT_TIMESTAMP WHERE id = NEW.animal_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_venta_insert ON ventas;
CREATE TRIGGER trg_venta_insert
AFTER INSERT ON ventas FOR EACH ROW EXECUTE FUNCTION fn_venta_insert();

-- ⚙️ Trigger 2: Si cancelan la venta → devuelve bovino a 'disponible'
CREATE OR REPLACE FUNCTION fn_venta_update() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado_pago IS DISTINCT FROM NEW.estado_pago AND NEW.estado_pago = 'cancelado' THEN
    UPDATE bovinos SET estado = 'disponible', updated_at = CURRENT_TIMESTAMP WHERE id = NEW.animal_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_venta_update ON ventas;
CREATE TRIGGER trg_venta_update
AFTER UPDATE ON ventas FOR EACH ROW EXECUTE FUNCTION fn_venta_update();
-----------
-- Ver estructura completa
\d ventas

-- Ver triggers activos
SELECT tgname, tgtype FROM pg_trigger WHERE tgrelid = 'ventas'::regclass;
---- ver ventas completa
SELECT 
  v.id,
  b.chip,
  b.nombre AS animal,
  b.raza,
  v.comprador_nombre,
  v.comprador_documento,
  v.fecha_venta,
  v.precio_venta,
  v.metodo_pago,
  v.estado_pago,
  v.referencia_contrato,
  v.created_at
FROM ventas v
JOIN bovinos b ON v.animal_id = b.id
ORDER BY v.created_at DESC;
--Esta vista reemplaza/actualiza tu v_dashboard_kpis actual para incluir ventas y gastos reales.---
-- ==========================================
-- 🔄 ACTUALIZAR VISTA DASHBOARD CON DATOS REALES
-- ==========================================

DROP MATERIALIZED VIEW IF EXISTS v_dashboard_kpis CASCADE;

CREATE MATERIALIZED VIEW v_dashboard_kpis AS
WITH kpis AS (
  SELECT
    (SELECT COUNT(*) FROM bovinos WHERE estado = 'activo') AS cabezas_activas,
    (SELECT COUNT(*) FROM bovinos WHERE estado = 'disponible') AS disponibles_venta,
    (SELECT COUNT(*) FROM bovinos WHERE estado = 'preñez') AS hembras_prenadas,
    (SELECT COUNT(*) FROM salud WHERE estado = 'pendiente') AS tratamientos_pendientes,
    (SELECT COUNT(*) FROM reproduccion WHERE estado IN ('confirmada','evaluacion')) AS inseminaciones_activas
),
finanzas_totales AS (
  SELECT 
    COALESCE(SUM(ingresos), 0) AS total_ingresos,
    COALESCE(SUM(egresos), 0) AS total_egresos
  FROM finanzas
),
gastos_categoria AS (
  SELECT 
    categoria,
    SUM(monto) AS total_categoria
  FROM gastos 
  WHERE anio = EXTRACT(YEAR FROM CURRENT_DATE)
  GROUP BY categoria
),
ventas_recientes AS (
  SELECT COUNT(*) AS ventas_mes, SUM(precio_venta) AS total_vendido
  FROM ventas 
  WHERE estado_pago <> 'cancelado' 
    AND fecha_venta >= DATE_TRUNC('month', CURRENT_DATE)
)
SELECT 
  k.cabezas_activas,
  k.disponibles_venta,
  k.hembras_prenadas,
  k.tratamientos_pendientes,
  k.inseminaciones_activas,
  f.total_ingresos,
  f.total_egresos,
  (f.total_ingresos - f.total_egresos) AS margen_neto,
  v.ventas_mes,
  v.total_vendido
FROM kpis k
CROSS JOIN finanzas_totales f
CROSS JOIN ventas_recientes v;

-- Índice para refresh rápido
CREATE INDEX IF NOT EXISTS idx_dashboard_refresh ON v_dashboard_kpis(cabezas_activas);

-- Refresh inicial
REFRESH MATERIALIZED VIEW v_dashboard_kpis;
-- ==========================================
-- 🥧 GASTOS POR CATEGORÍA (Para gráfico de torta)
-- ==========================================

SELECT 
  categoria,
  SUM(monto) AS total,
  ROUND(SUM(monto) * 100.0 / NULLIF(SUM(SUM(monto)) OVER (), 0), 1) AS porcentaje
FROM gastos
WHERE anio = EXTRACT(YEAR FROM CURRENT_DATE)
  AND mes = EXTRACT(MONTH FROM CURRENT_DATE)  -- 👈 Quita esta línea si quieres acumulado anual
GROUP BY categoria
ORDER BY total DESC;
------próximas tareas sanitarias
SELECT 
  b.chip, b.nombre, b.raza,
  s.tipo, s.proxima_fecha, s.veterinario, s.notas
FROM salud s
JOIN bovinos b ON s.animal_id = b.id
WHERE s.estado = 'pendiente' 
  AND s.proxima_fecha >= CURRENT_DATE
ORDER BY s.proxima_fecha ASC
LIMIT 5;
----Partos estimados próximos
SELECT 
  h.chip AS chip_hembra, 
  h.nombre AS hembra,
  p.chip AS chip_padre, 
  p.nombre AS padre,
  r.parto_estimado,
  (r.parto_estimado - CURRENT_DATE) AS dias_restantes  -- ✅ Devuelve días automáticamente
FROM reproduccion r
JOIN bovinos h ON r.hembra_id = h.id
LEFT JOIN bovinos p ON r.padre_id = p.id
WHERE r.estado IN ('confirmada','evaluacion')
  AND r.parto_estimado >= CURRENT_DATE
ORDER BY r.parto_estimado ASC
LIMIT 5;
----Últimos gastos registrados
SELECT 
  g.lote, g.categoria, g.descripcion, g.monto, g.created_at
FROM gastos g
ORDER BY g.created_at DESC
LIMIT 10;
-----------
-- ==========================================
-- 🤖 CONSULTOR GANADERO: BASE DE REGLAS
-- ==========================================

CREATE TABLE IF NOT EXISTS consultor_reglas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria VARCHAR(30) NOT NULL,  -- 'salud'|'reproduccion'|'nutricion'|'clima'
  prioridad VARCHAR(10) DEFAULT 'media', -- 'alta'|'media'|'baja'
  condicion_sql TEXT NOT NULL,     -- Fragmento WHERE evaluado dinámicamente
  mensaje_alerta TEXT NOT NULL,    -- Mensaje para el usuario
  recomendacion TEXT,              -- Acción sugerida
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_consultor_cat ON consultor_reglas(categoria, activo);
CREATE INDEX IF NOT EXISTS idx_consultor_prioridad ON consultor_reglas(prioridad);

-- Permisos
GRANT ALL ON consultor_reglas TO estancia_admin;
GRANT SELECT ON consultor_reglas TO estancia_trabajador;

-- 🔁 Seed: Reglas iniciales para Bolivia (trópico/subtrópico)
INSERT INTO consultor_reglas (categoria, prioridad, condicion_sql, mensaje_alerta, recomendacion) VALUES
  ('salud', 'alta', 
   'EXISTS (SELECT 1 FROM salud s WHERE s.animal_id = b.id AND s.tipo = ''vacuna'' AND s.estado = ''pendiente'' AND s.proxima_fecha <= CURRENT_DATE + 7)',
   '⚠️ Vacuna pendiente en 7 días',
   'Programar aplicación de vacuna contra aftosa o carbunclo según calendario SENASAG.'),
  
  ('salud', 'alta',
   'b.potrero ILIKE ''%humedo%'' AND b.estado = ''activo'' AND EXTRACT(MONTH FROM CURRENT_DATE) IN (12,1,2,3)',
   '🌧️ Riesgo de parasitosis en época de lluvias',
   'Aplicar desparasitante estratégico (Ivermectina + Albendazol) y rotar potreros.'),
  
  ('reproduccion', 'alta',
   'r.dias_gestacion > 270 AND r.estado IN (''confirmada'', ''evaluacion'')',
   '🤰 Parto inminente (≥270 días)',
   'Monitorear signos de parto: inquietud, ubre llena, separación del hato. Tener kit de asistencia listo.'),
  
  ('reproduccion', 'media',
   'r.fecha_inseminacion IS NOT NULL AND r.estado = ''confirmada'' AND CURRENT_DATE - r.fecha_inseminacion > 45 AND NOT EXISTS (SELECT 1 FROM salud s WHERE s.animal_id = r.hembra_id AND s.tipo = ''chequeo'' AND s.fecha > r.fecha_inseminacion + 30)',
   '🔍 Sin diagnóstico de preñez post-inseminación',
   'Programar ecografía o tacto rectal para confirmar preñez y descartar embriones tempranos.'),
  
  ('nutricion', 'media',
   'b.peso_actual < b.peso_inicial * 0.95 AND b.estado = ''activo''',
   '📉 Pérdida de peso detectada',
   'Revisar calidad de forraje, suplementar con sales mineralizadas y evaluar carga animal por hectárea.'),
  
  ('clima', 'baja',
   'EXTRACT(MONTH FROM CURRENT_DATE) IN (9,10,11) AND b.potrero ILIKE ''%norte%''',
   '☀️ Época seca: riesgo de estrés calórico',
   'Asegurar sombra natural/artificial y acceso permanente a agua limpia. Evitar manejo en horas pico de calor.');

-- Vista para consultar alertas activas (segura, sin SQL dinámico en frontend)
CREATE OR REPLACE VIEW v_alertas_consultor AS
WITH evaluaciones AS (
  SELECT 
    r.id AS regla_id,
    r.categoria,
    r.prioridad,
    r.mensaje_alerta,
    r.recomendacion,
    -- Evaluamos condiciones predefinidas con CASE (seguro y mantenible)
    CASE 
      WHEN r.condicion_sql LIKE '%vacuna%pendiente%' AND EXISTS (
        SELECT 1 FROM salud s JOIN bovinos b ON s.animal_id = b.id 
        WHERE s.tipo = 'vacuna' AND s.estado = 'pendiente' AND s.proxima_fecha <= CURRENT_DATE + 7
      ) THEN true
      WHEN r.condicion_sql LIKE '%humedo%lluvias%' AND EXISTS (
        SELECT 1 FROM bovinos b WHERE b.potrero ILIKE '%humedo%' AND EXTRACT(MONTH FROM CURRENT_DATE) IN (12,1,2,3)
      ) THEN true
      WHEN r.condicion_sql LIKE '%dias_gestacion > 270%' AND EXISTS (
        SELECT 1 FROM reproduccion r WHERE r.dias_gestacion > 270 AND r.estado IN ('confirmada','evaluacion')
      ) THEN true
      ELSE false
    END AS activada
  FROM consultor_reglas r
  WHERE r.activo = true
)
SELECT categoria, prioridad, mensaje_alerta, recomendacion
FROM evaluaciones
WHERE activada = true
ORDER BY 
  CASE prioridad WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,
  mensaje_alerta;
  -----
  -- Ver vacunas pendientes próximas
SELECT COUNT(*) FROM salud WHERE tipo = 'vacuna' AND estado = 'pendiente' AND proxima_fecha <= CURRENT_DATE + 7;
-- Ver partos con >270 días
SELECT COUNT(*) FROM reproduccion WHERE dias_gestacion > 270;
-- Ver bovinos con pérdida de peso
SELECT chip, nombre, peso_inicial, peso_actual FROM bovinos WHERE peso_actual < peso_inicial * 0.95;
-- Ver todas las reglas activas en la tabla
SELECT categoria, prioridad, mensaje_alerta FROM consultor_reglas WHERE activo = true;
-- ==========================================
-- 💰 MEJORAS PARA FINANZAS (Contexto Bolivia)
-- ==========================================

-- 1. Agregar campos a `gastos` para mayor control
ALTER TABLE gastos 
  ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(20),  -- 'efectivo','qr','transferencia','cheque'
  ADD COLUMN IF NOT EXISTS nro_documento VARCHAR(30), -- Factura, recibo, remito
  ADD COLUMN IF NOT EXISTS asignado_a UUID REFERENCES bovinos(id) ON DELETE SET NULL, -- Gasto vinculado a animal específico
  ADD COLUMN IF NOT EXISTS categoria_detallada VARCHAR(50); -- Subcategoría opcional

-- 2. Nueva tabla para ingresos por venta (complementa `ventas`)
CREATE TABLE IF NOT EXISTS ingresos_venta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
  monto_recibido DECIMAL(10,2) NOT NULL,
  fecha_pago DATE DEFAULT CURRENT_DATE,
  metodo_pago VARCHAR(20),
  nro_comprobante VARCHAR(30),
  observado TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Vista intuitiva: Flujo de caja mensual por categoría
CREATE OR REPLACE VIEW v_flujo_caja_mensual AS
SELECT 
  EXTRACT(YEAR FROM g.created_at) AS anio,
  EXTRACT(MONTH FROM g.created_at) AS mes,
  g.categoria,
  SUM(g.monto) AS total_egresos,
  COUNT(*) AS nro_registros
FROM gastos g
GROUP BY EXTRACT(YEAR FROM g.created_at), EXTRACT(MONTH FROM g.created_at), g.categoria
ORDER BY anio DESC, mes DESC, total_egresos DESC;

-- 4. Vista: Costo promedio por cabeza (útil para márgenes)
CREATE OR REPLACE VIEW v_costo_por_cabeza AS
SELECT 
  b.potrero,
  b.raza,
  COUNT(*) AS cabezas,
  COALESCE(SUM(g.monto) FILTER (WHERE g.categoria IN ('💊 Remedios y veterinaria','🌾 Alimentación y suplementos')), 0) AS costo_sanidad_alimentacion,
  ROUND(COALESCE(SUM(g.monto) FILTER (WHERE g.categoria IN ('💊 Remedios y veterinaria','🌾 Alimentación y suplementos')), 0) * 1.0 / NULLIF(COUNT(*), 0), 2) AS costo_promedio_por_cabeza
FROM bovinos b
LEFT JOIN gastos g ON g.asignado_a = b.id
WHERE b.estado IN ('activo','disponible','preñez')
GROUP BY b.potrero, b.raza;

-- Permisos
GRANT ALL ON ingresos_venta TO estancia_admin;
GRANT SELECT, INSERT, UPDATE ON ingresos_venta TO estancia_trabajador;
GRANT SELECT ON v_flujo_caja_mensual, v_costo_por_cabeza TO estancia_admin, estancia_trabajador;
----------------------------
CREATE TABLE IF NOT EXISTS insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  presentacion TEXT,
  stock_actual NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_minimo NUMERIC(10,2) NOT NULL DEFAULT 0,
  unidad TEXT NOT NULL DEFAULT 'unidad',
  lote TEXT,
  fecha_compra TIMESTAMP,
  fecha_vencimiento TIMESTAMP,
  proveedor TEXT,
  costo_unitario NUMERIC(10,2) DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
------------
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO estancia_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO estancia_admin;
------------
CREATE TABLE IF NOT EXISTS configuracion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave VARCHAR(100) UNIQUE NOT NULL,
  valor TEXT NOT NULL DEFAULT '',
  tipo VARCHAR(20) NOT NULL DEFAULT 'text',
  descripcion TEXT NOT NULL DEFAULT '',
  grupo VARCHAR(50) NOT NULL DEFAULT 'general',
  opciones TEXT,
  editable INTEGER NOT NULL DEFAULT 1,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
-----------
GRANT CREATE ON SCHEMA public TO estancia_admin;
-------
GRANT ALL PRIVILEGES ON TABLE configuracion TO estancia_admin;
-----------+--
GRANT CREATE ON SCHEMA public TO estancia_admin;
CREATE TABLE IF NOT EXISTS configuracion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave VARCHAR(100) UNIQUE NOT NULL,
  valor TEXT NOT NULL DEFAULT '',
  tipo VARCHAR(20) NOT NULL DEFAULT 'text',
  descripcion TEXT NOT NULL DEFAULT '',
  grupo VARCHAR(50) NOT NULL DEFAULT 'general',
  opciones TEXT,
  editable INTEGER NOT NULL DEFAULT 1,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
GRANT ALL ON configuracion TO estancia_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO estancia_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO estancia_admin;
