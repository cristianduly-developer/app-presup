-- RPC atómico: actualiza un presupuesto y reemplaza todos sus items.
create or replace function actualizar_presupuesto(
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
returns jsonb
language plpgsql
security definer
as $$
declare
  v_item jsonb;
begin
  update presupuestos set
    titulo           = p_titulo,
    cliente_id       = p_cliente_id,
    vigencia_dias    = p_vigencia_dias,
    notas_internas   = p_notas_internas,
    status           = p_status,
    total            = p_total,
    total_materiales = p_total_materiales,
    total_mano_obra  = p_total_mano_obra,
    margen_estimado  = p_margen_estimado,
    fecha_vence      = p_fecha_vence
  where id = p_id;

  delete from presupuesto_items where presupuesto_id = p_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into presupuesto_items (
      presupuesto_id, tipo, descripcion, unidad, cantidad, precio_unit, subtotal, orden
    ) values (
      p_id,
      v_item->>'tipo',
      v_item->>'descripcion',
      v_item->>'unidad',
      (v_item->>'cantidad')::numeric,
      (v_item->>'precio_unit')::numeric,
      (v_item->>'cantidad')::numeric * (v_item->>'precio_unit')::numeric,
      (v_item->>'orden')::integer
    );
  end loop;

  return jsonb_build_object('ok', true);
end;
$$;
