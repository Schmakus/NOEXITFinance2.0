import { cva, type VariantProps } from "class-variance-authority";

export const inputVariants = cva(
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-input",
        amber: "border-amber-600 focus-visible:ring-amber-600 focus-visible:border-amber-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export type InputVariantProps = VariantProps<typeof inputVariants>;
