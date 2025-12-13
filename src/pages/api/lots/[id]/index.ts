import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/db";
import { computeMinBid } from "@/lib/bids";
import { formatMskMinute } from "@/lib/time";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const pool = getPool();

  const lotR = await pool.query(`
    SELECT id, title, description, start_price, current_price, bids_count, status,
           winner_nickname, winning_amount,
           (SELECT created_at FROM bids WHERE id = lots.winning_bid_id) AS winning_time
    FROM lots
    WHERE id = $1
  `, [id]);

  if (lotR.rowCount === 0) return res.status(404).json({ error: "Not found" });
  const lot = lotR.rows[0];

  const auctionR = await pool.query(`SELECT ends_at, is_active FROM auction_settings WHERE id=1`);
  const auction = auctionR.rows[0];

  const bidsR = await pool.query(`
    SELECT id, nickname, amount, created_at
    FROM bids
    WHERE lot_id = $1 AND status='accepted'
    ORDER BY created_at DESC
    LIMIT 100
  `, [id]);

  const minBid = computeMinBid(Number(lot.current_price));

  res.json({
    lot: {
      ...lot,
      winning_time_msk: lot.winning_time ? formatMskMinute(lot.winning_time) : null
    },
    auction: {
      ends_at: auction.ends_at,
      is_active: auction.is_active && (new Date() < new Date(auction.ends_at))
    },
    min_bid: minBid,
    bids: bidsR.rows.map(b => ({ ...b, time_msk: formatMskMinute(b.created_at) }))
  });
}
