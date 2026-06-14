export default async function handler(req, res) {
    // CORS（ブラウザからの通信を許可する）設定
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { message } = req.body;
        const hfToken = process.env.HF_TOKEN;

        if (!hfToken) {
            return res.status(500).json({ reply: "エラー：HF_TOKENが登録されてないぜ！" });
        }

        // 💡 DNSエラー（迷子）が絶対に起きないドメイン ＋ Qwen直通の最新OpenAI互換URLだ！
        const response = await fetch("https://api.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${hfToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "Qwen/Qwen2.5-7B-Instruct", // 日本語が超得意な最強モデル
                messages: [{ "role": "user", "content": message }],
                max_tokens: 300
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ reply: `HFエラー(${response.status}): ${errorText}` });
        }

        const data = await response.json();
        const replyText = data.choices?.[0]?.message?.content || "AIからの返答が空っぽだぜ";
        return res.status(200).json({ reply: replyText });

    } catch (error) {
        return res.status(500).json({ reply: `Vercel内部エラー: ${error.message}` });
    }
}
