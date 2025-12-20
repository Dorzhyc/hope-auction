import { serialize, parse } from "cookie";
import bcrypt from "bcryptjs";

const COOKIE_NAME = "hope_admin";

export function getAdminCookie(req: { headers: Record<string, string | string[] | undefined> }): string | null {
  const cookieHeader = req.headers["cookie"];
  if (!cookieHeader) return null;
  const cookies = parse(Array.isArray(cookieHeader) ? cookieHeader.join(";") : cookieHeader);
  return cookies[COOKIE_NAME] ?? null;
}

export function setAdminCookie(value: string): string {
  return serialize(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12, // 12h
  });
}

export function clearAdminCookie(): string {
  return serialize(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}

// Very simple stateless cookie: store a bcrypt hash of ADMIN_PASSWORD and compare.
// Not perfect, but ok for MVP. For production, use proper sessions.
export async function isAdmin(value: string | null): Promise<boolean> {
  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminPass || !value) return false;
  // value is hash(adminPass)
  return await bcrypt.compare(adminPass, value);
}

export async function makeAdminToken(): Promise<string> {
  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminPass) throw new Error("ADMIN_PASSWORD is required");
  return await bcrypt.hash(adminPass, 10);
  }
export async function isAdminRequest(req: any): Promise<boolean> {
  const token = getAdminCookie(req);
  return isAdmin(token);
}
