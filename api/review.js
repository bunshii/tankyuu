export default async function handler(req, res) {
    // 🌐 CORS設定
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
        const { minutes, todosCount, diverName } = req.body; 
        
        const cfToken = process.env.CF_TOKEN;
        const cfAccountId = process.env.CF_ACCOUNT_ID;

        if (!cfToken || !cfAccountId) {
            return res.status(500).json({ reply: "エラー：Vercelの環境変数が足りないぜ！" });
        }

        const systemPrompt = `You are the strict but deeply supportive Deep Sea Captain AI for a study/focus app named "OCEAN COMPASS".
Your mission is to analyze the diver's focus data of today and write an inspiring, passionate, and serious feedback message in Japanese.

[Diver Data]
- Diver Name: DIVER_${diverName || 'UNKNOWN'}
- Today's Total Dive (Focus) Time: ${minutes || 0} minutes
- Unfinished Missions (ToDos): ${todosCount || 0} items

[Rules]
- Output ONLY the final message in Japanese. Do not include any intro or explanation.
- Address the user as "DIVER_${diverName || 'UNKNOWN'}".
- Use deep-sea terminology (e.g., 潜水, 深海, 航海, キャプテン, 水圧).
- Format it as a cohesive, natural captain's log. Do not use bullet points.`;

        // 🚀 【修正】Cloudflareの正しいQwenモデル名に変えてfetchを叩く！
        // 「@cf/qwen/qwen1.5-14b-chat」から「@cf/qwen/qwen1.5-14b-chat-awq」などの公式なルートへ変更
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/qwen/qwen1.5-14b-chat-awq`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${cfToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: "本日の潜水データの解析を完了し、航海ログ・フィードバックを出力せよ。" }
                    ]
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return res.status(200).json({
                reply: `🚨 Cloudflare APIエラー: ${JSON.stringify(data)}`
            });
        }

        const replyText = data.result?.response || "潜水データの解析に失敗した。通信環境を確認せよ。";
        return res.status(200).json({ reply: replyText.trim() });

    } catch (error) {
        return res.status(200).json({ reply: `🚨 サーバー内部エラーが発生: ${error.message}` });
    }
}
