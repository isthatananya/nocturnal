import { motion, type Variants } from 'framer-motion'

/* ── Apple-style spring presets ─────────────────────────────── */
const spring = { type: 'spring' as const, stiffness: 380, damping: 28 }
const springFast = { type: 'spring' as const, stiffness: 500, damping: 32 }
const ease = [0.25, 0.46, 0.45, 0.94] as const  // Apple's default ease

/* ── FadeIn ──────────────────────────────────────────────────── */
export function FadeIn({ children, delay = 0, className = '' }: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ── SlideUp — spring entrance ───────────────────────────────── */
export function SlideUp({ children, delay = 0, className = '' }: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ── ViewIn — triggers when element scrolls into view ───────── */
export function ViewIn({ children, delay = 0, className = '' }: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ ...spring, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ── Stagger container + item ────────────────────────────────── */
const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 380, damping: 28 },
  },
}

export function Stagger({ children, className = '' }: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className = '' }: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  )
}

/* ── ScaleIn ─────────────────────────────────────────────────── */
export function ScaleIn({ children, delay = 0, className = '' }: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...spring, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ── Page transition wrapper ─────────────────────────────────── */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.99 }}
      transition={{ duration: 0.3, ease }}
    >
      {children}
    </motion.div>
  )
}

/* ── PressButton — Apple-feel tap response ───────────────────── */
export function PressButton({
  children,
  className = '',
  onClick,
  disabled,
  type = 'button',
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.018, y: -1 }}
      whileTap={disabled ? {} : { scale: 0.968, y: 0 }}
      transition={springFast}
      className={className}
    >
      {children}
    </motion.button>
  )
}

/* ── HoverCard — subtle lift on hover ───────────────────────── */
export function HoverCard({ children, className = '' }: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.008 }}
      whileTap={{ scale: 0.995 }}
      transition={spring}
      className={className}
    >
      {children}
    </motion.div>
  )
}
