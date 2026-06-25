-- Índices de performance para consultas frecuentes
create index if not exists idx_pagos_presupuesto_id on pagos(presupuesto_id);
create index if not exists idx_pagos_obra_id        on pagos(obra_id);
create index if not exists idx_gastos_obra_id       on gastos(obra_id);
create index if not exists idx_horas_obra_id        on horas(obra_id);
create index if not exists idx_clientes_user_id     on clientes(user_id);

-- Trigger de updated_at para presupuestos
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_presupuestos_updated_at
  before update on presupuestos
  for each row execute function set_updated_at();

create trigger trg_obras_updated_at
  before update on obras
  for each row execute function set_updated_at();

create trigger trg_clientes_updated_at
  before update on clientes
  for each row execute function set_updated_at();
