import { create } from 'zustand';
import type { User, Message, Channel } from '../types/index'
import { VOICE_EVENT_TYPES } from '../constant/events';

interface WebSocketState {
    ws: WebSocket | null;
    isConnected : boolean;
    myId: string | null;
    users: User[];
    textChannels: Channel[];
    voiceChannels: Channel[];

    // Chat related state
    activeTextChannelId: string | null;
    messagesByChannel: Record<string, Message[]>; // { channelId: [Message, ...] }

    // Voice related state
    activeVoiceChannelId: string | null;
    voiceChannelMembers: Record<string, User[]>; // { voiceChannelId: [User, ...] }

    // Actions
    connect: () => void;
    disconnect: () => void;
    sendMessage: (message: any) => void;

    // Chat actions
    setActiveTextChannel: (channelId: string) => void;
    addTextMessage: (message: Message) => void;
    loadHistoryMessages: (channelId: string, messages: Message[]) => void;

    // Voice actions
    joinVoiceChannel: (channelId: string) => void;
    leaveCurrentVoiceChannel: () => void;
    _handleVoiceMessage: (msg: any) => void; //內部處理語音訊息

    // Internal WebSocket event handlers
    _handleOpen: () => void;
    _handleMessage: (event: MessageEvent) => void;
    _handleClose: () => void;
    _handleError: (event: Event) => void;
}

const initialTextChannels: Channel[] = [
    { id: 'chat1', name: 'Chat 1', type: 'text' },
    { id: 'chat2', name: 'Chat 2', type: 'text' },
    { id: 'chat3', name: 'Chat 3', type: 'text' },
];
const initialVoiceChannels: Channel[] = [
    { id: 'voice1', name: 'Voice 1', type: 'voice' },
    { id: 'voice2', name: 'Voice 2', type: 'voice' },
];

const URL: string = 'ws://localhost:8080';
// Provide empty array and object constants
const STABLE_EMPTY_ARRAY: User[] = [];
const STABLE_EMPTY_VOICE_MEMBERS: Record<string, User[]> = {};

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  ws: null,
  isConnected: false, // 初始為 false
  myId: 'test-static-id', // 靜態 ID
  users: STABLE_EMPTY_ARRAY,
  textChannels: [ // 靜態頻道數據
    { id: 'chat1', name: 'General Text', type: 'text' },
    { id: 'chat2', name: 'Random Text', type: 'text' },
  ],
  voiceChannels: [ // 靜態頻道數據
    { id: 'voice1', name: 'General Voice', type: 'voice' },
    { id: 'voice2', name: 'Gaming Voice', type: 'voice' },
  ],
  messagesByChannel: {},
  activeTextChannelId: 'chat1', // 靜態
  activeVoiceChannelId: null,  // 靜態
  voiceChannelMembers: STABLE_EMPTY_VOICE_MEMBERS,
  isConnecting: false,

  connect: () => {
    console.log('[Store - Simplified] connect called');
    // 暫時不做任何 WebSocket 連線
    // set({ isConnected: true, isConnecting: false }); // 可以模擬連接成功
  },
  disconnect: () => {
    console.log('[Store - Simplified] disconnect called');
    // set({ isConnected: false, ws: null, activeVoiceChannelId: null, voiceChannelMembers: STABLE_EMPTY_VOICE_MEMBERS });
  },
  sendMessage: (message: any) => {
    console.log('[Store - Simplified] sendMessage called with:', message);
  },
  setActiveTextChannel: (channelId: string) => {
    console.log('[Store - Simplified] setActiveTextChannel called with:', channelId);
    set({ activeTextChannelId: channelId });
  },
  addTextMessage: (_message: Message) => {
    // no-op for simplified store
  },
  loadHistoryMessages: (_channelId: string, _messages: Message[]) => {
    // no-op for simplified store
  },
  joinVoiceChannel: (channelId: string) => {
    console.log('[Store - Simplified] joinVoiceChannel called with:', channelId);
    // set({ activeVoiceChannelId: channelId });
  },
  leaveCurrentVoiceChannel: () => {
    console.log('[Store - Simplified] leaveCurrentVoiceChannel called');
    // set({ activeVoiceChannelId: null, voiceChannelMembers: STABLE_EMPTY_VOICE_MEMBERS });
  },
  _handleVoiceMessage: (_msg: any) => {
    // no-op for simplified store
  },
  _handleOpen: () => {
    // no-op for simplified store
  },
  _handleMessage: (_event: MessageEvent) => {
    // no-op for simplified store
  },
  _handleClose: () => {
    // no-op for simplified store
  },
  _handleError: (_event: Event) => {
    // no-op for simplified store
  },
}));

const useWebSocketStore2 = create<WebSocketState>((set, get) => ({
    ws: null,
    isConnected: false,
    myId: null,
    users: [],
    textChannels: initialTextChannels, // 初始值，之後可以考慮從 API 獲取
    voiceChannels: initialVoiceChannels, // 初始值

    activeTextChannelId: initialTextChannels[0]?.id || null, // 預設第一個文字頻道
    messagesByChannel: {},

    activeVoiceChannelId: null,
    voiceChannelMembers: {},

    /*
    useWebSocketStore.connect: 對應 useWebSocket.ts 中 useEffect 裡建立 new WebSocket(...) 
    並設置 onopen, onmessage, onclose, onerror 的邏輯。
    */
    connect: () => 
    {
        console.log('[Store] Attempting to connect WebSocket...');
        // if (get().ws && get().isConnected) // 這個條件可能不夠，因為 ws 可能存在但 isConnected 是 false
        if (get().ws && get().ws.readyState === WebSocket.OPEN && get().isConnected) // 更嚴格的檢查
        {
            console.log('[Store] WebSocket already connected and ws instance exists.');
            return;
        }
        if (get().ws) 
        { // 如果 ws 實例存在，無論其狀態如何，先關閉它
            console.log('[Store] Existing ws instance found. Closing it before creating a new one. ReadyState:', get().ws.readyState);
            get().ws.close();
            // set({ ws: null }); // 可以在這裡立即設為 null，或依賴 onclose
        }
        const wsInstance = new WebSocket(URL);
        console.log('[Store] New WebSocket instance created:', wsInstance);
        wsInstance.onopen = () => 
        {
            console.log('[Store] WebSocket onopen event triggered.');
            get()._handleOpen();
        }

        wsInstance.onmessage = (event) => get()._handleMessage(event);
        wsInstance.onclose = () => 
        {
            console.log('[Store] WebSocket onclose event triggered. Code:', event.code, 'Reason:', event.reason, 'wasClean:', event.wasClean);
            get()._handleClose();
        }
        wsInstance.onerror = (event) => 
        {
            console.error('[Store] WebSocket onerror event triggered:', event);
            get()._handleError(event);
        }
        set({ ws:wsInstance });
        console.log('[Store] ws instance set in store.');
    },
    
    /*useWebSocketStore.disconnect: 對應 useEffect 清理函數中的 ws.current.close()。*/
    disconnect: () => 
    {
        get().ws?.close();
        set({ ws:null, isConnected: false});
    },

    /**
    useWebSocketStore.sendMessage: 對應 useWebSocket.ts 中的 sendMessage 函式。
    */
    sendMessage: (message) => 
    {
        const ws = get().ws;
        if (ws && ws.readyState === WebSocket.OPEN)
        {
            ws.send(JSON.stringify(message));
        }
        else
        {
            console.error('[Store] WebSocket is not open. Cannot send message:', message);
        }
    },

    /**
    useWebSocketStore._handleOpen: 對應 ws.current.onopen 的回呼。*  
    */
    _handleOpen: () => 
    {
        console.log('[Store] _handleOpen: WebSocket connected. Setting isConnected to true.');
        set({ isConnected: true });
        // 連線成功後，可以發送初始請求，例如獲取預設頻道的歷史訊息
        const activeTextChannel = get().activeTextChannelId;
        if (activeTextChannel) 
        {
            get().sendMessage({ type: "get-history", channelId: activeTextChannel });
        }
    },

    /**
    useWebSocketStore._handleClose: 對應 ws.current.onclose。* 
    */
    _handleClose: () => 
    {
        console.warn('[Store] _handleClose: WebSocket disconnected. Setting isConnected to false and ws to null.');
        set({ isConnected: false, ws: null, activeVoiceChannelId: null, voiceChannelMembers: {} });
    },

    /**
    useWebSocketStore._handleError: 對應 ws.current.onerror。
    */
    _handleError: (event: any) => 
    {
        console.error('[Store] _handleError: WebSocket error occurred.', event);
        // 可以在這裡觸發一些錯誤處理邏輯        
        set ({ isConnected: false});
    },

    /**
     *useWebSocketStore._handleMessage: 這是核心改變。
     *它取代了 useWebSocket.ts 中 ws.current.onmessage 內部龐大的 if/else if 結構。
     *現在，所有訊息首先由 Store 的 _handleMessage 接收，
     *然後根據 msg.type 分發給 Store 內部相應的狀態更新邏輯
     *（例如更新 users, messagesByChannel, 或調用 _handleVoiceMessage）。 
     */
    _handleMessage: (event: MessageEvent) => 
    {
        const msg = JSON.parse(event.data as string);
        console.log('[Store] Received message:', msg);

        switch (msg.type)
        {
            case 'welcome':
                set({ myId: msg.id });
                const userObjects: User[] = msg.userList.map((userId: string) => 
                (
                    {
                        id: userId,
                        name: userId,
                        status: 'online',
                    }
                ));
                set({ users: userObjects });
            break;
            case 'user-joined':// 全局使用者加入
                const newUser: User = { id: msg.id, name: msg.id, status: 'online'};
                set(state => 
                ({
                    users: state.users.find(u => u.id === newUser.id) ? state.users : [...state.users, newUser]
                }));
                if (msg.message)
                {
                    const systemMessage: Message = 
                    {
                        type: 'system-message',
                        id: `system-${Date.now()}-${Math.random()}`,
                        text: msg.message,
                        timestamp: new Date(),
                        channelId: get().activeTextChannelId || 'unknown',
                        userId: 'system',
                        userName: 'System',
                    };
                    get().addTextMessage(systemMessage);
                }
            break;
            case 'user-left':// 全局使用者離開
                set(state => ({ users: state.users.filter(user => user.id !== msg.id) }));
                if(msg.message)
                {
                    const systemMessage: Message = 
                    {
                        type: 'system-message',
                        id: `system-${Date.now()}-${Math.random()}`,
                        text: msg.message,
                        timestamp: new Date(),
                        channelId: get().activeTextChannelId || 'unknown',
                        userId: 'system',
                        userName: 'System',
                    };
                    get().addTextMessage(systemMessage);
                }
            break;
            case 'text-message':
                const sender = get().users.find(u => u.id === msg.fromId);
                const newTextMessage: Message = 
                {
                    type: 'text-message',
                    id: `${msg.fromId}-${msg.timestamp}-${Math.random()}`,
                    text: msg.text,
                    timestamp: new Date(msg.timestamp),
                    channelId: msg.channelId,
                    userId: msg.fromId,
                    userName: sender ? sender.name : msg.fromId,
                };
                get().addTextMessage(newTextMessage);
            break;
            case 'history':
                const historyMessages: Message[] = (msg.messages || []).map((m: any) => ({
                type: 'text-message',
                id: `${m.fromId}-${m.timestamp}-${Math.random()}`,
                text: m.text,
                timestamp: new Date(m.timestamp),
                channelId: m.channelId,
                userId: m.fromId,
                userName: get().users.find(u => u.id === m.fromId)?.name || m.fromId,
                }));
                get().loadHistoryMessages(msg.channelId, historyMessages);
            break;
            case VOICE_EVENT_TYPES.VOICE_CHANNEL_STATUS:
            case VOICE_EVENT_TYPES.VOICE_USER_JOINED:
            case VOICE_EVENT_TYPES.VOICE_USER_LEFT:
                get()._handleVoiceMessage(msg);
                break;
            default:
                console.warn('[Store] Unhandled message type:', msg.type, msg);
        }
    },

    /**
     * 移除了 setTextMessageCallback, setVoiceMessageHandler, setHistoryCallback: 
     * 這些 callback 註冊機制不再需要，因為所有相關邏輯都集中在 Store 的 _handleMessage 中處理。
     * Above is useWebSocket.ts
     * Below will be useChat.ts
     */
    /**
     * useWebSocketStore.setActiveTextChannel: 
     * 對應 useChat.ts 中的 switchChannel 邏輯，現在還整合了初次切換頻道時請求歷史訊息的邏輯。
     */
    setActiveTextChannel: (channelId) => 
    {
        set( {activeTextChannelId: channelId} );
        if (!get().messagesByChannel[channelId]?.length)
        {
            get().sendMessage({ type: 'get-history', channelId });
        }
    },

    /**
     * useWebSocketStore.addTextMessage: 對應 useChat.ts 中 
     * handleIncomingMessage 裡處理 text-message 類型並調用 setMessages 的部分。
     * Store 中還增加了簡單的防止重複訊息的邏輯。
     */
    addTextMessage: (message) => 
    {
        set ( state => 
            {
                const channelMessages = state.messagesByChannel[message.channelId] || [];
                if (channelMessages.find(m => m.id === message.id)) return {};//簡單的防止重複，基於id
                return { //?
                    messagesByChannel: {
                    ...state.messagesByChannel,
                    [message.channelId]: [...channelMessages, message]
                    }
                };
            }
            )
    },

    /**
     * 應 useChat.ts 中 setHistoryCallback 內部處理歷史訊息並調用 setMessages 的部分。
     */
    loadHistoryMessages: (channelId, messages) => 
    {
        set(state => 
        ({
            messagesByChannel: 
            {
                ...state.messagesByChannel,
                [channelId]: messages // 直接替換，或者您可以做合併邏輯
            }
        }));
    },

    /**
     * 聊天訊息的發送: 原本 useChat.ts 的 sendMessage 函式會調用 
     * useWebSocket.ts 的 wsSendMessage。現在，UI 元件或簡化的 useAppChat Hook 會直接調用
     * Store 的 sendMessage，並由 Store 的 _handleMessage 處理伺服器回傳的訊息（如果有的話）來更新狀態。
     * Above is useChat.ts
     * Below will be useVoice.ts
     */
    /**
     * 這是一個新的內部輔助函式，它整合了原 useVoice.ts 中 handleVoiceMessage 
     * 內部 switch 語句處理 VOICE_CHANNEL_STATUS, VOICE_USER_JOINED, VOICE_USER_LEFT 的所有邏輯。
     * VOICE_CHANNEL_STATUS: 更新 voiceChannelMembers 和 activeVoiceChannelId。
     * VOICE_USER_JOINED: 更新對應頻道的 voiceChannelMembers。
    * VOICE_USER_LEFT: 更新對應頻道的 voiceChannelMembers，並在自己離開時重置 activeVoiceChannelId。
     */
    _handleVoiceMessage: (msg) => 
    {
    switch (msg.type) 
    {
        case VOICE_EVENT_TYPES.VOICE_CHANNEL_STATUS:
        if (msg.channelId && Array.isArray(msg.users)) 
        {
            const users: User[] = msg.users.map((u: { userId: string, userName: string }) => 
            ({
                id: u.userId,
                name: u.userName || u.userId,
                status: 'online',
            }));
            set(state => 
            ({
                voiceChannelMembers: { ...state.voiceChannelMembers, [msg.channelId]: users },
                // 伺服器確認後，更新 activeVoiceChannelId
                activeVoiceChannelId: msg.channelId
            }));
        }
        break;
        case VOICE_EVENT_TYPES.VOICE_USER_JOINED:
        if (msg.channelId && msg.userId) 
        {
            const newUser: User = { id: msg.userId, name: msg.userName || msg.userId, status: 'online' };
            set(state => 
            {
                const currentChannelUsers = state.voiceChannelMembers[msg.channelId] || [];
                if (currentChannelUsers.find(u => u.id === newUser.id)) return {}; // 已存在
                return {
                    voiceChannelMembers: {
                    ...state.voiceChannelMembers,
                    [msg.channelId]: [...currentChannelUsers, newUser]
                    }
                };
            });
        }
        break;
        case VOICE_EVENT_TYPES.VOICE_USER_LEFT:
        if (msg.channelId && msg.userId) 
        {
            set(state => 
            {
                const currentChannelUsers = state.voiceChannelMembers[msg.channelId] || [];
                const updatedUsers = currentChannelUsers.filter(u => u.id !== msg.userId);
                const newVoiceMembers = { ...state.voiceChannelMembers, [msg.channelId]: updatedUsers };
                // 如果離開的是自己，則清除 activeVoiceChannelId
                const newActiveVoiceId = (msg.userId === state.myId && msg.channelId === state.activeVoiceChannelId)
                                            ? null
                                            : state.activeVoiceChannelId;
                if (updatedUsers.length === 0 && msg.channelId in newVoiceMembers) {
                        // 如果頻道空了，可以選擇性地從 voiceChannelMembers 中移除該頻道鍵
                        // delete newVoiceMembers[msg.channelId];
                }
                return {
                    voiceChannelMembers: newVoiceMembers,
                    activeVoiceChannelId: newActiveVoiceId
                };
            });
        }
        break;
    }
    },

    /**
     * 對應 useVoice.ts 中的 joinVoiceChannel。
     * 離開舊頻道的 sendMessage 邏輯保留。
     * 樂觀更新 activeVoiceChannelId 的邏輯保留。
     * 移除了 setVoiceChannelMembers 來樂觀清除舊頻道成員的邏輯，
     * 因為 Store 的 _handleVoiceMessage 在收到 
     * VOICE_CHANNEL_STATUS 或 VOICE_USER_LEFT 時會更權威地更新成員列表。
     * 但如果需要非常即時的 UI 反應，可以考慮在 Store action 中加入更細緻的樂觀更新。
     */
    joinVoiceChannel: (channelId) => 
    {
        if (!get().isConnected)
        {
            console.warn("[Store] WebSocket not connected. Cannot join voice channel:", channelId);
            // 如果未連接，則不執行後續的樂觀更新和訊息發送
            // 這樣可以避免在 WebSocket 明顯斷開時，activeVoiceChannelId 仍然被樂觀設定，
            // 然後立即被 _handleClose 重置，從而可能避免更新迴圈。
            return;
        }

        const currentActiveVoiceChannelId = get().activeVoiceChannelId;
        const myUserId = get().myId;

        if (channelId === currentActiveVoiceChannelId) 
        {
            console.log('[Store] Already in voice channel:', channelId);
            return;
        }

        // 如果已在其他語音頻道，先發送離開訊息 (樂觀更新 UI，並通知伺服器)
        if (currentActiveVoiceChannelId) 
        {
            get().sendMessage({
            type: VOICE_EVENT_TYPES.LEAVE_VOICE,
            payload: { channelId: currentActiveVoiceChannelId },
            });
            // 樂觀地從舊頻道移除自己 (如果需要更即時的 UI 反應)
            // set(state => {
            //   const oldChannelUsers = (state.voiceChannelMembers[currentActiveVoiceChannelId] || []).filter(u => u.id !== myUserId);
            //   return {
            //     voiceChannelMembers: { ...state.voiceChannelMembers, [currentActiveVoiceChannelId]: oldChannelUsers }
            //   };
            // });
        }

        // 發送加入新語音頻道的訊息
        get().sendMessage(
        {
            type: VOICE_EVENT_TYPES.JOIN_VOICE,
            payload: { channelId },
        });

        // 樂觀更新 activeVoiceChannelId，伺服器的 VOICE_CHANNEL_STATUS 會確認並提供成員列表
        set({ activeVoiceChannelId: channelId });
        // 也可以樂觀地將自己加入到新頻道的成員列表
        // if (myUserId) {
        //   const meAsUser: User = { id: myUserId, name: get().users.find(u=>u.id === myUserId)?.name || myUserId, status: 'online' };
        //   set(state => ({
        //     voiceChannelMembers: { ...state.voiceChannelMembers, [channelId]: [meAsUser] }
        //   }));
        // }
    },

    /**
     * 對應 useVoice.ts 中的 leaveCurrentVoiceChannel。
     * sendMessage 邏輯保留。
     * 樂觀更新 activeVoiceChannelId 和 voiceChannelMembers 的邏輯也整合進來了。
     */
    leaveCurrentVoiceChannel: () => 
    {
        const currentActiveVoiceChannelId = get().activeVoiceChannelId;
        const myUserId = get().myId;

        if (currentActiveVoiceChannelId) 
        {
            get().sendMessage(
            {
                type: VOICE_EVENT_TYPES.LEAVE_VOICE,
                payload: { channelId: currentActiveVoiceChannelId },
            });
            // 樂觀更新
            set(state => 
            {
                const updatedMembers = { ...state.voiceChannelMembers };
                if (myUserId && updatedMembers[currentActiveVoiceChannelId]) 
                {
                    updatedMembers[currentActiveVoiceChannelId] = updatedMembers[currentActiveVoiceChannelId].filter(u => u.id !== myUserId);
                    if (updatedMembers[currentActiveVoiceChannelId].length === 0) 
                    {
                    // delete updatedMembers[currentActiveVoiceChannelId]; // 如果頻道空了，可以移除
                    }
                }
                return {
                    activeVoiceChannelId: null,
                    voiceChannelMembers: updatedMembers
                };
            });
        } 
    }
}));