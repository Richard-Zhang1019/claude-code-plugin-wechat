/**
 * Weixin ClawBot ilink API Client
 */

import type {
  WeixinMessage,
  GetUpdatesReq,
  GetUpdatesResp,
  SendMessageReq,
  QRCodeResponse,
  StatusResponse,
  LoginResult,
} from "./types.js";

const DEFAULT_BASE_URL = "https://ilinkai.weixin.qq.com/";
const CHANNEL_VERSION = "0.1.0";
const DEFAULT_BOT_TYPE = "3";
const QR_LONG_POLL_TIMEOUT_MS = 35000;
const DEFAULT_LONG_POLL_TIMEOUT_MS = 35000;

/** Generate random X-WECHAT-UIN header */
function randomWechatUin(): string {
  const uint32 = crypto.getRandomValues(new Uint32Array(1))[0];
  return btoa(String(uint32));
}

/** Build base info for requests */
function buildBaseInfo() {
  return { channel_version: CHANNEL_VERSION };
}

/** Build request headers */
function buildHeaders(body: string, token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    AuthorizationType: "ilink_bot_token",
    "Content-Length": String(Buffer.byteLength(body, "utf-8")),
    "X-WECHAT-UIN": randomWechatUin(),
  };
  if (token?.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }
  return headers;
}

/** Ensure URL has trailing slash */
function ensureTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

/**
 * Weixin ilink API Client
 */
export class IlinkApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = DEFAULT_BASE_URL) {
    this.baseUrl = ensureTrailingSlash(baseUrl);
  }

  /**
   * Fetch QR code for login
   */
  async fetchQRCode(botType: string = DEFAULT_BOT_TYPE): Promise<QRCodeResponse> {
    const url = new URL(`ilink/bot/get_bot_qrcode?bot_type=${encodeURIComponent(botType)}`, this.baseUrl);

    const response = await fetch(url.toString(), {
      headers: { "iLink-App-ClientVersion": "1" },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "(unreadable)");
      throw new Error(`Failed to fetch QR code: ${response.status} ${response.statusText} body=${body}`);
    }

    return (await response.json()) as QRCodeResponse;
  }

  /**
   * Poll QR code status (long poll)
   */
  async pollQRStatus(qrcode: string): Promise<StatusResponse> {
    const url = new URL(`ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`, this.baseUrl);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), QR_LONG_POLL_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        headers: {
          "iLink-App-ClientVersion": "1",
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Failed to poll QR status: ${response.status} ${response.statusText} body=${body}`);
      }

      return (await response.json()) as StatusResponse;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === "AbortError") {
        // Timeout is normal for long poll
        return { status: "wait" };
      }
      throw err;
    }
  }

  /**
   * Login with QR code (blocking)
   */
  async loginWithQR(opts: { timeoutMs?: number; verbose?: boolean }): Promise<LoginResult> {
    const timeoutMs = opts.timeoutMs ?? 300000; // 5 minutes default
    const deadline = Date.now() + timeoutMs;
    let scannedPrinted = false;

    // Fetch initial QR code
    const qrResponse = await this.fetchQRCode();
    const qrcode = qrResponse.qrcode;
    const qrcodeUrl = qrResponse.qrcode_img_content;

    if (opts.verbose) {
      console.log(`\n📱 Scan this QR code with WeChat:\n`);
      console.log(qrcodeUrl);
      console.log(`\nOr scan at: https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrcodeUrl)}\n`);
    }

    // Poll for status
    while (Date.now() < deadline) {
      const statusResponse = await this.pollQRStatus(qrcode);

      switch (statusResponse.status) {
        case "wait":
          if (opts.verbose) {
            process.stdout.write(".");
          }
          break;
        case "scaned":
          if (!scannedPrinted && opts.verbose) {
            process.stdout.write("\n👀 Scanned! Confirm in WeChat...\n");
            scannedPrinted = true;
          }
          break;
        case "expired":
          // QR expired, need to refresh
          if (opts.verbose) {
            console.log("\n⏳ QR expired, refreshing...");
          }
          const newQr = await this.fetchQRCode();
          return this.loginWithQR(opts); // Retry with new QR
        case "confirmed":
          if (!statusResponse.ilink_bot_id) {
            return {
              connected: false,
              message: "Login confirmed but ilink_bot_id missing",
            };
          }
          if (opts.verbose) {
            console.log("\n✅ Connected to WeChat!\n");
          }
          return {
            connected: true,
            botToken: statusResponse.bot_token,
            accountId: statusResponse.ilink_bot_id,
            baseUrl: statusResponse.baseurl,
            userId: statusResponse.ilink_user_id,
            message: "Connected successfully",
          };
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return {
      connected: false,
      message: "Login timeout",
    };
  }

  /**
   * Long poll for updates (new messages)
   */
  async getUpdates(params: {
    token: string;
    getUpdatesBuf?: string;
    timeoutMs?: number;
  }): Promise<GetUpdatesResp> {
    const timeout = params.timeoutMs ?? DEFAULT_LONG_POLL_TIMEOUT_MS;

    const body = JSON.stringify({
      get_updates_buf: params.getUpdatesBuf ?? "",
      base_info: buildBaseInfo(),
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const url = new URL("ilink/bot/getupdates", this.baseUrl);
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: buildHeaders(body, params.token),
        body,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        const rawText = await response.text();
        throw new Error(`getUpdates ${response.status}: ${rawText}`);
      }

      return (await response.json()) as GetUpdatesResp;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === "AbortError") {
        // Long poll timeout is normal
        return { ret: 0, msgs: [], get_updates_buf: params.getUpdatesBuf };
      }
      throw err;
    }
  }

  /**
   * Send a message to WeChat
   */
  async sendMessage(params: {
    token: string;
    toUserId: string;
    contextToken: string;
    text: string;
    msgId?: string;
  }): Promise<void> {
    const msg: WeixinMessage = {
      to_user_id: params.toUserId,
      context_token: params.contextToken,
      item_list: [
        {
          type: 1, // TEXT
          text_item: { text: params.text },
          msg_id: params.msgId,
        },
      ],
    };

    const body = JSON.stringify({
      msg,
      base_info: buildBaseInfo(),
    });

    const url = new URL("ilink/bot/sendmessage", this.baseUrl);
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: buildHeaders(body, params.token),
      body,
    });

    if (!response.ok) {
      const rawText = await response.text();
      throw new Error(`sendMessage ${response.status}: ${rawText}`);
    }
  }
}
