"use client";

import { Button } from "@/components/ui/button";
import { useAppStore, type ViewKey } from "@/lib/store";
import {
  ClipboardList,
  FileSpreadsheet,
  ArrowRightCircle,
  FileText,
  FlaskConical,
} from "lucide-react";

interface SubTab {
  key: ViewKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SUB_TABS: SubTab[] = [
  { key: "evaluations", label: "Notes", icon: ClipboardList },
  { key: "essais", label: "Essais", icon: FlaskConical },
  { key: "synthese", label: "Synthèse", icon: FileSpreadsheet },
  { key: "proposition", label: "Proposition de Passage", icon: ArrowRightCircle },
  { key: "bulletins", label: "Bulletins", icon: FileText },
];

export function EvaluationsSubTabs({ active }: { active: string }) {
  const setView = useAppStore((s) => s.setView);
  return (
    <div className="flex flex-wrap gap-2 mb-4 border-b pb-2">
      {SUB_TABS.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.key;
        return (
          <Button
            key={t.key}
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            className={`gap-1.5 ${isActive ? "font-semibold" : ""}`}
            onClick={() => setView(t.key)}
          >
            <Icon className="h-4 w-4" /> {t.label}
          </Button>
        );
      })}
    </div>
  );
}
