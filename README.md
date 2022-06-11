# zigzag_wechat_bot

## 功能
1. 每隔6.5s 监控做市机器人接单情况，如果新单，会立刻微信通知

2. 通过微信远程执行操作，包括当前运行状态、重启做市程序、查看 pm2 list、查看实时微信机器人日志

## 注意事项
1. ZigZag 做市程序需要使用 pm2 服务开启
2. 前往 `constants.ts` 填入自己的配置
3. 需要 iPad 微信机器人key，前往 http://pad-local.com/#/login 申请
4. 需要实时币价接口 Key，前往 https://p.nomics.com/cryptocurrency-bitcoin-api 申请
5. 执行 `pm2 start src/main.ts` 开启微信机器人
6. 上述方法不行，可以执行 `pm2 start run-ts.sh`
