DO $$ BEGIN
    CREATE TYPE "public"."calidad_seminal" AS ENUM('A', 'S', 'E', 'B');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."color_bovino" AS ENUM('BC', 'CL', 'CO', 'OV', 'NE', 'BR', 'OT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."resultado_diagnostico" AS ENUM('preñada', 'vacia', 'aborto', 'no_confirmado');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."resultado_iatf" AS ENUM('positivo', 'negativo', 'pendiente');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."tipo_bovino" AS ENUM('vaca', 'vaquilla', 'toro', 'novillo', 'ternero', 'ternera');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."tipo_diagnostico" AS ENUM('tacto', 'ecografia');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."tipo_evento_reproductivo" AS ENUM('servicio_natural', 'iatf', 'parto', 'destete', 'aborto', 'diagnostico');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."tipo_servicio" AS ENUM('iatf', 'servicio_natural', 'transferencia_embrion');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."tipo_insumo" AS ENUM('vacuna', 'desparasitante', 'antibiotico', 'antiinflamatorio', 'vitamina', 'suplemento', 'herramienta', 'otro');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Añadir columnas a bovinos
ALTER TABLE bovinos ADD COLUMN IF NOT EXISTS numero_identificacion text;
ALTER TABLE bovinos ADD COLUMN IF NOT EXISTS color color_bovino;
ALTER TABLE bovinos ADD COLUMN IF NOT EXISTS tipo tipo_bovino;
ALTER TABLE bovinos ADD COLUMN IF NOT EXISTS madre_id uuid REFERENCES bovinos(id) ON DELETE SET NULL;
ALTER TABLE bovinos ADD COLUMN IF NOT EXISTS padre_id uuid REFERENCES bovinos(id) ON DELETE SET NULL;
ALTER TABLE bovinos ADD COLUMN IF NOT EXISTS descartado boolean DEFAULT false;
ALTER TABLE bovinos ADD COLUMN IF NOT EXISTS motivo_descarte text;
ALTER TABLE bovinos ADD COLUMN IF NOT EXISTS foto text;

CREATE INDEX IF NOT EXISTS idx_bovinos_madre ON bovinos (madre_id);
CREATE INDEX IF NOT EXISTS idx_bovinos_padre ON bovinos (padre_id);
CREATE INDEX IF NOT EXISTS idx_bovinos_tipo ON bovinos (tipo);

-- Añadir columnas a reproduccion
ALTER TABLE reproduccion ADD COLUMN IF NOT EXISTS toro_id uuid REFERENCES bovinos(id) ON DELETE SET NULL;
ALTER TABLE reproduccion ADD COLUMN IF NOT EXISTS ciclo_numero integer DEFAULT 1;
ALTER TABLE reproduccion ADD COLUMN IF NOT EXISTS resultado resultado_iatf DEFAULT 'pendiente';
ALTER TABLE reproduccion ADD COLUMN IF NOT EXISTS tipo_servicio tipo_servicio DEFAULT 'iatf';
ALTER TABLE reproduccion ADD COLUMN IF NOT EXISTS fecha_diagnostico timestamp;
ALTER TABLE reproduccion ADD COLUMN IF NOT EXISTS observaciones text;

CREATE INDEX IF NOT EXISTS idx_reproduccion_hembra ON reproduccion (hembra_id);
CREATE INDEX IF NOT EXISTS idx_reproduccion_ciclo ON reproduccion (ciclo_numero);
CREATE INDEX IF NOT EXISTS idx_reproduccion_resultado ON reproduccion (resultado);

-- Cambiar tipo de fecha_inseminacion de date a timestamp si es necesario
DO $$ BEGIN
    ALTER TABLE reproduccion ALTER COLUMN fecha_inseminacion TYPE timestamp USING fecha_inseminacion::timestamp;
EXCEPTION WHEN others THEN null;
END $$;

-- Tabla toros
CREATE TABLE IF NOT EXISTS toros (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    bovino_id uuid NOT NULL REFERENCES bovinos(id) ON DELETE CASCADE,
    codigo text,
    nombre text,
    raza text,
    fecha_nacimiento timestamp,
    fecha_evaluacion timestamp,
    peso_evaluacion numeric(6, 2),
    circunferencia_escrotal numeric(5, 1),
    calidad_seminal calidad_seminal,
    categoria text,
    activo boolean DEFAULT true,
    descartado boolean DEFAULT false,
    motivo_descarte text,
    observaciones text,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL,
    CONSTRAINT toros_bovino_id_unique UNIQUE(bovino_id)
);

CREATE INDEX IF NOT EXISTS idx_toros_activo ON toros (activo);

-- Tabla diagnosticos
CREATE TABLE IF NOT EXISTS diagnosticos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    animal_id uuid NOT NULL REFERENCES bovinos(id) ON DELETE CASCADE,
    reproduccion_id uuid REFERENCES reproduccion(id) ON DELETE SET NULL,
    fecha_diagnostico timestamp NOT NULL,
    tipo_diagnostico tipo_diagnostico NOT NULL,
    resultado resultado_diagnostico NOT NULL,
    edad_gestacional_dias integer,
    observaciones text,
    created_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_diagnosticos_animal ON diagnosticos (animal_id);

-- Tabla eventos_reproductivos
CREATE TABLE IF NOT EXISTS eventos_reproductivos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    animal_id uuid NOT NULL REFERENCES bovinos(id) ON DELETE CASCADE,
    fecha_evento timestamp NOT NULL,
    tipo_evento tipo_evento_reproductivo NOT NULL,
    toro_id uuid REFERENCES bovinos(id) ON DELETE SET NULL,
    descripcion text,
    resultado text,
    observaciones text,
    created_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_eventos_animal ON eventos_reproductivos (animal_id);

-- Tabla vaquillas
CREATE TABLE IF NOT EXISTS vaquillas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    bovino_id uuid NOT NULL REFERENCES bovinos(id) ON DELETE CASCADE,
    tat text,
    fecha_nacimiento timestamp,
    padre_id uuid REFERENCES bovinos(id) ON DELETE SET NULL,
    madre_id uuid REFERENCES bovinos(id) ON DELETE SET NULL,
    color color_bovino,
    numero_lote integer,
    observaciones text,
    estado text,
    created_at timestamp DEFAULT now() NOT NULL,
    CONSTRAINT vaquillas_bovino_id_unique UNIQUE(bovino_id)
);

-- Insertar reglas IATF en consultor_reglas si no existen
INSERT INTO consultor_reglas (categoria, prioridad, condicion_sql, mensaje_alerta, recomendacion, activo)
SELECT 'IATF', 'alta',
    'SELECT r.hembra_id FROM reproduccion r JOIN bovinos b ON r.hembra_id = b.id WHERE r.resultado = ''negativo'' AND r.tipo_servicio = ''iatf'' GROUP BY r.hembra_id HAVING COUNT(*) >= 3 AND b.descartado = false',
    'Vaca con 3+ IATF negativas - evaluar descarte',
    'Evaluar estado reproductivo, considerar descarte o cambio a servicio natural',
    1
WHERE NOT EXISTS (SELECT 1 FROM consultor_reglas WHERE condicion_sql LIKE '%3+ IATF%');

INSERT INTO consultor_reglas (categoria, prioridad, condicion_sql, mensaje_alerta, recomendacion, activo)
SELECT 'IATF', 'alta',
    'SELECT r.id FROM reproduccion r WHERE r.toro_id IN (SELECT id FROM toros WHERE descartado = true) AND r.tipo_servicio = ''iatf'' AND r.fecha_inseminacion >= CURRENT_DATE - INTERVAL ''90 days''',
    'Toro descartado registrado en servicios recientes',
    'Verificar si el toro descartado fue usado por error en IATF',
    1
WHERE NOT EXISTS (SELECT 1 FROM consultor_reglas WHERE condicion_sql LIKE '%Toro descartado%');

INSERT INTO consultor_reglas (categoria, prioridad, condicion_sql, mensaje_alerta, recomendacion, activo)
SELECT 'IATF', 'media',
    'SELECT b.id, b.nombre FROM bovinos b LEFT JOIN reproduccion r ON b.id = r.hembra_id AND r.tipo_servicio = ''iatf'' WHERE b.tipo IN (''vaca'', ''vaquilla'') AND b.sexo = ''Hembra'' AND b.estado = ''activo'' AND r.id IS NULL',
    'Hembras activas sin registro IATF',
    'Considerar incorporar al programa reproductivo',
    1
WHERE NOT EXISTS (SELECT 1 FROM consultor_reglas WHERE condicion_sql LIKE '%Hembras activas sin registro IATF%');

INSERT INTO consultor_reglas (categoria, prioridad, condicion_sql, mensaje_alerta, recomendacion, activo)
SELECT 'Reproducción', 'alta',
    'SELECT r.hembra_id, COUNT(*) as total_servicios FROM reproduccion r JOIN bovinos b ON r.hembra_id = b.id WHERE r.tipo_servicio = ''iatf'' AND b.descartado = false GROUP BY r.hembra_id HAVING COUNT(*) >= 4',
    'Vaca con 4+ servicios IATF - límite alcanzado',
    'Esta vaca ha alcanzado el límite máximo de IATF. Evaluar descarte o cambio a servicio natural.',
    1
WHERE NOT EXISTS (SELECT 1 FROM consultor_reglas WHERE condicion_sql LIKE '%4+ servicios IATF%');

INSERT INTO consultor_reglas (categoria, prioridad, condicion_sql, mensaje_alerta, recomendacion, activo)
SELECT 'Reproducción', 'media',
    'SELECT r.hembra_id FROM reproduccion r WHERE r.tipo_servicio = ''iatf'' AND r.resultado = ''negativo'' AND (r.fecha_diagnostico IS NULL OR r.fecha_diagnostico < CURRENT_DATE - INTERVAL ''45 days'')',
    'IATF sin diagnóstico posterior en 45+ días',
    'Programar diagnóstico para confirmar resultado del servicio',
    1
WHERE NOT EXISTS (SELECT 1 FROM consultor_reglas WHERE condicion_sql LIKE '%IATF sin diagnóstico%');
