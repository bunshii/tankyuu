export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { message } = req.body;
        const hfToken = process.env.HF_TOKEN;

        if (!hfToken) {
            return res.status(500).json({ reply: "エラー：HF_TOKENが設定されてないぜ！" });
        }

        // Qwen2.5モデルに直接繋ぐ最新のOpenAI互換URL
        const response = await fetch("https://api.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${hfToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "Qwen/Qwen2.5-7B-Instruct",
                messages: [{ "role": "user", "content": message }],
                max_tokens: 300
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            return res.status(response.status).json({ reply: `HFエラー(${response.status}): ${errText}` });
        }

        const data = await response.json();
        const replyText = data.choices?.[0]?.message?.content || "返答が空っぽだぜ";
        return res.status(200).json({ reply: replyText });

    } catch (error) {
        return res.status(500).json({ reply: `内部エラー: ${error.message}` });
    }
}
