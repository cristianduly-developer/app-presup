-- ══════════════════════════════════════════════════════════════
-- Presupuestos — Espejo de acceso por tenant
-- STAGE 1: solo crea tablas y funciones. NO enforca nada.
-- Presup usa user_id (auth.uid()) como tenant → tiene_acceso() sin parámetro.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tenant_access (
  tenant_id   UUID PRIMARY KEY,   -- auth.uid() del dueño
  plan        TEXT,
  valid_until TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '3650 days'
);
ALTER TABLE tenant_access ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION tiene_acceso() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT valid_until > now() FROM tenant_access WHERE tenant_id = auth.uid()), TRUE);
$$;

-- ══════════════════════════════════════════════════════════════
-- FIN STAGE 1. Verificar: SELECT * FROM tenant_access;
-- ══════════════════════════════════════════════════════════════
