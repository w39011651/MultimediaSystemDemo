import { ChannelList } from '../ChannelList/ChannelList';
import { ChatArea } from '../ChatArea/ChatArea';
import type { Message, Channel } from '../../types';

interface MainLayoutProps {
  channels?: Channel[];
  messages: Message[];
  input: string;
  activeChannel: string;
  setInput: (value: string) => void;
  sendMessage: () => void;
  switchChannel: (channelId: string) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  channels = [], // 預設空陣列
  messages,
  input,
  activeChannel,
  setInput,
  sendMessage,
  switchChannel
}) => {
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <ChannelList
        channels={channels}
        activeChannel={activeChannel}
        onChannelClick={switchChannel}
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