export default async function handler(req, res) {
    // 違うサイトからの怪しいアクセスを弾く設定（CORS）
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { message } = req.body;
        
        // Vercelの金庫から、さっき登録した本物のHugging Faceの鍵を読み込む！
        const hfToken = process.env.HF_TOKEN;

        if (!hfToken) {
            return res.status(500).json({ reply: "エラー：Vercelに『HF_TOKEN』が登録されてないぜ！" });
        }

        // VercelのサーバーからHugging Faceへ直接アタック！（制限なし！）
        const response = await fetch("https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${hfToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs: message,
                parameters: { max_new_tokens: 300, return_full_text: false }
            }),
        });

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
        return res.status(500).json({ reply: "Vercelの裏の部屋でのエラーだぜ: " + error.message });
    }
}
