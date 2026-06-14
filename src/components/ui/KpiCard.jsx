export default function KpiCard({ label, value, sub, color = 'text-white', trend }) {
  return (
    <div className="bg-surface-card rounded-2xl p-3 flex flex-col gap-1 min-w-0">
      <span className={`text-[11px] font-medium ${color}`}>{label}</span>
      <span className="text-white font-bold text-[15px] leading-tight truncate">{value}</span>
      {sub && <span className="text-gray-400 text-[10px]">{sub}</span>}
    </div>
  )
}
