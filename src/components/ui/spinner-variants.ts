import { cva, type VariantProps } from "class-variance-authority";

export const spinnerVariants = cva(
  "flex flex-col items-center justify-center gap-3",
  {
    variants: {
      variant: {
        default: "text-primary",
        amber: "text-amber-600",
      },
      size: {
        sm: "",
        md: "",
        lg: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export type SpinnerVariantProps = VariantProps<typeof spinnerVariants>;
