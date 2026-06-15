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
        const cfToken = process.env.CF_TOKEN;
        const cfAccountId = process.env.CF_ACCOUNT_ID;

        if (!cfToken || !cfAccountId) {
            return res.status(500).json({ reply: "エラー：Vercelの環境変数（CF_TOKEN または CF_ACCOUNT_ID）が足りないぜ！" });
        }

        // 💡 役割（system）と翻訳対象（user）を完全に分けて、AIに命令を絶対遵守させる！
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
                            role: "system", 
                            content: "You are a professional English-to-Japanese translation dictionary. Output ONLY the Japanese translation of the provided word. Never include any explanations, definitions, English sentences, pronunciations, greetings, introduction, or markdown formatting. Your response must be strictly in Japanese characters only." 
                        },
                        { 
                            role: "user", 
                            content: `Translate this word: ${message}` 
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

        const replyText = data.result?.response || "返事が空っぽだぜ？";

        // 万が一、AIが前後に余計な改行やスペースを入れても大丈夫なようにトリミングして返す
        return res.status(200).json({ reply: replyText.trim() });

    } catch (error) {
        return res.status(500).json({ reply: `サーバー内部エラー: ${error.message}` });
    }
}
