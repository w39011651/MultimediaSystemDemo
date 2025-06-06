interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChange,
  onSend,
  placeholder = "Type a message..."
}) => {
  return (
    <div style={{ padding: '16px', background: '#222327', display: 'flex' }}>
      <input
        style={{ 
          flex: 1, 
          padding: '8px',
          backgroundColor: '#222327',
          border: 'none',
          color: '#fff',
          outline: 'none'
        }}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        onKeyDown={e => {
          if (e.key === 'Enter' && value.trim()) {
            onSend();
          }
        }}
      />
      <button
        style={{ padding: '8px 16px', marginLeft: '8px' }}
        onClick={onSend}
      >
        Send
      </button>
    </div>
  );
};