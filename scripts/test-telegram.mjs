import fs from 'node:fs';
import path from 'node:path';
import { sendTelegramMessage, getTelegramPublicConfig } from '../server/telegram.js';

const loadLocalEnvFile = fileName => {
  const filePath = path.resolve(fileName);
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] != null) continue;

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
};

loadLocalEnvFile('.env');
loadLocalEnvFile('.env.local');

const message =
  process.argv.slice(2).join(' ').trim() ||
  `SC23 텔레그램 테스트 (${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })})`;

const config = getTelegramPublicConfig();
if (!config.readiness.ready) {
  console.error('텔레그램 알림 설정이 준비되지 않았습니다.');
  console.error(JSON.stringify(config, null, 2));
  process.exit(1);
}

const result = await sendTelegramMessage({ message });
console.log(
  JSON.stringify(
    {
      ok: true,
      messageId: result.messageId,
      chatId: result.chatId,
    },
    null,
    2,
  ),
);
