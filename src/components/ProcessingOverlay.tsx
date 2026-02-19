import { useState, useEffect } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import StripeWordmark from "./StripeWordmark";

interface ProcessingOverlayProps {
  onComplete: () => void;
}

const ProcessingOverlay = ({ onComplete }: ProcessingOverlayProps) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Initiating secure connection…");
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { label: "Encrypting card details", icon: "🔒" },
    { label: "Connecting to your bank", icon: "🏦" },
    { label: "Verifying transaction", icon: "✓" },
    { label: "Running security checks", icon: "🛡" },
    { label: "Authorizing payment", icon: "⚡" },
  ];

  useEffect(() => {
    const timeline = [
      { at: 600, progress: 12, text: "Encrypting card details…", step: 0 },
      { at: 2000, progress: 30, text: "Connecting to your bank…", step: 1 },
      { at: 3800, progress: 50, text: "Verifying transaction…", step: 2 },
      { at: 5400, progress: 70, text: "Running security checks…", step: 3 },
      { at: 7000, progress: 88, text: "Authorizing payment…", step: 4 },
      { at: 8200, progress: 100, text: "Almost there…", step: 4 },
    ];

    const timers = timeline.map((s) =>
      setTimeout(() => { setProgress(s.progress); setStatusText(s.text); setCurrentStep(s.step); }, s.at)
    );

    const completeTimer = setTimeout(onComplete, 9000);
    return () => { timers.forEach(clearTimeout); clearTimeout(completeTimer); };
  }, [onComplete]);

  return (
    <div className="animate-stripe-slide">
      <div className="flex flex-col items-center text-center py-10">
        {/* Animated circular progress with lock */}
        <div className="relative mb-8">
          <svg className="h-20 w-20 animate-spin-slow" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="hsl(var(--muted) / 0.15)" strokeWidth="3" />
            <circle cx="40" cy="40" r="36" fill="none" stroke="hsl(var(--primary))" strokeWidth="3"
              strokeDasharray={`${progress * 2.26} 226`} strokeLinecap="round"
              className="transition-all duration-700 ease-out" style={{ transform: "rotate(-90deg)", transformOrigin: "center" }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-12 w-12 rounded-full bg-primary/8 border border-primary/10 flex items-center justify-center">
              <Lock className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>

        <h2 className="text-lg font-display font-semibold text-foreground mb-1">{statusText}</h2>
        <p className="text-sm text-muted-foreground mb-8">Please do not close or refresh this page.</p>

        {/* Step indicators */}
        <div className="w-full max-w-[280px] space-y-2.5 mb-6">
          {steps.map((step, i) => (
            <div key={i} className={`flex items-center gap-3 text-xs transition-all duration-300 ${
              i < currentStep ? "text-muted-foreground/60" : i === currentStep ? "text-foreground font-medium" : "text-muted-foreground/30"
            }`}>
              <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] shrink-0 transition-all duration-300 ${
                i < currentStep ? "bg-success/15 text-success" :
                i === currentStep ? "bg-primary/10 text-primary ring-2 ring-primary/15" :
                "bg-muted/40 text-muted-foreground/30"
              }`}>
                {i < currentStep ? "✓" : step.icon}
              </div>
              <span>{step.label}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-[280px] h-1.5 bg-muted/20 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))" }} />
        </div>

        {/* Stripe trust footer */}
        <div className="flex flex-col items-center gap-2 pt-6">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/60" />
            <span>256-bit SSL encrypted connection</span>
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

export default ProcessingOverlay;
