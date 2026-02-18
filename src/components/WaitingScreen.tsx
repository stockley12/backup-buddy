import { Loader2 } from "lucide-react";

interface WaitingScreenProps {
  amount?: string;
}

const WaitingScreen = ({ amount }: WaitingScreenProps) => {
  return (
    <div className="animate-stripe-slide">
      <div className="flex flex-col items-center text-center py-12">
        <div className="relative mb-6">
          <div className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Authorizing your card</h2>
        {amount && (
          <p className="text-2xl font-bold text-foreground mb-2">{amount}</p>
        )}
        <p className="text-sm text-muted-foreground max-w-xs">
          We're securely connecting to your bank to authorize this transaction. Please do not close or refresh this page.
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground/60 mt-6 animate-pulse-soft">
          <Loader2 className="h-3 w-3 animate-spin" />
          Contacting your bank...
        </div>
      </div>
    </div>
  );
};

export default WaitingScreen;
