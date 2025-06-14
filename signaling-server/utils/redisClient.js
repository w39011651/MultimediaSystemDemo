// signaling-server/utils/redisClient.js
const redis = require('redis');
const logger = require('./logger'); // 假設您有 logger 模組

// 從環境變數獲取 Redis 連接資訊，這在 GKE 中很重要
// 如果沒有設置環境變數，則使用 k8s service 的預設名稱
const REDIS_HOST = process.env.REDIS_HOST || 'redis-service';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

let publisher;
let subscriber;

// 異步函數來連接 Redis
async function connectRedis() {
    try {
        // 創建一個用於「發布」訊息的客戶端
        publisher = redis.createClient({
            url: `redis://${REDIS_HOST}:${REDIS_PORT}`
        });
        // 創建一個用於「訂閱」訊息的客戶端
        // Pub/Sub 要求發布者和訂閱者必須是獨立的 Redis 連線
        subscriber = publisher.duplicate();

        // 連接到 Redis
        await publisher.connect();
        await subscriber.connect();

        logger.info(`Successfully connected to Redis at ${REDIS_HOST}:${REDIS_PORT} for Pub/Sub.`);
    } catch (error) {
        logger.error('Failed to connect to Redis:', error);
        // 在實際生產環境中，您可能需要更健壯的重試邏輯
        process.exit(1); // 連接失敗則退出進程
    }
}

// 在應用啟動時調用此函數來建立 Redis 連線
connectRedis();

// 導出 Redis 客戶端實例
module.exports = {
    publisher: () => publisher, // 返回函數，確保在使用時已連接
    subscriber: () => subscriber
};