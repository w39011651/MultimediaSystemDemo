import React, { useState } from 'react';
import type { Channel } from '../../types/index.ts';
import { ChannelItem } from './ChannelItem';

// 1. 擴充 props 型別，加入語音/視訊相關
interface ChannelListProps {
  textChannels: Channel[];
  voiceChannels: Channel[];
  activeChannel: string;
  switchChannel: (channelId: string) => void;
  // 語音/視訊 props
  activeVoiceChannelId?: string | null;
  voiceChannelMembers?: Record<string, any>;
  joinVoiceChannel?: (channelId: string) => void;
  leaveCurrentVoiceChannel?: () => void;
  remoteStreams?: Record<string, MediaStream>;
  isCameraOn?: boolean;
  toggleCamera?: () => void;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  textChannels,
  voiceChannels,
  activeChannel,
  switchChannel,
  activeVoiceChannelId,
  voiceChannelMembers,
  joinVoiceChannel,
  leaveCurrentVoiceChannel,
  remoteStreams,
  isCameraOn,
  toggleCamera,
}) => {
  // 新增 state 控制 tooltip
  const [hoveredBtn, setHoveredBtn] = useState<null | 'video' | 'hangup'>(null);

  const handleChannelClick = (channelId: string, type: 'text' | 'voice') => {
    if (type === 'text') {
      switchChannel(channelId);
    } else if (type === 'voice') {
      joinVoiceChannel && joinVoiceChannel(channelId);
    }
  };

  // DEBUG: Log voice state from useVoice
  console.log('[ChannelList] activeVoiceChannelId:', activeVoiceChannelId);
  console.log('[ChannelList] voiceChannelMembers:', voiceChannelMembers);
  console.log('[ChannelList] remoteStreams:', remoteStreams); // <--- 新增 debug log
  

  return (
    <div style={{
      width: '240px',
      background: '#1e1f22',
      padding: '16px',
      color: '#8e9297',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      boxSizing: 'border-box'
    }}>
      {/* ...原本的頻道列表... */}
      <div style={{ flex: 1 }}>
        {/* ...Text Channels... */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px' }}>Text Channels</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {textChannels.map(channel => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                isActive={channel.id === activeChannel}
                onClick={handleChannelClick}
              />
            ))}
          </ul>
        </div>
        {/* ...Voice Channels... */}
        <div>
          <h3 style={{ fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px' }}>Voice Channels</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {voiceChannels.map(channel => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                isActive={channel.id === activeVoiceChannelId}
                usersInChannel={voiceChannelMembers?.[channel.id]}
                onClick={handleChannelClick}
              />
            ))}
          </ul>
        </div>
      </div>

      {/* 語音狀態區塊 */}
      {activeVoiceChannelId && (
        <div
          style={{
            background: '#232428',
            borderRadius: '8px',
            padding: '12px',
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative'
          }}
        >
          {/* 左側：開啟視訊 */}
          <div style={{ position: 'relative' }}>
            <button
              style={{
                background: '#36393f',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#b9bbbe',
                fontSize: '20px',
                cursor: 'pointer',
                marginRight: '8px'
              }}
              onMouseEnter={() => setHoveredBtn('video')}
              onMouseLeave={() => setHoveredBtn(null)}
              onClick={toggleCamera}
            >
              <span role="img" aria-label="video">📷</span>
            </button>
            {hoveredBtn === 'video' && (
              <div style={{
                position: 'absolute',
                top: '110%',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#222',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                zIndex: 10
              }}>
                {isCameraOn ? '關閉視訊鏡頭' : '開啟視訊鏡頭'}
              </div>
            )}
          </div>

          {/* 中間：頻道資訊 */}
          <div style={{ flex: 1, textAlign: 'center', color: '#43b581', fontSize: '14px' }}>
            <div>語音已連線</div>
            <div style={{ color: '#fff', fontSize: '13px' }}>
              {voiceChannels.find(v => v.id === activeVoiceChannelId)?.name}
            </div>
          </div>

          {/* 右側：中斷連線 */}
          <div style={{ position: 'relative' }}>
            <button
              style={{
                background: '#ff5555',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '20px',
                cursor: 'pointer',
                marginLeft: '8px'
              }}
              onMouseEnter={() => setHoveredBtn('hangup')}
              onMouseLeave={() => setHoveredBtn(null)}
              onClick={leaveCurrentVoiceChannel}
            >
              <span role="img" aria-label="hangup">📞</span>
            </button>
            {hoveredBtn === 'hangup' && (
              <div style={{
                position: 'absolute',
                top: '110%',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#222',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                zIndex: 10
              }}>
                中斷連接
              </div>
            )}
          </div>
        </div>
      )}
      {/* === 新增：遠端音訊播放區塊 === */}
      {remoteStreams && Object.entries(remoteStreams).map(([peerId, stream]) =>
        stream ? (
          <audio
            key={peerId}
            ref={audio => {
              if (audio && stream) audio.srcObject = stream;
            }}
            autoPlay
            controls
            style={{ display: 'none' }}
          />
        ) : null
      )}
    </div>
  );
};