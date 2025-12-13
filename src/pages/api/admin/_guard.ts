import { getAdminCookie, isAdmin } from "@/lib/adminAuth";

export async function requireAdmin(req: any, res: any): Promise<boolean> {
  const token = getAdminCookie(req);
  const ok = await isAdmin(token);
  if (!ok) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}
