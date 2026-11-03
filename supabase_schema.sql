-- ==============================================================================
-- AMCaudales Pro (amcaudales.com) - Esquema Oficial de Base de Datos Supabase
-- ==============================================================================
-- Instrucciones:
-- 1. Ingrese a su consola de Supabase (https://supabase.com/dashboard).
-- 2. Seleccione su proyecto (dwtuafavqqzgosrwsgdw) y vaya a "SQL Editor".
-- 3. Pegue este script y haga clic en "Run" (Ejecutar).
-- ==============================================================================

-- 1. Crear tabla de Proyectos en la Nube
create table if not exists public.projects (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Proyecto AMC',
  project_data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Crear índices para optimizar la velocidad de consulta
create index if not exists idx_projects_user_id on public.projects(user_id);
create index if not exists idx_projects_updated_at on public.projects(updated_at desc);

-- 3. Habilitar Seguridad a Nivel de Fila (Row Level Security - RLS)
alter table public.projects enable row level security;

-- 4. Políticas de Seguridad RLS: Cada ingeniero solo tiene acceso a sus propios proyectos
drop policy if exists "Los usuarios pueden consultar sus propios proyectos" on public.projects;
create policy "Los usuarios pueden consultar sus propios proyectos"
  on public.projects for select
  using (auth.uid() = user_id);

drop policy if exists "Los usuarios pueden guardar nuevos proyectos" on public.projects;
create policy "Los usuarios pueden guardar nuevos proyectos"
  on public.projects for insert
  with check (auth.uid() = user_id);

drop policy if exists "Los usuarios pueden actualizar sus propios proyectos" on public.projects;
create policy "Los usuarios pueden actualizar sus propios proyectos"
  on public.projects for update
  using (auth.uid() = user_id);

drop policy if exists "Los usuarios pueden eliminar sus propios proyectos" on public.projects;
create policy "Los usuarios pueden eliminar sus propios proyectos"
  on public.projects for delete
  using (auth.uid() = user_id);

-- 5. Trigger para actualizar automáticamente la fecha updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_projects_updated_at on public.projects;
create trigger trigger_projects_updated_at
  before update on public.projects
  for each row execute procedure public.handle_updated_at();

-- Comentario informativo
comment on table public.projects is 'Almacenamiento en la nube para diseños hidráulicos, pozos, cantidades y presupuestos de AMCaudales Pro';
