# WeChat Channel for Claude Code - Quick Start

## What is this?

A bridge that connects WeChat to Claude Code using the official ClawBot ilink API.

## Setup

### 1. Install and build

```bash
bun install
bun run build
```

### 2. Login to WeChat

```bash
bun run login
```

Scan the QR code with WeChat to authenticate. After successful login:
- Your bot token is saved to `~/.config/wechat-channel.json`
- The user who scanned the QR code is auto-added to the allowlist

### 3. Add to Claude Code MCP config

Copy the example config:

```bash
cp .mcp.json.example ~/.claude/mcp.json
```

Or manually add to your `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "wechat": {
      "command": "bun",
      "args": ["/Users/ayu/Desktop/openclaw-wechat/dist/cli.js"]
    }
  }
}
```

### 4. Start Claude Code with the channel

```bash
claude --channels=wechat
```

## Usage

Once connected:

1. Send a message from WeChat to your bot
2. The message arrives in your Claude Code session
3. Claude can reply using the `wechat_reply` tool
4. The reply appears back in WeChat

## Managing the channel

```bash
# Check login status
bun run dist/cli.js status

# Add a user to allowlist (if auto-pairing didn't work)
bun run dist/cli.js allow <user_id>

# Logout
bun run dist/cli.js logout
```

## Architecture

```
WeChat → ClawBot ilink API → [Bridge Plugin] → Claude Code Session
                                    ↕
Claude Code → wechat_reply tool → ilink API → WeChat
```

## Security

- Only users in the allowlist can send messages
- Tokens stored locally in `~/.config/wechat-channel.json`
- Uses official WeChat ClawBot API endpoints
- No protocol reverse engineering

## Troubleshooting

### Messages not arriving
- Check that Claude Code is running with `--channels=wechat`
- Verify the user is in the allowlist: `bun run dist/cli.js status`
- Check stderr output for errors

### Login failed
- Make sure you scan the QR code within 5 minutes
- Confirm the scan in WeChat after scanning

### Can't reply
- Check that the sender is in the allowlist
- Verify context token is stored (user must have sent a message first)
