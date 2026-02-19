import { Lock, ShieldCheck } from "lucide-react";

interface WaitingScreenProps {
  amount?: string;
}

const WaitingScreen = ({ amount }: WaitingScreenProps) => {
  return (
    <div className="animate-stripe-slide">
      <div className="flex flex-col items-center text-center py-12">
        {/* Premium spinner */}
        <div className="relative mb-8">
          <div className="h-16 w-16 rounded-full border-[2.5px] border-muted/15 border-t-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-4 w-4 text-primary" />
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

        <div className="flex items-center gap-2 text-xs text-muted-foreground/40 mt-8">
          <div className="flex gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span>Contacting your bank</span>
        </div>

        <div className="flex items-center gap-1.5 mt-6 text-[11px] text-muted-foreground/35">
          <ShieldCheck className="h-3 w-3" />
          <span>Secured with 256-bit encryption</span>
        </div>
      </div>
    </div>
  );
};

export default WaitingScreen;