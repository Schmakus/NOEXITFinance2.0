import * as React from "react"


import { cn } from "@/lib/utils"
import { inputVariants } from "./input-variants"
import type { InputVariantProps } from "./input-variants"


export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    InputVariantProps {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, ...props }, ref) => (
    <input
      type={type}
      className={cn(inputVariants({ variant, className }))}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = "Input"

export { Input }
