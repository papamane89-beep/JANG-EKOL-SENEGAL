import { createHash, randomBytes } from "crypto";

// Hachage simple du mot de passe (SHA-256 + sel)
export function hashPassword(password: string, salt?: string): string {
  const s = salt ?? randomBytes(8).toString("hex");
  const hash = createHash("sha256")
    .update(s + password)
    .digest("hex");
  return `${s}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = createHash("sha256").update(salt + password).digest("hex");
  return test === hash;
}

// Session simple côté serveur (en mémoire)
interface Session {
  userId: string;
  login: string;
  nom: string;
  prenom: string;
  role: string;
  createdAt: number;
}

const sessions = new Map<string, Session>();

const SESSION_TTL = 1000 * 60 * 60 * 12; // 12h

export function createSession(user: {
  id: string;
  login: string;
  nom: string;
  prenom: string;
  role: string;
}): string {
  const token = randomBytes(24).toString("hex");
  sessions.set(token, { ...user, createdAt: Date.now() });
  return token;
}

export function getSession(token?: string | null): Session | null {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() - s.createdAt > SESSION_TTL) {
    sessions.delete(token);
    return null;
  }
  return s;
}

export function destroySession(token?: string | null) {
  if (token) sessions.delete(token);
}

export function getTokenFromRequest(req: Request): string | null {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/jang_token=([^;]+)/);
  return match ? match[1] : null;
}
