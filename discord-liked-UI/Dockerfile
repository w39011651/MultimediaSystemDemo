# discord-liked-UI/Dockerfile

# --- 1. 建置階段 (Build Stage) ---
FROM node:20.19.2 AS builder

# 宣告一個建置參數
ARG VITE_WEBSOCKET_URL_ARG

# 將建置參數設定為環境變數，以便 Vite 在建置時使用
ENV VITE_WEBSOCKET_URL=$VITE_WEBSOCKET_URL_ARG

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- 2. 生產階段 (Production Stage) ---
# 使用一個非常輕量的 Nginx 伺服器來提供靜態檔案
FROM nginx:1.27-alpine

# 將我們剛剛在 'builder' 階段產生的靜態檔案，複製到 Nginx 的網頁根目錄
COPY --from=builder /app/dist /usr/share/nginx/html

# 讓所有路由都返回 index.html，以支援 React Router 的前端路由
# 我們可以用一個簡單的 shell 命令來修改預設設定，或者複製一個自訂的 nginx.conf
RUN sed -i '/index.html/a \        try_files $uri $uri/ /index.html;' /etc/nginx/conf.d/default.conf

# 宣告 Nginx 監聽的埠號
EXPOSE 80

# 啟動 Nginx 伺服器
CMD ["nginx", "-g", "daemon off;"]