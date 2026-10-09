import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Desktop } from "@/components/os/Desktop";
import { LoginScreen } from "@/components/os/LoginScreen";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sonoma Hub — Proxies, Games & Apps" },
      { name: "description", content: "A macOS Sonoma–style desktop hub for proxies, games, a browser and chat." },
      { property: "og:title", content: "Sonoma Hub" },
      { property: "og:description", content: "A macOS Sonoma–style desktop hub for proxies, games, a browser and chat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  if (user === undefined) return <div className="fixed inset-0 bg-background" />;
  return user ? <Desktop user={user} /> : <LoginScreen />;
}
