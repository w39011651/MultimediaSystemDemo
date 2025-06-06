import { useState } from 'react';
import type{ Message, Channel } from '../types/index.ts';

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [activeChannel, setActiveChannel] = useState<string>('chat1');

  const sendMessage = () => {
    if (input.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: input,
        timestamp: new Date(),
        channelId: activeChannel
      };
      setMessages(prev => [...prev, newMessage]);
      setInput('');
    }
  };

  const switchChannel = (channelId: string) => {
    setActiveChannel(channelId);
    // 可以在這裡載入該頻道的訊息
  };

  return {
    messages: messages.filter(msg => msg.channelId === activeChannel),
    input,
    activeChannel,
    setInput,
    sendMessage,
    switchChannel
  };
};