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
        const { message } = req.body; // フロントから届いた文字
        const cfToken = process.env.CF_TOKEN;
        const cfAccountId = process.env.CF_ACCOUNT_ID;

        if (!cfToken || !cfAccountId) {
            return res.status(500).json({ reply: "エラー：Vercelの環境変数（CF_TOKEN または CF_ACCOUNT_ID）が足りないぜ！" });
        }

        // 🌟【超絶強化】AIに直前のログを忘れさせ、1単語だけの翻訳に集中させる超厳密プロンプト
        const strictPrompt = `【絶対遵守のルール】
あなたは翻訳システムです。今から送る英単語を日本語に直した「単語1語」だけを出力してください。
挨拶、解説、カギカッコ、Pythonのコード、ログ、説明文などは一切出力してはいけません。
例外はありません。ただの1語の日本語単語だけを返してください。

翻訳する英単語: ${message}`;

        // 補完部分：CloudflareのAI GatewayやWorkers AIへのfetch処理
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/meta/llama-3-8b-instruct`, // 使用するモデル等に合わせて適宜変更してください
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${cfToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    messages: [
                        { 
                            role: "user", 
                            content: strictPrompt
                        }
                    ],
                    max_tokens: 15, 
                    temperature: 0.0
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                reply: `Cloudflareエラー: ${JSON.stringify(data)}`
            });
        }

        let replyText = data.result?.response || "返事が空っぽだぜ？";

        // AIの出力から前後の余計な記号、カッコ、クォーテーションを徹底排除
        replyText = replyText.replace(/["'「」『』()（）:：=.\-\s]/g, '').trim();

        // 🌟【超力技フィルター】漢字・ひらがな・カタカナの「最初の塊」だけを抜く
        const japaneseMatch = replyText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/);
        
        let finalReply = replyText;
        if (japaneseMatch) {
            finalReply = japaneseMatch[0]; // 最初に見つかった日本語単語のみ
            
            // 「魚です」などの語尾を抹殺する保険
            if (finalReply.endsWith("です") && finalReply.length > 2) {
                finalReply = finalReply.slice(0, -2);
            }
        } else {
            finalReply = replyText.trim();
        }

        return res.status(200).json({ reply: finalReply });

    } catch (error) {
        return res.status(500).json({ reply: `サーバー内部エラー: ${error.message}` });
    }
}
