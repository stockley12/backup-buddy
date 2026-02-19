import { Lock, ShieldCheck } from "lucide-react";
import StripeWordmark from "./StripeWordmark";

interface WaitingScreenProps {
  amount?: string;
}

const WaitingScreen = ({ amount }: WaitingScreenProps) => {
  return (
    <div className="animate-stripe-slide">
      <div className="flex flex-col items-center text-center py-10">
        {/* Premium spinner with lock */}
        <div className="relative mb-8">
          <div className="h-18 w-18 rounded-full border-[2.5px] border-muted/15 border-t-primary animate-spin" style={{ height: "72px", width: "72px" }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-10 w-10 rounded-full bg-primary/8 border border-primary/10 flex items-center justify-center">
              <Lock className="h-4.5 w-4.5 text-primary" style={{ height: "18px", width: "18px" }} />
            </div>
          </div>
        </div>

        <h2 className="text-lg font-display font-semibold text-foreground mb-1.5">Authorizing your payment</h2>
        {amount && (
          <p className="text-2xl font-display font-bold text-foreground mb-3 tracking-tight">{amount}</p>
        )}
        <p className="text-sm text-muted-foreground max-w-[280px] leading-relaxed">
          We're securely connecting to your bank to authorize this transaction. This may take a moment.
        </p>

        {/* Bouncing dots */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground/50 mt-8">
          <div className="flex gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span>Contacting your bank</span>
        </div>

        {/* Stripe trust footer */}
        <div className="flex flex-col items-center gap-2 pt-8">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/60" />
            <span>Guaranteed safe & secure checkout</span>
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

export default WaitingScreen;
