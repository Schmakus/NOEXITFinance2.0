import { cva, type VariantProps } from 'class-variance-authority'

export const multiSelectVariants = cva(
  'flex min-h-10 w-full flex-wrap items-center gap-1 rounded-md border bg-background px-2 py-1 text-foreground transition-colors',
  {
    variants: {
      variant: {
        default: 'border-input focus-within:border-ring focus-within:ring-2 focus-within:ring-ring',
        amber: 'border-amber-600 focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export const multiSelectOptionVariants = cva(
  'cursor-pointer bg-[#18181b] px-3 py-2 text-sm text-foreground transition-colors',
  {
    variants: {
      variant: {
        default: 'hover:bg-muted',
        amber: 'hover:bg-amber-100 hover:text-amber-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export type MultiSelectVariantProps = VariantProps<typeof multiSelectVariants>
