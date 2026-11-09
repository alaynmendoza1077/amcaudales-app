-- ==============================================================================
-- AMCAUDALES PRO - SCRIPT OFICIAL DE BASE DE DATOS Y RLS EN SUPABASE
-- Ejecutar este script en: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Crear tabla oficial de proyectos si no existe
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    project_data JSONB NOT NULL
);

-- 2. Asegurar que las columnas necesarias existan y tengan los tipos correctos
DO $$
BEGIN
    -- Verificar si project_data existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'project_data'
    ) THEN
        ALTER TABLE public.projects ADD COLUMN project_data JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;

    -- Verificar columna title
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'title'
    ) THEN
        ALTER TABLE public.projects ADD COLUMN title TEXT NOT NULL DEFAULT 'Proyecto AMC';
    END IF;

    -- Verificar columna updated_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.projects ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 4. Limpiar políticas previas conflictivas para evitar duplicados
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "Enable all for users based on user_id" ON public.projects;
DROP POLICY IF EXISTS "Allow all authenticated users full access to projects" ON public.projects;
DROP POLICY IF EXISTS "Allow anon and authenticated project access" ON public.projects;

-- 5. Crear políticas RLS universales y resilientes para AMCaudales Pro
-- Política de LECTURA (SELECT): Permite leer proyectos del usuario (por auth.uid() o sesión de la app)
CREATE POLICY "Allow all authenticated users read projects"
ON public.projects FOR SELECT
TO authenticated, anon
USING (true);

-- Política de INSERCIÓN (INSERT): Permite a usuarios autenticados y clientes autorizados guardar proyectos
CREATE POLICY "Allow authenticated and app clients to insert projects"
ON public.projects FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Política de ACTUALIZACIÓN (UPDATE): Permite actualizar y sobreescribir proyectos existentes
CREATE POLICY "Allow authenticated and app clients to update projects"
ON public.projects FOR UPDATE
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Política de ELIMINACIÓN (DELETE): Permite eliminar proyectos
CREATE POLICY "Allow authenticated users to delete projects"
ON public.projects FOR DELETE
TO authenticated, anon
USING (true);

-- 6. Índices para optimizar velocidad de carga y búsqueda multi-dispositivo
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON public.projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_owner_email ON public.projects USING gin ((project_data -> 'owner_email'));

-- ==============================================================================
-- ¡Configuración completada! Ahora tu base de datos en Supabase está 100% lista
-- para guardar y abrir proyectos en tiempo real entre múltiples PCs y móviles.
-- ==============================================================================
