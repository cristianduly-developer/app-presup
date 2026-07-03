-- ══════════════════════════════════════════════════════════════
-- Presupuestos — ENFORCEMENT (item 8)
-- Correr DESPUÉS de 009_tenant_access.sql
-- Gatea ESCRITURA por acceso vigente. LECTURA intacta.
-- Presup ya enforca límites de plan en los RPCs (crear_presupuesto,
-- crear_obra_con_limite), así que acá solo agregamos el paywall.
-- ══════════════════════════════════════════════════════════════

DO $$
DECLARE t TEXT;
DECLARE tablas TEXT[] := ARRAY[
  'presupuestos','obras','clientes','plantillas','pagos',
  'gastos','horas','visitas','fotos'
];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name = t AND column_name = 'user_id') THEN
      EXECUTE format('DROP POLICY IF EXISTS acc_ins_%1$s ON %1$s', t);
      EXECUTE format('DROP POLICY IF EXISTS acc_upd_%1$s ON %1$s', t);
      EXECUTE format('CREATE POLICY acc_ins_%1$s ON %1$s AS RESTRICTIVE FOR INSERT WITH CHECK (tiene_acceso())', t);
      EXECUTE format('CREATE POLICY acc_upd_%1$s ON %1$s AS RESTRICTIVE FOR UPDATE WITH CHECK (tiene_acceso())', t);
    END IF;
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════
-- ROLLBACK:
-- DO $$ DECLARE t TEXT; DECLARE tablas TEXT[] := ARRAY['presupuestos','obras','clientes','plantillas','pagos','gastos','horas','visitas','fotos'];
-- BEGIN FOREACH t IN ARRAY tablas LOOP
--   EXECUTE format('DROP POLICY IF EXISTS acc_ins_%1$s ON %1$s', t);
--   EXECUTE format('DROP POLICY IF EXISTS acc_upd_%1$s ON %1$s', t);
-- END LOOP; END $$;
-- ══════════════════════════════════════════════════════════════
