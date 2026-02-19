import { CheckCircle2, Mail, Copy } from "lucide-react";
import { useState } from "react";

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
      <div className="flex flex-col items-center text-center py-12">
        <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center mb-5 animate-scale-in">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>

        <h2 className="text-lg font-semibold text-foreground mb-1">Payment successful</h2>
        <p className="text-3xl font-bold text-foreground mt-2 mb-3">{amount}</p>

        {email && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
            <Mail className="h-3.5 w-3.5" />
            <span>Receipt sent to <span className="font-medium text-foreground">{email}</span></span>
          </div>
        )}

        <div className="mt-8 w-full space-y-0">
          <div className="flex items-center justify-between py-2.5 border-b border-border text-sm">
            <span className="text-muted-foreground">Status</span>
            <span className="text-success font-medium flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-success" />
              Paid
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5 border-b border-border text-sm">
            <span className="text-muted-foreground">Amount</span>
            <span className="text-foreground font-medium">{amount}</span>
          </div>
          {cardLast4 && (
            <div className="flex items-center justify-between py-2.5 border-b border-border text-sm">
              <span className="text-muted-foreground">Payment method</span>
              <span className="text-foreground font-medium">
                {cardBrand ? `${cardBrand.charAt(0).toUpperCase() + cardBrand.slice(1)}` : "Card"} •••• {cardLast4}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between py-2.5 border-b border-border text-sm">
            <span className="text-muted-foreground">Receipt</span>
            <span className="text-foreground font-medium font-mono text-xs">{receiptNumber}</span>
          </div>
          <div className="flex items-center justify-between py-2.5 border-b border-border text-sm">
            <span className="text-muted-foreground">Date</span>
            <span className="text-foreground font-medium">
              {now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5 text-sm">
            <span className="text-muted-foreground">Transaction ID</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-foreground font-mono text-xs hover:text-primary transition-colors"
            >
              {transactionId.slice(0, 18)}…
              <Copy className="h-3 w-3 text-muted-foreground" />
              {copied && <span className="text-[10px] text-success ml-1">Copied</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
