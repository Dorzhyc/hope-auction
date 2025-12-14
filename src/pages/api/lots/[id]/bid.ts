import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { computeMinBid } from "@/lib/bids";

const Body = z.object({
  email: z.string().email().max(254),
  nickname: z.string().min(2).max(32),
  amount: z.number().int().positive(),
});

function getClientIp(req: NextApiRequest): string | null {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string") return xf.split(",")[0].trim();
  return (req.socket.remoteAddress ?? null) as any;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("BID API HIT", req.method, req.query, req.body);

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const parse = Body.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: "Неверные данные ставки" });
    }

  const { email, nickname, amount } = parse.data;
  const pool = getPool();

  const ip = getClientIp(req);
  const ua = req.headers["user-agent"] ?? null;

  // Rate limit: <= 3 bids/min per IP (count both accepted and rejected, to reduce brute force)
  if (ip) {
    const rl = await pool.query(`
      SELECT COUNT(*)::int AS c
      FROM bids
      WHERE client_ip = $1 AND created_at >= (now() - interval '60 seconds')
    `, [ip]);
    if (rl.rows[0].c >= 3) {
      await pool.query(
        `INSERT INTO bids(lot_id,email,nickname,amount,status,reject_reason,client_ip,user_agent)
         VALUES ($1,$2,$3,$4,'rejected','rate_limited',$5,$6)`,
        [Number(req.query.id), email.toLowerCase(), nickname, amount, ip, ua]
      );
      return res.status(429).json({ accepted: false, reason: "Слишком часто. Не более 3 ставок в минуту с одного IP." });
    }
  }

  // Transaction with row lock to prevent races
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const auctionR = await client.query(`SELECT ends_at, is_active, winners_finalized FROM auction_settings WHERE id=1 FOR UPDATE`);
    if (auctionR.rowCount === 0) throw new Error("auction_settings missing");
    const auction = auctionR.rows[0];

    const now = new Date();
    const endsAt = new Date(auction.ends_at);
    const auctionOpen = auction.is_active && now < endsAt;

    const lotR = await client.query(`SELECT * FROM lots WHERE id=$1 FOR UPDATE`, [Number(req.query.id)]);
    if (lotR.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Лот не найден" });
    }
    const lot = lotR.rows[0];

    if (!auctionOpen || lot.status === "ended") {
      await client.query(`
        INSERT INTO bids(lot_id,email,nickname,amount,status,reject_reason,client_ip,user_agent)
        VALUES ($1,$2,$3,$4,'rejected','auction_ended',$5,$6)
      `, [lot.id, email.toLowerCase(), nickname, amount, ip, ua]);
      await client.query("COMMIT");
      return res.status(400).json({ accepted: false, reason: "Аукцион завершён. Ставки не принимаются." });
    }

    const P = Number(lot.current_price);
    const minBid = computeMinBid(P);

    if (amount < minBid) {
      await client.query(`
        INSERT INTO bids(lot_id,email,nickname,amount,status,reject_reason,client_ip,user_agent)
        VALUES ($1,$2,$3,$4,'rejected','below_min',$5,$6)
      `, [lot.id, email.toLowerCase(), nickname, amount, ip, ua]);
      await client.query("COMMIT");
      return res.status(400).json({ accepted: false, reason: `Минимальная ставка сейчас: ${minBid} ₽` });
    }

    if (amount >= P * 20) {
      await client.query(`
        INSERT INTO bids(lot_id,email,nickname,amount,status,reject_reason,client_ip,user_agent)
        VALUES ($1,$2,$3,$4,'rejected','too_high',$5,$6)
      `, [lot.id, email.toLowerCase(), nickname, amount, ip, ua]);
      await client.query("COMMIT");
      return res.status(400).json({ accepted: false, reason: "Ставка слишком большая (≥ 20× текущей цены) — отклонена." });
    }

    // Accept
    const bidIns = await client.query(`
      INSERT INTO bids(lot_id,email,nickname,amount,status,reject_reason,client_ip,user_agent)
      VALUES ($1,$2,$3,$4,'accepted',NULL,$5,$6)
      RETURNING id
    `, [lot.id, email.toLowerCase(), nickname, amount, ip, ua]);

    await client.query(`
      UPDATE lots
      SET current_price = $1,
          bids_count = bids_count + 1,
          updated_at = now()
      WHERE id = $2
    `, [amount, lot.id]);

    await client.query(`
  INSERT INTO audit_log(actor, action, payload_json, client_ip)
  VALUES (
    'guest',
    'bid_accepted',
    jsonb_build_object(
      'lot_id', $1::int,
      'amount', $2::int,
      'nickname', $3::text
    ),
    $4::text
  )
`, [lot.id, amount, nickname, ip ?? ""]);

    await client.query("COMMIT");
    return res.status(200).json({ accepted: true, bid_id: bidIns.rows[0].id });
  } catch (e: any) {
  await client.query("ROLLBACK");
  console.error("BID TX ERROR:", e);
  return res.status(500).json({ error: e?.message ? e.message : String(e) });

} finally {
    client.release();
  }
} catch (e: any) {
  console.error("BID OUTER ERROR:", e);
  return res.status(500).json({ error: e?.message ? e.message : String(e) });
}
}
