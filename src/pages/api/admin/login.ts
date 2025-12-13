import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { makeAdminToken, setAdminCookie } from "@/lib/adminAuth";

const Body = z.object({ password: z.string().min(1) });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const parse = Body.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Bad request" });

  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminPass) return res.status(500).json({ error: "ADMIN_PASSWORD not set" });

  if (parse.data.password !== adminPass) return res.status(401).json({ error: "Неверный пароль" });

  const token = await makeAdminToken();
  res.setHeader("Set-Cookie", setAdminCookie(token));
  res.status(200).json({ ok: true });
}
