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
        const { message } = req.body; // フロントから届いた英単語
        const cfToken = process.env.CF_TOKEN;
        const cfAccountId = process.env.CF_ACCOUNT_ID;

        if (!cfToken || !cfAccountId) {
            return res.status(500).json({ reply: "エラー：Vercelの環境変数（CF_TOKEN または CF_ACCOUNT_ID）が足りないぜ！" });
        }

        // 💡 AIが一発で理解できるように、1つのユーザーメッセージの中に鉄壁のルールを仕込む
        const strictPrompt = `Translate the English word "${message}" into Japanese. 
Output ONLY the Japanese translation character. 
Do NOT include any explanations, English words, notes, formatting, or greetings. 
Just reply with the Japanese word.`;

        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/google/gemma-7b-it-lora`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${cfToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [
                        { 
                            role: "user", 
                            content: strictPrompt
                        }
                    ]
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                reply: `Cloudflareエラー: ${JSON.stringify(data)}`
            });
        }

        let replyText = data.result?.response || "返事が空っぽだぜ？";

        // AIがどうしても「"魚"」のようにクォーテーションマークをつけてきた場合のために、余計な記号を消すクリーンアップ処理
        replyText = replyText.replace(/["'「」]/g, '').trim();

        return res.status(200).json({ reply: replyText });

    } catch (error) {
        return res.status(500).json({ reply: `サーバー内部エラー: ${error.message}` });
    }
}
