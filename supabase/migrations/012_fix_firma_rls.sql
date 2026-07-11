-- Fix: la policy "firma por token" permite UPDATE de cualquier columna.
-- Reemplazar con un RPC que solo actualiza campos de firma.

drop policy if exists "firma por token" on presupuestos;

create or replace function guardar_firma_presupuesto(p_token text, p_firma_imagen text, p_firma_nombre text default '')
returns json language plpgsql security definer as $$
declare
  v_presup presupuestos%rowtype;
begin
  select * into v_presup from presupuestos
  where token_publico = p_token and status = 'aprobado';

  if not found then
    return json_build_object('ok', false, 'error', 'Presupuesto no encontrado o no aprobado');
  end if;

  update presupuestos
  set firma_imagen = p_firma_imagen,
      firma_nombre = p_firma_nombre,
      firma_fecha = now(),
      updated_at = now()
  where id = v_presup.id;

  return json_build_object('ok', true);
end;
$$;
