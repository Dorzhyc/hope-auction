import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { requireAdmin } from "../_guard";

const Patch = z.object({
  status: z.enum(["active","hidden","ended"]).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireAdmin(req as any, res as any))) return;

  const pool = getPool();
  const id = Number(req.query.id);

  if (req.method === "PATCH") {
    const parse = Patch.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: "Bad request" });

    const { status } = parse.data;
    if (status) {
      await pool.query(`UPDATE lots SET status=$1, updated_at=now() WHERE id=$2`, [status, id]);
      await pool.query(`INSERT INTO audit_log(actor, action, payload_json) VALUES ('admin','lot_status', jsonb_build_object('lot_id',$1,'status',$2))`, [id, status]);
    }
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
