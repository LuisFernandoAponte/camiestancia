INSERT INTO consultor_reglas (categoria, prioridad, condicion_sql, mensaje_alerta, recomendacion, activo)
SELECT 'IATF', 'alta',
'SELECT r.hembra_id FROM reproduccion r JOIN bovinos b ON r.hembra_id = b.id WHERE r.resultado = ''negativo'' AND r.tipo_servicio = ''iatf'' GROUP BY r.hembra_id HAVING COUNT(*) >= 3 AND b.descartado = false',
'Vaca con 3+ IATF negativas - evaluar descarte',
'Evaluar estado reproductivo, considerar descarte o cambio a servicio natural',
true
WHERE NOT EXISTS (SELECT 1 FROM consultor_reglas WHERE condicion_sql LIKE '%3+ IATF%');

INSERT INTO consultor_reglas (categoria, prioridad, condicion_sql, mensaje_alerta, recomendacion, activo)
SELECT 'IATF', 'alta',
'SELECT r.id FROM reproduccion r WHERE r.toro_id IN (SELECT id FROM toros WHERE descartado = true) AND r.tipo_servicio = ''iatf'' AND r.fecha_inseminacion >= CURRENT_DATE - INTERVAL ''90 days''',
'Toro descartado registrado en servicios recientes',
'Verificar si el toro descartado fue usado por error en IATF',
true
WHERE NOT EXISTS (SELECT 1 FROM consultor_reglas WHERE condicion_sql LIKE '%Toro descartado%');

INSERT INTO consultor_reglas (categoria, prioridad, condicion_sql, mensaje_alerta, recomendacion, activo)
SELECT 'IATF', 'media',
'SELECT b.id, b.nombre FROM bovinos b LEFT JOIN reproduccion r ON b.id = r.hembra_id AND r.tipo_servicio = ''iatf'' WHERE b.tipo IN (''vaca'', ''vaquilla'') AND b.sexo = ''Hembra'' AND b.estado = ''activo'' AND r.id IS NULL',
'Hembras activas sin registro IATF',
'Considerar incorporar al programa reproductivo',
true
WHERE NOT EXISTS (SELECT 1 FROM consultor_reglas WHERE condicion_sql LIKE '%Hembras activas sin registro IATF%');

INSERT INTO consultor_reglas (categoria, prioridad, condicion_sql, mensaje_alerta, recomendacion, activo)
SELECT 'Reproduccion', 'alta',
'SELECT r.hembra_id, COUNT(*) as total_servicios FROM reproduccion r JOIN bovinos b ON r.hembra_id = b.id WHERE r.tipo_servicio = ''iatf'' AND b.descartado = false GROUP BY r.hembra_id HAVING COUNT(*) >= 4',
'Vaca con 4+ servicios IATF - limite alcanzado',
'Esta vaca ha alcanzado el limite maximo de IATF. Evaluar descarte o cambio a servicio natural.',
true
WHERE NOT EXISTS (SELECT 1 FROM consultor_reglas WHERE condicion_sql LIKE '%4+ servicios IATF%');

INSERT INTO consultor_reglas (categoria, prioridad, condicion_sql, mensaje_alerta, recomendacion, activo)
SELECT 'Reproduccion', 'media',
'SELECT r.hembra_id FROM reproduccion r WHERE r.tipo_servicio = ''iatf'' AND r.resultado = ''negativo'' AND (r.fecha_diagnostico IS NULL OR r.fecha_diagnostico < CURRENT_DATE - INTERVAL ''45 days'')',
'IATF sin diagnostico posterior en 45+ dias',
'Programar diagnostico para confirmar resultado del servicio',
true
WHERE NOT EXISTS (SELECT 1 FROM consultor_reglas WHERE condicion_sql LIKE '%IATF sin diagnostico%');
