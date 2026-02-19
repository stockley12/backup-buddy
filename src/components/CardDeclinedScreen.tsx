import { useEffect } from "react";
import { XCircle, Lock, ShieldCheck, ArrowLeft } from "lucide-react";
import StripeWordmark from "./StripeWordmark";

interface CardDeclinedScreenProps {
  onComplete: () => void;
}

const CardDeclinedScreen = ({ onComplete }: CardDeclinedScreenProps) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="animate-stripe-slide">
      <div className="flex flex-col items-center text-center py-8">
        {/* Pulsing error icon */}
        <div className="relative mb-6">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center animate-scale-in border border-destructive/15">
            <XCircle className="h-9 w-9 text-destructive" strokeWidth={1.5} />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-destructive/15 animate-ping" style={{ animationDuration: "1.5s" }} />
        </div>

        <h2 className="text-xl font-display font-semibold text-foreground mb-2">Card declined</h2>
        <p className="text-sm text-muted-foreground max-w-[280px] leading-relaxed">
          Your card could not be authorized. You'll be redirected to update your payment details.
        </p>

        {/* Redirect progress */}
        <div className="w-full mt-8 max-w-[260px]">
          <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground mb-3">
            <ArrowLeft className="h-3 w-3" />
            <span>Redirecting to payment form…</span>
          </div>
          <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-destructive/50" style={{ animation: "declineProgress 2.8s ease-out forwards" }} />
          </div>
        </div>

        {/* Stripe trust footer */}
        <div className="flex flex-col items-center gap-2 pt-8">
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

      <style>{`
        @keyframes declineProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default CardDeclinedScreen;
