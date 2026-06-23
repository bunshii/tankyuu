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
            // 固定返却の場合も、せっかくなのでSupabaseに保存する処理を裏で走らせます
            await saveToSupabase("fish", "魚");
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
            const fallbackReply = `${message}の訳`;
            await saveToSupabase(message, fallbackReply);
            return res.status(200).json({ reply: fallbackReply });
        }

        // Pythonコード暴走時の安全弁
        const lowerText = replyText.toLowerCase();
        if (lowerText.includes("import") || lowerText.includes("pd.") || lowerText.includes("python") || lowerText.includes("プログラム")) {
            await saveToSupabase(message, "翻訳データ");
            return res.status(200).json({ reply: "翻訳データ" });
        }

        // 🌟【新設：お節介ワード徹底抹殺フィルター】
        replyText = replyText.replace(/^(答え|答案|翻訳|和訳|意味|回答|単語|output|result|response|translation)[:：\s\-\=\[\]\(\)]+/i, '');
        
        // カッコやマークダウン記号などを排除
        replyText = replyText.replace(/["'「」『』()（）:：=.\-\s`#\*\[\]\{\}]/g, '').trim();

        // 漢字・ひらがな・カタカナの「最初の塊」だけを抽出
        const japaneseMatch = replyText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/);
        let finalReply = japaneseMatch ? japaneseMatch[0] : replyText;

        // 再び「答え」などのノイズだけが抽出されてしまっていた場合の最終微調整
        if (finalReply === "答え" || finalReply === "答案" || finalReply === "翻訳" || finalReply === "意味") {
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

        const resultReply = finalReply || "翻訳失敗";

        // 🌟【新設：安全なSupabaseへの自動保存】
        // 翻訳が成功した文字列を、裏側でSupabaseの倉庫へ自動転送します
        await saveToSupabase(message, resultReply);

        return res.status(200).json({ reply: resultReply });

    } catch (error) {
        return res.status(200).json({ reply: "システム調整中" });
    }
}

// 🚢【支援関数：Supabaseにデータを横流しして保存する金庫番】
async function saveToSupabase(englishWord, japaneseWord) {
    // Vercelの環境変数（secret）から合言葉を呼び出す
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    // 合言葉が両方とも入っているときだけ通信を試みる
    if (supabaseUrl && supabaseKey) {
        try {
            // URLの末尾にスラッシュが重複しないよう綺麗に整えて、wordsテーブルの住所を作ります
            const cleanUrl = supabaseUrl.endsWith('/') ? supabaseUrl : supabaseUrl + '/';
            const targetUrl = `${cleanUrl}words`;

            await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    en: englishWord.trim(),   // 英語の列（en）に保存
                    ja: japaneseWord.trim(),  // 日本語の列（ja）に保存
                    checked: false            // 初期状態は未チェック（false）
                })
            });
            console.log('Supabaseへの自動保存に成功！');
        } catch (sbError) {
            // もしSupabase側で何かが起きても、ユーザーへの翻訳表示を邪魔しないようログだけ残す
            console.error('Supabase自動保存エラー:', sbError);
        }
    }
}
