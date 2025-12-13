import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function Home() {
  const { data: auction } = useSWR("/api/auction", fetcher, { refreshInterval: 10000 });
  const { data } = useSWR("/api/lots", fetcher, { refreshInterval: 10000 });

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1>Аукцион «Создавая надежду»</h1>
      <p>
        Благотворительная выставка совместно с арт-агентством «Переход» и фондом СПИД.ЦЕНТР.
      </p>

      {auction && (
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, marginBottom: 16 }}>
          <div><b>Окончание аукциона:</b> {auction.ends_at_msk} (МСК)</div>
          <div><b>Статус:</b> {auction.is_active ? "приём ставок открыт" : "ставки закрыты"}</div>
        </div>
      )}

      <h2>Лоты</h2>
      {!data ? <p>Загрузка...</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {data.lots.map((lot: any) => (
            <Link key={lot.id} href={`/lots/${lot.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{lot.title}</div>
                <div>Текущая цена: <b>{lot.current_price} ₽</b></div>
                <div>Ставок: <b>{lot.bids_count}</b></div>
                <div>Статус: {lot.status === "ended" ? "завершён" : (lot.status === "hidden" ? "скрыт" : "активен")}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <hr style={{ margin: "24px 0" }} />
      <Link href="/admin">Админ</Link>
    </main>
  );
}
