import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-md border px-4 py-3 text-sm flex gap-3 items-start [&_[data-alert-title]]:font-medium",
  {
    variants: {
      variant: {
        default: "bg-card text-foreground border-border",
        destructive:
          "bg-destructive/5 text-destructive border-destructive/30 [&_svg]:text-destructive",
        success:
          "bg-success/5 text-success border-success/30 [&_svg]:text-success",
        warning:
          "bg-warning/10 text-[hsl(35_92%_30%)] border-warning/40 [&_svg]:text-warning",
        info:
          "bg-info/5 text-info border-info/30 [&_svg]:text-info",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const ICONS: Record<NonNullable<VariantProps<typeof alertVariants>["variant"]>, React.ElementType> = {
  default: Info,
  destructive: AlertCircle,
  success: CheckCircle2,
  warning: TriangleAlert,
  info: Info,
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  hideIcon?: boolean;
}

export function Alert({
  className,
  variant = "default",
  title,
  hideIcon,
  children,
  ...props
}: AlertProps) {
  const Icon = ICONS[variant ?? "default"];
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      {!hideIcon ? <Icon className="h-4 w-4 mt-0.5 shrink-0" /> : null}
      <div className="space-y-1 leading-relaxed">
        {title ? <div data-alert-title>{title}</div> : null}
        {children ? <div className="text-sm opacity-90 break-words">{children}</div> : null}
      </div>
    </div>
  );
}
