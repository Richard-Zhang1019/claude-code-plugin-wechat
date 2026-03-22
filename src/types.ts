/**
 * Weixin ClawBot ilink API Types
 * Based on @tencent-weixin/openclaw-weixin
 */

/** Common request metadata attached to every CGI request. */
export interface BaseInfo {
  channel_version?: string;
}

/** Message item types */
export const MessageItemType = {
  NONE: 0,
  TEXT: 1,
  IMAGE: 2,
  VOICE: 3,
  FILE: 4,
  VIDEO: 5,
} as const;

export interface TextItem {
  text?: string;
}

export interface CDNMedia {
  encrypt_query_param?: string;
  aes_key?: string;
  encrypt_type?: number;
}

export interface ImageItem {
  media?: CDNMedia;
  thumb_media?: CDNMedia;
  aeskey?: string;
  url?: string;
  mid_size?: number;
  thumb_size?: number;
  thumb_height?: number;
  thumb_width?: number;
  hd_size?: number;
}

export interface VoiceItem {
  media?: CDNMedia;
  encode_type?: number;
  bits_per_sample?: number;
  sample_rate?: number;
  playtime?: number;
  text?: string; // Voice-to-text result
}

export interface FileItem {
  media?: CDNMedia;
  file_name?: string;
  md5?: string;
  len?: string;
}

export interface VideoItem {
  media?: CDNMedia;
  video_size?: number;
  play_length?: number;
  video_md5?: string;
  thumb_media?: CDNMedia;
  thumb_size?: number;
  thumb_height?: number;
  thumb_width?: number;
}

export interface RefMessage {
  message_item?: MessageItem;
  title?: string;
}

export interface MessageItem {
  type?: number;
  create_time_ms?: number;
  update_time_ms?: number;
  is_completed?: boolean;
  msg_id?: string;
  ref_msg?: RefMessage;
  text_item?: TextItem;
  image_item?: ImageItem;
  voice_item?: VoiceItem;
  file_item?: FileItem;
  video_item?: VideoItem;
}

/** Unified message from Weixin API */
export interface WeixinMessage {
  seq?: number;
  message_id?: number;
  from_user_id?: string;
  to_user_id?: string;
  client_id?: string;
  create_time_ms?: number;
  update_time_ms?: number;
  delete_time_ms?: number;
  session_id?: string;
  group_id?: string;
  message_type?: number;
  message_state?: number;
  item_list?: MessageItem[];
  context_token?: string;
}

/** GetUpdates request */
export interface GetUpdatesReq {
  get_updates_buf?: string;
}

/** GetUpdates response */
export interface GetUpdatesResp {
  ret?: number;
  errcode?: number;
  errmsg?: string;
  msgs?: WeixinMessage[];
  get_updates_buf?: string;
  longpolling_timeout_ms?: number;
}

/** SendMessage request */
export interface SendMessageReq {
  msg?: WeixinMessage;
}

/** QR Code login status */
export type QRStatus = "wait" | "scaned" | "confirmed" | "expired";

/** QR Code response */
export interface QRCodeResponse {
  qrcode: string;
  qrcode_img_content: string;
}

/** QR Status poll response */
export interface StatusResponse {
  status: QRStatus;
  bot_token?: string;
  ilink_bot_id?: string;
  baseurl?: string;
  ilink_user_id?: string;
}

/** Login result */
export interface LoginResult {
  connected: boolean;
  botToken?: string;
  accountId?: string;
  baseUrl?: string;
  userId?: string;
  message: string;
}

/** Stored credentials */
export interface WeixinCredentials {
  botToken: string;
  accountId: string;
  userId: string;
  baseUrl: string;
  createdAt: number;
}

/** Channel configuration */
export interface ChannelConfig {
  baseUrl?: string;
  credentials?: WeixinCredentials;
  allowedSenders?: string[];
  longPollTimeoutMs?: number;
}
