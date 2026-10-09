import { useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import wallpaper from "@/assets/wallpaper.jpg";
import { isAdmin, type HubApp } from "@/lib/hub";
import {
  AdminApp,
  BrowserApp,
  ChatApp,
  LinkPicker,
  SettingsApp,
} from "./apps";

type Launchable = {
  key: string;
  name: string;
  icon: string;
  color: string;
  render: () => ReactNode;
};

type Win = {
  id: string;
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  min: boolean;
  max: boolean;
  closing: boolean;
};

let zTop = 10;

function Window({
  win,
  app,
  onFocus,
  onClose,
  onMin,
  onMax,
  onMove,
}: {
  win: Win;
  app: Launchable;
  onFocus: () => void;
  onClose: () => void;
  onMin: () => void;
  onMax: () => void;
  onMove: (x: number, y: number) => void;
}) {
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  const style = win.max
    ? {
        left: 0,
        top: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: win.z,
      }
    : {
        left: win.x,
        top: win.y,
        width: win.w,
        height: win.h,
        zIndex: win.z,
      };

  return (
    <div
      onPointerDown={onFocus}
      style={style}
      className={`absolute flex flex-col overflow-hidden ${
        win.max ? "" : "rounded-xl"
      } glass-strong shadow-window ${
        win.closing || win.min
          ? "animate-genie-out pointer-events-none"
          : "animate-genie-in"
      }`}
    >
      <div
        className="flex h-9 shrink-0 cursor-default select-none items-center px-3"
        onDoubleClick={onMax}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          if (win.max) return;

          drag.current = {
            dx: event.clientX - win.x,
            dy: event.clientY - win.y,
          };

          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drag.current || win.max) return;

          onMove(
            event.clientX - drag.current.dx,
            Math.max(28, event.clientY - drag.current.dy),
          );
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <div className="group flex shrink-0 gap-2">
          {[
            ["bg-traffic-red", onClose, "×", "Close window"],
            ["bg-traffic-yellow", onMin, "–", "Minimize window"],
            ["bg-traffic-green", onMax, "+", "Toggle fullscreen"],
          ].map(([color, action, symbol, label], index) => (
            <button
              key={index}
              type="button"
              aria-label={label as string}
              title={label as string}
              onClick={action as () => void}
              className={`flex h-3 w-3 items-center justify-center rounded-full text-[9px] leading-none text-background ${color}`}
            >
              <span className="opacity-0 group-hover:opacity-70">
                {symbol as string}
              </span>
            </button>
          ))}
        </div>

        <div className="min-w-0 flex-1 truncate px-2 text-center text-xs font-medium text-muted-foreground">
          {app.name}
        </div>

        <div className="w-12 shrink-0" />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {app.render()}
      </div>
    </div>
  );
}

function Dock({
  items,
  running,
  onOpen,
}: {
  items: Launchable[];
  running: Set<string>;
  onOpen: (key: string) => void;
}) {
  const [mouseX, setMouseX] = useState<number | null>(null);
  const [bounce, setBounce] = useState<string | null>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <div className="fixed bottom-2 left-1/2 z-9999 -translate-x-1/2">
      <div
        onMouseMove={(event) => setMouseX(event.clientX)}
        onMouseLeave={() => setMouseX(null)}
        className="flex max-w-[calc(100vw-16px)] items-end gap-1.5 overflow-visible rounded-2xl border border-border glass px-2 pb-1.5 pt-1.5"
      >
        {items.map((item, index) => {
          const element = refs.current[index];
          let scale = 1;

          if (mouseX !== null && element) {
            const rect = element.getBoundingClientRect();
            const center = rect.left + rect.width / 2;
            const distance = Math.abs(mouseX - center);

            scale = 1 + Math.max(0, 1 - distance / 140) * 0.45;
          }

          return (
            <button
              key={item.key}
              ref={(element) => {
                refs.current[index] = element;
              }}
              type="button"
              aria-label={`Open ${item.name}`}
              title={item.name}
              onClick={() => {
                setBounce(item.key);
                window.setTimeout(() => setBounce(null), 900);
                onOpen(item.key);
              }}
              className="group relative flex w-13 shrink-0 flex-col items-center border-0 bg-transparent p-0"
            >
              <span className="pointer-events-none absolute -top-9 left-1/2 z-20 max-w-35 -translate-x-1/2 truncate whitespace-nowrap rounded-md glass-strong px-2 py-1 text-xs opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                {item.name}
              </span>

              <span
                className={`pointer-events-none flex h-13 w-13 shrink-0 items-center justify-center rounded-[22%] shadow-lg ${
                  bounce === item.key ? "animate-dock-bounce" : ""
                }`}
                style={{
                  background: `linear-gradient(160deg, ${item.color}, color-mix(in oklab, ${item.color} 55%, black))`,
                  fontSize: 28,
                  transform: `scale(${scale})`,
                  transformOrigin: "center bottom",
                  transition: "transform 120ms ease-out",
                }}
              >
                {item.icon}
              </span>

              <span
                className={`pointer-events-none mt-1 h-1 w-1 rounded-full bg-foreground ${
                  running.has(item.key) ? "opacity-80" : "opacity-0"
                }`}
              />
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
  const name = String(
    user.user_metadata?.["name"] ?? user.email ?? "User",
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 10000);

    const load = async () => {
      const { data, error } = await supabase
        .from("hub_apps")
        .select("*")
        .order("created_at");

      if (error) {
        console.error("Could not load apps:", error.message);
        return;
      }

      setHubApps((data as HubApp[]) ?? []);
    };

    void load();

    const channel = supabase
      .channel("hub_apps")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "hub_apps",
        },
        () => void load(),
      )
      .subscribe();

    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, []);

  const builtins: Launchable[] = [
    {
      key: "launchpad",
      name: "Launchpad",
      icon: "🚀",
      color: "oklch(0.45 0.05 270)",
      render: () => null,
    },
    {
      key: "browser",
      name: "Browser",
      icon: "🧭",
      color: "oklch(0.6 0.17 235)",
      render: () => <BrowserApp />,
    },
    {
      key: "chat",
      name: "Chat",
      icon: "💬",
      color: "oklch(0.68 0.18 150)",
      render: () => <ChatApp />,
    },
    {
      key: "settings",
      name: "Settings",
      icon: "⚙️",
      color: "oklch(0.55 0.01 270)",
      render: () => (
        <SettingsApp
          name={name}
          email={user.email ?? ""}
          admin={admin}
          onSignOut={() => void supabase.auth.signOut()}
        />
      ),
    },
    ...(admin
      ? [
          {
            key: "admin",
            name: "Admin",
            icon: "🛠️",
            color: "oklch(0.6 0.2 25)",
            render: () => <AdminApp apps={hubApps} />,
          },
        ]
      : []),
  ];

  const dynamic: Launchable[] = hubApps.map((app) => ({
    key: app.id,
    name: app.name,
    icon: app.icon,
    color: app.color,
    render: () => <LinkPicker app={app} />,
  }));

  const allApps = [...builtins, ...dynamic];
  const appsByKey = new Map(allApps.map((app) => [app.key, app]));

  const isFullscreen = wins.some(
    (win) => win.max && !win.min && !win.closing,
  );

  function open(key: string) {
    if (key === "launchpad") {
      setLaunchpad((previous) => !previous);
      return;
    }

    const app = appsByKey.get(key);
    if (!app) return;

    setLaunchpad(false);

    setWins((current) => {
      const existing = current.find(
        (win) => win.key === key && !win.closing,
      );

      if (existing) {
        return current.map((win) =>
          win.id === existing.id
            ? {
                ...win,
                min: false,
                z: ++zTop,
              }
            : win,
        );
      }

      const index = current.length;
      const width = Math.max(
        320,
        Math.min(1000, window.innerWidth - 48),
      );
      const height = Math.max(
        280,
        Math.min(650, window.innerHeight - 80),
      );

      return [
        ...current,
        {
          id: crypto.randomUUID(),
          key,
          x: Math.min(40 + index * 28, Math.max(0, window.innerWidth - width)),
          y: Math.min(40 + index * 28, Math.max(28, window.innerHeight - 100)),
          w: width,
          h: height,
          z: ++zTop,
          min: false,
          max: false,
          closing: false,
        },
      ];
    });
  }

  const updateWindow = (id: string, changes: Partial<Win>) => {
    setWins((current) =>
      current.map((win) =>
        win.id === id ? { ...win, ...changes } : win,
      ),
    );
  };

  const closeWindow = (id: string) => {
    updateWindow(id, { closing: true, max: false });

    window.setTimeout(() => {
      setWins((current) => current.filter((win) => win.id !== id));
    }, 340);
  };

  const toggleFullscreen = (id: string) => {
    setWins((current) =>
      current.map((win) =>
        win.id === id
          ? { ...win, max: !win.max, z: ++zTop }
          : { ...win, max: false },
      ),
    );
  };

  const focused = wins
    .filter((win) => !win.min && !win.closing)
    .sort((a, b) => b.z - a.z)[0];

  // Keep dynamic apps in Launchpad instead of overcrowding the dock.
  const dockItems = builtins;

  return (
    <div className="fixed inset-0 overflow-hidden text-glass-foreground">
      <img
        src={wallpaper}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />

      {!isFullscreen && (
        <>
          <div className="fixed inset-x-0 top-0 z-9998 flex h-7 items-center gap-5 glass px-4 text-[13px]">
            <span className="font-semibold">
              {focused ? appsByKey.get(focused.key)?.name : "Finder"}
            </span>

            <span className="opacity-80">File</span>
            <span className="opacity-80">Edit</span>
            <span className="opacity-80">View</span>
            <span className="opacity-80">Window</span>

            <span className="ml-auto truncate opacity-90">{name}</span>

            <span className="shrink-0">
              {now.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
              &nbsp;
              {now.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>

          <div className="absolute left-6 top-12 space-y-3 animate-fade-up">
            <div className="w-40 rounded-2xl border border-border glass p-4">
              <div className="text-xs uppercase opacity-70">
                {now.toLocaleDateString(undefined, {
                  weekday: "long",
                })}
              </div>
              <div className="text-5xl font-light">{now.getDate()}</div>
            </div>

            <div className="w-40 rounded-2xl border border-border glass p-4 text-sm">
              <div className="opacity-70">Apps live</div>
              <div className="text-3xl font-semibold">{hubApps.length}</div>
            </div>
          </div>
        </>
      )}

      {wins.map((win) => {
        const app = appsByKey.get(win.key);
        if (!app) return null;

        return (
          <Window
            key={win.id}
            win={win}
            app={app}
            onFocus={() => updateWindow(win.id, { z: ++zTop })}
            onClose={() => closeWindow(win.id)}
            onMin={() =>
              updateWindow(win.id, { min: true, max: false })
            }
            onMax={() => toggleFullscreen(win.id)}
            onMove={(x, y) => updateWindow(win.id, { x, y })}
          />
        );
      })}

      {launchpad && !isFullscreen && (
        <div
          onClick={() => setLaunchpad(false)}
          className="fixed inset-0 z-9990 overflow-auto glass animate-fade-up px-[10vw] pb-32 pt-20"
        >
          {(["proxy", "game", "app"] as const).map((kind) => {
            const list =
              kind === "app"
                ? [
                    ...builtins.filter(
                      (app) => app.key !== "launchpad",
                    ),
                    ...dynamic.filter(
                      (app) =>
                        hubApps.find((source) => source.id === app.key)
                          ?.kind === "app",
                    ),
                  ]
                : dynamic.filter(
                    (app) =>
                      hubApps.find((source) => source.id === app.key)
                        ?.kind === kind,
                  );

            if (!list.length) return null;

            return (
              <section key={kind} className="mb-10">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest opacity-70">
                  {kind === "proxy"
                    ? "Proxies"
                    : kind === "game"
                      ? "Games"
                      : "Apps"}
                </h3>

                <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-6">
                  {list.map((app) => (
                    <button
                      key={app.key}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        open(app.key);
                      }}
                      className="flex flex-col items-center gap-2 transition hover:scale-110"
                    >
                      <span
                        className="flex h-20 w-20 items-center justify-center rounded-[22%] text-4xl shadow-xl"
                        style={{
                          background: `linear-gradient(160deg, ${app.color}, color-mix(in oklab, ${app.color} 55%, black))`,
                        }}
                      >
                        {app.icon}
                      </span>

                      <span className="max-w-28 truncate text-xs">
                        {app.name}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {!isFullscreen && (
        <Dock
          items={dockItems}
          running={
            new Set(
              wins
                .filter((win) => !win.min && !win.closing)
                .map((win) => win.key),
            )
          }
          onOpen={open}
        />
      )}
    </div>
  );
}