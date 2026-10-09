import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { HubApp } from "@/lib/hub";
import { CHAT_URL } from "@/lib/hub";

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

  const go = (e: React.FormEvent) => {
    e.preventDefault();

    let nextUrl = input.trim();

    if (!/^https?:\/\//i.test(nextUrl)) {
      nextUrl = nextUrl.includes(".")
        ? `https://${nextUrl}`
        : `https://duckduckgo.com/?q=${encodeURIComponent(nextUrl)}`;
    }

    setUrl(nextUrl);
    setInput(nextUrl);
  };

  return (
    <div className="flex h-full flex-col">
      <form
        onSubmit={go}
        className="flex items-center gap-2 border-b border-border px-3 py-2"
      >
        <button
          type="button"
          onClick={() => setUrl((current) => current)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Reload page"
          title="Reload"
        >
          ↻
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 rounded-md bg-muted px-3 py-1 text-center text-xs outline-none focus:ring-2 focus:ring-ring"
          aria-label="Website address or search"
        />
      </form>

      <div className="min-h-0 flex-1">
        <Frame key={url} src={url} />
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
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-xs">
          <button
            type="button"
            onClick={() => setLaunched(null)}
            className="rounded bg-muted px-2 py-0.5 hover:bg-accent"
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
    <div className="flex h-full flex-col p-6">
      <h2 className="text-2xl font-semibold">
        {app.icon} {app.name}
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
            // Keep the original URL visible if it's malformed.
          }

          return (
            <button
              key={`${url}-${index}`}
              type="button"
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onClick={() => {
                if (isActive) {
                  setLaunched(url);
                } else {
                  setActive(index);
                }
              }}
              style={{
                background: `linear-gradient(160deg, ${app.color}, oklch(0.18 0.03 270))`,
              }}
              className={`relative min-w-0 overflow-hidden rounded-2xl border border-border text-left transition-all duration-500 ease-[cubic-bezier(.2,.8,.2,1)] ${
                isActive ? "flex-5" : "flex-1"
              }`}
            >
              <span
                className={`absolute left-4 top-4 text-4xl transition-transform duration-500 ${
                  isActive ? "scale-125" : ""
                }`}
              >
                {app.icon}
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

export function SettingsApp({
  name,
  email,
  admin,
  onSignOut,
}: {
  name: string;
  email: string;
  admin: boolean;
  onSignOut: () => void;
}) {
  return (
    <div className="flex h-full">
      <aside className="w-48 shrink-0 border-r border-border p-3 text-sm">
        <div className="rounded-md bg-primary px-2 py-1 text-primary-foreground">
          General
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-4 overflow-auto p-6">
        <div className="flex items-center gap-4 rounded-xl bg-muted p-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground">
            {name[0]?.toUpperCase() ?? "?"}
          </div>

          <div className="min-w-0">
            <div className="font-semibold">
              {name}

              {admin && (
                <span className="ml-1 rounded bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                  ADMIN
                </span>
              )}
            </div>

            <div className="break-all text-sm text-muted-foreground">
              {email}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-muted p-4 text-sm">
          <div className="font-medium">About</div>
          <div className="text-muted-foreground">
            Sonoma Hub · Version 14.0
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="rounded-md bg-destructive px-4 py-1.5 text-sm text-destructive-foreground"
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
  const [deleting, setDeleting] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const cleanName = name.trim();
    const cleanIcon = icon.trim() || "🌐";
    const hue = Math.floor(Math.random() * 360);

    const list =
      mode === "link"
        ? urls
            .split(/[\s,]+/)
            .map((value) => value.trim())
            .filter(Boolean)
        : [];

    if (!cleanName) {
      setMsg("Please enter an app name.");
      return;
    }

    if (mode === "link") {
      const invalidUrl = list.find((value) => {
        try {
          const parsed = new URL(value);
          return parsed.protocol !== "http:" && parsed.protocol !== "https:";
        } catch {
          return true;
        }
      });

      if (!list.length || invalidUrl) {
        setMsg("Enter one or more valid http:// or https:// links.");
        return;
      }
    }

    if (mode === "html" && !html.trim()) {
      setMsg("Enter the HTML content for your app.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("hub_apps").insert({
        name: cleanName,
        icon: cleanIcon,
        kind,
        color: `oklch(0.6 0.18 ${hue})`,
        urls: list,
        html: mode === "html" ? html : null,
      });

      if (error) {
        setMsg(`Could not add app: ${error.message}`);
        return;
      }

      setMsg(`Added ${cleanName}!`);
      setName("");
      setIcon("🌐");
      setUrls("");
      setHtml("");
    } catch (error) {
      setMsg(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeApp(id: string) {
    const confirmed = window.confirm(
      "Delete this app for everyone? This cannot be undone.",
    );

    if (!confirmed) return;

    setDeleting(id);
    setMsg(null);

    try {
      const { error } = await supabase
        .from("hub_apps")
        .delete()
        .eq("id", id);

      if (error) {
        setMsg(`Could not delete app: ${error.message}`);
      } else {
        setMsg("App deleted.");
      }
    } catch (error) {
      setMsg(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
      );
    } finally {
      setDeleting(null);
    }
  }

  const inputClass =
    "w-full rounded-md bg-muted px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="grid h-full min-h-0 grid-cols-2 gap-0 overflow-hidden">
      <form
        onSubmit={add}
        className="min-h-0 space-y-3 overflow-auto border-r border-border p-5"
      >
        <h2 className="text-lg font-semibold">Add app or proxy</h2>

        <div className="flex gap-2">
          <input
            aria-label="App icon"
            className={`${inputClass} w-16 shrink-0 text-center`}
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
          />

          <input
            className={inputClass}
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <select
          aria-label="App type"
          className={inputClass}
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="proxy">Proxy</option>
          <option value="game">Game</option>
          <option value="app">App</option>
        </select>

        <div className="flex rounded-md bg-muted p-0.5 text-sm">
          {(["link", "html"] as const).map((choice) => (
            <button
              type="button"
              key={choice}
              onClick={() => setMode(choice)}
              className={`flex-1 rounded py-1 ${
                mode === choice ? "bg-accent" : ""
              }`}
            >
              {choice === "link" ? "Links" : "HTML code"}
            </button>
          ))}
        </div>

        {mode === "link" ? (
          <textarea
            className={`${inputClass} h-28 font-mono text-xs`}
            placeholder="One full URL per line (https://...)"
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            required
          />
        ) : (
          <textarea
            className={`${inputClass} h-48 font-mono text-xs`}
            placeholder="<html>…</html>"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            required
          />
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-primary py-1.5 text-sm text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Publishing…" : "Publish to everyone"}
        </button>

        {msg && (
          <p role="status" className="break-words text-xs text-muted-foreground">
            {msg}
          </p>
        )}
      </form>

      <div className="min-h-0 overflow-auto p-5">
        <h2 className="mb-3 text-lg font-semibold">
          Live apps ({apps.length})
        </h2>

        {apps.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No apps have been published yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {apps.map((app) => (
              <li
                key={app.id}
                className="flex min-w-0 items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm"
              >
                <span>{app.icon}</span>

                <span className="min-w-0 flex-1 truncate">
                  {app.name}
                </span>

                <span className="shrink-0 text-xs text-muted-foreground">
                  {app.kind}
                </span>

                <button
                  type="button"
                  onClick={() => void removeApp(app.id)}
                  disabled={deleting === app.id}
                  className="shrink-0 text-xs text-destructive disabled:opacity-50"
                >
                  {deleting === app.id ? "Deleting…" : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}