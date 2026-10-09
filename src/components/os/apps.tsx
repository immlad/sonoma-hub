
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { HubApp } from "@/lib/hub";
import { CHAT_URL } from "@/lib/hub";

export type TabTitlePreset =
  | "sonoma"
  | "workspace"
  | "focus"
  | "study"
  | "personal"
  | "custom";

export const TAB_TITLE_PRESETS: Record<
  Exclude<TabTitlePreset, "custom">,
  string
> = {
  sonoma: "Sonoma Hub",
  workspace: "My Workspace",
  focus: "Focus Mode",
  study: "Study Desk",
  personal: "Personal Desktop",
};

export type DesktopPreferences = {
  wallpaper: "sonoma" | "aurora" | "ocean" | "midnight" | "rose" | "custom";
  customWallpaper: string;
  dockPosition: "bottom" | "left" | "right";
  dockWidth: number;
  dockSize: number;
  glassBlur: number;
  tabTitlePreset: TabTitlePreset;
  customTabTitle: string;
};

export const DEFAULT_DESKTOP_PREFERENCES: DesktopPreferences = {
  wallpaper: "sonoma",
  customWallpaper: "",
  dockPosition: "bottom",
  dockWidth: 100,
  dockSize: 52,
  glassBlur: 28,
  tabTitlePreset: "sonoma",
  customTabTitle: "Sonoma Hub",
};

function iconImageSource(icon: string): string | null {
  const value = icon.trim();
  if (!value) return null;

  if (/^(https?:\/\/|data:image\/|blob:)/i.test(value)) {
    return value;
  }

  if (!/\.(png|jpe?g|gif|svg|webp|avif)(?:[?#].*)?$/i.test(value)) {
    return null;
  }

  const base = import.meta.env.BASE_URL || "/";
  const cleaned = value.replace(/^\/+/, "").replace(/^\.\//, "");

  if (value.startsWith(base) && base !== "/") {
    return value;
  }

  return `${base.endsWith("/") ? base : `${base}/`}${cleaned}`;
}

/** Supports emoji icons, absolute image paths, and image URLs. */
export function AppIcon({
  icon,
  className = "",
  imageClassName = "h-full w-full object-contain",
}: {
  icon: string;
  className?: string;
  imageClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = iconImageSource(icon);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        draggable={false}
        className={imageClassName}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className={className}>
      {src ? "🌌" : icon.trim() || "🌌"}
    </span>
  );
}

function Frame({
  src,
  srcDoc,
}: {
  src?: string;
  srcDoc?: string;
}) {
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

export function BrowserApp({
  initial = "https://www.wikipedia.org/",
}: {
  initial?: string;
}) {
  const [input, setInput] = useState(initial);
  const [url, setUrl] = useState(initial);
  const [reloadKey, setReloadKey] = useState(0);

  function go(event: FormEvent) {
    event.preventDefault();

    let nextUrl = input.trim();

    if (!/^https?:\/\//i.test(nextUrl)) {
      nextUrl = nextUrl.includes(".")
        ? `https://${nextUrl}`
        : `https://duckduckgo.com/?q=${encodeURIComponent(nextUrl)}`;
    }

    setUrl(nextUrl);
    setInput(nextUrl);
    setReloadKey((current) => current + 1);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <form
        onSubmit={go}
        className="flex shrink-0 items-center gap-2 border-b border-border bg-white/5 px-3 py-2"
      >
        <button
          type="button"
          onClick={() => setReloadKey((current) => current + 1)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Refresh page"
          title="Refresh"
        >
          ↻
        </button>

        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          aria-label="Website address or search"
          className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-1 text-center text-xs outline-none focus:ring-2 focus:ring-ring"
          style={{ color: "white", caretColor: "white" }}
        />

        <button
          type="submit"
          className="rounded-md bg-white/10 px-3 py-1 text-xs hover:bg-white/15"
        >
          Go
        </button>
      </form>

      <div className="min-h-0 flex-1">
        <Frame key={`${url}-${reloadKey}`} src={url} />
      </div>
    </div>
  );
}

export function ChatApp() {
  return <Frame src={CHAT_URL} />;
}

export function LinkPicker({ app }: { app: HubApp }) {
  const [active, setActive] = useState(0);
  const [launched, setLaunched] = useState<string | null>(null);

  if (app.html && app.urls.length === 0) {
    return <Frame srcDoc={app.html} />;
  }

  if (launched) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-white/5 px-3 py-1.5 text-xs">
          <button
            type="button"
            onClick={() => setLaunched(null)}
            className="rounded bg-white/10 px-2 py-1 hover:bg-white/15"
          >
            ← Links
          </button>

          <span className="truncate text-muted-foreground">
            {launched}
          </span>
        </div>

        <div className="min-h-0 flex-1">
          <Frame src={launched} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col p-6">
      <h2 className="flex items-center gap-3 text-2xl font-semibold">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center">
          <AppIcon
            icon={app.icon}
            className="text-3xl"
            imageClassName="h-full w-full object-contain"
          />
        </span>

        <span className="truncate">{app.name}</span>
      </h2>

      <p className="mb-5 text-sm text-muted-foreground">
        Choose a link to launch
      </p>

      <div className="flex min-h-0 flex-1 gap-3">
        {app.urls.map((url, index) => {
          const isActive = index === active;
          let hostname = url;

          try {
            hostname = new URL(url).hostname;
          } catch {
            // Keep malformed URLs visible so the admin can spot them.
          }

          return (
            <button
              key={`${url}-${index}`}
              type="button"
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onClick={() =>
                isActive ? setLaunched(url) : setActive(index)
              }
              style={{
                background: `linear-gradient(160deg, ${app.color}, oklch(0.18 0.03 270))`,
              }}
              className={`relative min-w-0 overflow-hidden rounded-2xl border border-white/10 text-left transition-all duration-500 ${
                isActive ? "flex-5" : "flex-1"
              }`}
            >
              <span className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center">
                <AppIcon
                  icon={app.icon}
                  className="text-3xl"
                  imageClassName="h-full w-full object-contain"
                />
              </span>

              <span
                className={`absolute bottom-4 left-4 right-4 transition-opacity duration-300 ${
                  isActive ? "opacity-100" : "opacity-0"
                }`}
              >
                <span className="block text-xs uppercase tracking-widest opacity-70">
                  Link {index + 1}
                </span>

                <span className="block truncate text-lg font-semibold">
                  {hostname}
                </span>

                <span className="mt-2 inline-block rounded-full bg-primary px-4 py-1 text-sm text-primary-foreground">
                  Launch →
                </span>
              </span>

              {!isActive && (
                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm font-semibold opacity-80">
                  {index + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const wallpaperOptions: {
  value: DesktopPreferences["wallpaper"];
  label: string;
  preview: string;
}[] = [
  {
    value: "sonoma",
    label: "Sonoma Sunset",
    preview: "linear-gradient(135deg, #573b78, #ff9b53 48%, #045067)",
  },
  {
    value: "aurora",
    label: "Aurora",
    preview:
      "radial-gradient(at 20% 5%, #3bb9a4, transparent 55%), linear-gradient(135deg, #10152d, #7250bf)",
  },
  {
    value: "ocean",
    label: "Ocean",
    preview:
      "radial-gradient(at 80% 15%, #35b5cf, transparent 50%), linear-gradient(135deg, #07182f, #0c445d)",
  },
  {
    value: "midnight",
    label: "Midnight",
    preview:
      "radial-gradient(at 25% 10%, #54428f, transparent 50%), linear-gradient(135deg, #090b19, #161329)",
  },
  {
    value: "rose",
    label: "Rose",
    preview:
      "radial-gradient(at 20% 15%, #fa9bc9, transparent 50%), linear-gradient(135deg, #381d52, #bc668d)",
  },
];

function settingCardStyle(blur: number) {
  return {
    background: "rgba(255,255,255,0.055)",
    border: "1px solid rgba(255,255,255,0.09)",
    backdropFilter: `blur(${blur}px) saturate(160%)`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(160%)`,
  };
}

export function SettingsApp({
  name,
  email,
  admin,
  onSignOut,
  preferences,
  onPreferencesChange,
}: {
  name: string;
  email: string;
  admin: boolean;
  onSignOut: () => void;
  preferences: DesktopPreferences;
  onPreferencesChange: (patch: Partial<DesktopPreferences>) => void;
}) {
  const [wallpaperUrl, setWallpaperUrl] = useState(
    preferences.customWallpaper,
  );
  const [wallpaperMessage, setWallpaperMessage] = useState("");
  const cardStyle = settingCardStyle(preferences.glassBlur);

  const inputClass =
    "w-full rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-sm text-white caret-white outline-none placeholder:text-white/45 selection:bg-violet-500/40 focus:border-white/30 focus:ring-2 focus:ring-violet-400/50";

  const tabTitlePreview =
    preferences.tabTitlePreset === "custom"
      ? preferences.customTabTitle.trim() || "Sonoma Hub"
      : TAB_TITLE_PRESETS[preferences.tabTitlePreset];

  useEffect(() => {
    setWallpaperUrl(preferences.customWallpaper);
  }, [preferences.customWallpaper]);

  function applyCustomWallpaper() {
    try {
      const url = new URL(wallpaperUrl.trim());

      if (url.protocol !== "https:" && url.protocol !== "http:") {
        setWallpaperMessage("Use an http:// or https:// image URL.");
        return;
      }

      onPreferencesChange({
        wallpaper: "custom",
        customWallpaper: url.href,
      });

      setWallpaperMessage("Custom wallpaper applied.");
    } catch {
      setWallpaperMessage("Enter a valid image URL.");
    }
  }

  return (
    <div className="flex h-full min-h-0">
      <aside
        className="w-40 shrink-0 border-r border-white/10 p-3 text-sm md:w-48"
        style={cardStyle}
      >
        <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-2">
          General
        </div>
        <div className="mt-2 rounded-lg px-3 py-2 text-white/60">
          Personalization
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-5 overflow-auto p-4 md:p-6">
        <section
          className="flex items-center gap-4 rounded-2xl p-4"
          style={cardStyle}
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground">
            {name[0]?.toUpperCase() ?? "?"}
          </div>

          <div className="min-w-0">
            <div className="font-semibold">
              {name}
              {admin && (
                <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                  ADMIN
                </span>
              )}
            </div>

            <div className="break-all text-sm text-muted-foreground">
              {email}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold">Wallpaper</h2>
            <p className="mt-1 text-xs text-white/60">
              Choose a background for your desktop.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {wallpaperOptions.map((option) => {
              const selected = preferences.wallpaper === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    onPreferencesChange({ wallpaper: option.value })
                  }
                  className={`overflow-hidden rounded-xl border text-left transition hover:-translate-y-0.5 ${
                    selected
                      ? "border-white/80 ring-2 ring-white/20"
                      : "border-white/10"
                  }`}
                  style={cardStyle}
                >
                  <span
                    className="block h-20 w-full"
                    style={{ background: option.preview }}
                  />
                  <span className="block p-2 text-xs">
                    {option.label}
                    {selected && <span className="ml-1">✓</span>}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2 rounded-xl p-3" style={cardStyle}>
            <label className="block text-xs font-medium">
              Custom wallpaper image URL
            </label>

            <input
              type="url"
              value={wallpaperUrl}
              onChange={(event) => setWallpaperUrl(event.target.value)}
              placeholder="https://example.com/wallpaper.jpg"
              className={inputClass}
            />

            <button
              type="button"
              onClick={applyCustomWallpaper}
              className="rounded-lg bg-white/10 px-3 py-2 text-xs hover:bg-white/15"
            >
              Apply image URL
            </button>

            {wallpaperMessage && (
              <p role="status" className="text-xs text-white/65">
                {wallpaperMessage}
              </p>
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl p-4" style={cardStyle}>
          <div>
            <h2 className="text-base font-semibold">Browser Tab Title</h2>
            <p className="mt-1 text-xs text-white/60">
              Choose a preset or create a custom title for your browser tab.
            </p>
          </div>

          <label className="block space-y-2 text-sm">
            <span>Title template</span>
            <select
              value={preferences.tabTitlePreset}
              onChange={(event) =>
                onPreferencesChange({
                  tabTitlePreset: event.target.value as DesktopPreferences["tabTitlePreset"],
                })
              }
              className={inputClass}
            >
              <option value="sonoma">Sonoma Hub</option>
              <option value="workspace">My Workspace</option>
              <option value="focus">Focus Mode</option>
              <option value="study">Study Desk</option>
              <option value="personal">Personal Desktop</option>
              <option value="custom">Custom title</option>
            </select>
          </label>

          {preferences.tabTitlePreset === "custom" && (
            <label className="block space-y-2 text-sm">
              <span>Custom title</span>
              <input
                type="text"
                maxLength={60}
                value={preferences.customTabTitle}
                onChange={(event) =>
                  onPreferencesChange({
                    customTabTitle: event.target.value,
                  })
                }
                placeholder="Enter your title..."
                className={inputClass}
              />
            </label>
          )}

          <div
            className="rounded-xl p-3"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <p className="mb-2 text-[10px] uppercase tracking-wider text-white/50">
              Live preview
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span>🌐</span>
              <span className="truncate">{tabTitlePreview}</span>
            </div>
          </div>

          <p className="text-xs text-white/50">
            This changes the tab title only; it does not change the website address.
          </p>
        </section>

        <section className="space-y-4 rounded-2xl p-4" style={cardStyle}>
          <div>
            <h2 className="text-base font-semibold">Taskbar</h2>
            <p className="mt-1 text-xs text-white/60">
              Position and resize the translucent taskbar. Changes are saved in this browser.
            </p>
          </div>

          <label className="block space-y-2 text-sm">
            <span>Position</span>
            <select
              value={preferences.dockPosition}
              onChange={(event) =>
                onPreferencesChange({
                  dockPosition: event.target.value as DesktopPreferences["dockPosition"],
                })
              }
              className={inputClass}
            >
              <option value="bottom">Bottom · Centered</option>
              <option value="left">Left side</option>
              <option value="right">Right side</option>
            </select>
          </label>

          <label className="block space-y-2 text-sm">
            <span>Taskbar length: {preferences.dockWidth}%</span>
            <input
              type="range"
              min="35"
              max="100"
              step="1"
              value={preferences.dockWidth}
              onChange={(event) =>
                onPreferencesChange({
                  dockWidth: Number(event.target.value),
                })
              }
              className="w-full accent-violet-400"
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span>Taskbar thickness and icon size: {preferences.dockSize}px</span>
            <input
              type="range"
              min="40"
              max="68"
              step="2"
              value={preferences.dockSize}
              onChange={(event) =>
                onPreferencesChange({
                  dockSize: Number(event.target.value),
                })
              }
              className="w-full accent-violet-400"
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span>Glass blur: {preferences.glassBlur}px</span>
            <input
              type="range"
              min="12"
              max="40"
              step="2"
              value={preferences.glassBlur}
              onChange={(event) =>
                onPreferencesChange({
                  glassBlur: Number(event.target.value),
                })
              }
              className="w-full accent-violet-400"
            />
          </label>

          <button
            type="button"
            onClick={() => onPreferencesChange(DEFAULT_DESKTOP_PREFERENCES)}
            className="rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/10"
          >
            Reset desktop appearance
          </button>
        </section>

        <section className="rounded-2xl p-4 text-sm" style={cardStyle}>
          <div className="font-medium">About</div>
          <div className="mt-1 text-white/60">Sonoma Hub · Version 14.0</div>
        </section>

        <button
          type="button"
          onClick={onSignOut}
          className="rounded-lg bg-destructive px-4 py-2 text-sm text-destructive-foreground"
        >
          Log Out
        </button>
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
  const [saving, setSaving] = useState(false);

  const inputClass =
    "w-full rounded-md border border-white/15 bg-slate-950/40 px-3 py-2 text-sm text-white caret-white outline-none placeholder:text-white/45 selection:bg-violet-500/40 focus:border-white/30 focus:ring-2 focus:ring-violet-400/50";

  async function add(event: FormEvent) {
    event.preventDefault();
    setMsg(null);

    const appName = name.trim();
    const appIcon = icon.trim() || "🌐";

    const links =
      mode === "link"
        ? urls
            .split(/[\s,]+/)
            .map((value) => value.trim())
            .filter(Boolean)
        : [];

    if (!appName) {
      setMsg("Enter an app name.");
      return;
    }

    if (
      mode === "link" &&
      (!links.length ||
        links.some((value) => {
          try {
            const parsed = new URL(value);
            return parsed.protocol !== "http:" && parsed.protocol !== "https:";
          } catch {
            return true;
          }
        }))
    ) {
      setMsg("Enter one or more valid http:// or https:// links.");
      return;
    }

    if (mode === "html" && !html.trim()) {
      setMsg("Enter the HTML code for the app.");
      return;
    }

    setSaving(true);

    try {
      const hue = Math.floor(Math.random() * 360);

      const { error } = await supabase.from("hub_apps").insert({
        name: appName,
        icon: appIcon,
        kind,
        color: `oklch(0.6 0.18 ${hue})`,
        urls: links,
        html: mode === "html" ? html : null,
      });

      if (error) {
        setMsg(`Could not add app: ${error.message}`);
      } else {
        setMsg(`Added ${appName}!`);
        setName("");
        setIcon("🌐");
        setUrls("");
        setHtml("");
      }
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Unable to add app.");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (
      !window.confirm(
        "Delete this app for everyone? This cannot be undone.",
      )
    ) {
      return;
    }

    const { error } = await supabase.from("hub_apps").delete().eq("id", id);

    setMsg(error ? `Could not delete app: ${error.message}` : "App deleted.");
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-2 gap-0 overflow-hidden">
      <form
        onSubmit={add}
        className="min-h-0 space-y-3 overflow-auto border-r border-white/10 p-5"
      >
        <h2 className="text-lg font-semibold">Add app or proxy</h2>

        <div className="flex gap-2">
          <input
            aria-label="App icon or image path"
            className={`${inputClass} w-16 shrink-0 text-center`}
            value={icon}
            onChange={(event) => setIcon(event.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>

        <p className="text-xs text-white/55">
          Use an emoji or an image path such as /icons/nebulo.png.
        </p>

        <select
          aria-label="App type"
          className={inputClass}
          value={kind}
          onChange={(event) => setKind(event.target.value)}
        >
          <option value="proxy">Proxy</option>
          <option value="game">Game</option>
          <option value="app">App</option>
        </select>

        <div className="flex rounded-md border border-white/10 bg-white/5 p-0.5 text-sm">
          {(["link", "html"] as const).map((choice) => (
            <button
              type="button"
              key={choice}
              onClick={() => setMode(choice)}
              className={`flex-1 rounded py-1.5 ${
                mode === choice ? "bg-white/15" : ""
              }`}
            >
              {choice === "link" ? "Links" : "HTML code"}
            </button>
          ))}
        </div>

        {mode === "link" ? (
          <textarea
            className={`${inputClass} h-28 font-mono text-xs`}
            placeholder="One link per line"
            value={urls}
            onChange={(event) => setUrls(event.target.value)}
            required
          />
        ) : (
          <textarea
            className={`${inputClass} h-48 font-mono text-xs`}
            placeholder="<html>…</html>"
            value={html}
            onChange={(event) => setHtml(event.target.value)}
            required
          />
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-primary py-2 text-sm text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Publishing…" : "Publish to everyone"}
        </button>

        {msg && (
          <p role="status" className="wrap-break-word text-xs text-white/65">
            {msg}
          </p>
        )}
      </form>

      <div className="min-h-0 overflow-auto p-5">
        <h2 className="mb-3 text-lg font-semibold">
          Live apps ({apps.length})
        </h2>

        <ul className="space-y-1.5">
          {apps.map((app) => (
            <li
              key={app.id}
              className="flex min-w-0 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center">
                <AppIcon
                  icon={app.icon}
                  className="text-xl leading-none"
                  imageClassName="h-full w-full object-contain"
                />
              </span>

              <span className="min-w-0 flex-1 truncate">{app.name}</span>

              <span className="shrink-0 text-xs text-white/55">
                {app.kind}
              </span>

              <button
                type="button"
                onClick={() => void del(app.id)}
                className="shrink-0 text-xs text-destructive hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}