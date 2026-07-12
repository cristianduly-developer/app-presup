-- Agregar configuración de seña al perfil
alter table perfiles
  add column if not exists senia_activa boolean default false,
  add column if not exists senia_porcentaje int default 30;

-- Actualizar get_presupuesto_publico para incluir senia_activa y senia_porcentaje
create or replace function get_presupuesto_publico(p_token text)
returns json language plpgsql security definer as $$
declare
  v_row record;
begin
  select
    p.id, p.numero, p.titulo, p.status, p.total,
    p.total_materiales, p.total_mano_obra, p.margen_estimado,
    p.fecha_vence, p.vigencia_dias, p.token_publico,
    p.firma_nombre, p.firma_fecha,
    p.cliente_id,
    c.nombre as cliente_nombre,
    c.telefono as cliente_telefono,
    c.email as cliente_email,
    c.direccion as cliente_direccion,
    pf.nombre as prof_nombre,
    pf.oficio as prof_oficio,
    pf.telefono as prof_telefono,
    pf.logo_url as prof_logo,
    pf.ciudad as prof_ciudad,
    pf.provincia as prof_provincia,
    pf.matricula as prof_matricula,
    pf.cuit as prof_cuit,
    pf.condicion_iva as prof_condicion_iva,
    pf.senia_activa,
    pf.senia_porcentaje,
    coalesce((select sum(monto) from pagos where presupuesto_id = p.id), 0) as cobrado,
    (
      select json_agg(i order by i.orden)
      from presupuesto_items i
      where i.presupuesto_id = p.id
    ) as items
  into v_row
  from presupuestos p
  left join clientes c on c.id = p.cliente_id
  left join perfiles pf on pf.id = p.user_id
  where p.token_publico = p_token;

  if not found then return null; end if;

  return row_to_json(v_row);
end;
$$;
