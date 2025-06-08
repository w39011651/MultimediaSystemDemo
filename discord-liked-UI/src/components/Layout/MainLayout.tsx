import React from 'react';
import { ChannelList } from '../ChannelList/ChannelList';
import { ChatArea } from '../ChatArea/ChatArea';
import type { Message, Channel } from '../../types';

interface MainLayoutProps {
  textChannels: Channel[];
  voiceChannels: Channel[];
  messages: Message[];
  input: string;
  activeChannel: string;
  setInput: (value: string) => void;
  sendMessage: () => void;
  switchChannel: (channelId: string) => void; // 新增
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  textChannels,
  voiceChannels,
  messages,
  input,
  activeChannel,
  setInput,
  sendMessage,
  switchChannel, // 新增
}) => {
  console.log('[MainLayout] Component execution started'); // <--- 新增日誌
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <ChannelList
        textChannels={textChannels}
        voiceChannels={voiceChannels}
        activeChannel={activeChannel} // 新增
        switchChannel={switchChannel} // 新增
      />
      <ChatArea
        messages={messages}
        input={input}
        activeChannel={activeChannel}
        onInputChange={setInput}
        onSendMessage={sendMessage}
      />
    </div>
  );
};

