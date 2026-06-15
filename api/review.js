export default async function handler(req, res) {
    // 🌐 CORS設定（chat.jsと完全に統一）
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
        // フロントから届いた分析用のデータ（分、タスク数、ダイバー名）
        const { minutes, todosCount, diverName } = req.body; 
        
        const cfToken = process.env.CF_TOKEN;
        const cfAccountId = process.env.CF_ACCOUNT_ID;

        if (!cfToken || !cfAccountId) {
            return res.status(500).json({ reply: "エラー：Vercelの環境変数（CF_TOKEN または CF_ACCOUNT_ID）が足りないぜ！" });
        }

        // 🧠 Qwenの日本語能力を100%引き出すためのキャプテンプロンプト指示文
        const systemPrompt = `You are the strict but deeply supportive Deep Sea Captain AI for a study/focus app named "OCEAN COMPASS".
Your mission is to analyze the diver's focus data of today and write an inspiring, passionate, and serious feedback message in Japanese.

[Diver Data]
- Diver Name: DIVER_${diverName}
- Today's Total Dive (Focus) Time: ${minutes} minutes
- Unfinished Missions (ToDos): ${todosCount} items

[Rules]
- 必ず日本語だけで出力してください。「はい、分かりました」などの余計な前置きは一切不要です。解析結果のメッセージ本文だけを直接出力してください。
- ユーザーを "DIVER_${diverName}" と呼んでください。
- 潜水、深海、航海、キャプテン、水圧、酸素ボンベなどの深海・潜水用語を交えて、映画のワンシーンのような熱いトーンで書いてください。
- 改行を適度に入れ、読みやすい手紙やログの形式にしてください（箇条書きは禁止）。

[Analysis Guidance]
- 0分: 厳しくも熱く、最初の5分の潜水（集中）を始めるよう促す。
- 1-29分: 水圧に慣れ始めた一歩を褒めつつ、次はさらに深いエリア（長時間の集中）を目指すよう鼓舞する。
- 30-59分: 素晴らしい集中力を称賛する。深海のトワイライトゾーンに到達したと告げ、残り ${todosCount} 件のミッションの撃破を促す。
- 60分以上: 圧倒的な深海ダイブを大絶賛する。暗黒の海溝を君の集中力が照らし出したと、最大級のリスペクトを送る。`;

        // 🚀 Cloudflare Workers AI のエンドポイントを fetch で直接叩く！
        // 日本語の文脈理解が圧倒的に優れている「qwen1.5-14b-chat」を使用
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/qwen/qwen1.5-14b-chat`,
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
                    ],
                    max_tokens: 400,
                    temperature: 0.7
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                reply: `Cloudflareエラー: ${JSON.stringify(data)}`
            });
        }

        // Qwenモデルのレスポンスからテキストを安全に抽出
        const replyText = data.result?.response || "潜水データの解析に失敗した。通信環境を確認せよ。";

        // 前後の余計な空白をトリミングしてフロントに返す
        const finalReply = replyText.trim();

        return res.status(200).json({ reply: finalReply });

    } catch (error) {
        return res.status(500).json({ reply: `サーバー内部エラー: ${error.message}` });
    }
}
