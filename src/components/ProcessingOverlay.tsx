import { useState, useEffect } from "react";
import { Lock } from "lucide-react";

interface ProcessingOverlayProps {
  onComplete: () => void;
}

const ProcessingOverlay = ({ onComplete }: ProcessingOverlayProps) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Processing payment…");

  useEffect(() => {
    const steps = [
      { at: 800, progress: 15, text: "Encrypting card details…" },
      { at: 2200, progress: 35, text: "Connecting to your bank…" },
      { at: 4000, progress: 55, text: "Verifying transaction…" },
      { at: 5500, progress: 75, text: "Running security checks…" },
      { at: 7000, progress: 90, text: "Authorizing payment…" },
      { at: 8200, progress: 100, text: "Almost there…" },
    ];

    const timers = steps.map((step) =>
      setTimeout(() => {
        setProgress(step.progress);
        setStatusText(step.text);
      }, step.at)
    );

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 9000);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col items-center text-center py-16">
        {/* Stripe-style spinning circle with lock icon */}
        <div className="relative mb-8">
          <div className="h-16 w-16 rounded-full border-[3px] border-muted/30 border-t-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Lock className="h-5 w-5 text-primary" />
          </div>
        </div>

        <h2 className="text-lg font-semibold text-foreground mb-2">{statusText}</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Please do not close or refresh this page.
        </p>

        {/* Progress bar */}
        <div className="w-full max-w-[240px] h-1 bg-muted/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProcessingOverlay;
