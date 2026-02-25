import * as React from "react"


import { cn } from "@/lib/utils"
import { inputVariants } from "./input-variants"
import type { InputVariantProps } from "./input-variants"


export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    InputVariantProps {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, ...props }, ref) => (
    <textarea
      className={cn(inputVariants({ variant, className }), "min-h-[80px]")}
      ref={ref}
      {...props}
    />
  )
)
Textarea.displayName = "Textarea"

export { Textarea }
