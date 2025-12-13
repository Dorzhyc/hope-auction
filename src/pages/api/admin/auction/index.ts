import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { requireAdmin } from "../_guard";
import { formatMskMinute } from "@/lib/time";

const Patch = z.object({ ends_at: z.string().min(10) });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireAdmin(req as any, res as any))) return;

  const pool = getPool();

  if (req.method === "GET") {
    const r = await pool.query(`SELECT ends_at,is_active,winners_finalized FROM auction_settings WHERE id=1`);
    const row = r.rows[0];
    return res.json({ ...row, ends_at_msk: formatMskMinute(row.ends_at) });
  }

  if (req.method === "PATCH") {
    const parse = Patch.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: "Bad request" });

    const endsAt = parse.data.ends_at;
    // PostgreSQL will parse ISO 8601 with +03:00
    await pool.query(`UPDATE auction_settings SET ends_at=$1, updated_at=now(), winners_finalized=FALSE WHERE id=1`, [endsAt]);
    await pool.query(`INSERT INTO audit_log(actor, action, payload_json) VALUES ('admin','auction_ends_at', jsonb_build_object('ends_at',$1))`, [endsAt]);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
