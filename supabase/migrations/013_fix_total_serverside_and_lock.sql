-- ══════════════════════════════════════════════════════════════
-- Fix P-03: Recalcular total server-side (no confiar en el frontend)
-- Fix P-04: Bloquear edición de presupuestos aprobados
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION actualizar_presupuesto(
  p_id               uuid,
  p_titulo           text,
  p_cliente_id       uuid,
  p_vigencia_dias    integer,
  p_notas_internas   text,
  p_status           text,
  p_total            numeric,
  p_total_materiales numeric,
  p_total_mano_obra  numeric,
  p_margen_estimado  numeric,
  p_fecha_vence      date,
  p_items            jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item       jsonb;
  v_calc_total numeric := 0;
  v_status_actual text;
BEGIN
  -- P-04: Verificar que no esté aprobado/firmado
  SELECT status INTO v_status_actual FROM presupuestos WHERE id = p_id;
  IF v_status_actual IN ('aprobado', 'firmado') THEN
    RAISE EXCEPTION 'BLOQUEADO: No se puede editar un presupuesto en estado %', v_status_actual;
  END IF;

  -- Borrar items viejos e insertar nuevos
  DELETE FROM presupuesto_items WHERE presupuesto_id = p_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO presupuesto_items (
      presupuesto_id, tipo, descripcion, unidad, cantidad, precio_unit, subtotal, orden
    ) VALUES (
      p_id,
      v_item->>'tipo',
      v_item->>'descripcion',
      v_item->>'unidad',
      (v_item->>'cantidad')::numeric,
      (v_item->>'precio_unit')::numeric,
      (v_item->>'cantidad')::numeric * (v_item->>'precio_unit')::numeric,
      (v_item->>'orden')::integer
    );

    -- P-03: Acumular total real desde items (excluir secciones)
    IF (v_item->>'tipo') IS DISTINCT FROM 'seccion' THEN
      v_calc_total := v_calc_total + ((v_item->>'cantidad')::numeric * (v_item->>'precio_unit')::numeric);
    END IF;
  END LOOP;

  -- Actualizar presupuesto con total calculado server-side
  UPDATE presupuestos SET
    titulo           = p_titulo,
    cliente_id       = p_cliente_id,
    vigencia_dias    = p_vigencia_dias,
    notas_internas   = p_notas_internas,
    status           = p_status,
    total            = v_calc_total,
    total_materiales = p_total_materiales,
    total_mano_obra  = p_total_mano_obra,
    margen_estimado  = p_margen_estimado,
    fecha_vence      = p_fecha_vence
  WHERE id = p_id;

  RETURN jsonb_build_object('ok', true, 'total', v_calc_total);
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- Parchear crear_presupuesto: calcular total server-side
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION crear_presupuesto(
  p_user_id          uuid,
  p_titulo           text,
  p_cliente_id       uuid,
  p_vigencia_dias    integer,
  p_notas_internas   text,
  p_status           text,
  p_total            numeric,
  p_total_materiales numeric,
  p_total_mano_obra  numeric,
  p_margen_estimado  numeric,
  p_fecha_vence      date,
  p_items            jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count      integer;
  v_limite     integer;
  v_plan       text;
  v_presup_id  uuid;
  v_numero     integer;
  v_token      text;
  v_item       jsonb;
  v_calc_total numeric := 0;
BEGIN
  SELECT plan INTO v_plan FROM perfiles WHERE id = p_user_id;

  v_limite := CASE v_plan
    WHEN 'basico'      THEN 10
    WHEN 'demo'        THEN 999
    WHEN 'profesional' THEN 999
    WHEN 'premium'     THEN 999
    ELSE 5
  END;

  SELECT count(*) INTO v_count
  FROM presupuestos
  WHERE user_id = p_user_id
    AND date_trunc('month', created_at) = date_trunc('month', now());

  IF v_count >= v_limite THEN
    RAISE EXCEPTION 'LIMITE_PLAN: Alcanzaste el límite de % presupuestos del plan %', v_limite, COALESCE(v_plan, 'sin plan');
  END IF;

  SELECT COALESCE(max(numero), 0) + 1 INTO v_numero
  FROM presupuestos WHERE user_id = p_user_id;

  v_token := encode(gen_random_bytes(16), 'hex');
  v_presup_id := gen_random_uuid();

  -- Insertar items y calcular total
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO presupuesto_items (
      presupuesto_id, tipo, descripcion, unidad, cantidad, precio_unit, subtotal, orden
    ) VALUES (
      v_presup_id,
      v_item->>'tipo',
      v_item->>'descripcion',
      v_item->>'unidad',
      (v_item->>'cantidad')::numeric,
      (v_item->>'precio_unit')::numeric,
      (v_item->>'cantidad')::numeric * (v_item->>'precio_unit')::numeric,
      (v_item->>'orden')::integer
    );

    IF (v_item->>'tipo') IS DISTINCT FROM 'seccion' THEN
      v_calc_total := v_calc_total + ((v_item->>'cantidad')::numeric * (v_item->>'precio_unit')::numeric);
    END IF;
  END LOOP;

  INSERT INTO presupuestos (
    id, user_id, numero, titulo, cliente_id, status,
    total, total_materiales, total_mano_obra, margen_estimado,
    vigencia_dias, notas_internas, fecha_vence, token_publico
  ) VALUES (
    v_presup_id, p_user_id, v_numero, p_titulo, p_cliente_id, p_status,
    v_calc_total, p_total_materiales, p_total_mano_obra, p_margen_estimado,
    p_vigencia_dias, p_notas_internas, p_fecha_vence, v_token
  );

  RETURN jsonb_build_object('id', v_presup_id, 'numero', v_numero, 'token_publico', v_token, 'total', v_calc_total);
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- P-04 extra: Bloquear DELETE de presupuestos aprobados
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION proteger_presupuesto_aprobado()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('aprobado', 'firmado') THEN
    RAISE EXCEPTION 'BLOQUEADO: No se puede eliminar un presupuesto aprobado/firmado';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trig_proteger_presupuesto_delete ON presupuestos;
CREATE TRIGGER trig_proteger_presupuesto_delete
  BEFORE DELETE ON presupuestos
  FOR EACH ROW EXECUTE FUNCTION proteger_presupuesto_aprobado();
