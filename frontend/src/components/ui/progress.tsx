import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '../../lib/utils'

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  indicatorClassName?: string
}

const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  ({ className, value, indicatorClassName, ...props }, ref) => (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-white/10', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn('h-full transition-all duration-500 ease-out rounded-full', indicatorClassName ?? 'bg-indigo-500 [box-shadow:0_0_12px_rgba(99,102,241,0.6)]')}
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  ),
)
Progress.displayName = 'Progress'

export { Progress }
