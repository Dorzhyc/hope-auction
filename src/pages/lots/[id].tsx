import { useRouter } from "next/router";
import useSWR from "swr";
import { useMemo, useState } from "react";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function LotPage() {
  const router = useRouter();
  const id = router.query.id;
  const { data, mutate } = useSWR(id ? `/api/lots/${id}` : null, fetcher, { refreshInterval: 5000 });

  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const minBid = useMemo(() => data?.min_bid ?? null, [data]);

  async function submitBid(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/lots/${id}/bid`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, nickname, amount: Number(amount) }),
      });
      const j = await res.json();
      if (!res.ok) {
        setMsg(j?.error ?? "Ошибка");
      } else {
        setMsg(j.accepted ? "Ставка принята!" : `Ставка отклонена: ${j.reason}`);
        await mutate();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <main style={{ padding: 16, fontFamily: "system-ui" }}>Загрузка...</main>;

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <button onClick={() => router.push("/")}>← назад</button>
      <h1 style={{ marginTop: 12 }}>{data.lot.title}</h1>
{/* КАРТИНКА ЛОТА */}
{data.lot.images && (
  <div style={{ margin: "12px 0" }}>
    <img
      src={data.lot.images}
      alt={data.lot.title}
      style={{
        maxWidth: "100%",
        maxHeight: 400,
        objectFit: "contain",
        borderRadius: 8,
        display: "block"
      }}
    />
  </div>
)}    
      <p>{data.lot.description}</p>

      <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <div>Текущая цена: <b>{data.lot.current_price} ₽</b></div>
        <div>Ставок: <b>{data.lot.bids_count}</b></div>
        <div>Минимальная следующая ставка (шаг 10%, округление до 100 ₽): <b>{minBid} ₽</b></div>
        <div>Статус: <b>{data.auction.is_active ? "ставки принимаются" : "ставки закрыты"}</b></div>

        {data.lot.status === "ended" && data.lot.winner_nickname && (
          <div style={{ marginTop: 10, padding: 10, border: "1px solid #eee", borderRadius: 8 }}>
            <div><b>Победитель:</b> {data.lot.winner_nickname}</div>
            <div><b>Победная ставка:</b> {data.lot.winning_amount} ₽</div>
            <div><b>Время:</b> {data.lot.winning_time_msk} (МСК)</div>
          </div>
        )}
        {data.lot.status === "ended" && !data.lot.winner_nickname && (
          <div style={{ marginTop: 10 }}><b>Ставок не было</b></div>
        )}
      </div>

      <h2 style={{ marginTop: 18 }}>Сделать ставку</h2>
      <form onSubmit={submitBid} style={{ display: "grid", gap: 8, maxWidth: 420 }}>
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input placeholder="Ник" value={nickname} onChange={e => setNickname(e.target.value)} required />
        <input placeholder="Сумма (₽)" value={amount} onChange={e => setAmount(e.target.value)} required inputMode="numeric" />
        <button disabled={busy || !data.auction.is_active}>Отправить ставку</button>
        {msg && <div>{msg}</div>}
      </form>

      <h2 style={{ marginTop: 18 }}>История ставок</h2>
      <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 160px", gap: 0, padding: 10, background: "#fafafa", fontWeight: 700 }}>
          <div>Ник</div><div>Сумма</div><div>Время (МСК)</div>
        </div>
        {data.bids.map((b: any) => (
          <div key={b.id} style={{ display: "grid", gridTemplateColumns: "1fr 140px 160px", gap: 0, padding: 10, borderTop: "1px solid #eee" }}>
            <div>{b.nickname}</div>
            <div>{b.amount} ₽</div>
            <div>{b.time_msk}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
