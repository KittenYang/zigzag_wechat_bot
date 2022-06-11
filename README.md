# zigzag_wechat_bot

## 功能
1. 每隔6.5s 监控做市机器人接单情况，如有新单，会立刻微信通知
<img src="https://user-images.githubusercontent.com/5517281/173199616-efeb3d24-0adf-43ed-87db-bbf00f6dd7bd.jpg" width="200"/>
2. 通过微信远程执行操作，包括当前运行状态、重启做市程序、查看 pm2 list、查看实时微信机器人日志
<img src="https://user-images.githubusercontent.com/5517281/173199654-032dd267-3ee4-4902-b3ee-d70da9f6c9ff.jpg" width="200" />

## 注意事项
1. ZigZag 做市程序请参考 https://github.com/ZigZagExchange/market-maker 部署。
2. 需要使用 pm2 开启上面的做市程序
3. 前往 `constants.ts` 填入自己的配置
4. 需要 iPad 微信机器人key，前往 http://pad-local.com/#/login 申请
5. 需要实时币价接口 Key，前往 https://p.nomics.com/cryptocurrency-bitcoin-api 申请
6. 执行 `pm2 start src/main.ts` 开启微信机器人
7. 若上述方法不行，可以执行 `pm2 start run-ts.sh`
