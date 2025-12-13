import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/db";
import { formatMskMinute } from "@/lib/time";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const pool = getPool();
  const r = await pool.query(`SELECT ends_at, is_active, winners_finalized FROM auction_settings WHERE id=1`);
  if (r.rowCount === 0) {
    return res.status(500).json({ error: "auction_settings not initialized. Run db:migrate and db:seed." });
  }
  const row = r.rows[0];
  res.json({
    ends_at: row.ends_at,
    ends_at_msk: formatMskMinute(row.ends_at),
    is_active: row.is_active,
    winners_finalized: row.winners_finalized,
    server_time: new Date().toISOString()
  });
}
