# MultimediaSystemDemo

使用Websocket+Signaling+WebRTC模仿Discord

## 總體架構(預計)

```
+---------------------+      +-----------------------+      +---------------------+
|    Client (使用者)  |-----> |  Web Server / API GW  |<---->|      Database       |
| (Browser - JS/HTML/CSS)|   |  (Node.js/Express.js  |      |  (PostgreSQL/MySQL) |
| - React/Vue/Angular |      |   or Python/Flask)    |      +---------------------+
| - WebRTC API        |<---+  +-----------------------+
| - WebSocket Client  |    |            |
+---------------------+    |            | (WebSocket for Signaling & Text Chat)
                           |            |
                           |+-----------------------+
                         +->|   Signaling Server    |
                            | (Node.js + socket.io/ws)|
                            +-----------------------+
                                      ^
                                      | (ICE Candidates, SDP)
                                      v
+---------------------+      +-----------------------+
| Client B (使用者)   |----->| STUN/TURN Server      |
| (Browser - JS/HTML/CSS)|   | (coturn - Optional but |
| - React/Vue/Angular |      |  Recommended)         |
| - WebRTC API        |      +-----------------------+
| - WebSocket Client  |
+---------------------+
```

## 文件結構(預計)
### Signaling Server
```
signaling-server/
├── server.js             # 主程式入口，初始化伺服器和 socket.io
├── config/
│   └── index.js          # 設定檔 (例如埠號)
├── managers/
│   ├── RoomManager.js    # 管理房間的建立、加入、離開、成員等
│   └── UserManager.js    # 管理使用者連線資訊 (可選，有時與 RoomManager 整合)
├── handlers/
│   ├── connectionHandler.js # 處理新的 socket 連線和基礎事件 (如斷線)
│   ├── roomHandler.js       # 處理與房間相關的事件 (加入、離開)
│   └── webRTCHandler.js   # 處理 WebRTC 訊令事件 (offer, answer, candidate)
├── constants/
│   └── events.js         # 定義所有 socket 事件的常數名稱
└── utils/
    └── logger.js         # (可選) 日誌工具
```