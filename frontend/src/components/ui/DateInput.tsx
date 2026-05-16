import { useEffect, useState } from 'react'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate()
}

interface Props {
  value: string         // ISO yyyy-mm-dd
  onChange: (iso: string) => void
  max?: string          // ISO yyyy-mm-dd upper bound
  required?: boolean
}

export default function DateInput({ value, onChange, max, required }: Props) {
  const currentYear = new Date().getFullYear()
  const maxYear = max ? parseInt(max.slice(0, 4)) : currentYear

  const [day, setDay]     = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear]   = useState('')

  // Initialise from value prop
  useEffect(() => {
    if (value && value.length === 10) {
      setYear(value.slice(0, 4))
      setMonth(String(parseInt(value.slice(5, 7))))
      setDay(String(parseInt(value.slice(8, 10))))
    }
  }, [])

  // Emit ISO string whenever all three are filled
  useEffect(() => {
    if (day && month && year && year.length === 4) {
      const m = month.padStart(2, '0')
      const d = day.padStart(2, '0')
      onChange(`${year}-${m}-${d}`)
    } else if (!day && !month && !year) {
      onChange('')
    }
  }, [day, month, year])

  const maxDayForMonth = (month && year && year.length === 4)
    ? daysInMonth(parseInt(month), parseInt(year))
    : 31

  const years = Array.from({ length: maxYear - 1924 }, (_, i) => maxYear - i)

  const selectClass = `
    flex-1 appearance-none bg-white/5 border border-white/9 rounded-xl
    px-3 py-3 text-sm text-zinc-100 outline-none cursor-pointer
    hover:bg-white/7 hover:border-white/16
    focus:bg-white/8 focus:border-white/30 focus:ring-2 focus:ring-white/7
    transition-all duration-150
    [&>option]:bg-zinc-900 [&>option]:text-zinc-100
  `.replace(/\s+/g, ' ').trim()

  const placeholderClass = 'text-zinc-500'
  const filledClass = 'text-zinc-100'

  return (
    <div className="flex gap-2">
      {/* Day */}
      <select
        value={day}
        onChange={e => setDay(e.target.value)}
        required={required}
        className={`${selectClass} w-[72px] shrink-0 ${day ? filledClass : placeholderClass}`}
        style={{ flex: '0 0 auto' }}
      >
        <option value="" disabled>Day</option>
        {Array.from({ length: maxDayForMonth }, (_, i) => i + 1).map(d => (
          <option key={d} value={String(d)}>{String(d).padStart(2, '0')}</option>
        ))}
      </select>

      {/* Month */}
      <select
        value={month}
        onChange={e => setMonth(e.target.value)}
        required={required}
        className={`${selectClass} ${month ? filledClass : placeholderClass}`}
      >
        <option value="" disabled>Month</option>
        {MONTHS.map((name, i) => (
          <option key={i + 1} value={String(i + 1)}>{name}</option>
        ))}
      </select>

      {/* Year */}
      <select
        value={year}
        onChange={e => setYear(e.target.value)}
        required={required}
        className={`${selectClass} w-[88px] shrink-0 ${year ? filledClass : placeholderClass}`}
        style={{ flex: '0 0 auto' }}
      >
        <option value="" disabled>Year</option>
        {years.map(y => (
          <option key={y} value={String(y)}>{y}</option>
        ))}
      </select>
    </div>
  )
}
