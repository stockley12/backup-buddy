import { XCircle, RefreshCw, Lock, ShieldCheck, AlertTriangle } from "lucide-react";
import StripeWordmark from "./StripeWordmark";

interface PaymentRejectedProps {
  onRetry: () => void;
}

const PaymentRejected = ({ onRetry }: PaymentRejectedProps) => {
  return (
    <div className="animate-stripe-slide">
      <div className="flex flex-col items-center text-center py-8">
        {/* Error icon */}
        <div className="relative mb-6">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center animate-scale-in">
            <XCircle className="h-9 w-9 text-destructive" strokeWidth={1.5} />
          </div>
        </div>

        <h2 className="text-xl font-display font-semibold text-foreground mb-2">Payment declined</h2>
        <p className="text-sm text-muted-foreground max-w-[300px] leading-relaxed">
          Your payment could not be processed. This may be due to insufficient funds, incorrect card details, or a temporary issue with your bank.
        </p>

        {/* Error detail card */}
        <div className="w-full mt-6 rounded-xl border border-destructive/15 bg-destructive/5 overflow-hidden"
          style={{ boxShadow: "0 1px 3px 0 hsl(var(--stripe-shadow) / 0.04)" }}>
          <div className="flex items-start gap-3 px-5 py-4">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-sm font-medium text-destructive">Transaction failed</p>
              <p className="text-xs text-destructive/70 mt-1 leading-relaxed">
                Your card issuer declined this transaction. Please verify your details or contact your bank for more information.
              </p>
            </div>
          </div>
        </div>

        {/* Retry button */}
        <button onClick={onRetry} className="stripe-button flex items-center justify-center gap-2.5 mt-6">
          <RefreshCw className="h-4 w-4 opacity-80" />
          Try again
        </button>

        {/* Stripe trust footer */}
        <div className="flex flex-col items-center gap-2 pt-6">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/60" />
            <span>Your card details are safe</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-muted-foreground/35" />
            <p className="text-[11px] text-muted-foreground/45 flex items-center gap-1">
              Powered by <StripeWordmark className="h-3.5 text-muted-foreground/55" />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentRejected;
