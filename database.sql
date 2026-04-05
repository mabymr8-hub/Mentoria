-- ═══════════════════════════════════════════════════════════
--  SCRIPT SQL — Maby Mentorías
--  Ejecutar en: Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. CREAR TABLA PRINCIPAL
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mentorias (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  -- Datos personales
  nombre                TEXT NOT NULL,
  apellido              TEXT NOT NULL,
  telefono              TEXT,
  email                 TEXT,

  -- Contacto
  fecha_primer_contacto DATE,
  respondio             TEXT CHECK (respondio IN ('Sí', 'No', NULL)),
  tipo_contacto         TEXT CHECK (tipo_contacto IN ('Mensaje', 'Llamada telefónica', 'Videollamada', NULL)),
  fecha_ultimo_contacto DATE,

  -- Info de la persona
  oficio                TEXT,
  inquietudes           TEXT,

  -- Seguimiento del mentor
  respuesta_mentor      TEXT,
  observaciones         TEXT,

  -- Estado del proceso
  estado                TEXT NOT NULL DEFAULT 'Sin respuesta'
                        CHECK (estado IN ('Sin respuesta', 'En contacto', 'Seguimiento', 'Mentoría activa'))
);

-- 2. ÍNDICES PARA PERFORMANCE
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mentorias_estado ON mentorias(estado);
CREATE INDEX IF NOT EXISTS idx_mentorias_nombre ON mentorias(nombre, apellido);
CREATE INDEX IF NOT EXISTS idx_mentorias_created ON mentorias(created_at DESC);

-- 3. TRIGGER: updated_at automático
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON mentorias;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON mentorias
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 4. ROW LEVEL SECURITY (RLS)
-- Solo usuarios autenticados pueden acceder a sus propios datos.
-- ────────────────────────────────────────────────────────────
ALTER TABLE mentorias ENABLE ROW LEVEL SECURITY;

-- Política: el usuario autenticado puede ver TODOS los registros
-- (es una app personal de una sola mentora)
DROP POLICY IF EXISTS "Authenticated users can read" ON mentorias;
CREATE POLICY "Authenticated users can read"
  ON mentorias FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert" ON mentorias;
CREATE POLICY "Authenticated users can insert"
  ON mentorias FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update" ON mentorias;
CREATE POLICY "Authenticated users can update"
  ON mentorias FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete" ON mentorias;
CREATE POLICY "Authenticated users can delete"
  ON mentorias FOR DELETE
  TO authenticated
  USING (true);

-- 5. DATOS DE EJEMPLO (10 mentoreadas)
-- ────────────────────────────────────────────────────────────
INSERT INTO mentorias (
  nombre, apellido, telefono, email,
  fecha_primer_contacto, respondio, tipo_contacto, fecha_ultimo_contacto,
  oficio, inquietudes, respuesta_mentor, observaciones, estado
) VALUES

('Valentina', 'Rodríguez', '+54 11 4523-7891', 'valen.rodriguez@gmail.com',
 '2025-03-01', 'Sí', 'Mensaje', '2025-03-15',
 'Estudiante de Psicología',
 'Tiene dudas sobre cómo enfocar la práctica profesional y si el counseling es compatible con su carrera.',
 'Le expliqué las diferencias entre psicología y counseling, y cómo se complementan. Le compartí recursos de Holos.',
 'Muy receptiva. Buen perfil para seguimiento activo.',
 'Mentoría activa'),

('Lucía', 'Fernández', '+54 9 351 612-4500', 'lu.ferna@hotmail.com',
 '2025-03-02', 'Sí', 'Videollamada', '2025-04-01',
 'Docente de primaria',
 'Quiere incorporar herramientas de acompañamiento emocional en el aula.',
 'Hablamos de la escucha activa y técnicas de contención. La orienté hacia módulos específicos del programa.',
 'Muy motivada. Videollamada de 45 min muy productiva.',
 'Seguimiento'),

('Martina', 'Gómez', '+54 11 3341-2209', 'martina.gomez@icloud.com',
 '2025-03-03', 'Sí', 'Mensaje', '2025-03-20',
 'Emprendedora — ventas online',
 'Estrés por la presión de resultados y dificultad para establecer límites con clientes.',
 'Conversamos sobre límites saludables y gestión del tiempo. Le compartí bibliografía.',
 'Responde rápido por WhatsApp. Muy abierta.',
 'En contacto'),

('Camila', 'López', '+54 9 261 788-3312', 'camila.lopez@gmail.com',
 '2025-03-05', 'No', NULL, '2025-03-05',
 NULL, NULL, NULL,
 'No respondió el mensaje de bienvenida. Reintentar en 2 semanas.',
 'Sin respuesta'),

('Sofía', 'Martínez', '+54 11 5678-9012', 'sofi.mtz@outlook.com',
 '2025-03-06', 'Sí', 'Llamada telefónica', '2025-03-28',
 'Enfermera',
 'Burnout laboral. Siente que no puede desconectarse del trabajo.',
 'Le hablé de los primeros auxilios emocionales y la importancia del autocuidado. Programamos otra llamada.',
 'Situación delicada pero con buena predisposición.',
 'Seguimiento'),

('Ana', 'Herrera', '+54 9 387 456-7890', 'ana.herrera88@gmail.com',
 '2025-03-08', 'Sí', 'Videollamada', '2025-04-02',
 'Contadora',
 'Está considerando un cambio de carrera hacia el ámbito social y quiere orientación.',
 'Exploramos sus motivaciones y le presenté el programa completo de Holos. Muy entusiasmada.',
 'Perfil ideal para mentoría completa. Seguir de cerca.',
 'Mentoría activa'),

('Isabel', 'Sánchez', '+54 11 4455-6677', 'isasanchez@gmail.com',
 '2025-03-10', 'Sí', 'Mensaje', '2025-03-18',
 'Madre y ama de casa',
 'Busca un espacio de desarrollo personal. Siente que perdió su identidad profesional.',
 'Le hablé del counseling como herramienta de autoconocimiento y crecimiento personal.',
 'Necesita contención. Muy reflexiva en sus respuestas.',
 'En contacto'),

('Romina', 'Díaz', '+54 9 299 234-5678', 'romi.diaz@yahoo.com',
 '2025-03-12', 'No', NULL, '2025-03-12',
 NULL, NULL, NULL,
 'Número de teléfono podría estar desactualizado. Probar por email.',
 'Sin respuesta'),

('Carolina', 'Ruiz', '+54 11 3322-1100', 'caro.ruiz@gmail.com',
 '2025-03-15', 'Sí', 'Mensaje', '2025-03-30',
 'Diseñadora gráfica freelance',
 'Dificultad para poner valor a su trabajo y manejar clientes difíciles.',
 'Trabajamos el autoconcepto y cómo comunicar el valor de su trabajo. Le compartí recursos.',
 'Buena conexión. Muy creativa y reflexiva.',
 'Seguimiento'),

('Florencia', 'Torres', '+54 9 341 789-0123', 'flor.torres@gmail.com',
 '2025-03-18', 'Sí', 'Videollamada', '2025-04-03',
 'Psicóloga en formación',
 'Quiere entender las diferencias y complementos entre psicología clínica y counseling.',
 'Tuvimos una charla muy enriquecedora sobre los marcos teóricos. Le entusiasma el enfoque holístico.',
 'Excelente perfil. Muy preparada conceptualmente. Mentoría muy activa.',
 'Mentoría activa');

-- ═══════════════════════════════════════════════════════════
--  FIN DEL SCRIPT
-- ═══════════════════════════════════════════════════════════
