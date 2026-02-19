import { CheckCircle2, Mail, Copy, Lock, ShieldCheck, Download } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import StripeWordmark from "./StripeWordmark";

interface PaymentSuccessProps {
  amount: string;
  email?: string;
  cardLast4?: string;
  cardBrand?: string;
  companyName?: string;
  invoiceNumber?: string;
  description?: string;
  clientName?: string;
  clientEmail?: string;
  baseAmount?: string;
  transactionFee?: string;
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

const PaymentSuccess = ({
  amount, email, cardLast4, cardBrand,
  companyName = "Merchant", invoiceNumber, description,
  clientName, clientEmail, baseAmount, transactionFee,
}: PaymentSuccessProps) => {
  const [transactionId] = useState(generateTransactionId);
  const [receiptNumber] = useState(generateReceiptNumber);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const handleCopy = () => {
    navigator.clipboard.writeText(transactionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const w = 800;
      const h = 1100;
      const dpr = 2;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);

      // Background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);

      // Top accent bar
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "#635bff");
      grad.addColorStop(1, "#4f46e5");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, 6);

      let y = 50;

      // Company branding
      ctx.fillStyle = "#635bff";
      ctx.beginPath();
      ctx.roundRect(40, y, 44, 44, 10);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(companyName.charAt(0).toUpperCase(), 62, y + 29);
      ctx.textAlign = "left";

      ctx.fillStyle = "#1a1a2e";
      ctx.font = "600 20px 'Inter', sans-serif";
      ctx.fillText(companyName, 96, y + 28);

      y += 70;

      // Receipt title
      ctx.fillStyle = "#6b7280";
      ctx.font = "500 13px 'Inter', sans-serif";
      ctx.fillText("PAYMENT RECEIPT", 40, y);
      y += 8;

      // Divider
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(w - 40, y);
      ctx.stroke();
      y += 30;

      // Amount
      ctx.fillStyle = "#111827";
      ctx.font = "bold 42px 'Inter', sans-serif";
      ctx.fillText(amount, 40, y);
      y += 20;

      // Status badge
      ctx.fillStyle = "#ecfdf5";
      ctx.beginPath();
      ctx.roundRect(40, y, 60, 24, 12);
      ctx.fill();
      ctx.fillStyle = "#059669";
      ctx.font = "600 11px 'Inter', sans-serif";
      ctx.fillText("● Paid", 52, y + 16);
      y += 50;

      // Info sections
      const drawSection = (label: string, value: string) => {
        ctx.fillStyle = "#9ca3af";
        ctx.font = "500 11px 'Inter', sans-serif";
        ctx.fillText(label.toUpperCase(), 40, y);
        y += 18;
        ctx.fillStyle = "#374151";
        ctx.font = "500 14px 'Inter', sans-serif";
        ctx.fillText(value, 40, y);
        y += 30;
      };

      if (description) drawSection("Description", description);
      if (clientName) {
        drawSection("Bill to", clientName + (clientEmail ? ` · ${clientEmail}` : ""));
      }

      // Divider
      ctx.strokeStyle = "#e5e7eb";
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(w - 40, y);
      ctx.stroke();
      y += 25;

      // Line items
      const drawRow = (label: string, value: string, bold = false) => {
        ctx.fillStyle = bold ? "#111827" : "#6b7280";
        ctx.font = `${bold ? "600" : "400"} 14px 'Inter', sans-serif`;
        ctx.fillText(label, 40, y);
        ctx.textAlign = "right";
        ctx.fillStyle = bold ? "#111827" : "#374151";
        ctx.font = `${bold ? "700" : "500"} 14px 'Inter', sans-serif`;
        ctx.fillText(value, w - 40, y);
        ctx.textAlign = "left";
        y += 32;
      };

      if (baseAmount) drawRow("Amount", baseAmount);
      if (transactionFee) drawRow("Transaction fee (0.1%)", transactionFee);

      // Total separator
      ctx.strokeStyle = "#e5e7eb";
      ctx.beginPath();
      ctx.moveTo(40, y - 10);
      ctx.lineTo(w - 40, y - 10);
      ctx.stroke();
      y += 8;
      drawRow("Total paid", amount, true);
      y += 10;

      // Payment details
      ctx.strokeStyle = "#e5e7eb";
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(w - 40, y);
      ctx.stroke();
      y += 25;

      ctx.fillStyle = "#9ca3af";
      ctx.font = "500 11px 'Inter', sans-serif";
      ctx.fillText("PAYMENT DETAILS", 40, y);
      y += 25;

      const drawDetail = (label: string, value: string) => {
        ctx.fillStyle = "#9ca3af";
        ctx.font = "400 13px 'Inter', sans-serif";
        ctx.fillText(label, 40, y);
        ctx.textAlign = "right";
        ctx.fillStyle = "#374151";
        ctx.font = "500 13px 'Inter', sans-serif";
        ctx.fillText(value, w - 40, y);
        ctx.textAlign = "left";
        y += 28;
      };

      drawDetail("Date", `${dateStr} · ${timeStr}`);
      if (cardLast4) drawDetail("Card", `${(cardBrand || "card").toUpperCase()} •••• ${cardLast4}`);
      drawDetail("Receipt #", receiptNumber);
      if (invoiceNumber) drawDetail("Invoice", invoiceNumber);
      drawDetail("Transaction ID", transactionId.slice(0, 20) + "…");
      if (email) drawDetail("Email", email);

      // Footer
      y = h - 60;
      ctx.fillStyle = "#d1d5db";
      ctx.font = "400 11px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Payment processed securely · Powered by Stripe", w / 2, y);
      ctx.textAlign = "left";

      // Download
      const link = document.createElement("a");
      link.download = `receipt-${receiptNumber}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Download failed", e);
    } finally {
      setDownloading(false);
    }
  }, [amount, companyName, description, clientName, clientEmail, baseAmount, transactionFee, cardLast4, cardBrand, receiptNumber, transactionId, email, invoiceNumber, dateStr, timeStr]);

  return (
    <div className="animate-stripe-slide" ref={receiptRef}>
      <div className="flex flex-col items-center text-center">
        {/* Success icon */}
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

          {description && (
            <div className="flex items-center justify-between px-5 py-3.5 text-sm">
              <span className="text-muted-foreground">Description</span>
              <span className="text-foreground font-medium text-right max-w-[200px] truncate">{description}</span>
            </div>
          )}

          {clientName && (
            <div className="flex items-center justify-between px-5 py-3.5 text-sm">
              <span className="text-muted-foreground">Bill to</span>
              <span className="text-foreground font-medium">{clientName}</span>
            </div>
          )}

          {baseAmount && (
            <div className="flex items-center justify-between px-5 py-3.5 text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="text-foreground font-medium">{baseAmount}</span>
            </div>
          )}

          {transactionFee && (
            <div className="flex items-center justify-between px-5 py-3.5 text-sm">
              <span className="text-muted-foreground">Transaction fee (0.1%)</span>
              <span className="text-foreground font-medium">{transactionFee}</span>
            </div>
          )}

          <div className="flex items-center justify-between px-5 py-3.5 text-sm bg-muted/20">
            <span className="text-foreground font-semibold">Total paid</span>
            <span className="text-foreground font-bold">{amount}</span>
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

          {invoiceNumber && (
            <div className="flex items-center justify-between px-5 py-3.5 text-sm">
              <span className="text-muted-foreground">Invoice</span>
              <span className="text-foreground font-mono text-xs font-medium">{invoiceNumber}</span>
            </div>
          )}

          <div className="flex items-center justify-between px-5 py-3.5 text-sm">
            <span className="text-muted-foreground">Date</span>
            <span className="text-foreground font-medium">{dateStr} · {timeStr}</span>
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
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all duration-200 disabled:opacity-50"
        style={{ boxShadow: "0 1px 2px 0 hsl(var(--stripe-shadow) / 0.03)" }}
      >
        <Download className="h-4 w-4" />
        {downloading ? "Generating…" : "Download receipt"}
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
