import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminCookie, isAdmin } from "@/lib/adminAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = getAdminCookie(req as any);
  const ok = await isAdmin(token);
  if (!ok) return res.status(401).json({ error: "unauthorized" });
  res.json({ ok: true });
}
