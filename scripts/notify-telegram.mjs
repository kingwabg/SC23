import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { sendTelegramMessage, getTelegramPublicConfig } from '../server/telegram.js';

const loadLocalEnvFile = (fileName) => {
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
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
};

const safeExec = (command) => {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
};

loadLocalEnvFile('.env');
loadLocalEnvFile('.env.local');

const branch = safeExec('git branch --show-current') || 'unknown';
const projectName = path.basename(process.cwd());
const timestamp = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
const summary = process.argv.slice(2).join(' ').trim();
const defaultMessage = [
  '작업이 완료되었습니다.',
  `프로젝트: ${projectName}`,
  `브랜치: ${branch}`,
  `시간: ${timestamp}`,
].join('\n');

const message = summary
  ? `${summary}\n프로젝트: ${projectName}\n브랜치: ${branch}\n시간: ${timestamp}`
  : defaultMessage;

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
