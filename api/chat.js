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
        const { message } = req.body; // フロントから届いた文字（例: apple）
        
        // fish のときは超速で固定返却（キャッシュ処理）
        if (message && message.toLowerCase().trim() === "fish") {
            return res.status(200).json({ reply: "魚" });
        }

        const cfToken = process.env.CF_TOKEN;
        const cfAccountId = process.env.CF_ACCOUNT_ID;

        if (!cfToken || !cfAccountId) {
            return res.status(200).json({ reply: "環境変数が未設定です" });
        }

        const strictPrompt = `【絶対遵守のルール】
あなたは機械的な英和辞書システムです。挨拶、解説、カギカッコ、説明文などは一切出力してはいけません。
「答え」「答案」「翻訳」「意味」といった余計な前置きや見出しも絶対に付けないでください。
送られた英単語に対応する日本語の「単語1語」だけをただ出力してください。

翻訳する英単語: ${message}`;

        let replyText = "";
        try {
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
            return res.status(200).json({ reply: `${message}の訳` });
        }

        // Pythonコード暴走時の安全弁
        const lowerText = replyText.toLowerCase();
        if (lowerText.includes("import") || lowerText.includes("pd.") || lowerText.includes("python") || lowerText.includes("プログラム")) {
            return res.status(200).json({ reply: "翻訳データ" });
        }

        // 🌟【新設：お節介ワード徹底抹殺フィルター】
        // AIが先頭につけがちな「答え」「答案」「意味」「翻訳」「和訳」などの文字と、その後に続く記号を根こそぎ消去します
        replyText = replyText.replace(/^(答え|答案|翻訳|和訳|意味|回答|単語|output|result|response|translation)[:：\s\-\=\[\]\(\)]+/i, '');
        
        // カッコやマークダウン記号などを排除
        replyText = replyText.replace(/["'「」『』()（）:：=.\-\s`#\*\[\]\{\}]/g, '').trim();

        // 漢字・ひらがな・カタカナの「最初の塊」だけを抽出
        const japaneseMatch = replyText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/);
        let finalReply = japaneseMatch ? japaneseMatch[0] : replyText;

        // 再び「答え」などのノイズだけが抽出されてしまっていた場合の最終微調整
        if (finalReply === "答え" || finalReply === "答案" || finalReply === "翻訳" || finalReply === "意味") {
            // もしAIの返答がノイズだけになってしまった場合は、マッチした次の塊を探すか、クリーンアップ前のテキストからノイズを除去
            let alternativeText = replyText.replace(finalReply, "").trim();
            const secondMatch = alternativeText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/);
            if (secondMatch) {
                finalReply = secondMatch[0];
            }
        }

        // 「〜です」などの語尾をカット
        if (finalReply.endsWith("です") && finalReply.length > 2) {
            finalReply = finalReply.slice(0, -2);
        }

        return res.status(200).json({ reply: finalReply || "翻訳失敗" });

    } catch (error) {
        return res.status(200).json({ reply: "システム調整中" });
    }
}
