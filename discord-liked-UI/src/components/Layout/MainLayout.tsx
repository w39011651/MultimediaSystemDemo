import React from 'react';
import { ChannelList } from '../ChannelList/ChannelList';
import { ChatArea } from '../ChatArea/ChatArea';
import type { Message, Channel } from '../../types';
import { text } from 'stream/consumers';

interface MainLayoutProps {
  textChannels: Channel[];
  voiceChannels: Channel[];
  messages: Message[];
  input: string;
  activeChannel: string;
  setInput: (value: string) => void;
  sendMessage: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  textChannels,
  voiceChannels,
  messages,
  input,
  activeChannel,
  setInput,
  sendMessage,
}) => {
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <ChannelList
        textChannels={textChannels}
        voiceChannels={voiceChannels}
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

