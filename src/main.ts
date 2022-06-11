import { Contact, log, ScanStatus, WechatyBuilder } from "wechaty";
import { PuppetPadlocal } from "wechaty-puppet-padlocal";
import * as FetchZksync from "./fetchZksync";
import * as Constant from "./constants";

export const LOGPRE = "[cypto_bot]";
const puppet = new PuppetPadlocal({
  token: Constant.PadWechatKey,
});
const bot = WechatyBuilder.build({
  name: "cypto_bot",
  puppet,
});

//与命令行 shell 交互
const exec = require('child_process').exec;

let _owner: Contact;
export const getOwner = async () =>
  _owner ||
  (_owner = (await bot.Contact.find({ name: Constant.TargetWeixinName })) as Contact);

bot
  .on("scan", async (qrcode, status) => {
    if (status === ScanStatus.Waiting && qrcode) {
      const qrcodeImageUrl = [
        "https://wechaty.js.org/qrcode/",
        encodeURIComponent(qrcode),
      ].join("");
      log.info(
        LOGPRE,
        `onScan: ${ScanStatus[status]}(${status}) - ${qrcodeImageUrl}`
      );
      require("qrcode-terminal").generate(qrcode, { small: true }); // show qrcode on console
    } else {
      log.info(LOGPRE, `onScan: ${ScanStatus[status]}(${status})`);
    }
  })
  .on("login", async (user) => {
    console.log("name:", user.name);

    const owner = await getOwner();
    if (!owner) return;

    owner.say(`${user}已登录 iPad 版`);
    log.info(LOGPRE, `${user} login`);

    //1. 先获取货币信息
    FetchZksync.fetchTokenInfo();

    //2. 定时爬取接口
    const callback = (message: string) => {
      owner.say(message);
    };
    const hello = () => {
      FetchZksync.hello(callback);
    };
    setInterval(hello, 6500); // 每隔6.5s轮询
  })
  .on("logout", async (user, reason) => {
    const owner = await getOwner();
    if (!owner) return;

    owner.say(`${user}已退出 iPad 版`);
    log.info(LOGPRE, `${user} logout, reason: ${reason}`);
  })
  .on("message", async (message) => {
    const owner = await getOwner();
    if (message.listener()?.self() && message.text() === '状态') {
      var isOnNodeJs = false;
      if (typeof process != 'undefined') {
        isOnNodeJs = true
      }
      await owner.say(`${isOnNodeJs ? "🟢 正在运行" : "🔴 程序停止"}`);
    } else if (message.listener()?.self() && message.text() === '重启') {
      exec('pm2 restart /root/cypto_bot/run-ts.sh',(error: any, stdout: any, stderr: any) => {
          console.log(stdout);
          if (stdout !== null) {
            owner.say(stdout);
          }
          console.log(stderr);
          if (error !== null) {
              console.log(`exec error: ${error}`);
          }
      });
    } else if (message.listener()?.self() && message.text() === 'list') {
      exec('pm2 jlist',(error:any, stdout:any, stderr:any) => {
          
          if (stdout !== null) {
	    let json = JSON.parse(stdout)
            var output = ""
            for(var index in json) {
              let value = json[index]
              console.log("value:",value)
              let name = value["name"]
              let status = value["pm2_env"]["status"] //"online"
              let mem = `${Number(value["monit"]["memory"]) / 1024 / 1024}MB`
              let cpu = `${Number(value["monit"]["cpu"])}%`
              output += `${name}-${status}-${mem}-${cpu}\n`
            }
            owner.say(output);
          }
          console.log(stderr);
          if (error !== null) {
              console.log(`exec error: ${error}`);
          }
      });
    } else if (message.listener()?.self() && message.text() === 'log') {
      exec('pm2 logs run-ts  --nostream --lines 5',(error:any, stdout:any, stderr:any) => {
          if (stdout !== null) {
            owner.say(stdout);
          }
          console.log(stderr);
          if (error !== null) {
              console.log(`exec error: ${error}`);
          }
      });
    } else if (message.listener()?.self() && message.text() === 'cmd') {
      owner.say('状态\n重启\nlist\nlog');
    }
  })
  .on("error", (error) => {
    log.error(LOGPRE, `on error: ${error}`);
  });

bot.start().then(() => {
  log.info(LOGPRE, "started.");
});
