import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"


import { cn } from "@/lib/utils"
import { switchVariants } from "./switch-variants"
import type { SwitchVariantProps } from "./switch-variants"

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>, SwitchVariantProps {}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, variant, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(switchVariants({ variant, className }))}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "switch-thumb pointer-events-none block h-5 w-5 rounded-full bg-white dark:bg-zinc-200 shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
