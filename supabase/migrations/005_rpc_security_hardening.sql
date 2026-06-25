-- ─── search_path hardening ─────────────────────────────────────────────────
-- Las funciones SECURITY DEFINER sin search_path fijo son vulnerables:
-- un atacante con permiso de crear esquemas puede interponer funciones propias.

alter function crear_presupuesto(uuid,text,uuid,integer,text,text,numeric,numeric,numeric,numeric,date,jsonb)
  set search_path = public, pg_catalog;

alter function actualizar_presupuesto(uuid,text,uuid,integer,text,numeric,numeric,numeric,numeric,date,jsonb)
  set search_path = public, pg_catalog;

alter function crear_obra_con_limite(text,uuid,date,text,integer)
  set search_path = public, pg_catalog;

-- ─── Revocar ejecución al rol anon ─────────────────────────────────────────
-- Los RPCs con SECURITY DEFINER bypassean RLS. Solo usuarios autenticados
-- deben poder invocarlos.

revoke execute on function crear_presupuesto(uuid,text,uuid,integer,text,text,numeric,numeric,numeric,numeric,date,jsonb) from anon;
grant  execute on function crear_presupuesto(uuid,text,uuid,integer,text,text,numeric,numeric,numeric,numeric,date,jsonb) to authenticated;

revoke execute on function actualizar_presupuesto(uuid,text,uuid,integer,text,numeric,numeric,numeric,numeric,date,jsonb) from anon;
grant  execute on function actualizar_presupuesto(uuid,text,uuid,integer,text,numeric,numeric,numeric,numeric,date,jsonb) to authenticated;

revoke execute on function crear_obra_con_limite(text,uuid,date,text,integer) from anon;
grant  execute on function crear_obra_con_limite(text,uuid,date,text,integer) to authenticated;

-- ─── Índice adicional ────────────────────────────────────────────────────────
create index if not exists idx_perfiles_email on perfiles(email);

-- ─── RLS explícito en todas las tablas ──────────────────────────────────────
alter table presupuestos  enable row level security;
alter table obras          enable row level security;
alter table clientes       enable row level security;
alter table pagos          enable row level security;
alter table gastos         enable row level security;
alter table horas          enable row level security;
alter table perfiles       enable row level security;
