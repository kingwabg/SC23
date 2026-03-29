const TELEGRAM_API_BASE = 'https://api.telegram.org';
const DEFAULT_TIMEOUT_MS = 10000;

const toBoolean = (value) => String(value || '').trim().toLowerCase() === 'true';

const getRawTelegramConfig = () => ({
  enabled: toBoolean(process.env.TELEGRAM_ENABLED),
  botToken: String(process.env.TELEGRAM_BOT_TOKEN || '').trim(),
  chatId: String(process.env.TELEGRAM_CHAT_ID || '').trim(),
  messagePrefix: String(process.env.TELEGRAM_MESSAGE_PREFIX || '[SC23 알림]').trim(),
});

export const getTelegramPublicConfig = () => {
  const config = getRawTelegramConfig();
  const hasBotToken = Boolean(config.botToken);
  const hasChatId = Boolean(config.chatId);

  return {
    enabled: config.enabled,
    readiness: {
      hasBotToken,
      hasChatId,
      ready: config.enabled && hasBotToken && hasChatId,
    },
    messagePrefix: config.messagePrefix,
  };
};

const assertTelegramReady = () => {
  const config = getRawTelegramConfig();

  if (!config.enabled) {
    throw new Error('텔레그램 알림이 비활성화되어 있습니다.');
  }

  if (!config.botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN 환경변수가 필요합니다.');
  }

  if (!config.chatId) {
    throw new Error('TELEGRAM_CHAT_ID 환경변수가 필요합니다.');
  }

  return config;
};

const normalizeMessage = (message, prefix) => {
  const body = String(message || '').trim();
  if (!body) {
    throw new Error('전송할 메시지가 비어 있습니다.');
  }

  if (!prefix) {
    return body;
  }

  return `${prefix}\n${body}`;
};

export const sendTelegramMessage = async ({
  message,
  prefix,
  disableWebPagePreview = true,
} = {}) => {
  const config = assertTelegramReady();
  const finalMessage = normalizeMessage(message, prefix ?? config.messagePrefix);
  const response = await fetch(
    `${TELEGRAM_API_BASE}/bot${config.botToken}/sendMessage`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: finalMessage,
        disable_web_page_preview: disableWebPagePreview,
      }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    },
  );

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    const description = data?.description || `Telegram API 요청 실패 (${response.status})`;
    throw new Error(description);
  }

  return {
    ok: true,
    messageId: data.result?.message_id ?? null,
    chatId: data.result?.chat?.id ?? null,
    raw: data.result ?? null,
  };
};
