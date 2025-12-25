import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function Home() {
  const { data: auction } = useSWR("/api/auction", fetcher, { refreshInterval: 10000 });
  const { data } = useSWR("/api/lots", fetcher, { refreshInterval: 10000 });

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1>Аукцион «Создавая надежду»</h1>
     <p style={{ lineHeight: 1.6 }}>
  Благотворительная выставка совместно с{" "}
  <a
    href="https://perehodart.com/"
    target="_blank"
    rel="noopener noreferrer"
  >
    арт-агентством «Переход»
  </a>{" "}
  и{" "}
  <a
    href="https://spid.center/ru/about"
    target="_blank"
    rel="noopener noreferrer"
  >
    Фондом СПИД.ЦЕНТР
  </a>
  .
</p>

<a
  href="https://spid.center/ru/help"
  target="_blank"
  rel="noopener noreferrer"
  style={{
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: "10px 18px",
    borderRadius: 9999, // гиперовальная форма
    backgroundColor: "#e30613",
    color: "#ffffff",
    fontFamily: "Gerbera, system-ui, -apple-system, BlinkMacSystemFont",
    fontSize: 14,
    fontWeight: 600,
    textDecoration: "none",
  }}
>
  Поддержать фонд
  <span style={{ fontSize: 16, lineHeight: 1 }}>→</span>
</a>


      {auction && (
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, marginBottom: 16 }}>
          <div><b>Окончание аукциона:</b> {auction.ends_at_msk} (МСК)</div>
          <div><b>Статус:</b> {auction.is_active ? "приём ставок открыт" : "ставки закрыты"}</div>
        </div>
      )}

      <h2>Лоты</h2>
      {!data ? <p>Загрузка...</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
         {data.lots.map((lot: any) => {
  const firstImage = lot.images
    ? String(lot.images).split("\n")[0]
    : null;

  return (
    <Link
      key={lot.id}
      href={`/lots/${lot.id}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
        {firstImage && (
          <div style={{ marginBottom: 8 }}>
            <img
              src={firstImage}
              alt={lot.title}
              style={{
                width: "100%",
                maxHeight: 220,
                objectFit: "cover",
                borderRadius: 8,
              }}
            />
          </div>
        )}
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{lot.title}</div>
        <div>Текущая цена: <b>{lot.current_price} ₽</b></div>
        <div>Ставок: <b>{lot.bids_count}</b></div>
        <div>Статус: {lot.status === "ended" ? "завершён" : (lot.status === "hidden" ? "скрыт" : "активен")}</div>
      </div>
    </Link>
  );
})}
        </div>
      )}

      <hr style={{ margin: "24px 0" }} />

      <div style={{ fontSize: 14, color: "#555" }}>
        <Link href="/privacy">Политика конфиденциальности</Link>
        {" · "}
        <Link href="/offer">Публичная оферта</Link>
      </div>

      <div style={{ fontSize: 12, color: "#777", marginTop: 8 }}>
        Используя сайт, вы соглашаетесь с использованием cookies.
      </div>


    </main>
  );
}
