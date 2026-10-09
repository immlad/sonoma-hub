
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import wallpaper from "@/assets/wallpaper.jpg";
import { isAdmin, type HubApp } from "@/lib/hub";
import {
  AdminApp,
  AppIcon,
  BrowserApp,
  ChatApp,
  LinkPicker,
  SettingsApp,
  DEFAULT_DESKTOP_PREFERENCES,
  type DesktopPreferences,
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

const PREFS_KEY = "sonoma-hub-desktop-preferences-v2";

const wallpaperStyles: Record<string, string> = {
  aurora:
    "radial-gradient(ellipse at 20% 5%, #3bb9a4 0%, transparent 42%), radial-gradient(ellipse at 80% 35%, #7250bf 0%, transparent 46%), linear-gradient(145deg, #10152d, #153b55 55%, #111327)",
  ocean:
    "radial-gradient(ellipse at 80% 15%, #35b5cf 0%, transparent 40%), radial-gradient(ellipse at 20% 80%, #355fc5 0%, transparent 45%), linear-gradient(145deg, #07182f, #0c445d 55%, #10182f)",
  midnight:
    "radial-gradient(ellipse at 25% 10%, #54428f 0%, transparent 42%), radial-gradient(ellipse at 90% 90%, #174a61 0%, transparent 46%), linear-gradient(145deg, #090b19, #161329 55%, #080d1b)",
  rose:
    "radial-gradient(ellipse at 20% 15%, #fa9bc9 0%, transparent 40%), radial-gradient(ellipse at 85% 70%, #9a6be5 0%, transparent 43%), linear-gradient(145deg, #381d52, #bc668d 55%, #20244c)",
};

let zTop = 10;

function glassStyle(blur: number, opacity = 0.42): CSSProperties {
  return {
    background: `rgba(22, 25, 43, ${opacity})`,
    backdropFilter: `blur(${blur}px) saturate(175%)`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(175%)`,
    border: "1px solid rgba(255,255,255,0.17)",
    boxShadow: "0 12px 36px rgba(0,0,0,0.18)",
  };
}

function Window({
  win,
  app,
  onFocus,
  onClose,
  onMin,
  onMax,
  onMove,
  blur,
}: {
  win: Win;
  app: Launchable;
  onFocus: () => void;
  onClose: () => void;
  onMin: () => void;
  onMax: () => void;
  onMove: (x: number, y: number) => void;
  blur: number;
}) {
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  const style: CSSProperties = win.max
    ? {
        left: 0,
        top: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: win.z,
        ...glassStyle(blur, 0.34),
      }
    : {
        left: win.x,
        top: win.y,
        width: win.w,
        height: win.h,
        zIndex: win.z,
        ...glassStyle(blur, 0.43),
      };

  return (
    <div
      onPointerDown={onFocus}
      style={style}
      className={`absolute flex flex-col overflow-hidden ${
        win.max ? "" : "rounded-xl"
      } shadow-window transition-[width,height,left,top] duration-300 ${
        win.closing || win.min
          ? "animate-genie-out pointer-events-none"
          : "animate-genie-in"
      }`}
    >
      <div
        className="flex h-9 shrink-0 cursor-default select-none items-center px-3"
        onDoubleClick={onMax}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          if (win.max) return;

          drag.current = {
            dx: e.clientX - win.x,
            dy: e.clientY - win.y,
          };

          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current && !win.max) {
            onMove(
              e.clientX - drag.current.dx,
              Math.max(28, e.clientY - drag.current.dy),
            );
          }
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
            ["bg-traffic-red", onClose, "×", "Close"],
            ["bg-traffic-yellow", onMin, "−", "Minimize"],
            ["bg-traffic-green", onMax, "+", "Toggle fullscreen"],
          ].map(([color, action, symbol, label], i) => (
            <button
              key={i}
              type="button"
              aria-label={label as string}
              title={label as string}
              onClick={action as () => void}
              className={`flex h-3 w-3 items-center justify-center rounded-full text-[9px] leading-none text-background ${color}`}
            >
              <span className="opacity-0 group-hover:opacity-80">
                {symbol as string}
              </span>
            </button>
          ))}
        </div>

        <div className="min-w-0 flex-1 truncate px-2 text-center text-xs font-medium text-foreground/80">
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
  preferences,
}: {
  items: Launchable[];
  running: Set<string>;
  onOpen: (key: string) => void;
  preferences: DesktopPreferences;
}) {
  const [mouseCoordinate, setMouseCoordinate] = useState<number | null>(null);
  const [bounce, setBounce] = useState<string | null>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const vertical = preferences.dockPosition !== "bottom";
  const size = preferences.dockSize;
  const blur = preferences.glassBlur;

  const outerStyle: CSSProperties =
    preferences.dockPosition === "bottom"
      ? {
          bottom: 10,
          left: "50%",
          transform: "translateX(-50%)",
          width: `min(${preferences.dockWidth}vw, calc(100vw - 24px))`,
          minWidth: "min(440px, calc(100vw - 24px))",
        }
      : {
          top: "50%",
          transform: "translateY(-50%)",
          height: `min(${preferences.dockWidth}vh, calc(100dvh - 24px))`,
          minHeight: "min(380px, calc(100dvh - 24px))",
          width: size + 24,
          ...(preferences.dockPosition === "left"
            ? { left: 10 }
            : { right: 10 }),
        };

  return (
    <div className="fixed z-9999" style={outerStyle}>
      <div
        onMouseMove={(e) =>
          setMouseCoordinate(vertical ? e.clientY : e.clientX)
        }
        onMouseLeave={() => setMouseCoordinate(null)}
        style={{
          ...glassStyle(blur + 6, 0.44),
          width: "100%",
          height: "100%",
          padding: 7,
          borderRadius: 23,
          display: "flex",
          flexDirection: vertical ? "column" : "row",
          alignItems: "center",
          justifyContent: vertical ? "center" : "space-evenly",
          gap: 4,
          overflow: "visible",
        }}
      >
        {items.map((it, i) => {
          const el = refs.current[i];
          let scale = 1;

          if (mouseCoordinate !== null && el) {
            const rect = el.getBoundingClientRect();
            const center = vertical
              ? rect.top + rect.height / 2
              : rect.left + rect.width / 2;

            const distance = Math.abs(mouseCoordinate - center);
            scale = 1 + Math.max(0, 1 - distance / 150) * 0.28;
          }

          return (
            <button
              key={it.key}
              ref={(r) => {
                refs.current[i] = r;
              }}
              type="button"
              aria-label={`Open ${it.name}`}
              title={it.name}
              onClick={() => {
                setBounce(it.key);
                window.setTimeout(() => setBounce(null), 700);
                onOpen(it.key);
              }}
              className={`group relative flex shrink-0 items-center justify-center border-0 bg-transparent p-1 ${
                vertical ? "w-full flex-col" : "h-full flex-1 flex-col"
              }`}
              style={{
                minWidth: vertical ? undefined : size + 14,
                flex: vertical ? "0 0 auto" : "1 1 0%",
              }}
            >
              <span
                className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 truncate whitespace-nowrap rounded-lg px-3 py-1.5 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                style={glassStyle(blur, 0.72)}
              >
                {it.name}
              </span>

              <span
                className={`flex shrink-0 items-center justify-center rounded-[22%] shadow-lg ${
                  bounce === it.key ? "animate-dock-bounce" : ""
                }`}
                style={{
                  height: size,
                  width: size,
                  background: `linear-gradient(155deg, ${it.color}, color-mix(in oklab, ${it.color} 54%, black))`,
                  transform: `scale(${scale})`,
                  transformOrigin: "center center",
                  transition: "transform 120ms ease-out",
                }}
              >
                <AppIcon
                  icon={it.icon}
                  className="leading-none"
                  imageClassName="h-[74%] w-[74%] object-contain"
                />
              </span>

              <span
                className={`mt-1 h-1 w-1 rounded-full bg-foreground ${
                  running.has(it.key) ? "opacity-90" : "opacity-0"
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
  const [launchpadSearch, setLaunchpadSearch] = useState("");
  const [now, setNow] = useState(new Date());
  const [preferences, setPreferences] = useState<DesktopPreferences>(
    DEFAULT_DESKTOP_PREFERENCES,
  );
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  const admin = isAdmin(user);
  const name = String(user.user_metadata?.["name"] ?? user.email ?? "User");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREFS_KEY);

      if (saved) {
        const parsed = JSON.parse(saved) as Partial<DesktopPreferences>;

        setPreferences({
          ...DEFAULT_DESKTOP_PREFERENCES,
          ...parsed,
          dockWidth: Math.min(90, Math.max(35, Number(parsed.dockWidth) || 50)),
          dockSize: Math.min(68, Math.max(40, Number(parsed.dockSize) || 52)),
          glassBlur: Math.min(40, Math.max(12, Number(parsed.glassBlur) || 28)),
        });
      }
    } catch {
      // Keep defaults if saved preferences cannot be read.
    } finally {
      setPreferencesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;

    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
    } catch {
      // The desktop continues to work even if storage is unavailable.
    }
  }, [preferences, preferencesLoaded]);

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

  const changePreferences = (patch: Partial<DesktopPreferences>) => {
    setPreferences((current) => ({ ...current, ...patch }));
  };

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
          preferences={preferences}
          onPreferencesChange={changePreferences}
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
  const byKey = new Map(allApps.map((app) => [app.key, app]));

  function open(key: string) {
    if (key === "launchpad") {
      setLaunchpad((previous) => !previous);
      setLaunchpadSearch("");
      return;
    }

    const app = byKey.get(key);
    if (!app) return;

    setLaunchpad(false);

    setWins((current) => {
      const existing = current.find(
        (win) => win.key === key && !win.closing,
      );

      if (existing) {
        return current.map((win) =>
          win.id === existing.id
            ? { ...win, min: false, z: ++zTop }
            : win,
        );
      }

      const index = current.length;
      const width = Math.max(320, Math.min(1000, window.innerWidth - 48));
      const height = Math.max(280, Math.min(650, window.innerHeight - 80));

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

  const isFullscreen = wins.some(
    (win) => win.max && !win.min && !win.closing,
  );

  const matchesSearch = (app: Launchable) =>
    app.name.toLowerCase().includes(launchpadSearch.trim().toLowerCase());

  const appKind = (app: Launchable) =>
    hubApps.find((source) => source.id === app.key)?.kind;

  const launchpadSections = [
    {
      key: "proxy",
      title: "Proxies",
      items: dynamic.filter(
        (app) => appKind(app) === "proxy" && matchesSearch(app),
      ),
    },
    {
      key: "game",
      title: "Games",
      items: dynamic.filter(
        (app) => appKind(app) === "game" && matchesSearch(app),
      ),
    },
    {
      key: "app",
      title: "Apps",
      items: [
        ...builtins.filter(
          (app) => app.key !== "launchpad" && matchesSearch(app),
        ),
        ...dynamic.filter(
          (app) => appKind(app) === "app" && matchesSearch(app),
        ),
      ],
    },
  ];

  const blurredPanel = glassStyle(preferences.glassBlur, 0.25);

  return (
    <div
      className="fixed inset-0 overflow-hidden text-glass-foreground"
      style={{
        background:
          preferences.wallpaper === "sonoma" ||
          (preferences.wallpaper === "custom" && preferences.customWallpaper)
            ? "#101323"
            : wallpaperStyles[preferences.wallpaper] ?? wallpaperStyles.midnight,
      }}
    >
      {preferences.wallpaper === "sonoma" && (
        <img
          src={wallpaper}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      )}

      {preferences.wallpaper === "custom" && preferences.customWallpaper && (
        <img
          src={preferences.customWallpaper}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}

      {!isFullscreen && (
        <>
          <div
            className="fixed inset-x-0 top-0 z-9998 flex h-7 items-center gap-5 px-4 text-[13px]"
            style={glassStyle(preferences.glassBlur, 0.37)}
          >
            <span className="font-semibold">
              {focused ? byKey.get(focused.key)?.name : "Finder"}
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
            <div
              className="w-40 rounded-2xl p-4"
              style={blurredPanel}
            >
              <div className="text-xs uppercase opacity-70">
                {now.toLocaleDateString(undefined, { weekday: "long" })}
              </div>
              <div className="text-5xl font-light">{now.getDate()}</div>
            </div>

            <div
              className="w-40 rounded-2xl p-4 text-sm"
              style={blurredPanel}
            >
              <div className="opacity-70">Apps live</div>
              <div className="text-3xl font-semibold">{hubApps.length}</div>
            </div>
          </div>
        </>
      )}

      {wins.map((win) => {
        const app = byKey.get(win.key);
        if (!app) return null;

        return (
          <Window
            key={win.id}
            win={win}
            app={app}
            blur={preferences.glassBlur}
            onFocus={() => updateWindow(win.id, { z: ++zTop })}
            onClose={() => closeWindow(win.id)}
            onMin={() => updateWindow(win.id, { min: true, max: false })}
            onMax={() => toggleFullscreen(win.id)}
            onMove={(x, y) => updateWindow(win.id, { x, y })}
          />
        );
      })}

      {launchpad && !isFullscreen && (
        <div
          onClick={() => setLaunchpad(false)}
          className="fixed inset-0 z-9990 overflow-auto px-5 pb-32 pt-12 md:px-[10vw] md:pt-16"
          style={{
            background: "rgba(10,12,23,0.28)",
            backdropFilter: `blur(${preferences.glassBlur + 10}px) saturate(165%)`,
            WebkitBackdropFilter: `blur(${preferences.glassBlur + 10}px) saturate(165%)`,
          }}
        >
          <div
            className="mx-auto max-w-6xl rounded-3xl p-6 md:p-8"
            style={glassStyle(preferences.glassBlur + 4, 0.42)}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-8 flex flex-wrap items-center gap-4">
              <div className="flex-1">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Launchpad
                </h2>
                <p className="mt-1 text-sm text-white/65">
                  Your apps, games and proxies
                </p>
              </div>

              <label className="min-w-[220px] flex-1 md:max-w-sm">
                <span className="sr-only">Search apps</span>
                <input
                  value={launchpadSearch}
                  onChange={(e) => setLaunchpadSearch(e.target.value)}
                  placeholder="Search apps…"
                  className="w-full rounded-xl border border-white/15 bg-black/15 px-4 py-2.5 text-sm outline-none placeholder:text-white/50 focus:border-white/35"
                />
              </label>

              <button
                type="button"
                onClick={() => setLaunchpad(false)}
                aria-label="Close Launchpad"
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {launchpadSections.map((section) => {
              if (!section.items.length) return null;

              return (
                <section key={section.key} className="mb-9 last:mb-0">
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
                    {section.title}
                  </h3>

                  <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7">
                    {section.items.map((app) => (
                      <button
                        key={app.key}
                        type="button"
                        onClick={() => open(app.key)}
                        className="group flex min-w-0 flex-col items-center gap-2 rounded-2xl p-2 transition hover:bg-white/10"
                      >
                        <span
                          className="flex h-[68px] w-[68px] items-center justify-center rounded-[22%] shadow-xl transition duration-200 group-hover:-translate-y-1 group-hover:scale-105"
                          style={{
                            background: `linear-gradient(155deg, ${app.color}, color-mix(in oklab, ${app.color} 54%, black))`,
                          }}
                        >
                          <AppIcon
                            icon={app.icon}
                            className="text-4xl leading-none"
                            imageClassName="h-[76%] w-[76%] object-contain"
                          />
                        </span>

                        <span className="w-full truncate text-center text-xs text-white/90">
                          {app.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}

            {launchpadSections.every((section) => section.items.length === 0) && (
              <p className="py-12 text-center text-sm text-white/60">
                No apps found. Try a different search.
              </p>
            )}
          </div>
        </div>
      )}

      {!isFullscreen && (
        <Dock
          items={builtins}
          running={
            new Set(
              wins
                .filter((win) => !win.min && !win.closing)
                .map((win) => win.key),
            )
          }
          onOpen={open}
          preferences={preferences}
        />
      )}
    </div>
  );
}