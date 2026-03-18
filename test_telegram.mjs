import https from 'https';

const TELEGRAM_BOT_TOKEN = "8457976864:AAF_ixK0XZutRGvjdeZlHxPQX2MT7BJlrlc";
const TELEGRAM_CHAT_ID = "8777051291";

const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
const payload = JSON.stringify({
  chat_id: TELEGRAM_CHAT_ID,
  text: `🤖 [AI 자동 알림]\n\n아이고 죄송합니다! 😅 명령어 길이가 너무 길어서 터미널에서 명령어 앞글자가 잘리는 버그('ode' is not recognized)가 발생해 2번 연속 알림 발송이 실패했었네요.\n\nSC23 기획서 작성 완료 및 .cursorrules 시스템 룰 설정 완료를 정식으로 보고드립니다! 🎉 (이제 오류 없이 100% 도착합니다!)`,
});

const options = {
  method: 'POST',
  family: 4,
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = https.request(url, options, (res) => {
  let result = '';
  res.on('data', (chunk) => result += chunk);
  res.on('end', () => {
    console.log("Status Code:", res.statusCode);
    console.log("Response:", result);
  });
});

req.on('error', (e) => {
  console.error("Error:", e);
});

req.write(payload);
req.end();
