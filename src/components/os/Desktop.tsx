import { useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import wallpaper from "@/assets/wallpaper.jpg";
import { isAdmin, type HubApp } from "@/lib/hub";
import { AdminApp, BrowserApp, ChatApp, LinkPicker, SettingsApp } from "./apps";

type Launchable = { key: string; name: string; icon: string; color: string; render: () => ReactNode };
type Win = { id: string; key: string; x: number; y: number; w: number; h: number; z: number; min: boolean; max: boolean; closing: boolean };

let zTop = 10;

function Window({ win, app, onFocus, onClose, onMin, onMax, onMove }: {
  win: Win; app: Launchable; onFocus: () => void; onClose: () => void; onMin: () => void; onMax: () => void;
  onMove: (x: number, y: number) => void;
}) {
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const style = win.max
    ? { left: 0, top: 28, width: "100vw", height: "calc(100vh - 28px - 84px)", zIndex: win.z }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z };
  return (
    <div
      onPointerDown={onFocus}
      style={style}
      className={`absolute flex flex-col overflow-hidden rounded-xl glass-strong shadow-window transition-[width,height,left,top] duration-300 ${win.closing || win.min ? "animate-genie-out pointer-events-none" : "animate-genie-in"}`}
    >
      <div
        className="flex h-9 shrink-0 cursor-default select-none items-center px-3"
        onDoubleClick={onMax}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          drag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => drag.current && !win.max && onMove(e.clientX - drag.current.dx, Math.max(28, e.clientY - drag.current.dy))}
        onPointerUp={() => (drag.current = null)}
      >
        <div className="group flex gap-2">
          {[["bg-traffic-red", onClose, "×"], ["bg-traffic-yellow", onMin, "–"], ["bg-traffic-green", onMax, "+"]].map(([c, fn, s], i) => (
            <button key={i} onClick={fn as () => void} className={`flex h-3 w-3 items-center justify-center rounded-full text-[9px] leading-none text-background ${c}`}>
              <span className="opacity-0 group-hover:opacity-70">{s as string}</span>
            </button>
          ))}
        </div>
        <div className="flex-1 text-center text-xs font-medium text-muted-foreground">{app.name}</div>
        <div className="w-12" />
      </div>
      <div className="min-h-0 flex-1">{app.render()}</div>
    </div>
  );
}

function Dock({ items, running, onOpen }: { items: Launchable[]; running: Set<string>; onOpen: (k: string) => void }) {
  const [mx, setMx] = useState<number | null>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [bounce, setBounce] = useState<string | null>(null);
  return (
    <div className="fixed bottom-2 left-1/2 z-[9999] -translate-x-1/2">
      <div
        onMouseMove={(e) => setMx(e.clientX)}
        onMouseLeave={() => setMx(null)}
        className="flex items-end gap-1.5 rounded-2xl glass border border-border px-2 pb-1.5 pt-1.5"
      >
        {items.map((it, i) => {
          let scale = 1;
          const el = refs.current[i];
          if (mx !== null && el) {
            const r = el.getBoundingClientRect();
            const d = Math.abs(mx - (r.left + r.width / 2));
            scale = 1 + Math.max(0, 1 - d / 140) * 0.7;
          }
          return (
            <button
              key={it.key}
              ref={(r) => { refs.current[i] = r; }}
              onClick={() => { setBounce(it.key); setTimeout(() => setBounce(null), 900); onOpen(it.key); }}
              className="group relative flex flex-col items-center"
              style={{ width: 52 * scale, transition: mx === null ? "width .25s" : "none" }}
            >
              <span className="pointer-events-none absolute -top-9 whitespace-nowrap rounded-md glass-strong px-2 py-0.5 text-xs opacity-0 group-hover:opacity-100">{it.name}</span>
              <span
                className={`flex aspect-square w-full items-center justify-center rounded-[22%] shadow-lg ${bounce === it.key ? "animate-dock-bounce" : ""}`}
                style={{ background: `linear-gradient(160deg, ${it.color}, color-mix(in oklab, ${it.color} 55%, black))`, fontSize: 28 * scale }}
              >
                {it.icon}
              </span>
              <span className={`mt-0.5 h-1 w-1 rounded-full bg-foreground ${running.has(it.key) ? "opacity-80" : "opacity-0"}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Desktop({ user }: { user: User }) {
  const [hubApps, setHubApps] = useState<HubApp[]>([]);
  const [wins, setWins] = useState<Win[]>([]);
  const [launchpad, setLaunchpad] = useState(false);
  const [now, setNow] = useState(new Date());
  const admin = isAdmin(user);
  const name = String(user.user_metadata?.['name'] ?? user.email ?? "User");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000);
    const load = () => supabase.from("hub_apps").select("*").order("created_at").then(({ data }) => setHubApps((data as HubApp[]) ?? []));
    load();
    const ch = supabase.channel("hub_apps").on("postgres_changes", { event: "*", schema: "public", table: "hub_apps" }, load).subscribe();
    return () => { clearInterval(t); supabase.removeChannel(ch); };
  }, []);

  const builtins: Launchable[] = [
    { key: "launchpad", name: "Launchpad", icon: "🚀", color: "oklch(0.45 0.05 270)", render: () => null },
    { key: "browser", name: "Browser", icon: "🧭", color: "oklch(0.6 0.17 235)", render: () => <BrowserApp /> },
    { key: "chat", name: "Chat", icon: "💬", color: "oklch(0.68 0.18 150)", render: () => <ChatApp /> },
    { key: "settings", name: "Settings", icon: "⚙️", color: "oklch(0.55 0.01 270)", render: () => <SettingsApp name={name} email={user.email ?? ""} admin={admin} onSignOut={() => supabase.auth.signOut()} /> },
    ...(admin ? [{ key: "admin", name: "Admin", icon: "🛠️", color: "oklch(0.6 0.2 25)", render: () => <AdminApp apps={hubApps} /> }] : []),
  ];
  const dynamic: Launchable[] = hubApps.map((a) => ({ key: a.id, name: a.name, icon: a.icon, color: a.color, render: () => <LinkPicker app={a} /> }));
  const all = [...builtins, ...dynamic];
  const byKey = new Map(all.map((a) => [a.key, a]));

  function open(key: string) {
    if (key === "launchpad") return setLaunchpad((v) => !v);
    setLaunchpad(false);
    setWins((ws) => {
      const ex = ws.find((w) => w.key === key && !w.closing);
      if (ex) return ws.map((w) => (w === ex ? { ...w, min: false, z: ++zTop } : w));
      const n = ws.length;
      const w = Math.min(1000, window.innerWidth - 80), h = Math.min(650, window.innerHeight - 160);
      return [...ws, { id: crypto.randomUUID(), key, x: 60 + n * 30, y: 50 + n * 30, w, h, z: ++zTop, min: false, max: false, closing: false }];
    });
  }
  const upd = (id: string, p: Partial<Win>) => setWins((ws) => ws.map((w) => (w.id === id ? { ...w, ...p } : w)));
  const close = (id: string) => { upd(id, { closing: true }); setTimeout(() => setWins((ws) => ws.filter((w) => w.id !== id)), 340); };

  const focused = wins.filter((w) => !w.min).sort((a, b) => b.z - a.z)[0];
  const proxies = dynamic.filter((d) => hubApps.find((h) => h.id === d.key)?.kind === "proxy");
  const dockItems = [...builtins, ...proxies.slice(0, 6)];

  return (
    <div className="fixed inset-0 overflow-hidden text-glass-foreground">
      <img src={wallpaper} alt="" className="absolute inset-0 h-full w-full object-cover" />
      {/* Menu bar */}
      <div className="fixed inset-x-0 top-0 z-[9998] flex h-7 items-center gap-5 glass px-4 text-[13px]">
        <span className="text-base"></span>
        <span className="font-semibold">{focused ? byKey.get(focused.key)?.name : "Finder"}</span>
        <span className="opacity-80">File</span><span className="opacity-80">Edit</span><span className="opacity-80">View</span><span className="opacity-80">Window</span>
        <span className="ml-auto opacity-90">{name}</span>
        <span>{now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}&nbsp; {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
      </div>

      {/* Sonoma desktop widgets */}
      <div className="absolute left-6 top-12 space-y-3 animate-fade-up">
        <div className="w-40 rounded-2xl glass border border-border p-4">
          <div className="text-xs uppercase opacity-70">{now.toLocaleDateString(undefined, { weekday: "long" })}</div>
          <div className="text-5xl font-light">{now.getDate()}</div>
        </div>
        <div className="w-40 rounded-2xl glass border border-border p-4 text-sm">
          <div className="opacity-70">Apps live</div>
          <div className="text-3xl font-semibold">{hubApps.length}</div>
        </div>
      </div>

      {wins.map((w) => {
        const app = byKey.get(w.key);
        if (!app) return null;
        return (
          <Window key={w.id} win={w} app={app}
            onFocus={() => upd(w.id, { z: ++zTop })}
            onClose={() => close(w.id)}
            onMin={() => upd(w.id, { min: true })}
            onMax={() => upd(w.id, { max: !w.max })}
            onMove={(x, y) => upd(w.id, { x, y })}
          />
        );
      })}

      {launchpad && (
        <div onClick={() => setLaunchpad(false)} className="fixed inset-0 z-[9990] glass animate-fade-up overflow-auto px-[10vw] pb-32 pt-20">
          {(["proxy", "game", "app"] as const).map((k) => {
            const list = k === "app" ? [...builtins.filter((b) => b.key !== "launchpad"), ...dynamic.filter((d) => hubApps.find((h) => h.id === d.key)?.kind === "app")] : dynamic.filter((d) => hubApps.find((h) => h.id === d.key)?.kind === k);
            if (!list.length) return null;
            return (
              <section key={k} className="mb-10">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest opacity-70">{k === "proxy" ? "Proxies" : k === "game" ? "Games" : "Apps"}</h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-6">
                  {list.map((it) => (
                    <button key={it.key} onClick={(e) => { e.stopPropagation(); open(it.key); }} className="flex flex-col items-center gap-2 transition hover:scale-110">
                      <span className="flex h-20 w-20 items-center justify-center rounded-[22%] text-4xl shadow-xl" style={{ background: `linear-gradient(160deg, ${it.color}, color-mix(in oklab, ${it.color} 55%, black))` }}>{it.icon}</span>
                      <span className="text-xs">{it.name}</span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Dock items={dockItems} running={new Set(wins.map((w) => w.key))} onOpen={open} />
    </div>
  );
}
