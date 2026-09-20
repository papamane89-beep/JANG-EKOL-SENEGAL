"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { LoginView } from "@/views/login-view";
import { Loader2 } from "lucide-react";

export default function Home() {
  const user = useAppStore((s) => s.user);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Différé pour éviter le rendu en cascade (setState asynchrone hors du corps de l'effect)
    const t = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(t);
  }, []);

  // Plein écran adaptatif
  useEffect(() => {
    document.documentElement.classList.add("h-full");
    document.body.classList.add("h-full", "overflow-hidden");
    return () => {
      document.body.classList.remove("h-full", "overflow-hidden");
    };
  }, []);

  if (!hydrated) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return <AppShell />;
}
