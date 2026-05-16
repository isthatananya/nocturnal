import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
  {
    variants: {
      variant: {
        primary: 'bg-white hover:bg-zinc-100 active:scale-[0.975] text-black rounded-xl [box-shadow:0_2px_8px_rgba(0,0,0,0.4)] hover:[box-shadow:0_4px_16px_rgba(0,0,0,0.5)]',
        ghost:   'bg-transparent hover:bg-white/6 active:scale-[0.975] text-zinc-400 hover:text-white border border-white/8 hover:border-white/16 rounded-xl',
        danger:  'bg-red-500/10 hover:bg-red-500/18 text-red-400 border border-red-500/20 hover:border-red-500/35 rounded-xl',
        link:    'text-white/60 hover:text-white underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm:   'h-8 px-3 text-sm rounded-lg',
        md:   'h-11 px-6 py-3 text-sm',
        lg:   'h-12 px-8 text-base',
        icon: 'h-9 w-9 rounded-lg p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {children}
          </>
        ) : children}
      </Comp>
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
