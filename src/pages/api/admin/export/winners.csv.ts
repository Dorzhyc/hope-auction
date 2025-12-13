import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/db";
import { requireAdmin } from "../_guard";
import { formatMskMinute } from "@/lib/time";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireAdmin(req as any, res as any))) return;

  const pool = getPool();
  const r = await pool.query(`
    SELECT l.id, l.title, l.winner_nickname, l.winning_amount,
           b.email, b.created_at AS bid_time
    FROM lots l
    LEFT JOIN bids b ON b.id = l.winning_bid_id
    WHERE l.status='ended' AND l.status <> 'hidden'
    ORDER BY l.id ASC
  `);

  const header = ["lot_id","title","winner_nickname","winning_amount","winner_email","winning_bid_time_msk"];
  const rows = [header.join(",")].concat(r.rows.map(x => {
    const time = x.bid_time ? formatMskMinute(x.bid_time) : "";
    const cols = [
      x.id,
      `"${String(x.title).replaceAll('"','""')}"`,
      x.winner_nickname ? `"${String(x.winner_nickname).replaceAll('"','""')}"` : "",
      x.winning_amount ?? "",
      x.email ? `"${String(x.email).replaceAll('"','""')}"` : "",
      time ? `"${time}"` : ""
    ];
    return cols.join(",");
  }));

  const csv = rows.join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=winners.csv");
  res.status(200).send(csv);
}
