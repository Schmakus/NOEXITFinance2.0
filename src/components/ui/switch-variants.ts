import { cva, type VariantProps } from "class-variance-authority";

export const switchVariants = cva(
  "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-input bg-background",
        amber: "border-amber-600 bg-amber-600 data-[state=unchecked]:bg-[#23272f] data-[state=unchecked]:border-[#666] data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export type SwitchVariantProps = VariantProps<typeof switchVariants>;
