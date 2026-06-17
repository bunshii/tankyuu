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

        // 🌟【改善点1】AIへの指示をよりシンプルに、余計な文章を一切省くよう超厳密に指定
        const strictPrompt = `Translate the English text "${message}" into Japanese. Output ONLY the literal Japanese translation word/sentence. Do not include any explanations, markers, quotes, or introduction words.`;

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

        // 🌟【改善点2】AIが親切心でカギカッコ「」やクォーテーション " " で囲んできた場合、先にそれを排除
        replyText = replyText.replace(/["'「」『』()（）:：]/g, '').trim();

        // 🌟【改善点3】フィルターの調整
        // 「fish」のように単語を投げられた場合は、最初の「漢字・ひらがな・カタカナのひとかたまり（単語）」だけを抜くようにします。
        // 文章（例：I like fish.）が送られてきた場合は、句読点（。や？）も含めて抽出できるように対応しています。
        const japaneseMatch = replyText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3001\u3002\uff01\uff1f]+/);
        
        let finalReply = replyText;
        if (japaneseMatch) {
            finalReply = japaneseMatch[0]; // 条件に合う最初の塊だけをセット
            
            // もしAIが「魚です」と返して、フィルターを「魚です」で通過してしまった場合の保険
            if (finalReply.endsWith("です") && finalReply.length > 2) {
                finalReply = finalReply.slice(0, -2);
            }
        } else {
            finalReply = replyText.trim(); // 日本語が見つからない時の保険
        }

        return res.status(200).json({ reply: finalReply });

    } catch (error) {
        return res.status(500).json({ reply: `サーバー内部エラー: ${error.message}` });
    }
}
