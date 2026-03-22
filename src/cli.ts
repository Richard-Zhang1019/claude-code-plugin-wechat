#!/usr/bin/env bun
/**
 * CLI for WeChat Channel
 */

import { WeChatChannelServer } from "./channel.js";

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case "login":
      await WeChatChannelServer.login({ verbose: true });
      break;

    case "logout":
      await WeChatChannelServer.logout();
      break;

    case "status":
      await WeChatChannelServer.status();
      break;

    case "allow":
      if (!args[1]) {
        console.error("Usage: wechat-channel allow <user_id>");
        process.exit(1);
      }
      await WeChatChannelServer.addAllowedSender(args[1]);
      break;

    case "start":
    case "":
      // Start the MCP channel server
      const config = await loadConfig();
      const server = new WeChatChannelServer(
        config.credentials,
        config.allowedSenders || []
      );
      console.error("🚀 Starting WeChat Channel server...");
      await server.start();
      break;

    default:
      console.log(`
WeChat Channel for Claude Code

Usage:
  wechat-channel login    - Login to WeChat with QR code
  wechat-channel logout   - Logout and clear credentials
  wechat-channel status   - Show current login status
  wechat-channel allow    - Add a user ID to the allowlist
  wechat-channel start    - Start the MCP channel server (default)

Configuration stored in: ~/.config/wechat-channel.json

After login, add to .mcp.json:
{
  "mcpServers": {
    "wechat": {
      "command": "bun",
      "args": ["/path/to/wechat-channel"]
    }
  }
}

Then start Claude Code with:
  claude --channels=wechat
      `);
  }
}

async function loadConfig() {
  const CONFIG_PATH = `${process.env.HOME}/.config/wechat-channel.json`;
  try {
    const content = await Bun.file(CONFIG_PATH).text();
    return JSON.parse(content);
  } catch {
    return {};
  }
}

main().catch((error) => {
  console.error(`Error: ${error}`);
  process.exit(1);
});
