import { Shield, Loader2 } from "lucide-react";

const WaitingScreen = () => {
  return (
    <div className="w-full max-w-md animate-fade-up">
      <div className="glass-card rounded-2xl overflow-hidden px-8 py-16">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-10 w-10 text-primary" />
            </div>
            <div className="absolute -inset-2 rounded-full border-2 border-primary/20 animate-spin-slow" 
                 style={{ borderTopColor: 'hsl(var(--primary))' }} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Verifying your payment</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Please wait while we verify your payment details. This may take a moment.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse-soft">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Processing securely...
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitingScreen;
