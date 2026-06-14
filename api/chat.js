export default async function handler(req, res) {
    // CORS設定
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { message } = req.body;
        const hfToken = process.env.HF_TOKEN;

        if (!hfToken) {
            return res.status(500).json({ reply: "エラー：Vercelに『HF_TOKEN』が登録されてないぜ！" });
        }

        // Hugging Faceへアタック！
        const response = await fetch("https://api.huggingface.co/models/meta-llama/Llama-3.2-1B-Instruct", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${hfToken}`,
                "Content-Type": "application/json",
                // ★ここが最大のポイント！Hugging Faceの警戒を解くための「変装お面」だ！
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            body: JSON.stringify({
                inputs: message,
                parameters: { max_new_tokens: 300, return_full_text: false }
            }),
        });

        // 通信自体が失敗していないかチェック
        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ reply: `Hugging Face側からエラーが返ってきたぜ (コード:${response.status}): ${errorText}` });
        }

        const data = await response.json();
        
        let replyText = "";
        if (Array.isArray(data) && data[0]?.generated_text) {
            replyText = data[0].generated_text;
        } else if (data.generated_text) {
            replyText = data.generated_text;
        } else {
            replyText = "AIからの返答の形がいつもと違うぜ： " + JSON.stringify(data);
        }

        return res.status(200).json({ reply: replyText });

} catch (error) {
        // エラーの名前やメッセージ、詳しい原因を全部合体させて画面に返すぜ！
        const errorDetails = {
            message: error.message,
            name: error.name,
            stack: error.stack,
            cause: error.cause ? error.cause.message : "原因の詳細はなし"
        };
        return res.status(500).json({ 
            reply: `Vercelの裏の部屋での詳細エラーだぜ:\n${JSON.stringify(errorDetails, null, 2)}` 
        });
    }
}
