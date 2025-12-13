import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then(async r => {
  if (!r.ok) throw new Error("unauthorized");
  return r.json();
});

export default function AdminAuction() {
  const { data, mutate } = useSWR("/api/admin/auction", fetcher);
  const [endsAt, setEndsAt] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = await fetch("/api/admin/auction", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ends_at: endsAt })
    });
    const j = await r.json();
    if (!r.ok) setMsg(j.error || "Ошибка");
    else { setMsg("Сохранено"); await mutate(); }
  }

  async function toggleActive() {
    await fetch("/api/admin/auction/toggle", { method: "POST" });
    await mutate();
  }

  async function finalize() {
    const r = await fetch("/api/admin/auction/finalize", { method: "POST" });
    const j = await r.json();
    setMsg(r.ok ? "Победители зафиксированы" : (j.error || "Ошибка"));
    await mutate();
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1>Настройки аукциона</h1>
      <p><Link href="/admin">← назад</Link></p>

      {!data ? <p>Загрузка...</p> : (
        <>
          <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
            <div><b>Окончание (МСК):</b> {data.ends_at_msk}</div>
            <div><b>is_active:</b> {String(data.is_active)}</div>
            <div><b>winners_finalized:</b> {String(data.winners_finalized)}</div>
          </div>

          <h2 style={{ marginTop: 16 }}>Изменить окончание</h2>
          <form onSubmit={save} style={{ display: "grid", gap: 8, maxWidth: 420 }}>
            <input
              placeholder="2026-01-10T18:00:00+03:00"
              value={endsAt}
              onChange={e => setEndsAt(e.target.value)}
            />
            <button>Сохранить</button>
            <small>Формат ISO 8601 с +03:00 (МСК). Например: 2026-01-10T18:00:00+03:00</small>
          </form>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={toggleActive}>{data.is_active ? "Закрыть приём ставок" : "Открыть приём ставок"}</button>
            <button onClick={finalize}>Зафиксировать победителей</button>
          </div>

          {msg && <p>{msg}</p>}
        </>
      )}
    </main>
  );
}
