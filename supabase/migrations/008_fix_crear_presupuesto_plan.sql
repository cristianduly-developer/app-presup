-- Fix crítico: perfiles usa id, no user_id
-- El bug causaba que v_plan siempre fuera null → límite de 5 presupuestos para todos

create or replace function crear_presupuesto(
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
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_count     integer;
  v_limite    integer;
  v_plan      text;
  v_presup_id uuid;
  v_numero    integer;
  v_token     text;
  v_item      jsonb;
begin
  -- Límite de plan (fix: id, no user_id)
  select plan into v_plan
  from perfiles where id = p_user_id;

  v_limite := case v_plan
    when 'basico'      then 50
    when 'profesional' then 200
    when 'premium'     then 999999
    when 'trial'       then 200
    when 'demo'        then 200
    when 'sincargo'    then 200
    else 50
  end;

  select count(*) into v_count
  from presupuestos
  where user_id = p_user_id
    and date_trunc('month', created_at) = date_trunc('month', now());

  if v_count >= v_limite then
    raise exception 'LIMITE_PLAN: Alcanzaste el límite de % presupuestos del plan %', v_limite, coalesce(v_plan, 'sin plan');
  end if;

  -- Número correlativo
  select coalesce(max(numero), 0) + 1 into v_numero
  from presupuestos where user_id = p_user_id;

  v_token := encode(gen_random_bytes(16), 'hex');
  v_presup_id := gen_random_uuid();

  insert into presupuestos (
    id, user_id, numero, titulo, cliente_id, status,
    total, total_materiales, total_mano_obra, margen_estimado,
    vigencia_dias, notas_internas, fecha_vence, token_publico
  ) values (
    v_presup_id, p_user_id, v_numero, p_titulo, p_cliente_id, p_status,
    p_total, p_total_materiales, p_total_mano_obra, p_margen_estimado,
    p_vigencia_dias, p_notas_internas, p_fecha_vence, v_token
  );

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into presupuesto_items (
      presupuesto_id, tipo, descripcion, unidad, cantidad, precio_unit, subtotal, orden
    ) values (
      v_presup_id,
      v_item->>'tipo',
      v_item->>'descripcion',
      v_item->>'unidad',
      (v_item->>'cantidad')::numeric,
      (v_item->>'precio_unit')::numeric,
      (v_item->>'cantidad')::numeric * (v_item->>'precio_unit')::numeric,
      (v_item->>'orden')::integer
    );
  end loop;

  return jsonb_build_object('id', v_presup_id, 'numero', v_numero, 'token_publico', v_token);
end;
$$;
