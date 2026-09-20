"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Lock, User, Mail } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import {
  DrapeauSenegal,
  MinistereLogo,
} from "@/components/official-logos";

export function LoginView() {
  const setUser = useAppStore((s) => s.setUser);
  const setView = useAppStore((s) => s.setView);
  const [login, setLogin] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(true);

  // Initialisation auto de la base au premier lancement
  useEffect(() => {
    (async () => {
      try {
        await fetch("/api/seed", { method: "POST" });
      } catch {
        /* ignore */
      } finally {
        setSeeding(false);
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login || !motDePasse) return;
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, motDePasse }),
      });
      const j = await r.json();
      if (!r.ok) {
        toast.error(j.error || "Connexion échouée");
        return;
      }
      setUser(j.data);
      setView("dashboard");
      toast.success("Bienvenue " + j.data.prenom);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  if (seeding) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Initialisation de la base de données...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-background via-background to-accent/30">
      {/* En-tête officielle */}
      <div className="republic-header px-6 py-3">
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
          <DrapeauSenegal className="h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0" />
          <div className="flex-1 text-center">
            <p className="text-sm sm:text-base font-bold text-foreground">
              République du Sénégal
            </p>
            <p className="text-[11px] sm:text-xs text-primary italic font-medium">
              Un peuple — Un but — Une foi
            </p>
            <p className="text-xs sm:text-sm font-semibold text-foreground/90 mt-0.5">
              Ministère de l&apos;Éducation Nationale
            </p>
          </div>
          <MinistereLogo className="h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0" />
        </div>
      </div>

      {/* Corps */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-border/60 overflow-hidden">
            {/* Bandeau logo */}
            <div className="bg-gradient-to-br from-primary to-primary/80 px-6 py-10 text-center text-primary-foreground">
              <div className="mx-auto h-28 w-28 rounded-3xl overflow-hidden bg-white ring-2 ring-white/30 shadow-xl mb-4 flex items-center justify-center">
                <img
                  src="/resources/app-logo.png"
                  alt="JANG EKOL SENEGAL"
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">JANG EKOL</h1>
              <p className="text-sm text-primary-foreground/85 mt-1 font-medium tracking-wide">
                SENEGAL — Gestion Scolaire
              </p>
            </div>

            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login" className="text-sm font-medium">
                    Identifiant
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login"
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      className="pl-9"
                      placeholder="Entrez votre identifiant"
                      autoComplete="username"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mdp" className="text-sm font-medium">
                    Mot de passe
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="mdp"
                      type="password"
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                      className="pl-9"
                      placeholder="Entrez votre mot de passe"
                      autoComplete="current-password"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                  size="lg"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Se connecter
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="text-center mt-6 space-y-1">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} JANG EKOL SENEGAL — Tous droits réservés
            </p>
            <a
              href="mailto:papamane89@gmail.com"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Mail className="h-3 w-3" />
              papamane89@gmail.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
