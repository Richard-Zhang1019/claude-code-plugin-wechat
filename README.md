# WeChat Channel for Claude Code

基于官方 WeChat ClawBot ilink API 的 Claude Code Channel 插件，允许你通过微信远程控制 Claude Code 会话。

## 目录

- [环境要求](#环境要求)
- [功能特性](#功能特性)
- [安装与设置](#安装与设置)
- [使用方法](#使用方法)
- [工作原理](#工作原理)
- [故障排除](#故障排除)
- [技术栈](#技术栈)

## 环境要求

### 必需软件

| 软件 | 最低版本 | 推荐版本 | 说明 |
|------|---------|---------|------|
| **Bun** | 1.0.0+ | 最新版 | JavaScript 运行时和包管理器 |
| **Claude Code** | 最新版 | 最新版 | 需要 MCP Channel 协议支持 |
| **微信(ios)**| 8.0.70+ | 最新版 | 需要微信插件支持 |

## 功能特性

- ✅ **二维码登录** - 使用微信扫描二维码登录
- ✅ **双向通信** - 从微信发送消息到 Claude Code，并接收回复
- ✅ **实时推送** - 使用 Channel 协议将消息推送到正在运行的 Claude Code 会话
- ✅ **支持多种消息类型** - 文本、语音转文字、引用消息等
- ✅ **安全可靠** - 使用官方 API，支持发件人白名单

## 架构

```
WeChat → ClawBot ilink API → [Channel Plugin] → Claude Code Session
                                    ↕
Claude Code → wechat_reply tool → ilink API → WeChat
```

## 安装与设置

### 步骤 1: 克隆或下载项目

```bash
cd /path/to/your/workspace
# 如果是从 git 克隆
git clone <repository-url> claude-code-plugin-wechat
cd claude-code-plugin-wechat
```

### 步骤 2: 安装依赖

使用 Bun 安装项目依赖：

```bash
bun install
```

这将安装以下依赖：
- `@modelcontextprotocol/sdk` - MCP 协议 SDK
- `qrcode-terminal` - 终端二维码显示

### 步骤 3: 构建项目

将 TypeScript 编译为 JavaScript：

```bash
bun run build
```

编译后的文件将输出到 `dist/` 目录。

### 步骤 4: 登录微信

使用微信扫描二维码登录：

```bash
bun run login
```

终端将显示二维码，使用微信扫描：

```
正在获取微信登录二维码...

请使用微信扫描以下二维码：

███████████████████████████████
███████████████████████████████
██ ▄▄▄▄▄ █▀█ █▄▄▄█ █▄▄▄▄▄ ██
██ █   █ █▀▀▀▀█ █   █   █ ██
██ █▄▄▄█ ██ ▀ █ █▄▄▄█   █ ██
██▄▄▄▄▄▄▄█ █▀█▄█ █▄▄▄▄▄▄███
██  ▀▄▀▀▀▄█ ▀▀▀█▄█▀█▀█▀▀ ██
██ ▀██ █▀▀▄▀█▄█▀█▀▄▀ ▄█▄██
███████████████████████████████


等待扫码...
```

**注意事项**：
- 请在 5 分钟内完成扫码
- 扫码后需要在微信中确认登录
- 登录成功后凭据会自动保存

### 步骤 5: 配置 MCP

获取当前项目路径：

```bash
pwd
# 输出示例: /Users/ayu/Desktop/claude-code-plugin-wechat
```

创建或编辑 `~/.config/claude/mcp.json`：

```bash
# 创建目录（如果不存在）
mkdir -p ~/.config/claude

# 编辑配置文件
nano ~/.config/claude/mcp.json
```

添加以下配置（**注意**：将路径替换为你的实际路径）：

```json
{
  "mcpServers": {
    "wechat": {
      "command": "bun",
      "args": ["/Users/ayu/Desktop/claude-code-plugin-wechat/dist/channel.js"]
    }
  }
}
```

**重要提示**：
- 路径必须是**绝对路径**
- 文件名是 `channel.js`，不是 `cli.js`
- JSON 格式必须正确（注意逗号和引号）

### 步骤 6: 验证配置

检查登录状态：

```bash
bun run status
```

应该看到类似输出：

```
✅ 已登录
   账号 ID: o9cq801PwJy9V0U3d-86WkdeRX6Y
   Base URL: https://ilinkai.weixin.qq.com
   用户 ID: xxx
   保存时间: 2026-03-22T...
```

### 步骤 7: 启动 Claude Code

使用 Channel 参数启动 Claude Code：

```bash
claude --dangerously-load-development-channels=server:wechat
```

**启动参数说明**：
- `--dangerously-load-development-channels` - 加载开发中的 Channel
- `server:wechat` - 加载 MCP 配置中名为 `wechat` 的服务器
- `server:` 前缀是必需的，表示这是 MCP 服务器

启动成功后，你会看到：

```
[wechat-channel] MCP 连接就绪
[wechat-channel] 使用已保存账号: xxx
[wechat-channel] 开始监听微信消息...
```

### 步骤 8: 测试连接

在微信中向机器人账号发送一条测试消息：

```
你好
```

如果一切正常，Claude Code 会收到消息并在会话中显示。

## 使用方法

### 基本命令

```bash
# 查看登录状态
bun run status

# 登出并清除凭据
bun run logout

# 重新登录
bun run login

# 启动 Channel（默认）
bun run start
```

### 与 Claude 对话

1. **在微信中发送消息**
   - 打开微信，找到已登录的机器人账号
   - 发送任何消息（文本、语音等）
   - 消息会实时推送到 Claude Code 会话

2. **Claude 接收和处理**
   - Claude Code 会话中会显示收到的消息
   - 消息包含发件人信息和内容
   - Claude 可以直接在会话中处理

3. **Claude 回复**
   - Claude 使用 `wechat_reply` 工具回复
   - 回复会直接显示在微信中
   - 支持多轮对话

### 使用示例

**示例 1: 询问问题**

```
微信: 今天北京天气怎么样？
Claude: [调用天气 API] 今天北京晴天，温度 15-25℃...
```

**示例 2: 代码相关**

```
微信: 帮我写一个 Python 快速排序
Claude: [生成代码] 这是快速排序的实现...
```

**示例 3: 文件操作**

```
微信: 读取 package.json
Claude: [使用工具读取文件] package.json 内容如下...
```

### 会话管理

- **多轮对话**: Claude 会记住对话上下文
- **Context Token**: 每个用户有独立的 context_token
- **自动重连**: 网络中断后自动重连

## 配置文件位置

### 项目文件

```
claude-code-plugin-wechat/
├── src/
│   ├── channel.ts      # MCP Channel 服务器核心代码
│   └── cli.ts          # CLI 工具（login/status/logout）
├── dist/
│   ├── channel.js      # 编译后的 Channel 服务器
│   └── cli.js          # 编译后的 CLI 工具
├── package.json        # 项目依赖配置
├── tsconfig.json       # TypeScript 配置
└── mcp.json           # MCP 配置示例
```

### 系统文件

| 文件 | 位置 | 说明 |
|------|------|------|
| **登录凭据** | `~/.claude/channels/wechat/account.json` | 存储 token 和账号信息 |
| **同步状态** | `~/.claude/channels/wechat/sync_buf.txt` | 消息同步位置标记 |
| **MCP 配置** | `~/.config/claude/mcp.json` | MCP 服务器配置 |

### 文件权限

登录凭据文件会自动设置为 `0600` 权限（仅所有者可读写）。

## 工作原理

### 1. 认证流程

```
ilink/bot/get_bot_qrcode?bot_type=3  → 获取二维码
ilink/bot/get_qrcode_status?qrcode=...  → 轮询扫码状态
```

### 2. 接收消息

```
ilink/bot/getupdates  → HTTP 长轮询获取新消息
```

### 3. 发送消息

```
ilink/bot/sendmessage  → POST 发送消息
```

### 4. Channel 事件推送

使用 MCP Channel 协议将消息推送到 Claude Code：

```typescript
await mcp.notification({
  method: "notifications/claude/channel",
  params: {
    content: text,
    meta: {
      sender: senderId,
      sender_id: senderId,
    },
  },
});
```

## 安全特性

- ✅ 使用官方 WeChat ClawBot API
- ✅ 支持发件人白名单（自动添加扫码用户）
- ✅ Token 安全存储（文件权限 0600）
- ✅ 不进行协议逆向工程

## 消息类型支持

| 类型 | 支持 | 说明 |
|------|------|------|
| 文本消息 | ✅ | 完全支持 |
| 语音消息 | ✅ | 自动转文字 |
| 引用消息 | ✅ | 显示引用内容 |
| 图片消息 | 📝 | 显示为 `[Image]` |
| 文件消息 | 📝 | 显示文件名 |
| 视频消息 | 📝 | 显示为 `[Video]` |

## 故障排除

### 问题 1: 登录失败

**症状**: 扫码后登录失败或超时

**解决方案**:

```bash
# 1. 清除旧凭据
bun run logout

# 2. 重新登录
bun run login

# 3. 确保在 5 分钟内完成扫码和确认
```

**常见原因**:
- 二维码过期（超过 5 分钟）
- 网络连接不稳定
- 微信客户端版本过低

---

### 问题 2: Channel 未加载

**症状**: 启动时提示 "channel not found"

**解决方案**:

检查启动命令是否正确：

```bash
# ❌ 错误 - 缺少 server: 前缀
claude --dangerously-load-development-channels=wechat

# ✅ 正确 - 包含 server: 前缀
claude --dangerously-load-development-channels=server:wechat
```

检查 MCP 配置：

```bash
# 查看配置
cat ~/.config/claude/mcp.json

# 确认路径正确且存在
ls -la /Users/ayu/Desktop/claude-code-plugin-wechat/dist/channel.js
```

**注意事项**:
- 必须使用 `server:` 前缀
- 配置文件中的路径必须是绝对路径
- 文件名是 `channel.js` 不是 `cli.js`

---

### 问题 3: 能收到消息但不会回复

**症状**: 微信消息能到达 Claude Code，但 Claude 不回复

**可能原因**:

1. **Context Token 未缓存**
   - 用户必须先发送一条消息
   - 系统会自动缓存 context_token
   - 之后才能回复

2. **MCP 工具未正确注册**
   ```bash
   # 在 Claude Code 中检查工具列表
   /tools
   # 应该能看到 wechat_reply 工具
   ```

3. **Channel 说明不够清晰**
   - 检查 MCP Server 的 instructions 是否正确
   - 确保说明了如何使用 reply 工具

---

### 问题 4: 编译错误

**症状**: `bun run build` 失败

**解决方案**:

```bash
# 1. 清理并重新安装依赖
rm -rf node_modules bun.lockb
bun install

# 2. 检查 TypeScript 版本
bun --version

# 3. 清理编译输出
rm -rf dist
bun run build
```

---

### 问题 5: 网络连接问题

**症状**: 无法接收消息或发送失败

**检查网络连接**:

```bash
# 测试是否能访问微信 API
curl -I https://ilinkai.weixin.qq.com

# 检查防火墙设置
# 确保允许访问 ilinkai.weixin.qq.com
```

**查看日志**:

启动时使用详细日志：

```bash
# Claude Code 的日志会输出到 stderr
# 观察是否有错误信息
claude --dangerously-load-development-channels=server:wechat 2> wechat.log
```

---

### 问题 6: Token 过期

**症状**: 发送消息失败，提示认证错误

**解决方案**:

```bash
# 重新登录获取新 token
bun run logout
bun run login
```

**注意**: Token 可能会在以下情况过期：
- 长时间未使用
- 微信账号在其他设备登录
- 微信服务器安全策略

---

### 获取帮助

如果以上方法都无法解决问题，请提供以下信息：

1. **环境信息**
   ```bash
   bun --version
   claude --version
   uname -a  # macOS/Linux
   ```

2. **配置信息**
   ```bash
   cat ~/.config/claude/mcp.json
   bun run status
   ```

3. **错误日志**
   - 启动时的完整输出
   - 错误堆栈信息
   - 操作步骤描述

## 技术栈

### 核心技术

| 技术 | 版本 | 用途 |
|------|------|------|
| **Bun** | 1.0.0+ | JavaScript 运行时和包管理器 |
| **TypeScript** | 5.x | 类型安全的开发语言 |
| **MCP SDK** | latest | Model Context Protocol SDK |

### 主要依赖

```json
{
  "@modelcontextprotocol/sdk": "^1.0.4",
  "qrcode-terminal": "^0.12.0"
}
```

### 开发依赖

```json
{
  "@types/node": "^20.x",
  "typescript": "^5.x"
}
```

### 协议和 API

- **MCP Protocol**: Model Context Protocol（模型上下文协议）
- **Channel API**: Claude Code Channel 扩展协议
- **WeChat API**: 官方 ClawBot ilink API

### 项目结构

```
src/
├── channel.ts      # MCP Channel 服务器 (600+ 行)
│   ├── 配置管理
│   ├── 凭据存储
│   ├── QR 登录流程
│   ├── 消息接收 (长轮询)
│   ├── 消息发送
│   └── MCP 服务器实现
│
└── cli.ts          # CLI 工具 (100 行)
    ├── login - 二维码登录
    ├── logout - 登出清除凭据
    ├── status - 查看登录状态
    └── start - 启动 Channel
```

### 代码特点

- **类型安全**: 完整的 TypeScript 类型定义
- **错误处理**: 完善的异常捕获和重试机制
- **日志系统**: 清晰的日志输出（stderr）
- **安全存储**: 凭据文件权限 0600
- **自动重连**: 网络中断后自动恢复

## 相关资源

### 官方文档

- [Claude Code Channels 文档](https://code.claude.com/docs/en/channels) - Channel 协议官方文档
- [MCP 协议规范](https://modelcontextprotocol.io/) - Model Context Protocol 规范
- [Claude Code 文档](https://code.claude.com/docs) - Claude Code 完整文档

### 参考实现

- [Telegram Channel Plugin](https://dev.to/czmilo/claude-code-telegram-plugin-complete-setup-guide-2026-3j0p) - Telegram 集成参考
- [Johnixr/wechat-channel](https://github.com/Johnixr/claude-code-wechat-channel) - 另一个 WeChat Channel 实现

### 微信相关

- [WeChat ClawBot API](https://ilinkai.weixin.qq.com) - 官方 ClawBot API
- [微信公众号平台](https://mp.weixin.qq.com) - 微信公众号开发文档

## 常见问题

### Q: 支持多用户吗？

A: 是的。任何向机器人账号发送消息的用户都会被自动添加，系统会为每个用户维护独立的 context_token。

### Q: 消息会保存吗？

A: 消息不会持久化保存。系统只缓存：
- 登录凭据（token）
- 消息同步位置（sync_buf）
- 临时 context_token（内存中，重启后丢失）

### Q: 可以同时运行多个实例吗？

A: 不建议。同一个微信账号只能在一个地方登录，多实例会导致消息接收冲突。

### Q: 如何卸载？

A: 执行以下步骤：
```bash
# 1. 登出并清除凭据
bun run logout

# 2. 删除 MCP 配置
# 编辑 ~/.config/claude/mcp.json，删除 wechat 部分

# 3. 删除项目文件
rm -rf /path/to/claude-code-plugin-wechat
```

### Q: 支持哪些消息类型？

A: 目前支持：
- ✅ 文本消息
- ✅ 语音消息（自动转文字）
- ✅ 引用消息
- ⚠️ 图片消息（仅显示文件名）
- ⚠️ 文件消息（仅显示文件名）
- ⚠️ 视频消息（仅显示 [Video] 标记）

### Q: 安全性如何？

A:
- ✅ 使用官方 WeChat ClawBot API
- ✅ Token 本地加密存储（0600 权限）
- ✅ 不进行协议逆向工程
- ✅ 不存储敏感消息内容
- ⚠️ 建议在可信网络环境使用

## 许可证

MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

**享受使用 WeChat Channel for Claude Code! 🚀**

如有问题或建议，欢迎提交 Issue 或 Pull Request。
