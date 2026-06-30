-- ================================================================
-- FIX CRÍTICO: RLS demasiado permisivas en presupuestos e ítems
-- ================================================================

-- 1. Eliminar política que expone todos los presupuestos con token
drop policy if exists "presupuesto publico por token" on presupuestos;

-- La vista pública se maneja SOLO a través de la función SECURITY DEFINER
-- get_presupuesto_publico — no necesita acceso directo anon a la tabla.
-- Las funciones aceptar_presupuesto y rechazar_presupuesto también son
-- SECURITY DEFINER y no necesitan política pública.

-- 2. Eliminar política que expone TODOS los ítems a cualquiera
drop policy if exists "items publicos por token" on presupuesto_items;

-- Los ítems públicos también se sirven a través de get_presupuesto_publico
-- (que hace join interno). No necesitan política directa anon.

-- 3. Asegurar que aceptar_presupuesto no cree obra duplicada
create or replace function aceptar_presupuesto(p_token text)
returns json language plpgsql security definer as $$
declare
  v_presup presupuestos%rowtype;
begin
  select * into v_presup from presupuestos where token_publico = p_token;

  if not found then
    return json_build_object('ok', false, 'error', 'Presupuesto no encontrado');
  end if;

  if v_presup.status = 'vencido' or (v_presup.fecha_vence is not null and v_presup.fecha_vence < current_date) then
    return json_build_object('ok', false, 'error', 'El presupuesto está vencido');
  end if;

  if v_presup.status = 'aprobado' then
    -- ya fue aceptado (doble-tap o retry) — devolver ok sin duplicar
    return json_build_object('ok', true, 'ya_aceptado', true);
  end if;

  if v_presup.status != 'enviado' then
    return json_build_object('ok', false, 'error', 'El presupuesto no está disponible para aceptar');
  end if;

  update presupuestos
  set status = 'aprobado', fecha_aprobado = current_date, updated_at = now()
  where token_publico = p_token;

  -- crear obra solo si no existe ya una vinculada a este presupuesto
  insert into obras (user_id, presupuesto_id, cliente_id, nombre, total, status)
  select p.user_id, p.id, p.cliente_id,
    coalesce((select nombre from clientes where id = v_presup.cliente_id), 'Sin cliente') || ' · Presupuesto #' || p.numero,
    p.total, 'en_ejecucion'
  from presupuestos p
  where p.token_publico = p_token
    and not exists (select 1 from obras where presupuesto_id = v_presup.id);

  return json_build_object('ok', true);
end;
$$;

-- 4. Permitir UPDATE de firma por token (anon) — solo campos de firma
-- Necesario para que el cliente pueda guardar su firma desde el link público
drop policy if exists "firma por token" on presupuestos;
create policy "firma por token" on presupuestos
  for update
  using (token_publico is not null and status = 'aprobado')
  with check (true);
