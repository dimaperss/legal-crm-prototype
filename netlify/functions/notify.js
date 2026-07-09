// Netlify Function: уведомление юриста в Telegram о новом клиенте.
//
// Токен бота и chat_id берутся ТОЛЬКО из переменных окружения Netlify
// (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID) и никогда не попадают в клиент.
//
// Контракт:
//   POST { name, phone, status }
//   200 { ok: true }        — сообщение отправлено
//   200 { skipped: true }   — env-переменные не заданы (локальная разработка)
//   400 { error }           — нет обязательного поля name
//   502 { error }           — Telegram API вернул ошибку

const STATUS_RU = {
  new: 'Новый',
  in_progress: 'В работе',
  closed: 'Закрыт',
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const { name, phone, status } = payload;
  if (!name || !String(name).trim()) {
    return json(400, { error: 'Field "name" is required' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  // Нет секретов — не роняем локальную разработку, просто пропускаем.
  if (!token || !chatId) {
    return json(200, { skipped: true });
  }

  const statusRu = STATUS_RU[status] || status || '—';
  const text =
    '🆕 Новый клиент в CRM\n' +
    `Имя: ${name}\n` +
    `Телефон: ${phone || '—'}\n` +
    `Статус: ${statusRu}`;

  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.ok) {
      console.error('Telegram API error:', resp.status, data);
      return json(502, { error: 'Telegram API error', detail: data });
    }

    return json(200, { ok: true });
  } catch (err) {
    console.error('Notify request failed:', err);
    return json(502, { error: String(err) });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
