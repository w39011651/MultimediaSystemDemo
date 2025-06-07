export interface Message
{
    type: string,
    id: string;
    text: string;
    timestamp: Date;
    channelId: string;
    userId?: string;    // 發送訊息的使用者 ID
    userName?: string;  // 發送訊息的使用者名稱 (可選)
}

export interface Channel
{
    id: string;
    name: string;
    type: 'text' | 'voice';
}

export interface User
{
    id: string;
    name: string;
    status: 'online' | 'offline' | 'away';
}