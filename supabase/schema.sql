-- ================================================================
-- APP-PRESUP · Schema completo
-- Ejecutar en Supabase → SQL Editor
-- ================================================================

-- Extensiones
create extension if not exists "uuid-ossp";

-- ================================================================
-- PERFILES DE USUARIO
-- ================================================================
create table if not exists perfiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  nombre        text not null default '',
  oficio        text default '',
  matricula     text default '',
  telefono      text default '',
  email         text default '',
  ciudad        text default '',
  provincia     text default '',
  cuit          text default '',
  condicion_iva text default 'monotributista',
  logo_url      text default '',
  color_primario text default '#3B82F6',
  moneda        text default 'ARS',
  vigencia_default int default 5,
  recargo_urgencia  int default 30,
  recargo_nocturno  int default 50,
  recargo_feriado   int default 100,
  whatsapp_msg  text default 'Hola {cliente}, te envío el presupuesto #{numero} por {total}. Podés verlo acá: {link}',
  -- suscripción (controlado desde app central)
  plan          text default 'trial',   -- trial | basico | profesional | full | bypass
  plan_vence    date,
  created_at    timestamptz default now()
);

alter table perfiles enable row level security;
create policy "perfil propio" on perfiles
  for all using (auth.uid() = id);

-- trigger: crear perfil automáticamente al registrarse
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into perfiles (id, email, nombre)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ================================================================
-- CLIENTES
-- ================================================================
create table if not exists clientes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references perfiles(id) on delete cascade,
  nombre      text not null,
  telefono    text default '',
  email       text default '',
  direccion   text default '',
  ciudad      text default '',
  cuit        text default '',
  notas       text default '',
  clasificacion text default 'normal',  -- excelente | normal | riesgoso
  created_at  timestamptz default now()
);

alter table clientes enable row level security;
create policy "clientes propios" on clientes
  for all using (auth.uid() = user_id);

create index clientes_user_idx on clientes(user_id);

-- ================================================================
-- PLANTILLAS
-- ================================================================
create table if not exists plantillas (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references perfiles(id) on delete cascade,
  nombre      text not null,
  descripcion text default '',
  icono       text default '🔧',
  usos        int default 0,
  created_at  timestamptz default now()
);

create table if not exists plantilla_items (
  id           uuid primary key default uuid_generate_v4(),
  plantilla_id uuid not null references plantillas(id) on delete cascade,
  tipo         text not null default 'material',  -- material | mano_obra
  descripcion  text not null,
  unidad       text default 'u',
  cantidad     numeric default 1,
  precio_unit  numeric default 0,
  orden        int default 0
);

alter table plantillas enable row level security;
create policy "plantillas propias" on plantillas
  for all using (auth.uid() = user_id);

alter table plantilla_items enable row level security;
create policy "plantilla items propios" on plantilla_items
  for all using (
    auth.uid() = (select user_id from plantillas where id = plantilla_id)
  );

-- ================================================================
-- PRESUPUESTOS
-- ================================================================
create table if not exists presupuestos (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references perfiles(id) on delete cascade,
  cliente_id    uuid references clientes(id) on delete set null,
  numero        serial,
  status        text not null default 'borrador',  -- borrador | enviado | aprobado | vencido
  vigencia_dias int default 5,
  fecha_envio   date,
  fecha_vence   date,
  fecha_aprobado date,
  total         numeric default 0,
  total_materiales numeric default 0,
  total_mano_obra  numeric default 0,
  margen_estimado  numeric default 0,
  notas_internas text default '',
  -- link público
  token_publico text unique default encode(gen_random_bytes(16), 'hex'),
  -- modo urgencia
  es_urgente    boolean default false,
  tipo_urgencia text default '',  -- nocturno | feriado | urgencia
  recargo_aplicado numeric default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table presupuestos enable row level security;
create policy "presupuestos propios" on presupuestos
  for all using (auth.uid() = user_id);

-- acceso público por token (para el link del cliente)
create policy "presupuesto publico por token" on presupuestos
  for select using (token_publico is not null);

create index presupuestos_user_idx on presupuestos(user_id);
create index presupuestos_cliente_idx on presupuestos(cliente_id);

-- ================================================================
-- ITEMS DE PRESUPUESTO
-- ================================================================
create table if not exists presupuesto_items (
  id              uuid primary key default uuid_generate_v4(),
  presupuesto_id  uuid not null references presupuestos(id) on delete cascade,
  tipo            text not null default 'material',  -- material | mano_obra
  descripcion     text not null,
  unidad          text default 'u',
  cantidad        numeric default 1,
  precio_unit     numeric default 0,
  subtotal        numeric generated always as (cantidad * precio_unit) stored,
  orden           int default 0
);

alter table presupuesto_items enable row level security;
create policy "items propios" on presupuesto_items
  for all using (
    auth.uid() = (select user_id from presupuestos where id = presupuesto_id)
  );
create policy "items publicos por token" on presupuesto_items
  for select using (true);

-- ================================================================
-- OBRAS
-- ================================================================
create table if not exists obras (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references perfiles(id) on delete cascade,
  presupuesto_id  uuid references presupuestos(id) on delete set null,
  cliente_id      uuid references clientes(id) on delete set null,
  nombre          text not null,
  descripcion     text default '',
  direccion       text default '',
  status          text not null default 'presupuestada',
    -- presupuestada | en_ejecucion | pendiente_cobro | finalizada | cobrada
  total           numeric default 0,
  fecha_inicio    date,
  fecha_fin       date,
  notas           text default '',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table obras enable row level security;
create policy "obras propias" on obras
  for all using (auth.uid() = user_id);

create index obras_user_idx on obras(user_id);

-- ================================================================
-- PAGOS
-- ================================================================
create table if not exists pagos (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references perfiles(id) on delete cascade,
  obra_id       uuid references obras(id) on delete cascade,
  presupuesto_id uuid references presupuestos(id) on delete cascade,
  monto         numeric not null,
  metodo        text default 'efectivo',  -- efectivo | transferencia | mercadopago | cheque
  fecha         date not null default current_date,
  notas         text default '',
  created_at    timestamptz default now()
);

alter table pagos enable row level security;
create policy "pagos propios" on pagos
  for all using (auth.uid() = user_id);

create index pagos_obra_idx on pagos(obra_id);
create index pagos_presupuesto_idx on pagos(presupuesto_id);

-- ================================================================
-- GASTOS
-- ================================================================
create table if not exists gastos (
  id        uuid primary key default uuid_generate_v4(),
  user_id   uuid not null references perfiles(id) on delete cascade,
  obra_id   uuid references obras(id) on delete cascade,
  descripcion text not null,
  monto     numeric not null,
  categoria text default 'material',  -- material | herramienta | traslado | otro
  fecha     date not null default current_date,
  foto_url  text default '',
  notas     text default '',
  created_at timestamptz default now()
);

alter table gastos enable row level security;
create policy "gastos propios" on gastos
  for all using (auth.uid() = user_id);

create index gastos_obra_idx on gastos(obra_id);

-- ================================================================
-- HORAS TRABAJADAS
-- ================================================================
create table if not exists horas (
  id        uuid primary key default uuid_generate_v4(),
  user_id   uuid not null references perfiles(id) on delete cascade,
  obra_id   uuid references obras(id) on delete cascade,
  cantidad  numeric not null,
  fecha     date not null default current_date,
  descripcion text default '',
  created_at timestamptz default now()
);

alter table horas enable row level security;
create policy "horas propias" on horas
  for all using (auth.uid() = user_id);

create index horas_obra_idx on horas(obra_id);

-- ================================================================
-- AGENDA / VISITAS
-- ================================================================
create table if not exists visitas (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references perfiles(id) on delete cascade,
  cliente_id  uuid references clientes(id) on delete set null,
  obra_id     uuid references obras(id) on delete set null,
  descripcion text not null,
  fecha       date not null,
  hora        time,
  duracion_min int default 60,
  status      text default 'pendiente',  -- pendiente | confirmada | cancelada | realizada
  direccion   text default '',
  notas       text default '',
  created_at  timestamptz default now()
);

alter table visitas enable row level security;
create policy "visitas propias" on visitas
  for all using (auth.uid() = user_id);

create index visitas_user_fecha_idx on visitas(user_id, fecha);

-- ================================================================
-- FOTOS DE OBRA
-- ================================================================
create table if not exists fotos (
  id        uuid primary key default uuid_generate_v4(),
  user_id   uuid not null references perfiles(id) on delete cascade,
  obra_id   uuid not null references obras(id) on delete cascade,
  url       text not null,
  etapa     text default 'durante',  -- antes | durante | final
  descripcion text default '',
  created_at timestamptz default now()
);

alter table fotos enable row level security;
create policy "fotos propias" on fotos
  for all using (auth.uid() = user_id);

-- storage bucket para fotos
insert into storage.buckets (id, name, public)
values ('fotos-obras', 'fotos-obras', true)
on conflict do nothing;

create policy "fotos upload" on storage.objects
  for insert with check (bucket_id = 'fotos-obras' and auth.uid() is not null);
create policy "fotos select" on storage.objects
  for select using (bucket_id = 'fotos-obras');

-- ================================================================
-- VISTAS ÚTILES
-- ================================================================

-- resumen financiero por obra
create or replace view obras_resumen as
select
  o.id,
  o.user_id,
  o.nombre,
  o.status,
  o.total,
  o.cliente_id,
  o.fecha_inicio,
  coalesce(sum(p.monto), 0)           as cobrado,
  o.total - coalesce(sum(p.monto), 0) as pendiente,
  coalesce(sum(g.monto), 0)           as gastos,
  coalesce(sum(h.cantidad), 0)        as horas,
  o.total - coalesce(sum(g.monto), 0) as ganancia_neta,
  case when coalesce(sum(h.cantidad), 0) > 0
    then (o.total - coalesce(sum(g.monto), 0)) / sum(h.cantidad)
    else 0
  end                                  as valor_hora
from obras o
left join pagos  p on p.obra_id = o.id
left join gastos g on g.obra_id = o.id
left join horas  h on h.obra_id = o.id
group by o.id;

-- kpis del mes para el dashboard
create or replace view kpis_mes as
select
  user_id,
  date_trunc('month', current_date) as mes,
  coalesce(sum(case when status in ('enviado','aprobado') then total end), 0) as facturado,
  0 as cobrado,   -- se calcula desde tabla pagos
  0 as pendiente
from presupuestos
where date_trunc('month', created_at) = date_trunc('month', current_date)
group by user_id;

-- ================================================================
-- FUNCIÓN: aceptar presupuesto desde link público
-- ================================================================
create or replace function aceptar_presupuesto(p_token text)
returns json language plpgsql security definer as $$
declare
  v_presup presupuestos%rowtype;
begin
  select * into v_presup from presupuestos where token_publico = p_token;

  if not found then
    return json_build_object('ok', false, 'error', 'Presupuesto no encontrado');
  end if;

  if v_presup.status = 'vencido' or (v_presup.fecha_vence is not null and v_presup.fecha_vence < current_date) then
    return json_build_object('ok', false, 'error', 'El presupuesto está vencido');
  end if;

  if v_presup.status != 'enviado' then
    return json_build_object('ok', false, 'error', 'El presupuesto no está disponible para aceptar');
  end if;

  update presupuestos
  set status = 'aprobado', fecha_aprobado = current_date, updated_at = now()
  where token_publico = p_token;

  -- crear obra automáticamente
  insert into obras (user_id, presupuesto_id, cliente_id, nombre, total, status)
  select user_id, id, cliente_id,
    (select nombre from clientes where id = v_presup.cliente_id) || ' · Presupuesto #' || numero,
    total, 'en_ejecucion'
  from presupuestos where token_publico = p_token;

  return json_build_object('ok', true);
end;
$$;
