/**
 * MCP Channel Server for WeChat
 *
 * This implements an MCP server that:
 * 1. Polls WeChat for new messages via ilink API
 * 2. Pushes them to Claude Code via channel events
 * 3. Exposes a tool for Claude to reply back
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { IlinkApiClient } from "./ilink-api.js";
import type { WeixinCredentials, WeixinMessage } from "./types.js";

/** Config storage path */
const CONFIG_PATH = `${process.env.HOME}/.config/wechat-channel.json`;

/** Load config from disk */
async function loadConfig(): Promise<{ credentials?: WeixinCredentials; allowedSenders?: string[] }> {
  try {
    const content = await Bun.file(CONFIG_PATH).text();
    return JSON.parse(content);
  } catch {
    return {};
  }
}

/** Save config to disk */
function saveConfig(config: Record<string, unknown>): void {
  const dir = CONFIG_PATH.split("/").slice(0, -1).join("/");
  Bun.write(CONFIG_PATH, JSON.stringify(config, null, 2));
}

/** Extract text from WeChat message */
function extractText(msg: WeixinMessage): string {
  if (!msg.item_list?.length) return "";

  for (const item of msg.item_list) {
    if (item.type === 1 && item.text_item?.text) {
      // Text message
      return String(item.text_item.text);
    }
    if (item.type === 3 && item.voice_item?.text) {
      // Voice with transcription
      return `[Voice] ${item.voice_item.text}`;
    }
    if (item.type === 2) {
      return "[Image]";
    }
    if (item.type === 4) {
      return `[File: ${item.file_item?.file_name || "attachment"}]`;
    }
    if (item.type === 5) {
      return "[Video]";
    }
  }

  return "";
}

/** Format message for Claude */
function formatMessageForClaude(msg: WeixinMessage): string {
  const text = extractText(msg);
  const userId = msg.from_user_id || "unknown";
  return `📱 WeChat message from ${userId}: ${text}`;
}

/**
 * WeChat Channel Server
 */
export class WeChatChannelServer {
  private server: Server;
  private api: IlinkApiClient;
  private credentials: WeixinCredentials | undefined;
  private allowedSenders: Set<string>;
  private contextTokens: Map<string, string>; // userId -> context_token
  private running: boolean = false;
  private pollInterval: number = 1000; // ms between polls

  constructor(credentials?: WeixinCredentials, allowedSenders: string[] = []) {
    this.credentials = credentials;
    this.allowedSenders = new Set(allowedSenders);
    this.contextTokens = new Map();

    // Initialize API client
    const baseUrl = credentials?.baseUrl || "https://ilinkai.weixin.qq.com/";
    this.api = new IlinkApiClient(baseUrl);

    // Create MCP server
    this.server = new Server(
      {
        name: "wechat-channel",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
          // Channel capability - this tells Claude Code we can push events
          // Note: The exact capability name may vary based on MCP spec
        },
      }
    );

    this.setupHandlers();
  }

  /** Setup MCP request handlers */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: "wechat_reply",
          description: "Reply to a WeChat message. Use this when you need to send a message back to a WeChat user who previously messaged you.",
          inputSchema: {
            type: "object",
            properties: {
              userId: {
                type: "string",
                description: "The WeChat user ID to reply to",
              },
              message: {
                type: "string",
                description: "The message text to send",
              },
            },
            required: ["userId", "message"],
          },
        },
      ];
      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === "wechat_reply") {
        return await this.handleReply(args as { userId: string; message: string });
      }

      return {
        content: [
          {
            type: "text",
            text: `Unknown tool: ${name}`,
          },
        ],
      };
    });
  }

  /** Handle reply tool call from Claude */
  private async handleReply(args: { userId: string; message: string }): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    if (!this.credentials) {
      return {
        content: [{ type: "text", text: "Not logged in to WeChat" }],
        isError: true,
      };
    }

    // Check if sender is allowed
    if (!this.allowedSenders.has(args.userId)) {
      return {
        content: [
          {
            type: "text",
            text: `User ${args.userId} is not in the allowlist. Cannot send reply.`,
          },
        ],
        isError: true,
      };
    }

    // Get context token for this user
    const contextToken = this.contextTokens.get(args.userId);
    if (!contextToken) {
      return {
        content: [
          {
            type: "text",
            text: `No context token found for user ${args.userId}. They may need to send a message first.`,
          },
        ],
        isError: true,
      };
    }

    try {
      await this.api.sendMessage({
        token: this.credentials.botToken,
        toUserId: args.userId,
        contextToken,
        text: args.message,
      });

      return {
        content: [
          {
            type: "text",
            text: `✅ Sent reply to ${args.userId}: ${args.message}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to send message: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  /** Start the channel server */
  async start(): Promise<void> {
    if (!this.credentials) {
      throw new Error("No credentials available. Please login first.");
    }

    this.running = true;

    // Connect to stdio for MCP communication
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Start polling for messages
    this.pollMessages().catch((error) => {
      console.error(`Polling error: ${error}`);
      this.running = false;
    });
  }

  /** Poll for new messages and push to Claude */
  private async pollMessages(): Promise<void> {
    let getUpdatesBuf = "";

    while (this.running) {
      try {
        const response = await this.api.getUpdates({
          token: this.credentials!.botToken,
          getUpdatesBuf,
          timeoutMs: 35000,
        });

        if (response.get_updates_buf) {
          getUpdatesBuf = response.get_updates_buf;
        }

        if (response.errcode && response.errcode !== 0) {
          console.error(`WeChat API error: ${response.errcode} ${response.errmsg}`);
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }

        // Process new messages
        for (const msg of response.msgs || []) {
          await this.handleIncomingMessage(msg);
        }

        // Small delay before next poll
        await new Promise((r) => setTimeout(r, this.pollInterval));
      } catch (error) {
        console.error(`Poll error: ${error}`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  /** Handle incoming message from WeChat */
  private async handleIncomingMessage(msg: WeixinMessage): Promise<void> {
    const userId = msg.from_user_id;
    if (!userId) return;

    // Store context token for replies
    if (msg.context_token) {
      this.contextTokens.set(userId, msg.context_token);
    }

    // Check allowlist (auto-add first sender for pairing)
    if (this.allowedSenders.size === 0 || this.allowedSenders.has(userId)) {
      // Push message to Claude via channel event
      // Note: The exact API for pushing events may vary
      // This is a placeholder for the actual channel push mechanism
      const message = formatMessageForClaude(msg);

      // Log to stderr so it doesn't interfere with MCP stdio
      console.error(`📨 Message from ${userId}: ${extractText(msg)}`);

      // TODO: Use proper MCP channel event API when available
      // For now, we rely on Claude to notice via the wechat_reply tool
    } else {
      console.error(`⚠️ Dropped message from unauthorized user: ${userId}`);
    }
  }

  /** Stop the channel server */
  stop(): void {
    this.running = false;
  }

  /** Login to WeChat and save credentials */
  static async login(opts: { verbose?: boolean; timeoutMs?: number }): Promise<void> {
    const api = new IlinkApiClient();
    const result = await api.loginWithQR(opts);

    if (!result.connected || !result.botToken || !result.accountId) {
      throw new Error(result.message || "Login failed");
    }

    // Save credentials
    const config = await loadConfig();
    config.credentials = {
      botToken: result.botToken,
      accountId: result.accountId,
      userId: result.userId || "",
      baseUrl: result.baseUrl || "https://ilinkai.weixin.qq.com/",
      createdAt: Date.now(),
    };

    // Auto-add the user who scanned to allowlist
    if (result.userId) {
      if (!config.allowedSenders) {
        config.allowedSenders = [];
      }
      if (!config.allowedSenders.includes(result.userId)) {
        config.allowedSenders.push(result.userId);
      }
    }

    saveConfig(config);
    console.log(`✅ Login successful! Account ID: ${result.accountId}`);
  }

  /** Add a sender to the allowlist */
  static async addAllowedSender(userId: string): Promise<void> {
    const config = await loadConfig();
    if (!config.allowedSenders) {
      config.allowedSenders = [];
    }
    if (!config.allowedSenders.includes(userId)) {
      config.allowedSenders.push(userId);
      saveConfig(config);
      console.log(`✅ Added ${userId} to allowlist`);
    } else {
      console.log(`ℹ️ ${userId} is already in allowlist`);
    }
  }

  /** Show current status */
  static async status(): Promise<void> {
    const config = await loadConfig();
    if (config.credentials) {
      console.log(`✅ Logged in as: ${config.credentials.accountId}`);
      console.log(`📱 Base URL: ${config.credentials.baseUrl}`);
      console.log(`🔐 Token: ${config.credentials.botToken.slice(0, 20)}...`);
    } else {
      console.log(`❌ Not logged in`);
    }
    if (config.allowedSenders?.length) {
      console.log(`✅ Allowed senders: ${config.allowedSenders.join(", ")}`);
    } else {
      console.log(`⚠️ No allowed senders configured`);
    }
  }

  /** Logout and clear credentials */
  static async logout(): Promise<void> {
    const config = await loadConfig();
    delete config.credentials;
    saveConfig(config);
    console.log(`✅ Logged out`);
  }
}
