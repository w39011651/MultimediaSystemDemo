export interface Message
{
    id: string;
    text: string;
    timestamp: Date;
    channelId: string;
}

export interface Channel
{
    id: string;
    name: string;
    type: 'text' | 'voice';
}