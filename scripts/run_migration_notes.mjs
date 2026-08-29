// Script para correr migraciones en Supabase via Management API
// La Service Role Key se obtiene de Settings → API en el panel de Supabase
// Usamos el endpoint de SQL directo de la Management API

const SUPABASE_URL = 'https://ncmkjutikqgbvrghqazp.supabase.co'
// Nota: la anon key NO tiene permisos para crear tablas
// Para migraciones necesitamos la service_role key
// La anon key termina en ...WyAz — que confirma que es publishable
// El script la usa solo para verificar conexión; las DDL las ejecutamos via Management API

const MANAGEMENT_API = `https://api.supabase.com`

// La migration SQL a ejecutar
const migrationSQL = `
-- Tabla de notas privadas por usuario (Tarea 4)
CREATE TABLE IF NOT EXISTS notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, song_id)
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own notes" ON notes;
CREATE POLICY "Users can insert their own notes"
ON notes FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read their own notes" ON notes;
CREATE POLICY "Users can read their own notes"
ON notes FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
CREATE POLICY "Users can update their own notes"
ON notes FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;
CREATE POLICY "Users can delete their own notes"
ON notes FOR DELETE
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_notes_updated_at_trigger ON notes;
CREATE TRIGGER update_notes_updated_at_trigger
BEFORE UPDATE ON notes
FOR EACH ROW
EXECUTE FUNCTION update_notes_updated_at();
`

console.log('=== INSTRUCCIONES PARA CORRER LA MIGRACIÓN EN SUPABASE ===')
console.log('')
console.log('Como no hay psql ni Supabase CLI instalados, debes:')
console.log('')
console.log('1. Ir a: https://supabase.com/dashboard/project/ncmkjutikqgbvrghqazp/sql/new')
console.log('2. Pegar y ejecutar el siguiente SQL:')
console.log('')
console.log('--- COPIAR DESDE AQUÍ ---')
console.log(migrationSQL)
console.log('--- HASTA AQUÍ ---')
console.log('')
console.log('3. Hacer clic en "Run"')
console.log('4. Verificar que no haya errores')
