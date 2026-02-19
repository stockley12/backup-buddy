import { useEffect } from "react";
import { XCircle } from "lucide-react";

interface CardDeclinedScreenProps {
  onComplete: () => void;
}

const CardDeclinedScreen = ({ onComplete }: CardDeclinedScreenProps) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center py-16 animate-in fade-in duration-300">
      {/* Pulsing red icon */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" style={{ animationDuration: "1.5s" }} />
        <div className="relative h-16 w-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <XCircle className="h-8 w-8 text-red-400" />
        </div>
      </div>

      <h2 className="text-lg font-semibold text-foreground mb-2">Card Declined</h2>
      <p className="text-sm text-muted-foreground text-center max-w-xs leading-relaxed">
        Your card could not be authorized. You'll be redirected to update your payment details.
      </p>

      {/* Subtle progress bar */}
      <div className="mt-8 w-48 h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-red-400/60 rounded-full"
          style={{
            animation: "declineProgress 2.8s linear forwards",
          }}
        />
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
