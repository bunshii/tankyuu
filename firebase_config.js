import { initializeApp } from "firebase/app";

// 通知（FCM）に必要な最低限の項目だけにギューッと短縮しました！
const firebaseConfig = {
  apiKey: "AIzaSyBJtTQOLVM1pHKwBcGhQXrsxTlkvFkgG2o",
  projectId: "oceancompass-58466",
  messagingSenderId: "108644591634", // これも通知に必須の番号です
  appId: "1:1086445991634:web:2c53f6b291a8504b021f0b"
};

// 起動して輸出
const app = initializeApp(firebaseConfig);
export { app };
