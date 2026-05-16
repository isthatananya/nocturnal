const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

function calcEMI(principal: number, aprStr: string | null, months: number | null): number | null {
  if (!aprStr || !months || months === 0) return null
  const r = parseFloat(aprStr) / 100 / 12
  if (r === 0) return principal / months
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
}

interface Props {
  max: number           // INR
  value: number         // INR
  onChange: (v: number) => void
  interestRate: string | null
  termMonths: number | null
}

export default function LoanSlider({ max, value, onChange, interestRate, termMonths }: Props) {
  const emi = calcEMI(value, interestRate, termMonths)
  const pct = max > 0 ? (value / max) * 100 : 0

  // Smart step: round to nearest clean denomination
  const step = max >= 100000 ? 5000 : max >= 25000 ? 1000 : 500

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-4xl font-bold text-zinc-100">{INR(value)}</p>
          <p className="text-sm text-zinc-500 mt-0.5">requested loan amount</p>
        </div>
        <p className="text-zinc-500 text-sm">Max: {INR(max)}</p>
      </div>

      <div className="relative">
        <input
          type="range"
          min={step}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full appearance-none h-2 rounded-full outline-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #f5f5f7 ${pct}%, rgba(255,255,255,0.08) ${pct}%)`,
          }}
        />
      </div>

      <div className="flex gap-4">
        <div className="glass rounded-xl px-4 py-3 flex-1 text-center">
          <p className="text-zinc-500 text-xs">APR</p>
          <p className="text-zinc-100 font-semibold">{interestRate ?? '—'}</p>
        </div>
        <div className="glass rounded-xl px-4 py-3 flex-1 text-center">
          <p className="text-zinc-500 text-xs">Term</p>
          <p className="text-zinc-100 font-semibold">{termMonths ? `${termMonths} mo` : '—'}</p>
        </div>
        <div className="glass rounded-xl px-4 py-3 flex-1 text-center">
          <p className="text-zinc-500 text-xs">Est. EMI/mo</p>
          <p className="text-zinc-100 font-semibold">{emi ? INR(emi) : '—'}</p>
        </div>
      </div>
    </div>
  )
}
