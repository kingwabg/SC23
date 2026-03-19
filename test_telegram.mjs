import https from 'https';

const TELEGRAM_BOT_TOKEN = "8457976864:AAF_ixK0XZutRGvjdeZlHxPQX2MT7BJlrlc";
const TELEGRAM_CHAT_ID = "8777051291";

const msg = process.argv[2] || '작업 완료';
const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
const payload = JSON.stringify({
  chat_id: TELEGRAM_CHAT_ID,
  text: `🤖 [AI 진행 상황 알림]\n\n${msg}`,
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
