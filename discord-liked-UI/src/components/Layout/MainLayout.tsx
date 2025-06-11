import React from 'react';
import { ChannelList } from '../ChannelList/ChannelList';
import { ChatArea } from '../ChatArea/ChatArea';
import { useVoice } from '../../hooks/useVoice'; // 新增
import type { Message, Channel } from '../../types';

interface MainLayoutProps {
  textChannels: Channel[];
  voiceChannels: Channel[];
  messages: Message[];
  input: string;
  activeChannel: string;
  setInput: (value: string) => void;
  sendMessage: () => void;
  switchChannel: (channelId: string) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  textChannels,
  voiceChannels,
  messages,
  input,
  activeChannel,
  setInput,
  sendMessage,
  switchChannel,
}) => {
  // 只在這裡呼叫 useVoice，並將所有語音/視訊狀態傳給子元件
  const voice = useVoice();

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <ChannelList
        textChannels={textChannels}
        voiceChannels={voiceChannels}
        activeChannel={activeChannel}
        switchChannel={switchChannel}
        {...voice} // 傳遞語音/視訊狀態與方法
      />
      <ChatArea
        messages={messages}
        input={input}
        activeChannel={activeChannel}
        onInputChange={setInput}
        onSendMessage={sendMessage}
        {...voice} // 傳遞語音/視訊狀態與方法
      />
    </div>
  );
};
