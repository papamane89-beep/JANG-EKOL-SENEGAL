"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";

interface PageHeaderProps {
  title: string;
  description?: string;
  onBack?: () => void;
  backTo?: import("@/lib/store").ViewKey;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  onBack,
  backTo,
  actions,
}: PageHeaderProps) {
  const setView = useAppStore((s) => s.setView);

  const handleBack = () => {
    if (onBack) return onBack();
    if (backTo) setView(backTo);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="outline"
          size="icon"
          onClick={handleBack}
          className="flex-shrink-0"
          aria-label="Retour"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground tracking-tight truncate">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
