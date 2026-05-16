interface Props {
  max: number
  value: number
  onChange: (v: number) => void
  interestRate: string | null
  termMonths: number | null
}

export default function LoanSlider({ max, value, onChange, interestRate, termMonths }: Props) {
  const monthly = termMonths && interestRate
    ? ((value * (parseFloat(interestRate) / 100)) / 12 + value / termMonths).toFixed(0)
    : null

  const pct = max > 0 ? (value / max) * 100 : 0

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-4xl font-bold text-slate-100">{value.toLocaleString()}</p>
          <p className="text-sm text-slate-500 mt-0.5">tDUST requested</p>
        </div>
        <p className="text-slate-500 text-sm">Max: {max.toLocaleString()} tDUST</p>
      </div>

      <div className="relative">
        <input
          type="range"
          min={100}
          max={max}
          step={100}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full appearance-none h-2 rounded-full outline-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #6366f1 ${pct}%, rgba(255,255,255,0.08) ${pct}%)`,
          }}
        />
      </div>

      {monthly && (
        <div className="flex gap-4">
          <div className="glass rounded-xl px-4 py-3 flex-1 text-center">
            <p className="text-slate-500 text-xs">APR</p>
            <p className="text-slate-100 font-semibold">{interestRate}</p>
          </div>
          <div className="glass rounded-xl px-4 py-3 flex-1 text-center">
            <p className="text-slate-500 text-xs">Term</p>
            <p className="text-slate-100 font-semibold">{termMonths} months</p>
          </div>
          <div className="glass rounded-xl px-4 py-3 flex-1 text-center">
            <p className="text-slate-500 text-xs">Est. monthly</p>
            <p className="text-slate-100 font-semibold">{Number(monthly).toLocaleString()} tDUST</p>
          </div>
        </div>
      )}
    </div>
  )
}
