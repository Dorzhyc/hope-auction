import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { requireAdmin } from "../_guard";

const Create = z.object({
  title: z.string().min(2).max(200),
  description: z.string().min(2).max(20000),
  start_price: z.number().int().positive(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireAdmin(req as any, res as any))) return;

  const pool = getPool();

  if (req.method === "GET") {
    const r = await pool.query(`SELECT id,title,description,start_price,current_price,bids_count,status FROM lots ORDER BY id ASC`);
    return res.json({ lots: r.rows });
  }

  if (req.method === "POST") {
    const parse = Create.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: "Bad request" });
    const { title, description, start_price } = parse.data;

    const r = await pool.query(`
      INSERT INTO lots(title,description,start_price,current_price,bids_count,status)
      VALUES ($1,$2,$3,$3,0,'active')
      RETURNING id
    `, [title, description, start_price]);

    await pool.query(`INSERT INTO audit_log(actor, action, payload_json) VALUES ('admin','lot_created', jsonb_build_object('lot_id',$1))`, [r.rows[0].id]);
    return res.status(200).json({ ok: true, id: r.rows[0].id });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
