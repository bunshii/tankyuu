// 💡 Hugging Face公式の推論用コードの書き方に変更
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ reply: "POSTで送ってね！" });
    }

    try {
        const { message } = req.body;
        const hfToken = process.env.HF_TOKEN;

        if (!hfToken) {
            return res.status(500).json({ reply: "エラー：HF_TOKENが設定されていません" });
        }

        // 💡 fetchの代わりに、よりエラーが起きにくい形式でHugging Faceへリクエスト
        const response = await fetch(
            "https://api-inference.huggingface.co/models/gpt2",
            {
                headers: {
                    Authorization: `Bearer ${hfToken}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify({ inputs: message }),
            }
        );

        // 通信自体はできたけど、相手からエラーが返ってきた場合
        if (!response.ok) {
            const errData = await response.text();
            return res.status(response.status).json({ 
                reply: `Hugging Face側でエラー発生: ${errData}` 
            });
        }

        const data = await response.json();
        
        let replyText = "";
        if (Array.isArray(data) && data[0]?.generated_text) {
            replyText = data[0].generated_text;
        } else if (data.generated_text) {
            replyText = data.generated_text;
        } else {
            replyText = JSON.stringify(data);
        }

        return res.status(200).json({ reply: replyText });

    } catch (error) {
        // 万が一またネットワークで落ちたら、詳細を出す
        return res.status(500).json({ 
            reply: `通信エラー詳細: ${error.message} (型: ${error.name})` 
        });
    }
}
