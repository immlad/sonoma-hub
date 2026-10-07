import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { HubApp } from "@/lib/hub";
import { CHAT_URL } from "@/lib/hub";

function Frame({ src, srcDoc }: { src?: string; srcDoc?: string }) {
  return (
    <iframe
      src={src}
      srcDoc={srcDoc}
      className="h-full w-full border-0 bg-background"
      allow="fullscreen; autoplay; clipboard-read; clipboard-write; gamepad"
      allowFullScreen
      title="app"
    />
  );
}

export function BrowserApp({ initial = "https://www.wikipedia.org/" }: { initial?: string }) {
  const [input, setInput] = useState(initial);
  const [url, setUrl] = useState(initial);
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    let u = input.trim();
    if (!/^https?:\/\//.test(u)) u = u.includes(".") ? `https://${u}` : `https://duckduckgo.com/?q=${encodeURIComponent(u)}`;
    setUrl(u);
    setInput(u);
  };
  return (
    <div className="flex h-full flex-col">
      <form onSubmit={go} className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button type="button" onClick={() => setUrl(url + "")} className="text-muted-foreground hover:text-foreground">↻</button>
        <input value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 rounded-md bg-muted px-3 py-1 text-center text-xs outline-none focus:ring-2 focus:ring-ring" />
      </form>
      <div className="flex-1"><Frame key={url} src={url} /></div>
    </div>
  );
}

export function ChatApp() {
  return <Frame src={CHAT_URL} />;
}

export function LinkPicker({ app }: { app: HubApp }) {
  const [active, setActive] = useState(0);
  const [launched, setLaunched] = useState<string | null>(null);
  if (app.html && app.urls.length === 0) return <Frame srcDoc={app.html} />;
  if (launched) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-xs">
          <button onClick={() => setLaunched(null)} className="rounded bg-muted px-2 py-0.5 hover:bg-accent">← Links</button>
          <span className="truncate text-muted-foreground">{launched}</span>
        </div>
        <div className="flex-1"><Frame src={launched} /></div>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col p-6">
      <h2 className="text-2xl font-semibold">{app.icon} {app.name}</h2>
      <p className="mb-5 text-sm text-muted-foreground">Choose a link to launch</p>
      <div className="flex min-h-0 flex-1 gap-3">
        {app.urls.map((u, i) => {
          const open = i === active;
          return (
            <button
              key={u + i}
              onMouseEnter={() => setActive(i)}
              onClick={() => (open ? setLaunched(u) : setActive(i))}
              style={{ background: `linear-gradient(160deg, ${app.color}, oklch(0.18 0.03 270))` }}
              className={`relative overflow-hidden rounded-2xl border border-border text-left transition-all duration-500 ease-[cubic-bezier(.2,.8,.2,1)] ${open ? "flex-[5]" : "flex-[1]"}`}
            >
              <span className={`absolute left-4 top-4 text-4xl transition-transform duration-500 ${open ? "scale-125" : ""}`}>{app.icon}</span>
              <span className={`absolute bottom-4 left-4 right-4 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}>
                <span className="block text-xs uppercase tracking-widest opacity-70">Link {i + 1}</span>
                <span className="block truncate text-lg font-semibold">{new URL(u).hostname}</span>
                <span className="mt-2 inline-block rounded-full bg-primary px-4 py-1 text-sm text-primary-foreground">Launch →</span>
              </span>
              {!open && <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm font-semibold opacity-80">{i + 1}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SettingsApp({ name, email, admin, onSignOut }: { name: string; email: string; admin: boolean; onSignOut: () => void }) {
  return (
    <div className="flex h-full">
      <aside className="w-48 border-r border-border p-3 text-sm">
        <div className="rounded-md bg-primary px-2 py-1 text-primary-foreground">General</div>
      </aside>
      <div className="flex-1 space-y-4 p-6">
        <div className="flex items-center gap-4 rounded-xl bg-muted p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground">{name[0]?.toUpperCase() ?? "?"}</div>
          <div>
            <div className="font-semibold">{name} {admin && <span className="ml-1 rounded bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">ADMIN</span>}</div>
            <div className="text-sm text-muted-foreground">{email}</div>
          </div>
        </div>
        <div className="rounded-xl bg-muted p-4 text-sm">
          <div className="font-medium">About</div>
          <div className="text-muted-foreground">Sonoma Hub · Version 14.0</div>
        </div>
        <button onClick={onSignOut} className="rounded-md bg-destructive px-4 py-1.5 text-sm text-destructive-foreground">Log Out</button>
      </div>
    </div>
  );
}

export function AdminApp({ apps }: { apps: HubApp[] }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🌐");
  const [kind, setKind] = useState("proxy");
  const [mode, setMode] = useState<"link" | "html">("link");
  const [urls, setUrls] = useState("");
  const [html, setHtml] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const hue = Math.floor(Math.random() * 360);
    const list = mode === "link" ? urls.split(/\s|,/).map((s) => s.trim()).filter(Boolean) : [];
    if (mode === "link" && list.some((u) => { try { new URL(u); return false; } catch { return true; } })) {
      setMsg("Every link must start with https://");
      return;
    }
    const { error } = await supabase.from("hub_apps").insert({
      name, icon, kind, color: `oklch(0.6 0.18 ${hue})`, urls: list, html: mode === "html" ? html : null,
    });
    setMsg(error ? error.message : `Added ${name}!`);
    if (!error) { setName(""); setUrls(""); setHtml(""); }
  }
  const del = async (id: string) => { await supabase.from("hub_apps").delete().eq("id", id); };
  const input = "w-full rounded-md bg-muted px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="grid h-full grid-cols-2 gap-0 overflow-hidden">
      <form onSubmit={add} className="space-y-3 overflow-auto border-r border-border p-5">
        <h2 className="text-lg font-semibold">Add app or proxy</h2>
        <div className="flex gap-2">
          <input className={`${input} w-16 text-center`} value={icon} onChange={(e) => setIcon(e.target.value)} />
          <input className={input} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <select className={input} value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="proxy">Proxy</option><option value="game">Game</option><option value="app">App</option>
        </select>
        <div className="flex rounded-md bg-muted p-0.5 text-sm">
          {(["link", "html"] as const).map((m) => (
            <button type="button" key={m} onClick={() => setMode(m)} className={`flex-1 rounded py-1 ${mode === m ? "bg-accent" : ""}`}>{m === "link" ? "Links" : "HTML code"}</button>
          ))}
        </div>
        {mode === "link" ? (
          <textarea className={`${input} h-28 font-mono text-xs`} placeholder="One link per line" value={urls} onChange={(e) => setUrls(e.target.value)} required />
        ) : (
          <textarea className={`${input} h-48 font-mono text-xs`} placeholder="<html>…</html>" value={html} onChange={(e) => setHtml(e.target.value)} required />
        )}
        <button className="w-full rounded-md bg-primary py-1.5 text-sm text-primary-foreground">Publish to everyone</button>
        {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
      </form>
      <div className="overflow-auto p-5">
        <h2 className="mb-3 text-lg font-semibold">Live apps ({apps.length})</h2>
        <ul className="space-y-1.5">
          {apps.map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm">
              <span>{a.icon}</span><span className="flex-1 truncate">{a.name}</span>
              <span className="text-xs text-muted-foreground">{a.kind}</span>
              <button onClick={() => del(a.id)} className="text-xs text-destructive">Delete</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
