import { HfInference } from "@huggingface/inference";

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

        // ★Hugging Face公式の無敵ツールを起動！
        const hf = new HfInference(hfToken);

        // 公式のやり方でAI（Llama）を呼び出す！URLの記入は不要！
        const response = await hf.textGeneration({
            model: "meta-llama/Llama-3.2-1B-Instruct",
            inputs: message,
            parameters: { max_new_tokens: 300, return_full_text: false }
        });

        const replyText = response.generated_text || "AIからの返答が空っぽだったぞ！";
        return res.status(200).json({ reply: replyText });

    } catch (error) {
        return res.status(500).json({ 
            reply: `Hugging Face公式ツールでのエラーだぜ:\n${error.message}` 
        });
    }
}
