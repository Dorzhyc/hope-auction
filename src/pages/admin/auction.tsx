import useSWR from "swr";
import Link from "next/link";
import { useEffect, useState } from "react";

const fetcher = (url: string) =>
  fetch(url).then(async (r) => {
    if (!r.ok) throw new Error("unauthorized");
    return r.json();
  });

// MSK (UTC+3) local input -> UTC ISO ("...Z")
function mskLocalToUtcIso(mskLocal: string) {
  // mskLocal пример: "2026-01-07T00:00"
  const d = new Date(mskLocal);
  d.setHours(d.getHours() - 3); // MSK -> UTC
  return d.toISOString();
}

// UTC ISO ("...Z") -> MSK local input ("YYYY-MM-DDTHH:mm")
function utcIsoToMskLocalInput(utcIso: string) {
  const d = new Date(utcIso);
  d.setHours(d.getHours() + 3); // UTC -> MSK
  return d.toISOString().slice(0, 16);
}

export default function AdminAuction() {
  const { data, mutate } = useSWR("/api/admin/auction", fetcher);
  const [endsAt, setEndsAt] = useState(""); // будет "YYYY-MM-DDTHH:mm" в МСК
  const [msg, setMsg] = useState<string | null>(null);

  // При первой загрузке данных подставляем текущий ends_at в поле (в МСК),
  // чтобы оно не "жило своей жизнью" и не прыгало
  useEffect(() => {
    if (data?.ends_at && !endsAt) {
      setEndsAt(utcIsoToMskLocalInput(String(data.ends_at)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.ends_at]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!endsAt) {
      setMsg("Введите дату и время окончания");
      return;
    }

    const r = await fetch("/api/admin/auction", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ends_at: mskLocalToUtcIso(endsAt),
      }),
    });

    const j = await r.json();
    if (!r.ok) setMsg(j.error || "Ошибка");
    else {
      setMsg("Сохранено");
      setEndsAt(utcIsoToMskLocalInput(String(j?.ends_at ?? data?.ends_at ?? mskLocalToUtcIso(endsAt))));
      await mutate();
    }
  }

  async function toggleActive() {
    await fetch("/api/admin/auction/toggle", { method: "POST" });
    await mutate();
  }

  async function finalize() {
    const r = await fetch("/api/admin/auction/finalize", { method: "POST" });
    const j = await r.json();
    setMsg(r.ok ? "Победители зафиксированы" : j.error || "Ошибка");
    await mutate();
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1>Настройки аукциона</h1>
      <p>
        <Link href="/admin">← назад</Link>
      </p>

      {!data ? (
        <p>Загрузка...</p>
      ) : (
        <>
          <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
            <div>
              <b>Окончание (МСК):</b> {data.ends_at_msk}
            </div>
            <div>
              <b>is_active:</b> {String(data.is_active)}
            </div>
            <div>
              <b>winners_finalized:</b> {String(data.winners_finalized)}
            </div>
          </div>

          <h2 style={{ marginTop: 16 }}>Изменить окончание</h2>
          <form onSubmit={save} style={{ display: "grid", gap: 8, maxWidth: 420 }}>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
            <button>Сохранить</button>
            <small>
              Введите дату и время в <b>МСК</b>. Сайт сам сохранит значение корректно в базе.
            </small>
          </form>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={toggleActive}>
              {data.is_active ? "Закрыть приём ставок" : "Открыть приём ставок"}
            </button>
            <button onClick={finalize}>Зафиксировать победителей</button>
          </div>

          {msg && <p>{msg}</p>}
        </>
      )}
    </main>
  );
}
