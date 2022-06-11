const fetch = require("node-fetch");
import * as Constant from "./constants";

// 获取所有 token 信息
let tokenInfo: { [x: string]: any };
let balances_str = "";
export async function fetchTokenInfo() {
  fetch("https://api.zksync.io/jsrpc", {
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "zh-CN,zh;q=0.9",
      "content-type": "application/json",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "sec-gpc": "1",
      Referer: "https://zkscan.io/",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
    body: '{"id":1,"jsonrpc":"2.0","method":"tokens","params":null}',
    method: "POST",
  })
    .then((response: { json: () => any }) => response.json())
    .then((json: { [x: string]: {} }) => {
      tokenInfo = json["result"];
    })
    .catch((error: any) => console.log("error", error));
}

let lastNonce = 0;
let all_coin_to_eth_price = 0 //所有币价转换到 eth 的总和，用 eth 衡量总资产
export function hello(callback: (message: string) => void) {
  // 获取余额
  let balances_raw: { [x: string]: any } = {};
  let balances: { [x: string]: any } = {};
  let hasNewTransition = false;
  fetch("https://api.zksync.io/jsrpc", {
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "zh-CN,zh;q=0.9",
      "content-type": "application/json",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "sec-gpc": "1",
      Referer: "https://zkscan.io/",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
    body: `{"id":1,"jsonrpc":"2.0","method":"account_info","params":[${Constant.TargetWallet}]}`,
    method: "POST",
  })
    .then((response: { json: () => any }) => response.json())
    .then((json: { [x: string]: { [x: string]: { [x: string]: any } } }) => {
      let newNonce = json["result"]["committed"]["nonce"];
      if (newNonce > lastNonce) {
        lastNonce = newNonce;
        hasNewTransition = true;
        balances_raw = json["result"]["committed"]["balances"];
        balances_str = "";
        for (let key in balances_raw) {
          let token_balance = balances_raw[key];
          let token_info = tokenInfo[key];
          let decimals = token_info["decimals"];
          let symbol = token_info["symbol"];
          /*
          AAVE	0.12451426904
          AVAX	0.4980558464
          */
          let price = token_balance / 10 ** decimals
          balances_str += `   ${symbol}: ${price}\n`;
          balances[symbol] = price
        }
      } else {
        hasNewTransition = false;
      }
    })
    .then(async () => {
      // 获取最新市场价格
      let eth_coin_sbls: any = Object.keys(balances)
      eth_coin_sbls = eth_coin_sbls.join(',')

      fetch(`https://api.nomics.com/v1/currencies/ticker?key=${Constant.NomicsAPIKey}&ids=${eth_coin_sbls}&interval=1h&convert=${Constant.BaseCurrencySymbol}&per-page=100&page=1`)
      .then((response: any) => response.json())  
      .then((json: { [x: string]: {} }) => {
        // console.log("获取最新市场价格:", json)
        var to_eth: { [id: string] : String; } = {};
        for (let index in json) {
          let pair:{ [id: string] : String; } = json[index]
          let key = String(pair["symbol"])
          to_eth[key] = pair["price"]
        }
        // console.log("获取最新市场价格dict:\n",to_eth)
        
        all_coin_to_eth_price = 0
        for (let key in balances) {
          let value = balances[key] //0.0001 SOL
          let toETHPrice = to_eth[key] // 1sol : 0.0012eth
          let resultETHPrice = Number(value) * Number(toETHPrice)
          all_coin_to_eth_price += resultETHPrice
        }
  
        if (hasNewTransition) {
          console.log("发现新交易！");
          getTransition(callback);
        } else {
          console.log("无新交易");
        }
      })
    })
    .catch((error: any) => console.log("error", error));
}

// 获取最新交易
function getTransition(callback: (message: string) => void) {
  return fetch(
    `https://api.zksync.io/api/v0.1/account/${Constant.TargetWallet}/history/0/10`,
    {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "zh-CN,zh;q=0.9",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "sec-gpc": "1",
        Referer: "https://zkscan.io/",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      body: null,
      method: "GET",
    }
  )
    .then((response: { json: () => any }) => response.json())
    .then((json: any[]) => {
      let firstObj = json[0];
      let tx = firstObj["tx"];
      let type = tx["type"];
      let fee = tx["fee"];
      let feeToken_id = tx["feeToken"];
      let nonce = tx["nonce"];
      console.log("nonce:", nonce);
      let ordes = tx["orders"];
      let to_object = ordes.find(
        (o: { [x: string]: any }) => o["nonce"] === nonce
      );

      let from_object = ordes.find(
        (o: { [x: string]: any }) => o["tokenBuy"] === to_object["tokenSell"]
      );

      let from_addr = from_object["recipient"];
      let to_addr = to_object["recipient"];
      let from_amount = from_object["amount"];
      let to_amount = to_object["amount"];
      let from_token_id = from_object["tokenSell"];
      let to_token_id = to_object["tokenSell"];

      // /1000000
      // /1000000000000000000

      let fee_str = null;
      let from_amount_str = null;
      let to_amount_str = null;
      for (let key in tokenInfo) {
        let value = tokenInfo[key];
        let id = value["id"];
        if (id == feeToken_id) {
          let decimals = value["decimals"];
          let symbol = value["symbol"];
          fee_str = `【fee】: ${fee / 10 ** decimals} ${symbol}`;
        }

        if (id == from_token_id) {
          let decimals = value["decimals"];
          let symbol = value["symbol"];
          from_amount_str = `${from_amount / 10 ** decimals} ${symbol}`;
        }

        if (id == to_token_id) {
          let decimals = value["decimals"];
          let symbol = value["symbol"];
          to_amount_str = `${to_amount / 10 ** decimals} ${symbol}`;
        }

        if (
          fee_str != null &&
          from_amount_str != null &&
          to_amount_str != null
        ) {
          break;
        }
      }

      let state_str = `${firstObj["success"] ? "成功" : "失败"} | ${
        firstObj["verified"] ? "已确认" : "未确认"
      } | ${firstObj["commited"] ? "已提交" : "未提交"} | ${
        firstObj["fail_reason"]
      }`;
      let nonce_str = `【nonce】: ${lastNonce}`;
      let from_str = `【from】: ${from_addr}`;
      let to_str = `【to】: ${to_addr}`;
      let amount_str = `【Amount】: ${from_amount_str} -> ${to_amount_str}`;
      let final_balances_str = `【余额】：{\n${balances_str}}`;
      let all_eth = `【总资产】：${all_coin_to_eth_price} ETH`

      let message = `🍻检测到新交易：${type}\n${state_str}\n${nonce_str}\n${from_str}\n${to_str}\n${amount_str}\n${fee_str}\n${final_balances_str}\n${all_eth}`;
      // console.log("最终输出结果：", message);

      callback(message);

      /*
        检测到新交易：Swap
        状态：成功 | 已确认
        nonce: 45
        from: 0x3df204d52430315c9b56bbe22b6e9c2f1f9b37f7
        to: 自己
        Amount: 
        fee: 0.306 USDT
        余额: {
          AAVE	0.12451426904
          AVAX	0.4980558464
          DAI	  0.08157772
          ETH	  0.016354639445
          SOL	  1.451859896
          UNI	  3.957894376
          USDC	0.252422
          USDT	709.223038
        }
        总资产： 0.5 ETH
      */
    })
    .catch((error: any) => console.log("error", error));
}
