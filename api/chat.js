import { HfInference } from '@huggingface/inference';

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

        // 🔥 Hugging Face公式の接続ツールを起動！
        const hf = new HfInference(hfToken);

        // 🔥 公式ツールを使って、迷子にならずにQwenを呼び出す！
        const response = await hf.chatCompletion({
            model: "Qwen/Qwen2.5-7B-Instruct",
            messages: [
                { "role": "user", "content": message }
            ],
            max_tokens: 300
        });

        // 返答を綺麗に引っこ抜く
        const replyText = response.choices?.[0]?.message?.content || "AIからの返答が空っぽだぜ";

        return res.status(200).json({ reply: replyText });

    } catch (error) {
        // エラーが出た場合、原因を詳しく画面に出す
        return res.status(500).json({ 
            reply: `公式ツールでもエラーだぜ:\n[名] ${error.name}\n[内容] ${error.message}` 
        });
    }
}
