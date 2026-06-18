import { getMessaging, getToken } from "firebase/messaging";
import { app } from "./firebase-config"; // さっき作った設定ファイルを読み込みます

// 通知の機能を呼び出します
const messaging = getMessaging(app);

// 画面に「通知を許可しますか？」と聞いて、OKなら「宛先（トークン）」を受け取る関数です
export async function requestNotificationPermission() {
  try {
    // 1. スマホの画面に「許可してください」のポップアップを出す
    const permission = await Notification.requestPermission();
    
    if (permission === "granted") {
      console.log("通知が許可されました！");
      
      // 2. 許可されたら、このスマホ専用の「宛先（トークン）」を発行してもらう
      const token = await getToken(messaging, {
        vapidKey: "BJ93qL2gC-P1yqB-BwbE-r6swD4IKx-9cZACMbEI2_Z5GhlvP17jKhrLu697XP9QulPuIxckJONlzeIwFovXnVI	" // ※後ほどここにFirebaseの別の鍵を入れます
      });
      
      if (token) {
        console.log("これがあなたのスマホの宛先（トークン）です👇");
        console.log(token);
        return token;
      } else {
        console.log("宛先（トークン）が取れませんでした。");
      }
    } else {
      console.log("通知がブロックされました。");
    }
  } catch (error) {
    console.error("通知の許可を取る時にエラーが発生しました:", error);
  }
}
