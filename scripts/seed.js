const { pool } = require('./db');

function twoWeeksFromNowMoscowISO() {
  // store as timestamptz; here we just do UTC now + 14 days, user will set exact MSK in admin
  const d = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

(async () => {
  try {
    const ends_at = twoWeeksFromNowMoscowISO();
    await pool.query(`
      INSERT INTO auction_settings (id, ends_at, is_active, winners_finalized)
      VALUES (1, $1, TRUE, FALSE)
      ON CONFLICT (id) DO UPDATE SET ends_at = EXCLUDED.ends_at, is_active=TRUE, winners_finalized=FALSE, updated_at=now()
    `, [ends_at]);

    const countRes = await pool.query(`SELECT COUNT(*)::int AS c FROM lots`);
    if (countRes.rows[0].c === 0) {
      for (let i = 1; i <= 3; i++) {
        const title = `Пример лота #${i}`;
        const description = `Описание лота #${i}. Замените на реальные данные выставки «Создавая надежду».`;
        const start = 5000 * i;
        await pool.query(`
          INSERT INTO lots (title, description, start_price, current_price, bids_count, status)
          VALUES ($1, $2, $3, $3, 0, 'active')
        `, [title, description, start]);
      }
      console.log("Seeded sample lots (3). Add your 35 real lots in admin.");
    } else {
      console.log("Lots already exist, skipping lots seed.");
    }
    console.log("Seed complete.");
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
