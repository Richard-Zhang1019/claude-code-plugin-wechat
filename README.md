# WeChat Channel for Claude Code

A bridge that connects WeChat to Claude Code using the official ClawBot ilink API and MCP Channel protocol.

## Architecture

```
WeChat → ClawBot ilink API → [Bridge Plugin] → Claude Code Session
                                    ↕
Claude Code → wechat_reply tool → ilink API → WeChat
```

## Protocol Overview

### WeChat ClawBot ilink API

1. **Authentication**: QR code login flow
   - `ilink/bot/get_bot_qrcode?bot_type=3` - Get login QR code
   - `ilink/bot/get_qrcode_status?qrcode=...` - Long poll for scan status

2. **Receive Messages**: `ilink/bot/getupdates`
   - HTTP long polling for new messages
   - Each message includes `context_token` for reply correlation

3. **Send Messages**: `ilink/bot/sendmessage`
   - POST with `bot_token` authentication
   - Must include `context_token` from received message

### MCP Channel Protocol

- Channel server pushes external events into Claude Code sessions
- Exposes tools for Claude to reply back
- Uses `claude/channel` capability type
- Requires sender allowlist for security

## Setup

1. Install dependencies:
```bash
bun install
```

2. Build the project:
```bash
bun run build
```

3. Login to WeChat:
```bash
bun run login
```

4. Add to `.mcp.json`:
```json
{
  "mcpServers": {
    "wechat": {
      "command": "node",
      "args": ["/path/to/openclaw-wechat/dist/cli.js"]
    }
  }
}
```

5. Start Claude Code with channels enabled:
```bash
claude --channels=wechat
```

## Security

- Only authorized senders can push messages (allowlist enforced)
- Uses official WeChat ClawBot API endpoints
- No protocol reverse engineering
- Tokens stored securely in local config

## Sources

- [Push events into a running session with channels - Claude Code Docs](https://code.claude.com/docs/en/channels)
- [Claude Code Telegram Plugin: Complete Setup Guide 2026](https://dev.to/czmilo/claude-code-telegram-plugin-complete-setup-guide-2026-3j0p)
