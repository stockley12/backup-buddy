import { CheckCircle2 } from "lucide-react";

interface PaymentSuccessProps {
  amount: string;
}

const PaymentSuccess = ({ amount }: PaymentSuccessProps) => {
  return (
    <div className="animate-stripe-slide">
      <div className="flex flex-col items-center text-center py-12">
        <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center mb-5 animate-scale-in">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>

        <h2 className="text-lg font-semibold text-foreground mb-1">Payment successful</h2>
        <p className="text-3xl font-bold text-foreground mt-2 mb-3">{amount}</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Your payment has been processed. A confirmation email will be sent shortly.
        </p>

        <div className="mt-8 w-full space-y-3">
          <div className="flex items-center justify-between py-2.5 border-b border-border text-sm">
            <span className="text-muted-foreground">Status</span>
            <span className="text-success font-medium flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-success" />
              Paid
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5 border-b border-border text-sm">
            <span className="text-muted-foreground">Amount</span>
            <span className="text-foreground font-medium">{amount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
