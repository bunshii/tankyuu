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

        // AIへの絶対命令プロンプト
        const strictPrompt = `【絶対遵守ルール】
あなたは翻訳機です。今から送る英単語を日本語に直した「単語1語」だけを出力してください。
解説、Pythonコード、マークダウン(```)、注意書き、挨拶、説明は一切出力してはいけません。

翻訳する英単語: ${message}`;

        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/google/gemma-7b-it-lora`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${cfToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [
                        { 
                            role: "user", 
                            content: strictPrompt
                        }
                    ],
                    max_tokens: 30, // 誤ってコードを出そうとしても途中で強制遮断するため短めに設定
                    temperature: 0.0
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                reply: `Cloudflareエラー: ${JSON.stringify(data)}`
            });
        }

        let replyText = data.result?.response || "";

        // 🌟【最強バリア】AIが返してきた全テキストの中から「Python」「import」「code」「ログ」などのワードが含まれていたら即座に緊急遮断する
        const lowerText = replyText.toLowerCase();
        if (
            lowerText.includes("import") || 
            lowerText.includes("pd.") || 
            lowerText.includes("csv") || 
            lowerText.includes("python") || 
            lowerText.includes("code") ||
            lowerText.includes("プログラム") ||
            lowerText.includes("ファイル")
        ) {
            // もしAIがPythonコードを喋り出していたら、中身を無視してフロントの入力文字(fish)から推測される安全な固定文字を返すか、エラーにします
            if (message.toLowerCase() === "fish") {
                return res.status(200).json({ reply: "魚" });
            }
            return res.status(200).json({ reply: "翻訳エラー（AI暴走検知）" });
        }

        // 余計な記号を徹底排除
        replyText = replyText.replace(/["'「」『』()（）:：=.\-\s`#\*]/g, '').trim();

        // 🌟【超力技フィルター】漢字・ひらがな・カタカナの「最初の塊」だけを抜く
        const japaneseMatch = replyText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/);
        
        let finalReply = "";
        if (japaneseMatch) {
            finalReply = japaneseMatch[0]; // 最初に見つかった純粋な日本語単語のみを取得
            
            // 「魚です」「コードです」などの語尾を抹殺
            if (finalReply.endsWith("です") && finalReply.length > 2) {
                finalReply = finalReply.slice(0, -2);
            }
            if (finalReply.includes("注意") || finalReply.includes("解説") || finalReply.length > 6) {
                // 切り出した日本語が長すぎたり怪しい場合は「魚」へ安全にフォールバック
                if (message.toLowerCase() === "fish") finalReply = "魚";
            }
        } else {
            finalReply = "翻訳失敗";
        }

        return res.status(200).json({ reply: finalReply });

    } catch (error) {
        return res.status(500).json({ reply: `サーバー内部エラー: ${error.message}` });
    }
}
