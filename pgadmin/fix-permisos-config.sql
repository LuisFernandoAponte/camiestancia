-- ==========================================
-- 🔧 FIX: Permisos para tabla configuracion
-- Ejecutar UNA VEZ como superusuario (postgres)
-- ==========================================

-- 1. Permitir que estancia_admin cree tablas
GRANT CREATE ON SCHEMA public TO estancia_admin;

-- 2. Crear la tabla si no existe
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

-- 3. Otorgar permisos explícitos
GRANT ALL ON configuracion TO estancia_admin;

-- 4. Permisos por defecto para tablas futuras
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO estancia_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO estancia_admin;

-- 5. Sembrar datos iniciales (si la tabla está vacía)
INSERT INTO configuracion (clave, valor, tipo, descripcion, grupo, editable, orden)
SELECT * FROM (VALUES
  ('farm_name',         'La Estancia',       'text',    'Nombre de la finca o empresa',                    'general',        1, 1),
  ('farm_address',      '',                  'text',    'Dirección física de la finca',                     'general',        1, 2),
  ('farm_phone',        '',                  'text',    'Teléfono de contacto',                             'general',        1, 3),
  ('farm_email',        '',                  'email',   'Correo electrónico de la empresa',                 'general',        1, 4),
  ('currency',          'Bs.',               'text',    'Símbolo de moneda local',                          'general',        1, 5),
  ('locale',            'es-BO',             'text',    'Código de localización (idioma/país)',             'general',        1, 6),
  ('whatsapp_notifications', 'true',         'boolean', 'Activar notificaciones por WhatsApp',              'notificaciones', 1, 7),
  ('whatsapp_phone',    '',                  'text',    'Número de WhatsApp para notificaciones',           'notificaciones', 1, 8),
  ('email_alerts',      'true',              'boolean', 'Activar alertas por correo electrónico',           'notificaciones', 1, 9),
  ('alert_before_vaccination_days', '7',      'number',  'Días antes para recordatorio de vacunación',      'notificaciones', 1, 10),
  ('alert_low_stock',   'true',              'boolean', 'Alertar cuando el stock de insumos esté bajo',    'notificaciones', 1, 11),
  ('default_stock_minimum', '5',             'number',  'Stock mínimo por defecto para insumos',            'inventario',     1, 12),
  ('weight_unit',       'kg',                'select',  'Unidad de peso para bovinos',                      'inventario',     1, 13),
  ('vaccination_reminder_days', '30',        'number',  'Días para recordatorio de próxima vacuna',         'salud',          1, 14),
  ('health_check_interval_days', '90',       'number',  'Intervalo en días entre chequeos de rutina',       'salud',          1, 15),
  ('tax_rate',           '0',                'number',  'Tasa de impuesto aplicada (%)',                    'finanzas',       1, 16),
  ('default_payment_terms', 'contado',       'select',  'Condición de pago por defecto',                    'finanzas',       1, 17)
) AS s(clave, valor, tipo, descripcion, grupo, editable, orden)
WHERE NOT EXISTS (SELECT 1 FROM configuracion WHERE configuracion.clave = s.clave);
