import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/db";
import { requireAdmin } from "../_guard";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!(await requireAdmin(req as any, res as any))) return;

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const a = await client.query(`SELECT ends_at, winners_finalized FROM auction_settings WHERE id=1 FOR UPDATE`);
    if (a.rowCount === 0) throw new Error("auction_settings missing");
    const endsAt = new Date(a.rows[0].ends_at);
    if (new Date() < endsAt) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Нельзя фиксировать победителей до окончания аукциона." });
    }

    // For each lot, find last accepted highest bid (since we enforce increasing, current_price is last accepted)
    // We'll set winner to the latest accepted bid for that lot.
    await client.query(`
      UPDATE lots l
      SET status='ended',
          winner_nickname = b.nickname,
          winning_amount = b.amount,
          winning_bid_id = b.id,
          updated_at=now()
      FROM LATERAL (
        SELECT id, nickname, amount
        FROM bids
        WHERE lot_id = l.id AND status='accepted'
        ORDER BY amount DESC, created_at ASC
        LIMIT 1
      ) b
      WHERE l.status <> 'hidden'
        AND EXISTS (SELECT 1 FROM bids WHERE lot_id=l.id AND status='accepted')
    `);

    // Lots with no bids: mark ended but no winner
    await client.query(`
      UPDATE lots
      SET status='ended', updated_at=now()
      WHERE status <> 'hidden' AND NOT EXISTS (SELECT 1 FROM bids WHERE lot_id=lots.id AND status='accepted')
    `);

    await client.query(`UPDATE auction_settings SET winners_finalized=TRUE, is_active=FALSE, updated_at=now() WHERE id=1`);
    await client.query(`INSERT INTO audit_log(actor, action, payload_json) VALUES ('admin','winners_finalized','{}'::jsonb)`);

    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Ошибка финализации" });
  } finally {
    client.release();
  }
}
