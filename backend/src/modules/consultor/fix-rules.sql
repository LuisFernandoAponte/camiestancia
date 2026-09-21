-- Create the consultor_reglas table if it doesn't exist
CREATE TABLE IF NOT EXISTS consultor_reglas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL,
  prioridad TEXT NOT NULL,
  condicion_sql TEXT NOT NULL,
  mensaje_alerta TEXT NOT NULL,
  recomendacion TEXT,
  activo INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Elimina las reglas viejas (formato incorrecto)
DELETE FROM consultor_reglas;

-- Reinserta con el formato correcto (SELECT autónomo, sin alias de tablas externas)
INSERT INTO consultor_reglas (categoria, prioridad, condicion_sql, mensaje_alerta, recomendacion) VALUES
('salud', 'alta',
 'SELECT 1 FROM salud s WHERE s.tipo = ''vacuna'' AND s.estado = ''pendiente'' AND s.proxima_fecha <= CURRENT_DATE + 7',
 '⚠️ Vacuna pendiente en 7 días',
 'Programar aplicación de vacuna contra aftosa o carbunclo según calendario SENASAG.'),

('salud', 'alta',
 'SELECT 1 FROM bovinos b WHERE b.potrero ILIKE ''%humedo%'' AND b.estado = ''activo'' AND EXTRACT(MONTH FROM CURRENT_DATE) IN (12,1,2,3)',
 '🌧️ Riesgo de parasitosis en época de lluvias',
 'Aplicar desparasitante estratégico (Ivermectina + Albendazol) y rotar potreros.'),

('reproduccion', 'alta',
 'SELECT 1 FROM reproduccion r WHERE r.dias_gestacion > 270 AND r.estado IN (''confirmada'', ''evaluacion'')',
 '🐮 Parto inminente (≥270 días)',
 'Monitorear signos de parto: inquietud, ubre llena, separación del hato. Tener kit de asistencia listo.'),

('reproduccion', 'media',
 'SELECT 1 FROM reproduccion r WHERE r.fecha_inseminacion IS NOT NULL AND r.estado = ''confirmada'' AND CURRENT_DATE - r.fecha_inseminacion > 45 AND NOT EXISTS (SELECT 1 FROM salud s WHERE s.animal_id = r.hembra_id AND s.tipo = ''chequeo'' AND s.fecha > r.fecha_inseminacion + 30)',
 '🔍 Sin diagnóstico de preñez post-inseminación',
 'Programar ecografía o tacto rectal para confirmar preñez y descartar embriones tempranos.'),

('nutricion', 'media',
 'SELECT 1 FROM bovinos b WHERE b.peso_actual IS NOT NULL AND b.peso_inicial IS NOT NULL AND b.peso_actual < b.peso_inicial * 0.95 AND b.estado = ''activo''',
 '📉 Pérdida de peso detectada',
 'Revisar calidad de forraje, suplementar con sales mineralizadas y evaluar carga animal por hectárea.'),

('clima', 'baja',
 'SELECT 1 FROM bovinos b WHERE b.potrero ILIKE ''%norte%'' AND EXTRACT(MONTH FROM CURRENT_DATE) IN (9,10,11)',
 '☀️ Época seca: riesgo de estrés calórico',
 'Asegurar sombra natural/artificial y acceso permanente a agua limpia. Evitar manejo en horas pico de calor.');

-- Ahora corré el test-data.sql de nuevo para tener datos de prueba
-- Y luego entrá a /admin/consultor
