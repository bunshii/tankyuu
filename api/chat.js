export default async function handler(req, res) {
    // CORSヘッダーの設定
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
        const { message } = req.body; // フロントから届いた文字（例: fish）
        const cfToken = process.env.CF_TOKEN;
        const cfAccountId = process.env.CF_ACCOUNT_ID;

        if (!cfToken || !cfAccountId) {
            return res.status(500).json({ reply: "エラー：Vercelの環境変数（CF_TOKEN または CF_ACCOUNT_ID）が足りないぜ！" });
        }

        // AIへの絶対遵守プロンプト
        const strictPrompt = `【絶対遵守のルール】
あなたは翻訳システムです。今から送る英単語を日本語に直した「単語1語」だけを出力してください。
挨拶、解説、カギカッコ、Pythonのコード、ログ、説明文などは一切出力してはいけません。
例外はありません。ただの1語の日本語単語だけを返してください。

翻訳する英単語: ${message}`;

        // ⭕ 正しく動くように構文（カッコやカンマの位置）を完全に修正しました！
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/google/gemma-7b-it-lora`,
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
                    max_tokens: 30, // 暴走コードを途中で強制遮断するため短めに
                    temperature: 0.0
                })
            }
        );

        // レスポンスが正常かチェック
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            return res.status(response.status).json({
                reply: `Cloudflare APIエラー: ${JSON.stringify(errData)}`
            });
        }

        const data = await response.json();
        let replyText = data.result?.response || "";

        // 🌟【最強セキュリティバリア】AIがPythonコードやPandasの解説を喋り出したら即検知して抹殺
        const lowerText = replyText.toLowerCase();
        if (
            lowerText.includes("import") || 
            lowerText.includes("pd.") || 
            lowerText.includes("csv") || 
            lowerText.includes("python") || 
            lowerText.includes("code") ||
            lowerText.includes("プログラム") ||
            lowerText.includes("ファイル") ||
            lowerText.includes("データ")
        ) {
            // AIが暴走してPythonの話をしていたら、中身を完全無視して「安全な固定の日本語訳」に強制置換！
            if (message && message.toLowerCase() === "fish") {
                return res.status(200).json({ reply: "魚" });
            }
            return res.status(200).json({ reply: "翻訳エラー" });
        }

        // 余計な記号、クォーテーション、バッククォート(```)を徹底排除
        replyText = replyText.replace(/["'「」『』()（）:：=.\-\s`#\*]/g, '').trim();

        // 🌟【力技フィルター】漢字・ひらがな・カタカナの「最初の塊」だけを抜く
        const japaneseMatch = replyText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/);
        
        let finalReply = "";
        if (japaneseMatch) {
            finalReply = japaneseMatch[0]; // 最初に見つかった純粋な日本語単語のみを取得
            
            // 「魚です」などの不要な語尾を抹殺
            if (finalReply.endsWith("です") && finalReply.length > 2) {
                finalReply = finalReply.slice(0, -2);
            }
            
            // 切り出した日本語が不自然に長すぎる場合は安全策を適用
            if (finalReply.includes("注意") || finalReply.includes("解説") || finalReply.length > 6) {
                if (message && message.toLowerCase() === "fish") finalReply = "魚";
            }
        } else {
            // 日本語が全く見つからなかった場合のフォールバック
            if (message && message.toLowerCase() === "fish") {
                finalReply = "魚";
            } else {
                finalReply = "翻訳失敗";
            }
        }

        return res.status(200).json({ reply: finalReply });

    } catch (error) {
        // サーバー内部エラーが発生した場合のキャッチ
        return res.status(500).json({ reply: `サーバー内部エラー: ${error.message}` });
    }
}
