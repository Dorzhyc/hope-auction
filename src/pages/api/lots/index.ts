import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const pool = getPool();
  const r = await pool.query(`
    SELECT id, title, current_price, start_price, bids_count, status, images
    FROM lots
    WHERE status <> 'hidden'
    ORDER BY id ASC
  `);
  res.json({ lots: r.rows });
}
