import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { User } from "@supabase/supabase-js";
import {
  BatteryCharging,
  ChevronUp,
  Compass,
  LayoutGrid,
  MessageCircle,
  Search,
  Settings as SettingsIcon,
  Volume2,
  Wifi,
  Wrench,
} from "lucide-react";
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

type AppContextMenuState = {
  key: string;
  x: number;
  y: number;
} | null;

const PREFERENCES_KEY = "sonoma-hub-desktop-preferences-v2";
const PINS_KEY = "sonoma-hub-pinned-apps-v1";
let zTop = 10;

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

function glassStyle(blur: number, opacity = 0.42): CSSProperties {
  return {
    background: `rgba(22, 25, 43, ${opacity})`,
    backdropFilter: `blur(${blur}px) saturate(175%)`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(175%)`,
    border: "1px solid rgba(255,255,255,0.15)",
    boxShadow: "0 12px 36px rgba(0,0,0,0.18)",
  };
}

function WindowsLogo({ size = 23 }: { size?: number }) {
  const side = (size - 3) / 2;
  return (
    <span
      className="grid shrink-0 grid-cols-2 gap-0.75"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {Array.from({ length: 4 }, (_, i) => (
        <span
          key={i}
          style={{
            width: side,
            height: side,
            background: "#60a5fa",
            borderRadius: 1.5,
          }}
        />
      ))}
    </span>
  );
}

function AppGlyph({ app, size = 24 }: { app: Launchable; size?: number }) {
  const common = { size, strokeWidth: 1.9 };
  switch (app.key) {
    case "launchpad":
      return <LayoutGrid {...common} color="#93c5fd" />;
    case "browser":
      return <Compass {...common} color="#7dd3fc" />;
    case "chat":
      return <MessageCircle {...common} color="#c4b5fd" />;
    case "settings":
      return <SettingsIcon {...common} color="#e2e8f0" />;
    case "admin":
      return <Wrench {...common} color="#fca5a5" />;
    default:
      return (
        <span
          className="flex h-full w-full items-center justify-center"
          style={{ fontSize: size }}
        >
          <AppIcon
            icon={app.icon}
            className="leading-none"
            imageClassName="h-[82%] w-[82%] object-contain"
          />
        </span>
      );
  }
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
      className={`absolute flex flex-col overflow-hidden shadow-window ${
        win.max ? "" : "rounded-xl"
      } ${
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
        <div className="min-w-0 flex-1 truncate px-2 text-center text-xs font-medium text-white/85">
          {app.name}
        </div>
        <div className="w-12 shrink-0" />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{app.render()}</div>
    </div>
  );
}

function WindowsTaskbar({
  items,
  running,
  onOpen,
  onContextMenu,
  preferences,
  now,
  search,
  onSearchChange,
  onSearchOpen,
}: {
  items: Launchable[];
  running: Set<string>;
  onOpen: (key: string) => void;
  onContextMenu: (
    event: ReactMouseEvent<HTMLElement>,
    app: Launchable,
  ) => void;
  preferences: DesktopPreferences;
  now: Date;
  search: string;
  onSearchChange: (value: string) => void;
  onSearchOpen: () => void;
}) {
  const vertical = preferences.dockPosition !== "bottom";
  const side = preferences.dockPosition;
  const width = Math.min(100, Math.max(35, preferences.dockWidth));
  const iconSize = Math.round(
    28 + ((preferences.dockSize - 40) / 28) * 8,
  );
  const barHeight = Math.max(50, preferences.dockSize + 8);
  const [trayOpen, setTrayOpen] = useState(false);
  const outerStyle: CSSProperties =
    side === "bottom"
      ? {
          bottom: width >= 99 ? 0 : 8,
          left: width >= 99 ? 0 : "50%",
          transform: width >= 99 ? undefined : "translateX(-50%)",
          width: width >= 99 ? "100%" : `min(${width}vw, calc(100vw - 20px))`,
          height: barHeight,
          borderRadius: width >= 99 ? "14px 14px 0 0" : 20,
        }
      : {
          top: "50%",
          transform: "translateY(-50%)",
          height: `min(${width}vh, calc(100dvh - 24px))`,
          width: iconSize + 30,
          ...(side === "left" ? { left: 8 } : { right: 8 }),
          borderRadius: 22,
        };
  const buttonStyle: CSSProperties = {
    border: 0,
    background: "transparent",
    color: "rgba(255,255,255,0.94)",
    cursor: "pointer",
  };

  return (
    <div
      className="fixed z-9999"
      style={{
        ...outerStyle,
        ...glassStyle(preferences.glassBlur + 4, 0.58),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: vertical ? "10px 5px" : "0 10px",
        boxSizing: "border-box",
      }}
    >
      <div
        className={`flex h-full items-center ${
          vertical ? "w-full flex-col justify-center gap-2" : "gap-1"
        }`}
      >
        <button
          type="button"
          title="Start"
          aria-label="Open Start menu"
          onClick={onSearchOpen}
          className="flex shrink-0 items-center justify-center rounded-xl transition hover:bg-white/10 active:scale-95"
          style={{
            ...buttonStyle,
            width: iconSize + 8,
            height: iconSize + 8,
          }}
        >
          <WindowsLogo size={iconSize * 0.78} />
        </button>

        {vertical ? (
          <button
            type="button"
            aria-label="Search apps"
            title="Search apps"
            onClick={onSearchOpen}
            className="flex items-center justify-center rounded-xl transition hover:bg-white/10"
            style={{
              ...buttonStyle,
              width: iconSize + 8,
              height: iconSize + 8,
            }}
          >
            <Search size={19} strokeWidth={1.9} />
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSearchOpen();
            }}
            className="mx-1 flex shrink items-center gap-2 rounded-full px-3 transition hover:bg-white/10"
            style={{
              background: "rgba(255,255,255,0.11)",
              border: "1px solid rgba(255,255,255,0.09)",
              width: "clamp(130px, 17vw, 230px)",
              height: 36,
              minWidth: 100,
            }}
          >
            <Search size={17} className="shrink-0 text-white/75" />
            <input
              value={search}
              onFocus={onSearchOpen}
              onClick={onSearchOpen}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search"
              aria-label="Search apps"
              className="w-full min-w-0 border-0 bg-transparent text-sm text-white outline-none placeholder:text-white/65"
              style={{ color: "#fff", caretColor: "#fff" }}
            />
          </form>
        )}

        {items.map((app) => (
          <button
            key={app.key}
            type="button"
            title={app.name}
            aria-label={`Open ${app.name}`}
            onClick={() => onOpen(app.key)}
            onContextMenu={(event) => onContextMenu(event, app)}
            className="group relative flex shrink-0 items-center justify-center rounded-xl transition duration-150 hover:bg-white/10 active:scale-95"
            style={{
              ...buttonStyle,
              width: iconSize + 8,
              height: iconSize + 8,
            }}
          >
            <AppGlyph app={app} size={iconSize * 0.72} />
            {running.has(app.key) && (
              <span
                className="absolute bottom-0 rounded-full"
                style={{ width: 12, height: 3, background: "#93c5fd" }}
              />
            )}
            <span
              className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
              style={glassStyle(preferences.glassBlur, 0.88)}
            >
              {app.name}
            </span>
          </button>
        ))}

        {!vertical && (
          <div
            className="ml-auto flex h-full shrink-0 items-center gap-2 pl-3"
            style={{ color: "rgba(255,255,255,0.94)" }}
          >
            <button
              type="button"
              title="Background applications"
              aria-label="Background applications"
              onClick={() => setTrayOpen((v) => !v)}
              className="rounded-md p-1 hover:bg-white/10"
              style={buttonStyle}
            >
              <ChevronUp size={15} />
            </button>
            <span className="hidden rounded-md p-1 sm:flex" title="Network">
              <Wifi size={17} />
            </span>
            <span className="hidden rounded-md p-1 sm:flex" title="Volume">
              <Volume2 size={17} />
            </span>
            <BatteryCharging size={18} />
            <div className="ml-1 flex flex-col items-end justify-center whitespace-nowrap text-[11px] leading-[1.35]">
              <span>
                {now.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
              <span>
                {now.toLocaleDateString([], {
                  month: "numeric",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            {trayOpen && (
              <div
                className="absolute bottom-full right-3 mb-3 rounded-2xl p-4 shadow-xl"
                style={{
                  ...glassStyle(preferences.glassBlur + 6, 0.86),
                  width: 220,
                }}
              >
                <div className="mb-3 text-sm font-semibold">Quick settings</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 rounded-xl bg-white/10 p-3">
                    <Wifi size={16} /> Wi-Fi
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-white/10 p-3">
                    <Volume2 size={16} /> Volume
                  </div>
                </div>
                <div className="mt-3 text-[10px] text-white/60">
                  Display settings are available in Sonoma Hub Settings.
                </div>
              </div>
            )}
          </div>
        )}
        {vertical && (
          <div className="mt-auto flex flex-col items-center gap-3 pt-3">
            <Wifi size={16} />
            <Volume2 size={16} />
            <BatteryCharging size={17} />
            <span
              className="text-[10px] text-white/80"
              style={{ writingMode: "vertical-rl" }}
            >
              {now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
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
  const [pinnedAppIds, setPinnedAppIds] = useState<string[]>([]);
  const [pinsLoaded, setPinsLoaded] = useState(false);
  const [contextMenu, setContextMenu] = useState<AppContextMenuState>(null);
  const [deletingApp, setDeletingApp] = useState(false);
  const admin = isAdmin(user);
  const name = String(user.user_metadata?.["name"] ?? user.email ?? "User");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREFERENCES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<DesktopPreferences>;
        const previousWidth = Number(parsed.dockWidth) || 50;
        setPreferences({
          ...DEFAULT_DESKTOP_PREFERENCES,
          ...parsed,
          dockWidth:
            parsed.dockPosition === "bottom" && previousWidth === 50
              ? 100
              : Math.min(100, Math.max(35, previousWidth)),
          dockSize: Math.min(68, Math.max(40, Number(parsed.dockSize) || 52)),
          glassBlur: Math.min(40, Math.max(12, Number(parsed.glassBlur) || 28)),
        });
      }
    } catch {
      // Use default appearance settings if saved preferences are invalid.
    } finally {
      setPreferencesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {
      // Local storage might be unavailable in private browsing.
    }
  }, [preferences, preferencesLoaded]);

  useEffect(() => {
    const defaults = ["browser", "chat", "settings", ...(admin ? ["admin"] : [])];
    try {
      const saved = localStorage.getItem(PINS_KEY);
      if (saved !== null) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every((value) => typeof value === "string")) {
          setPinnedAppIds(parsed.filter((key) => key !== "launchpad"));
        } else {
          setPinnedAppIds(defaults);
        }
      } else {
        setPinnedAppIds(defaults);
      }
    } catch {
      setPinnedAppIds(defaults);
    } finally {
      setPinsLoaded(true);
    }
  }, [admin]);

  useEffect(() => {
    if (!pinsLoaded) return;
    try {
      localStorage.setItem(PINS_KEY, JSON.stringify(pinnedAppIds));
    } catch {
      // Pins still work for the current session if local storage is unavailable.
    }
  }, [pinnedAppIds, pinsLoaded]);

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
        { event: "*", schema: "public", table: "hub_apps" },
        () => void load(),
      )
      .subscribe();
    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLaunchpad(false);
        setContextMenu(null);
        if (wins.some((win) => win.max && !win.min && !win.closing)) {
          setWins((current) => current.map((win) => ({ ...win, max: false })));
        }
      }
    };
    const dismissContextMenu = () => setContextMenu(null);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", dismissContextMenu);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", dismissContextMenu);
    };
  }, [wins]);

  const changePreferences = (patch: Partial<DesktopPreferences>) => {
    setPreferences((current) => ({ ...current, ...patch }));
  };

  const builtins: Launchable[] = [
    {
      key: "launchpad",
      name: "Start",
      icon: "🚀",
      color: "#2563eb",
      render: () => null,
    },
    {
      key: "browser",
      name: "Browser",
      icon: "🧭",
      color: "#0ea5e9",
      render: () => <BrowserApp />,
    },
    {
      key: "chat",
      name: "Chat",
      icon: "💬",
      color: "#10b981",
      render: () => <ChatApp />,
    },
    {
      key: "settings",
      name: "Settings",
      icon: "⚙️",
      color: "#64748b",
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
            color: "#dc2626",
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
  const customAppById = new Map(hubApps.map((app) => [app.id, app]));

  function open(key: string) {
    if (key === "launchpad") {
      setLaunchpad((previous) => !previous);
      setLaunchpadSearch("");
      setContextMenu(null);
      return;
    }
    const app = byKey.get(key);
    if (!app) return;
    setLaunchpad(false);
    setLaunchpadSearch("");
    setContextMenu(null);
    setWins((current) => {
      const existing = current.find((win) => win.key === key && !win.closing);
      if (existing) {
        return current.map((win) =>
          win.id === existing.id ? { ...win, min: false, z: ++zTop } : win,
        );
      }
      const index = current.length;
      const w = Math.max(320, Math.min(1000, window.innerWidth - 48));
      const h = Math.max(280, Math.min(650, window.innerHeight - 80));
      return [
        ...current,
        {
          id: crypto.randomUUID(),
          key,
          x: Math.min(40 + index * 28, Math.max(0, window.innerWidth - w)),
          y: Math.min(40 + index * 28, Math.max(28, window.innerHeight - 100)),
          w,
          h,
          z: ++zTop,
          min: false,
          max: false,
          closing: false,
        },
      ];
    });
  }

  function showAppContextMenu(
    event: ReactMouseEvent<HTMLElement>,
    app: Launchable,
  ) {
    event.preventDefault();
    event.stopPropagation();
    const menuWidth = 224;
    const custom = customAppById.has(app.key);
    const menuHeight = admin && custom ? 148 : 104;
    setContextMenu({
      key: app.key,
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8)),
    });
  }

  function togglePin(appKey: string) {
    if (appKey === "launchpad") return;
    setPinnedAppIds((current) =>
      current.includes(appKey)
        ? current.filter((key) => key !== appKey)
        : [...current, appKey],
    );
    setContextMenu(null);
  }

  async function deleteCustomApp(appKey: string) {
    if (!admin) return;
    const app = customAppById.get(appKey);
    if (!app) return;
    const confirmed = window.confirm(
      `Delete "${app.name}" from Sonoma Hub for everyone? This cannot be undone.`,
    );
    if (!confirmed) {
      setContextMenu(null);
      return;
    }

    setDeletingApp(true);
    const { error } = await supabase.from("hub_apps").delete().eq("id", appKey);
    setDeletingApp(false);
    if (error) {
      window.alert(`Could not delete app: ${error.message}`);
      return;
    }

    setHubApps((current) => current.filter((item) => item.id !== appKey));
    setPinnedAppIds((current) => current.filter((key) => key !== appKey));
    setWins((current) => current.filter((win) => win.key !== appKey));
    setContextMenu(null);
  }

  const updateWindow = (id: string, changes: Partial<Win>) => {
    setWins((current) =>
      current.map((win) => (win.id === id ? { ...win, ...changes } : win)),
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
  const query = launchpadSearch.trim().toLowerCase();
  const matches = (app: Launchable) => app.name.toLowerCase().includes(query);
  const appKind = (app: Launchable) =>
    hubApps.find((source) => source.id === app.key)?.kind;
  const sections = [
    {
      key: "proxy",
      title: "Proxies",
      items: dynamic.filter((app) => appKind(app) === "proxy" && matches(app)),
    },
    {
      key: "game",
      title: "Games",
      items: dynamic.filter((app) => appKind(app) === "game" && matches(app)),
    },
    {
      key: "app",
      title: "Pinned and apps",
      items: [
        ...builtins.filter((app) => app.key !== "launchpad" && matches(app)),
        ...dynamic.filter((app) => appKind(app) === "app" && matches(app)),
      ],
    },
  ];

  const taskbarApps = allApps.filter(
    (app) => app.key !== "launchpad" && pinnedAppIds.includes(app.key),
  );
  const changeSearch = (value: string) => {
    setLaunchpadSearch(value);
    setLaunchpad(true);
  };
  const wallpaperStyle =
    preferences.wallpaper === "sonoma"
      ? undefined
      : preferences.wallpaper === "custom" && preferences.customWallpaper
        ? "#101323"
        : wallpaperStyles[preferences.wallpaper] ?? wallpaperStyles["midnight"];

  return (
    <div
      className="fixed inset-0 overflow-hidden text-glass-foreground"
      style={{ background: wallpaperStyle }}
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

      <style>{`
        @keyframes start-menu-in {
          from { opacity: 0; transform: translate(-50%, 18px) scale(.96); filter: blur(5px); }
          to { opacity: 1; transform: translate(-50%, 0) scale(1); filter: blur(0); }
        }
        @keyframes start-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        .sonoma-start-menu { animation: start-menu-in 220ms cubic-bezier(.2,.8,.2,1) both; transform-origin: bottom center; }
        .sonoma-start-backdrop { animation: start-backdrop-in 160ms ease-out both; }
        @media (prefers-reduced-motion: reduce) { .sonoma-start-menu, .sonoma-start-backdrop { animation: none !important; } }
      `}</style>

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
              style={glassStyle(preferences.glassBlur, 0.3)}
            >
              <div className="text-xs uppercase opacity-70">
                {now.toLocaleDateString(undefined, { weekday: "long" })}
              </div>
              <div className="text-5xl font-light">{now.getDate()}</div>
            </div>
            <div
              className="w-40 rounded-2xl p-4 text-sm"
              style={glassStyle(preferences.glassBlur, 0.3)}
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
          className="sonoma-start-backdrop fixed inset-0 z-9990"
          onClick={() => setLaunchpad(false)}
          style={{
            background: "rgba(8,10,20,0.14)",
            backdropFilter: `blur(${Math.round(preferences.glassBlur * 0.3)}px)`,
            WebkitBackdropFilter: `blur(${Math.round(preferences.glassBlur * 0.3)}px)`,
          }}
        >
          <div
            role="dialog"
            aria-label="Start menu"
            onClick={(e) => e.stopPropagation()}
            className="sonoma-start-menu absolute bottom-17 left-1/2 flex max-h-[min(690px,calc(100dvh-92px))] w-[min(640px,calc(100vw-24px))] flex-col overflow-hidden rounded-3xl p-5 sm:p-7"
            style={glassStyle(preferences.glassBlur + 8, 0.78)}
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex-1">
                <h2 className="text-lg font-semibold tracking-tight">Start</h2>
                <p className="mt-0.5 text-xs text-white/55">Your apps and shortcuts</p>
              </div>
              <button
                type="button"
                onClick={() => setLaunchpad(false)}
                aria-label="Close Start menu"
                className="rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            <label
              className="mb-5 flex h-10 shrink-0 items-center gap-2 rounded-full px-3"
              style={{
                background: "rgba(255,255,255,0.095)",
                border: "1px solid rgba(255,255,255,0.13)",
              }}
            >
              <Search size={17} className="text-white/65" />
              <input
                value={launchpadSearch}
                onChange={(e) => setLaunchpadSearch(e.target.value)}
                placeholder="Search apps"
                aria-label="Search apps"
                className="w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-white/55"
                style={{ color: "#fff", caretColor: "#fff" }}
              />
            </label>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {sections.map((section) => {
                if (!section.items.length) return null;
                return (
                  <section key={section.key} className="mb-6 last:mb-0">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-xs font-semibold tracking-wide text-white/70">
                        {section.title}
                      </h3>
                      <span className="text-[10px] text-white/45">
                        {section.items.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
                      {section.items.map((app) => (
                        <button
                          key={app.key}
                          type="button"
                          onClick={() => open(app.key)}
                          onContextMenu={(event) => showAppContextMenu(event, app)}
                          className="group flex min-w-0 flex-col items-center gap-2 rounded-xl p-3 transition duration-150 hover:bg-white/10 active:scale-[0.97]"
                        >
                          <span className="flex h-10 w-10 items-center justify-center transition-transform duration-150 group-hover:-translate-y-0.5">
                            <AppGlyph app={app} size={30} />
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
              {sections.every((section) => section.items.length === 0) && (
                <p className="py-10 text-center text-sm text-white/60">No apps found.</p>
              )}
            </div>
            <div className="mt-5 flex shrink-0 items-center gap-3 border-t border-white/10 pt-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                {name[0]?.toUpperCase() ?? "U"}
              </div>
              <span className="min-w-0 flex-1 truncate text-xs text-white/80">{name}</span>
              <button
                type="button"
                onClick={() => void supabase.auth.signOut()}
                className="rounded-lg px-3 py-2 text-xs text-white/65 hover:bg-white/10 hover:text-white"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {contextMenu && byKey.has(contextMenu.key) && (
        <div
          className="fixed inset-0 z-10000"
          onClick={() => setContextMenu(null)}
          onContextMenu={(event) => {
            event.preventDefault();
            setContextMenu(null);
          }}
        >
          <div
            role="menu"
            aria-label={`${byKey.get(contextMenu.key)?.name ?? "App"} actions`}
            className="fixed z-10001 min-w-55 rounded-xl p-1.5 text-sm"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              ...glassStyle(preferences.glassBlur + 8, 0.94),
            }}
            onClick={(event) => event.stopPropagation()}
          >
            {(() => {
              const app = byKey.get(contextMenu.key);
              if (!app) return null;
              const isPinned = pinnedAppIds.includes(app.key);
              const isCustom = customAppById.has(app.key);
              return (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => open(app.key)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-white/10"
                  >
                    <span className="w-5 text-center">↗</span>
                    Open
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => togglePin(app.key)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-white/10"
                  >
                    <span className="w-5 text-center">📌</span>
                    {isPinned ? "Unpin from taskbar" : "Pin to taskbar"}
                  </button>
                  {admin && isCustom && (
                    <>
                      <div className="my-1 border-t border-white/10" />
                      <button
                        type="button"
                        role="menuitem"
                        disabled={deletingApp}
                        onClick={() => void deleteCustomApp(app.key)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-red-300 hover:bg-red-500/15 disabled:opacity-50"
                      >
                        <span className="w-5 text-center">⌫</span>
                        {deletingApp ? "Deleting…" : "Delete app for everyone"}
                      </button>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {!isFullscreen && (
        <WindowsTaskbar
          items={taskbarApps}
          running={
            new Set(
              wins
                .filter((win) => !win.min && !win.closing)
                .map((win) => win.key),
            )
          }
          onOpen={open}
          onContextMenu={showAppContextMenu}
          preferences={preferences}
          now={now}
          search={launchpadSearch}
          onSearchChange={changeSearch}
          onSearchOpen={() => setLaunchpad(true)}
        />
      )}
    </div>
  );
}