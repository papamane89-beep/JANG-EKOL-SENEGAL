import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CYCLES } from "@/lib/data";

export async function GET() {
  try {
    let cycles = await db.cycle.findMany({ orderBy: { ordre: "asc" } });
    // Auto-création si vide
    if (cycles.length === 0) {
      for (const c of CYCLES) {
        await db.cycle.create({ data: { nom: c.nom, ordre: c.ordre } });
      }
      cycles = await db.cycle.findMany({ orderBy: { ordre: "asc" } });
    }
    return NextResponse.json({ data: cycles });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
