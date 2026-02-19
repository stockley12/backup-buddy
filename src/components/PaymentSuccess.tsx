import { CheckCircle2, Mail, Copy, Lock, ShieldCheck, Download } from "lucide-react";
import { useState } from "react";
import StripeWordmark from "./StripeWordmark";

interface PaymentSuccessProps {
  amount: string;
  email?: string;
  cardLast4?: string;
  cardBrand?: string;
}

const generateTransactionId = () => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const id = Array.from({ length: 24 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `pi_${id}`;
};

const generateReceiptNumber = () => {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RCPT-${datePart}-${rand}`;
};

const CardBrandBadge = ({ brand }: { brand: string }) => {
  if (brand === "visa") {
    return (
      <div className="h-6 w-10 rounded bg-gradient-to-br from-[hsl(228,80%,45%)] to-[hsl(228,80%,35%)] flex items-center justify-center">
        <span className="text-[7px] font-extrabold text-white tracking-wider italic">VISA</span>
      </div>
    );
  }
  if (brand === "mastercard") {
    return (
      <div className="h-6 w-10 rounded bg-gradient-to-br from-[hsl(210,10%,15%)] to-[hsl(210,10%,25%)] flex items-center justify-center">
        <div className="flex -space-x-1">
          <div className="h-2.5 w-2.5 rounded-full bg-[hsl(4,90%,58%)]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[hsl(38,100%,50%)] opacity-80" />
        </div>
      </div>
    );
  }
  if (brand === "amex") {
    return (
      <div className="h-6 w-10 rounded bg-gradient-to-br from-[hsl(200,70%,50%)] to-[hsl(210,70%,40%)] flex items-center justify-center">
        <span className="text-[6px] font-bold text-white tracking-tight">AMEX</span>
      </div>
    );
  }
  return null;
};

const PaymentSuccess = ({ amount, email, cardLast4, cardBrand }: PaymentSuccessProps) => {
  const [transactionId] = useState(generateTransactionId);
  const [receiptNumber] = useState(generateReceiptNumber);
  const [copied, setCopied] = useState(false);
  const now = new Date();

  const handleCopy = () => {
    navigator.clipboard.writeText(transactionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-stripe-slide">
      <div className="flex flex-col items-center text-center">
        {/* Success icon with ring animation */}
        <div className="relative mb-6 mt-4">
          <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center animate-scale-in">
            <CheckCircle2 className="h-9 w-9 text-success" strokeWidth={1.5} />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-success/20 animate-ping" style={{ animationDuration: "2s", animationIterationCount: "2" }} />
        </div>

        <h2 className="text-xl font-display font-semibold text-foreground mb-1">Payment successful</h2>
        <p className="text-3xl font-display font-bold text-foreground mt-2 mb-1 tracking-tight">{amount}</p>

        {email && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
            <Mail className="h-3.5 w-3.5" />
            <span>Receipt sent to <span className="font-medium text-foreground">{email}</span></span>
          </div>
        )}
      </div>

      {/* Receipt card */}
      <div className="mt-8 rounded-xl border border-border bg-card overflow-hidden" style={{ boxShadow: "0 1px 3px 0 hsl(var(--stripe-shadow) / 0.04), 0 1px 2px 0 hsl(var(--stripe-shadow) / 0.02)" }}>
        <div className="px-5 py-3 bg-muted/30 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment receipt</p>
        </div>

        <div className="divide-y divide-border">
          <div className="flex items-center justify-between px-5 py-3.5 text-sm">
            <span className="text-muted-foreground">Status</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success/10 text-success text-xs font-semibold">
              <div className="h-1.5 w-1.5 rounded-full bg-success" />
              Paid
            </span>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5 text-sm">
            <span className="text-muted-foreground">Amount</span>
            <span className="text-foreground font-semibold">{amount}</span>
          </div>
          {cardLast4 && (
            <div className="flex items-center justify-between px-5 py-3.5 text-sm">
              <span className="text-muted-foreground">Payment method</span>
              <div className="flex items-center gap-2">
                {cardBrand && <CardBrandBadge brand={cardBrand} />}
                <span className="text-foreground font-medium">•••• {cardLast4}</span>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between px-5 py-3.5 text-sm">
            <span className="text-muted-foreground">Receipt number</span>
            <span className="text-foreground font-mono text-xs font-medium">{receiptNumber}</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5 text-sm">
            <span className="text-muted-foreground">Date</span>
            <span className="text-foreground font-medium">
              {now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5 text-sm">
            <span className="text-muted-foreground">Transaction ID</span>
            <button onClick={handleCopy} className="flex items-center gap-1.5 text-foreground font-mono text-xs hover:text-primary transition-colors group">
              {transactionId.slice(0, 16)}…
              <Copy className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary transition-colors" />
              {copied && <span className="text-[10px] text-success font-sans font-medium ml-0.5">Copied!</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Download receipt button */}
      <button className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all duration-200"
        style={{ boxShadow: "0 1px 2px 0 hsl(var(--stripe-shadow) / 0.03)" }}>
        <Download className="h-4 w-4" />
        Download receipt
      </button>

      {/* Stripe trust footer */}
      <div className="flex flex-col items-center gap-2 pt-6 pb-2">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/60" />
          <span>Payment processed securely</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-muted-foreground/35" />
          <p className="text-[11px] text-muted-foreground/45 flex items-center gap-1">
            Powered by <StripeWordmark className="h-3.5 text-muted-foreground/55" />
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
