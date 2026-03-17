import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 5005;

app.use(cors());
app.use(express.json());

const DATA_FILE = './attendance_data.json';

// 키즈콜 설정
const KIDSCALL_CONFIG = {
  id: 's00448',
  pw: 'asdf1020!@#',
  url: 'https://nursery.kidscall.co.kr/main.php', // frameset을 우회하여 직접 접속
  logUrl: 'https://nursery.kidscall.co.kr/attend/attend_class_logex_center.php'
};

// 데이터 저장 초기화
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

async function scrapeKidscall() {
  console.log(`[${new Date().toLocaleString()}] 키즈콜 데이터 수집 시작...`);
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // 1. 로그인
    await page.goto(KIDSCALL_CONFIG.url);
    await page.type('#userid', KIDSCALL_CONFIG.id); // 올바른 선택자
    await page.type('#passwd', KIDSCALL_CONFIG.pw); // 올바른 선택자
    await page.evaluate(() => {
      // @ts-ignore
      submitForm(); // 폼 전송 함수 직접 실행
    });
    await page.waitForNavigation();

    // 2. 출결 페이지 이동
    await page.goto(KIDSCALL_CONFIG.logUrl);
    await page.waitForSelector('table');

    // 3. 데이터 파싱 (성함, 등원시간 등)
    const data = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tr')).slice(1); // 헤더 제외
      return rows.map(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 5) return null;
        return {
          name: cells[1]?.innerText.trim(),
          time: cells[3]?.innerText.trim(), // 등원시간
          status: cells[5]?.innerText.trim(), // 출결상태
          timestamp: new Date().toISOString()
        };
      }).filter(item => item && item.name);
    });

    // 4. 파일 저장
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log(`[${new Date().toLocaleString()}] 수집 완료: ${data.length}명`);

  } catch (error) {
    console.error('데이터 수집 중 오류 발생:', error);
  } finally {
    await browser.close();
  }
}

// 2시 ~ 20시 사이, 매 정시(한 시간마다) 실행
// 0 14-20 * * *
cron.schedule('0 14-20 * * *', () => {
  scrapeKidscall();
}, {
  timezone: "Asia/Seoul"
});

// API 엔드포인트: 프론트엔드에서 데이터를 가져갈 때 사용
app.get('/api/attendance', (req, res) => {
  const data = JSON.parse(fs.readFileSync(DATA_FILE));
  res.json(data);
});

// 수동 수집 트리거
app.post('/api/fetch-now', async (req, res) => {
  await scrapeKidscall();
  res.json({ message: '수집이 완료되었습니다.' });
});

app.listen(PORT, () => {
  console.log(`중계 서버가 http://localhost:${PORT} 에서 작동 중입니다.`);
  console.log('스케줄러: 매일 14:00 ~ 20:00 사이 매 정시 실행');
});
