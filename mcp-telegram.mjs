import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import https from 'https';

// 텔레그램 봇 토큰과 사용자 Chat ID 설정
const TELEGRAM_BOT_TOKEN = "8457976864:AAF_ixK0XZutRGvjdeZlHxPQX2MT7BJlrlc";

// TODO: 아래 YOUR_CHAT_ID 부분에 본인의 텔레그램 숫자 ID를 입력하세요.
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "8777051291";

const server = new Server(
  {
    name: "telegram-notifier",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 도구(Tool) 리스트 정의: AI(Agent)가 사용할 수 있는 도구 선언
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "send_telegram_alert",
        description: "작업 완료 시 사용자님의 텔레그램으로 완료 알림 푸시 메시지를 전송합니다.",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "전송할 메시지 내용 (예: 작업 완료 보고서 요약)",
            },
          },
          required: ["message"],
        },
      },
    ],
  };
});

// 도구 실행 핸들러: AI가 send_telegram_alert를 호출했을 때의 실제 동작 구현
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "send_telegram_alert") {
    const message = request.params.arguments.message;
    
    return new Promise((resolve) => {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      const payload = JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: `🤖 [AI 자동 알림]\n${message}`,
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
          if (res.statusCode === 200) {
            resolve({
              content: [{ type: "text", text: `Success: Telegram message sent.` }],
            });
          } else {
            resolve({
              content: [{ type: "text", text: `Error: ${result}` }],
              isError: true,
            });
          }
        });
      });

      req.on('error', (e) => {
        resolve({
          content: [{ type: "text", text: `Failed to send Telegram message: ${e.message}` }],
          isError: true,
        });
      });

      req.write(payload);
      req.end();
    });
  }
  throw new Error(`Tool not found: ${request.params.name}`);
});

// MCP 서버 구동
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Telegram MCP Server is ready to receive requests!");
}

main().catch(console.error);
