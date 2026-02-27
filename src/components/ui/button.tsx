import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-destructive dark:text-destructive-foreground",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground dark:border-border dark:hover:bg-accent",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:bg-secondary dark:text-secondary-foreground",
        amber: "bg-amber-600 text-[#23272f] border border-amber-600 hover:bg-amber-600/95 focus-visible:ring-amber-600",
        update: "border border-amber-600 text-amber-600 bg-background hover:bg-amber-50 hover:border-amber-700",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent",
        link: "text-primary underline-offset-4 hover:underline dark:text-primary",
        danger: "border border-red-500 text-red-600 hover:bg-red-50 hover:border-red-600 bg-background",
        success: "border border-green-500 text-green-600 hover:bg-green-50 hover:border-green-600 bg-background",
        approve: "bg-green-600 text-white hover:bg-green-700",
        reject: "bg-red-600 text-white hover:bg-red-700",
        deleteicon: "border border-red-500 text-red-500 bg-background hover:bg-red-50 hover:border-red-600",
        editicon: "border border-amber-600 text-amber-600 bg-background hover:bg-amber-50 hover:border-amber-700",
        approveicon: "border border-green-600 text-green-600 bg-background hover:bg-green-50 hover:border-green-700",
        rejecticon: "border border-red-600 text-red-600 bg-background hover:bg-red-50 hover:border-red-700",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
