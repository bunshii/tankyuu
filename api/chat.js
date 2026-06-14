// 💡 一番スタンダードな Node.js 環境（Edge configは削除！）
export default async function handler(req, res) {
    // CORS（ブラウザからのアクセス許可）の設定
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // テスト通信（OPTIONS）が来たらその場で200を返して終了
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // POST以外の通信は弾く
    if (req.method !== 'POST') {
        return res.status(405).json({ reply: "POSTで送ってね！" });
    }

    try {
        // スタンダード環境なら、req.body から超安全にメッセージが取り出せる！
        const { message } = req.body;
        const hfToken = process.env.HF_TOKEN;

        if (!hfToken) {
            return res.status(500).json({ reply: "エラー：HF_TOKENが設定されていません" });
        }

        // 世界一安定している公式テスト用モデル「gpt2」へ通信
        const response = await fetch("https://api-inference.huggingface.co/models/gpt2", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${hfToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ inputs: message })
        });

        const data = await response.json();

        // もしHugging Face側でエラーが発生していたら、その文字をそのまま画面に出す
        if (!response.ok) {
            return res.status(response.status).json({ 
                reply: `Hugging Faceからのエラー: ${JSON.stringify(data)}` 
            });
        }
        
        // 返ってきたデータをテキストに変換
        let replyText = "";
        if (Array.isArray(data) && data[0]?.generated_text) {
            replyText = data[0].generated_text;
        } else if (data.generated_text) {
            replyText = data.generated_text;
        } else {
            replyText = JSON.stringify(data);
        }

        // 成功！画面に返事を返す
        return res.status(200).json({ reply: replyText });

    } catch (error) {
        // もしコード内でバグっても、原因を100%画面に表示する
        return res.status(500).json({ reply: `サーバー内部エラー: ${error.message}` });
    }
}
