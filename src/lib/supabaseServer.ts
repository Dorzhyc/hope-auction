// src/lib/supabaseServer.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "lot-images";

if (!url) throw new Error("SUPABASE_URL is missing");
if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});
