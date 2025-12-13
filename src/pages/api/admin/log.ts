import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/db";
import { requireAdmin } from "./_guard";
import { formatMskMinute } from "@/lib/time";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireAdmin(req as any, res as any))) return;
  const pool = getPool();
  const r = await pool.query(`
    SELECT id, action, payload_json, created_at
    FROM audit_log
    ORDER BY created_at DESC
    LIMIT 100
  `);
  res.json({
    items: r.rows.map(x => ({
      id: x.id,
      action: x.action,
      payload: x.payload_json,
      time_msk: formatMskMinute(x.created_at),
    }))
  });
}
