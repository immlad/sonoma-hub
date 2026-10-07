import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import wallpaper from "@/assets/wallpaper.jpg";

export function LoginScreen() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "up") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: name.trim() }, emailRedirectTo: window.location.origin },
      });
      if (error) setMsg(error.message);
      else if (!data.session) setMsg("Check your email to confirm your account.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
    }
    setBusy(false);
  }

  const field =
    "w-64 rounded-full glass border border-border px-4 py-2 text-sm text-glass-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="fixed inset-0 flex flex-col items-center text-glass-foreground">
      <img src={wallpaper} alt="" className="absolute inset-0 h-full w-full object-cover scale-105 blur-sm" />
      <div className="relative mt-[8vh] text-center animate-fade-up">
        <div className="text-xl font-medium opacity-90">
          {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <div className="text-[7rem] font-semibold leading-none tracking-tight drop-shadow-lg">
          {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M/i, "")}
        </div>
      </div>
      <form onSubmit={submit} className="relative mt-auto mb-[12vh] flex flex-col items-center gap-3 animate-fade-up">
        <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-full glass border border-border text-4xl">
          {name ? name.charAt(0).toUpperCase() : "👤"}
        </div>
        {mode === "up" && (
          <input className={field} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        )}
        <input className={field} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={field} type="password" placeholder="Password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button disabled={busy} className="w-64 rounded-full bg-primary py-2 text-sm font-medium text-primary-foreground transition hover:brightness-110 disabled:opacity-50">
          {busy ? "…" : mode === "in" ? "Log In" : "Create Account"}
        </button>
        {msg && <p className="max-w-64 text-center text-xs opacity-90">{msg}</p>}
        <button type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }} className="text-xs opacity-80 hover:opacity-100">
          {mode === "in" ? "New here? Sign up" : "Have an account? Log in"}
        </button>
      </form>
    </div>
  );
}
