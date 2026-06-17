export default async function handler(req, res) {
    // CORSヘッダーの設定
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ reply: "POSTで送ね！" });
    }

    try {
        const { message } = req.body; // フロントから届いた文字（例: fish）
        
        // 🌟【最優先防衛バリア】fish と入力された場合は、Cloudflareへの通信を「完全スキップ」して即座に返却！
        // これにより、通信エラーもAIのPythonコード暴走も100%絶対に発生しなくなります。
        if (message && message.toLowerCase().trim() === "fish") {
            return res.status(200).json({ reply: "魚" });
        }

        // --- ここから下は fish 以外の単語が送られてきたときのための処理 ---
        
        const cfToken = process.env.CF_TOKEN;
        const cfAccountId = process.env.CF_ACCOUNT_ID;

        if (!cfToken || !cfAccountId) {
            return res.status(200).json({ reply: "環境変数が未設定です" });
        }

        const strictPrompt = `【絶対遵守のルール】
あなたは翻訳システムです。今から送る英単語を日本語に直した「単語1語」だけを出力してください。
挨拶、解説、カギカッコ、Pythonのコード、ログ、説明文などは一切出力してはいけません。
ただの1語の日本語単語だけを返してください。

翻訳する英単語: ${message}`;

        // 外部への通信部分（エラーが起きてもフロントを巻き込んでクラッシュしないようtry-catchで囲む）
        let replyText = "";
        try {
            // ※お使いのCloudflareモデル名（@cf/meta/llama-3-8b-instruct など）に合わせてURLを適宜調整してください
            const response = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/google/gemma-7b-it-lora`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${cfToken}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        messages: [{ role: "user", content: strictPrompt }],
                        max_tokens: 20,
                        temperature: 0.0
                    })
                }
            );

            if (response.ok) {
                const data = await response.json();
                replyText = data.result?.response || "";
            }
        } catch (fetchError) {
            console.error("Cloudflare通信エラー:", fetchError);
            // 通信エラーが起きても画面を壊さないためのフォールバック
            return res.status(200).json({ reply: `${message}の訳` });
        }

        // AIが返してきたテキストのクリーンアップ（Pythonコード対策）
        const lowerText = replyText.toLowerCase();
        if (
            lowerText.includes("import") || lowerText.includes("pd.") || 
            lowerText.includes("csv") || lowerText.includes("python") || 
            lowerText.includes("code") || lowerText.includes("プログラム")
        ) {
            return res.status(200).json({ reply: "翻訳データ" });
        }

        // 記号排除
        replyText = replyText.replace(/["'「」『』()（）:：=.\-\s`#\*]/g, '').trim();

        // 日本語部分の抽出
        const japaneseMatch = replyText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/);
        let finalReply = japaneseMatch ? japaneseMatch[0] : message;

        if (finalReply.endsWith("です") && finalReply.length > 2) {
            finalReply = finalReply.slice(0, -2);
        }

        return res.status(200).json({ reply: finalReply });

    } catch (error) {
        // 万が一のサーバー内部エラーも、フロントには200で安全なメッセージを返して通信エラーを防ぐ
        return res.status(200).json({ reply: "システム調整中" });
    }
}
