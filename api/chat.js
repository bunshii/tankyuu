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

        // 🔥 【大本命】DNSエラーが起きないドメイン ＋ モデル直通のOpenAI形式URLだ！
        const response = await fetch("https://api.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${hfToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "Qwen/Qwen2.5-7B-Instruct", // 日本語ペラペラの最強モデルに戻すぜ！
                messages: [
                    { "role": "user", "content": message }
                ],
                max_tokens: 300
            })
        });

        // 通信チェック
        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ reply: `Hugging Faceからエラーだぜ (コード:${response.status}): ${errorText}` });
        }

        const data = await response.json();
        
        // 返答を綺麗に引っこ抜く
        const replyText = data.choices?.[0]?.message?.content || "AIからの返答が空っぽだぜ";

        return res.status(200).json({ reply: replyText });

    } catch (error) {
        return res.status(500).json({ reply: "Vercelの裏の部屋でのエラーだぜ: " + error.message });
    }
}
