-- ─── search_path hardening ─────────────────────────────────────────────────
-- Las funciones SECURITY DEFINER sin search_path fijo son vulnerables:
-- un atacante con permiso de crear esquemas puede interponer funciones propias.
-- Fijamos search_path en cada RPC para evitar esa superficie de ataque.

alter function crear_presupuesto(uuid,text,uuid,integer,text,text,numeric,numeric,numeric,numeric,date,jsonb)
  set search_path = public, pg_catalog;

alter function actualizar_presupuesto(uuid,text,uuid,integer,text,text,numeric,numeric,numeric,numeric,date,jsonb)
  set search_path = public, pg_catalog;

alter function crear_obra_con_limite(uuid,text,uuid,text,date,date,numeric,text)
  set search_path = public, pg_catalog;

-- ─── Revocar ejecución al rol anon ─────────────────────────────────────────
-- Los RPCs con SECURITY DEFINER se ejecutan como el owner (superuser-like),
-- bypasseando RLS. Solo deben ser invocables por usuarios autenticados.

revoke execute on function crear_presupuesto(uuid,text,uuid,integer,text,text,numeric,numeric,numeric,numeric,date,jsonb)
  from anon;
grant  execute on function crear_presupuesto(uuid,text,uuid,integer,text,text,numeric,numeric,numeric,numeric,date,jsonb)
  to authenticated;

revoke execute on function actualizar_presupuesto(uuid,text,uuid,integer,text,text,numeric,numeric,numeric,numeric,date,jsonb)
  from anon;
grant  execute on function actualizar_presupuesto(uuid,text,uuid,integer,text,text,numeric,numeric,numeric,numeric,date,jsonb)
  to authenticated;

revoke execute on function crear_obra_con_limite(uuid,text,uuid,text,date,date,numeric,text)
  from anon;
grant  execute on function crear_obra_con_limite(uuid,text,uuid,text,date,date,numeric,text)
  to authenticated;

-- ─── Index para perfiles (lookup por email frecuente en el central) ─────────
create index if not exists idx_perfiles_email on perfiles(email);

-- ─── Evitar que anon acceda a tablas sensibles directamente ─────────────────
-- Confirmar que RLS está activo (en Supabase viene habilitado por defecto,
-- pero lo explicitamos para que quede documentado).
alter table presupuestos  enable row level security;
alter table obras          enable row level security;
alter table clientes       enable row level security;
alter table pagos          enable row level security;
alter table gastos         enable row level security;
alter table horas          enable row level security;
alter table perfiles       enable row level security;
