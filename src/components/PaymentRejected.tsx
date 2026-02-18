import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentRejectedProps {
  onRetry: () => void;
}

const PaymentRejected = ({ onRetry }: PaymentRejectedProps) => {
  return (
    <div className="animate-stripe-slide">
      <div className="flex flex-col items-center text-center py-12">
        <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mb-5 animate-scale-in">
          <XCircle className="h-8 w-8 text-destructive" />
        </div>

        <h2 className="text-lg font-semibold text-foreground mb-1">Payment declined</h2>
        <p className="text-sm text-muted-foreground max-w-xs mt-2">
          Your payment could not be processed. Please check your card details and try again.
        </p>

        <Button onClick={onRetry} className="mt-8 w-full">
          Try again
        </Button>
      </div>
    </div>
  );
};

export default PaymentRejected;
