import { useRef, useEffect } from 'react';
import type { Message } from '../../types';

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', color: '#fff' }}>
      {[...messages]
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        .map((msg) => (
          <div key={msg.id} style={{ marginBottom: '8px' }}>
            <span style={{ color: '#b9bbbe', fontSize: '12px' }}>
              {msg.timestamp.toLocaleTimeString()}
            </span>
            {msg.type === 'system-message' ? (
              <div style={{ color: '#ffb347', fontStyle: 'italic' }}>{msg.text}</div>
            ) : (
              <div>
                <b>{msg.userName}:</b> {msg.text}
              </div>
            )}
          </div>
        ))}
      <div ref={messagesEndRef} />
    </div>
  );
};