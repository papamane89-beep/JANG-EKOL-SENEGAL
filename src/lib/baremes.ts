import { db } from "@/lib/db";
import { BAREMES_PAR_ETAPE } from "@/lib/data";

// Récupère les barèmes réels (sur) par activité pour un cycle + étape donnés.
// Priorité : ParametreNotation (DB) > BAREMES_PAR_ETAPE (défaut) > 10
export async function getBaremeMap(
  cycleId: string,
  etape: number
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  // 1. Defaults depuis les constantes
  const defaults = BAREMES_PAR_ETAPE[etape];
  if (defaults) {
    for (const [domaine, acts] of Object.entries(defaults)) {
      for (const [activite, sur] of Object.entries(acts)) {
        map.set(`${domaine}|${activite}`, sur);
      }
    }
  }
  // 2. Override depuis la DB (ParametreNotation)
  try {
    const params = await db.parametreNotation.findMany({
      where: { cycleId, etape },
    });
    for (const p of params) {
      map.set(`${p.domaine}|${p.activite}`, p.sur);
    }
  } catch {
    /* ignore si table non disponible */
  }
  return map;
}

// Clé de barème
export function baremeKey(domaine: string, activite: string) {
  return `${domaine}|${activite}`;
}
