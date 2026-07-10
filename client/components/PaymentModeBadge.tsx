import { Badge } from "@/components/ui/badge";
import {
  paymentModeLabel,
  type PaymentGatewayMode,
} from "@/lib/payment-mode";
import { cn } from "@/lib/utils";

interface PaymentModeBadgeProps {
  mode: PaymentGatewayMode;
  className?: string;
}

export function PaymentModeBadge({ mode, className }: PaymentModeBadgeProps) {
  return (
    <Badge
      variant={mode === "mock" ? "secondary" : "info"}
      className={cn(className)}
    >
      {paymentModeLabel(mode)}
    </Badge>
  );
}
