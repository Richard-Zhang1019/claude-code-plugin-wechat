#!/usr/bin/env bun
/**
 * CLI for WeChat Channel
 */

import { doQRLogin, loadCredentials } from "./channel.js";
import fs from "node:fs";
import path from "node:path";

const CREDENTIALS_DIR = path.join(
  process.env.HOME || "~",
  ".claude",
  "channels",
  "wechat",
);
const CREDENTIALS_FILE = path.join(CREDENTIALS_DIR, "account.json");

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case "login": {
      const account = await doQRLogin("https://ilinkai.weixin.qq.com");
      if (!account) {
        console.error("❌ 登录失败");
        process.exit(1);
      }
      console.log(`✅ 登录成功！账号 ID: ${account.accountId}`);
      console.log(`📁 凭据已保存到: ${CREDENTIALS_FILE}`);
      break;
    }

    case "logout": {
      try {
        fs.unlinkSync(CREDENTIALS_FILE);
        console.log("✅ 已登出并清除凭据");
      } catch {
        console.log("ℹ️ 未找到登录凭据");
      }
      // Also clear sync buf
      const syncBufFile = path.join(CREDENTIALS_DIR, "sync_buf.txt");
      try {
        fs.unlinkSync(syncBufFile);
      } catch {
        // ignore
      }
      break;
    }

    case "status": {
      const account = loadCredentials();
      if (!account) {
        console.log("❌ 未登录");
        console.log(`   运行 'wechat-channel login' 来登录`);
        process.exit(1);
      }
      console.log(`✅ 已登录`);
      console.log(`   账号 ID: ${account.accountId}`);
      console.log(`   Base URL: ${account.baseUrl}`);
      console.log(`   用户 ID: ${account.userId || "未知"}`);
      console.log(`   保存时间: ${account.savedAt}`);
      break;
    }

    case "start":
    case "":
      // Start the MCP channel server (main function from channel.ts)
      await import("./channel.js");
      break;

    default:
      console.log(`
WeChat Channel for Claude Code

使用方法:
  wechat-channel login    - 使用二维码登录微信
  wechat-channel logout   - 登出并清除凭据
  wechat-channel status   - 显示当前登录状态
  wechat-channel start    - 启动 MCP 通道服务器（默认）

配置文件位置: ${CREDENTIALS_FILE}

启动方式:
  1. 先登录: wechat-channel login
  2. 启动 Claude Code:
     claude --dangerously-load-development-channels=server:wechat

或者直接在 mcp.json 中配置后使用:
  claude
      `);
  }
}

main().catch((error) => {
  console.error(`Error: ${error}`);
  process.exit(1);
});
