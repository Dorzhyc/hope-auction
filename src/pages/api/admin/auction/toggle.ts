import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/db";
import { requireAdmin } from "../_guard";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!(await requireAdmin(req as any, res as any))) return;

  const pool = getPool();
  await pool.query(`UPDATE auction_settings SET is_active = NOT is_active, updated_at=now() WHERE id=1`);
  await pool.query(`INSERT INTO audit_log(actor, action, payload_json) VALUES ('admin','auction_toggle', '{}'::jsonb)`);
  res.json({ ok: true });
}
