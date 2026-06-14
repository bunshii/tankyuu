export default async function handler(req, res) {
    // CORS設定
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { message } = req.body;
        const hfToken = process.env.HF_TOKEN;

        if (!hfToken) {
            return res.status(500).json({ reply: "エラー：Vercelに『HF_TOKEN』が登録されてないぜ！" });
        }

        // 🔥 【2026年最新】Hugging Faceの新しい共通ルーターURLだ！
        const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${hfToken}`,
                "Content-Type": "application/json"
            },
            // 🔥 送るデータの形も、新仕様の「OpenAIスタイル」に変更！
            body: JSON.stringify({
                model: "meta-llama/Llama-3.2-1B-Instruct", // 現在無料でサクサク動く超軽量モデル
                messages: [
                    { "role": "user", "content": message }
                ],
                max_tokens: 300
            })
        });

        // 通信チェック
        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ reply: `Hugging Face新ルーターからエラーだぜ (コード:${response.status}): ${errorText}` });
        }

        const data = await response.json();
        
        // 🔥 受け取るデータの形も、OpenAIスタイル（choices...）で綺麗に引っこ抜く！
        const replyText = data.choices?.[0]?.message?.content || "AIからの返答が空っぽだぜ";

        return res.status(200).json({ reply: replyText });

    } catch (error) {
        return res.status(500).json({ reply: "Vercelの裏の部屋でのエラーだぜ: " + error.message });
    }
}
