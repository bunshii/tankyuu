export default async function handler(req, res) {
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

        // ★最新の公式URL ＋ サーバーの迷子を防ぐ設定（keepalive）を合体！
        const response = await fetch("https://api.huggingface.co/models/meta-llama/Llama-3.2-1B-Instruct", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${hfToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs: message,
                parameters: { max_new_tokens: 300, return_full_text: false }
            }),
            keepalive: true // 通信を途切れにくくするお守り
        });

        if (!response.ok) {
            const errText = await response.text();
            return res.status(response.status).json({ reply: `HFエラー(${response.status}): ${errText}` });
        }

        const data = await response.json();
        const replyText = data[0]?.generated_text || data.generated_text || "返答が空っぽだぜ";
        return res.status(200).json({ reply: replyText });

    } catch (error) {
        return res.status(500).json({ reply: `Vercel内部エラー: ${error.message}` });
    }
}
