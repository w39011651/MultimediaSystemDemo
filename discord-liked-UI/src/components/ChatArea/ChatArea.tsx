import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import type { Message } from '../../types';

// 1. 擴充 props 型別，加入語音/視訊相關
interface ChatAreaProps {
  messages: Message[];
  input: string;
  activeChannel: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  // 新增語音/視訊 props
  localVideoStream?: MediaStream | null;
  remoteVideoStreams?: Record<string, MediaStream>;
  isCameraOn?: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  input,
  activeChannel,
  onInputChange,
  onSendMessage,
  localVideoStream,
  remoteVideoStreams,
  isCameraOn
}) => {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1a1a1e' }}>
      {/* 頻道標題 */}
      <div style={{ padding: '16px', borderBottom: '1px solid #40444b', background: '#36393f' }}>
        <h3 style={{ margin: 0, color: '#fff' }}>#{activeChannel}</h3>
      </div>

      {/* === 本地與遠端視訊播放區塊 === */}
      <div style={{ display: 'flex', gap: 8, margin: '16px 0', flexWrap: 'wrap' }}>
        {/* 本地視訊 */}
        {isCameraOn && localVideoStream && (
          <video
            style={{ width: 160, height: 120, background: '#000', borderRadius: 8 }}
            ref={video => {
              if (video && localVideoStream) video.srcObject = localVideoStream;
            }}
            autoPlay
            muted
          />
        )}
        {/* 遠端視訊 */}
        {/* 遠端視訊 */}
        {remoteVideoStreams &&
          Object.entries(remoteVideoStreams).map(([peerId, stream]) => {
            const videoTracks = stream?.getVideoTracks() ?? [];
            if (videoTracks.length === 0 || videoTracks[0].readyState !== 'live') {
              // 新增：遠端鏡頭關閉時顯示提示
              return (
                <div
                  key={peerId}
                  style={{
                    width: 160,
                    height: 120,
                    background: '#222',
                    borderRadius: 8,
                    color: '#aaa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 500,
                  }}
                >
                  {peerId}已關閉鏡頭
                </div>
              );
            }
            return (
              <video
                key={peerId + (stream?.id ?? '') + (videoTracks[0]?.readyState ?? '')}
                style={{ width: 160, height: 120, background: '#000', borderRadius: 8 }}
                ref={video => {
                  if (video && stream) video.srcObject = stream;
                }}
                autoPlay
              />
            );
          })}
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