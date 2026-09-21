-- ============================================================
-- DATOS DE PRUEBA PARA CONSULTOR GANADERO
-- 5 ejemplos que activan distintas reglas
-- Fecha actual: 22 de Mayo 2026
-- ============================================================

-- 🔴 EJEMPLO 1: Vacuna pendiente en 7 días (Regla salud/alta)
-- Crea una vacuna con fecha próxima dentro de 3 días
INSERT INTO salud (animal_id, tipo, fecha, proxima_fecha, veterinario, estado)
SELECT id, 'vacuna', '2026-05-10', CURRENT_DATE + 3, 'Dr. Mendoza', 'pendiente'
FROM bovinos WHERE chip = 'BO-7710-001'
ON CONFLICT DO NOTHING;

-- 🔴 EJEMPLO 2: Parto inminente (Regla reproduccion/alta)
-- Registro de gestación con 280 días (supera los 270)
INSERT INTO reproduccion (hembra_id, padre_id, fecha_inseminacion, dias_gestacion, parto_estimado, estado)
SELECT h.id, p.id, '2025-08-15', 280, CURRENT_DATE + 5, 'confirmada'
FROM bovinos h, bovinos p
WHERE h.chip = 'BO-7710-002' AND p.chip = 'BO-7710-001'
ON CONFLICT DO NOTHING;

-- 🟡 EJEMPLO 3: Sin diagnóstico de preñez (Regla reproduccion/media)
-- Inseminación hace 82 días sin chequeo posterior
INSERT INTO reproduccion (hembra_id, padre_id, fecha_inseminacion, dias_gestacion, parto_estimado, estado)
SELECT h.id, p.id, '2026-03-01', 82, CURRENT_DATE + 200, 'confirmada'
FROM bovinos h, bovinos p
WHERE h.chip = 'BO-7710-006' AND p.chip = 'BO-7710-003'
ON CONFLICT DO NOTHING;

-- 🟡 EJEMPLO 4: Pérdida de peso (Regla nutricion/media)
-- Actualizamos Trovão a 'activo' y bajamos su peso
UPDATE bovinos
SET estado = 'activo', peso_actual = 28.0, updated_at = NOW()
WHERE chip = 'BO-7710-003' AND estado <> 'activo';

-- ⚪ EJEMPLO 5: Estrés calórico / parasitosis (depende del mes)
-- Un animal en potrero húmedo/norte que activa según temporada
INSERT INTO bovinos (chip, nombre, raza, sexo, nacimiento, peso_inicial, peso_actual, potrero, estado, precio)
SELECT 'TEST-CONSULTOR', 'Prueba Reglas', 'Nelore', 'M', '2024-01-15', 40, 35, 'Potrero Humedo Norte', 'activo', '2500'
WHERE NOT EXISTS (SELECT 1 FROM bovinos WHERE chip = 'TEST-CONSULTOR');

-- ============================================================
-- EXPLICACIÓN DE CADA REGLA:
-- ============================================================
-- Regla 1 (🔴): Vacuna pendiente → se activa con el INSERT de salud
-- Regla 3 (🔴): Parto inminente → se activa con el INSERT de reproducción (>270 días)
-- Regla 4 (🟡): Sin diagnóstico → se activa con inseminación de Luna hace 82d sin chequeo
-- Regla 5 (🟡): Pérdida peso → se activa porque Trovão pasó a 28kg (antes 920, muy por debajo de su peso_inicial 30)
-- Regla 2 (🔴): Parasitosis → solo Dic-Mar. Si corrés esto en diciembre, se activa
-- Regla 6 (⚪): Estrés calórico → solo Sep-Nov. Si corrés esto en octubre, se activa

-- Las reglas 2 y 6 son estacionales y no se activan en mayo.
