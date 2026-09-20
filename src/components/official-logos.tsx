"use client";

import Image from "next/image";

export function DrapeauSenegal({ className }: { className?: string }) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <img
        src="/resources/drapeau-senegal.svg"
        alt="Drapeau du Sénégal"
        className="w-full h-full object-contain"
      />
    </div>
  );
}

export function MinistereLogo({ className }: { className?: string }) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <img
        src="/resources/ministere-education.jpg"
        alt="Logo Ministère de l'Éducation Nationale"
        className="w-full h-full object-contain"
      />
    </div>
  );
}

export function EtabLogo({
  className,
  path,
}: {
  className?: string;
  path?: string | null;
}) {
  if (!path) {
    return (
      <div
        className={`relative ${className ?? ""} bg-primary/10 flex items-center justify-center`}
      >
        <span className="text-primary font-bold text-xs">ÉCOLE</span>
      </div>
    );
  }
  return (
    <div className={`relative ${className ?? ""}`}>
      <Image
        src={path}
        alt="Logo de l'établissement"
        fill
        className="object-contain"
      />
    </div>
  );
}
