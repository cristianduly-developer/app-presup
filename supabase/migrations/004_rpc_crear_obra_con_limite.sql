-- RPC atómico: crea una obra verificando el límite del plan del usuario.
create or replace function crear_obra_con_limite(
  p_user_id    uuid,
  p_nombre     text,
  p_cliente_id uuid,
  p_direccion  text,
  p_inicio     date,
  p_fin        date,
  p_monto      numeric,
  p_notas      text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_count  integer;
  v_limite integer;
  v_plan   text;
  v_id     uuid;
begin
  select plan into v_plan
  from perfiles where user_id = p_user_id;

  v_limite := case v_plan
    when 'basico'      then 3
    when 'demo'        then 999
    when 'profesional' then 999
    when 'premium'     then 999
    else 2
  end;

  select count(*) into v_count
  from obras
  where user_id = p_user_id and status != 'finalizada';

  if v_count >= v_limite then
    raise exception 'LIMITE_PLAN: Alcanzaste el límite de % obras activas del plan %', v_limite, coalesce(v_plan, 'sin plan');
  end if;

  v_id := gen_random_uuid();

  insert into obras (id, user_id, nombre, cliente_id, direccion, fecha_inicio, fecha_fin_est, monto_contrato, notas)
  values (v_id, p_user_id, p_nombre, p_cliente_id, p_direccion, p_inicio, p_fin, p_monto, p_notas);

  return jsonb_build_object('id', v_id);
end;
$$;
