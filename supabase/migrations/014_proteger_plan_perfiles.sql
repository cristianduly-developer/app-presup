-- ══════════════════════════════════════════════════════════════
-- Fix P-02: Proteger columna plan en tabla perfiles (Presup)
-- El usuario puede UPDATE su perfil pero NO cambiar el plan.
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION proteger_plan_perfiles()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.plan IS DISTINCT FROM NEW.plan THEN
    RAISE EXCEPTION 'BLOQUEADO: No se puede modificar el plan desde la app';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_proteger_plan_perfiles ON perfiles;
CREATE TRIGGER trig_proteger_plan_perfiles
  BEFORE UPDATE ON perfiles
  FOR EACH ROW EXECUTE FUNCTION proteger_plan_perfiles();
