import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import type { Message } from '../../types';

interface ChatAreaProps {
  messages: Message[];
  input: string;
  activeChannel: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  input,
  activeChannel,
  onInputChange,
  onSendMessage
}) => {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1a1a1e' }}>
      {/* 頻道標題 */}
      <div style={{ padding: '16px', borderBottom: '1px solid #40444b', background: '#36393f' }}>
        <h3 style={{ margin: 0, color: '#fff' }}>#{activeChannel}</h3>
      </div>
      
      {/* 訊息列表 */}
      <MessageList messages={messages} />
      
      {/* 輸入區 */}
      <MessageInput
        value={input}
        onChange={onInputChange}
        onSend={onSendMessage}
        placeholder={`Message #${activeChannel}`}
      />
    </div>
  );
};