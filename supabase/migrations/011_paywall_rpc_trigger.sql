-- ══════════════════════════════════════════════════════════════
-- Presupuestos — cerrar el paywall en las creaciones vía RPC
-- Los RPCs crear_presupuesto / crear_obra_con_limite son SECURITY DEFINER
-- → saltean las RLS (policies de 010). Un trigger BEFORE INSERT SÍ se
-- dispara siempre, así que gatea el acceso sin tocar el cuerpo del RPC.
-- Correr DESPUÉS de 009 y 010.
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION chk_acceso_escritura() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- fail-open: si no hay usuario (service role) o no hay fila espejo, permite
  IF NOT tiene_acceso() THEN
    RAISE EXCEPTION 'SIN_ACCESO: Tu suscripción venció o está suspendida. Renovala para seguir cargando.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_acceso_presupuestos ON presupuestos;
CREATE TRIGGER trg_acceso_presupuestos BEFORE INSERT ON presupuestos
  FOR EACH ROW EXECUTE FUNCTION chk_acceso_escritura();

DROP TRIGGER IF EXISTS trg_acceso_obras ON obras;
CREATE TRIGGER trg_acceso_obras BEFORE INSERT ON obras
  FOR EACH ROW EXECUTE FUNCTION chk_acceso_escritura();

-- ══════════════════════════════════════════════════════════════
-- ROLLBACK:
-- DROP TRIGGER IF EXISTS trg_acceso_presupuestos ON presupuestos;
-- DROP TRIGGER IF EXISTS trg_acceso_obras ON obras;
-- DROP FUNCTION IF EXISTS chk_acceso_escritura();
-- ══════════════════════════════════════════════════════════════
