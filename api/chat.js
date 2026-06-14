export default async function handler(req, res) {
    // 1. CORS（ブラウザからの通信を許可する）設定
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // プリフライトリクエスト（事前確認通信）は即座にOKを返す
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { message } = req.body;
        const hfToken = process.env.HF_TOKEN;

        // 2. 鍵（トークン）があるかチェック
        if (!hfToken) {
            return res.status(500).json({ reply: "エラー：Vercelの環境変数に『HF_TOKEN』が登録されてないぜ！" });
        }

        // 3. 【2026年最新】DNSエラーを回避するドメイン ＋ Qwen直通のOpenAI互換URL
        const response = await fetch("https://api.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${hfToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "Qwen/Qwen2.5-7B-Instruct", // 日本語が最強に得意なモデル
                messages: [
                    { "role": "user", "content": message }
                ],
                max_tokens: 300
            })
        });

        // 4. Hugging Face側でエラーが起きた場合の処理
        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ 
                reply: `Hugging Faceからエラーが返ってきたぜ (コード:${response.status}): ${errorText}` 
            });
        }

        // 5. 成功したらデータを解析して返答を取り出す
        const data = await response.json();
        const replyText = data.choices?.[0]?.message?.content || "AIからの返答が空っぽだぜ";

        return res.status(200).json({ reply: replyText });

    } catch (error) {
        // 6. ネットワークの切断など、予期せぬエラーが起きた場合
        return res.status(500).json({ 
            reply: `Vercelの裏の部屋での致命的エラーだぜ:\n{\n  "message": "${error.message}",\n  "name": "${error.name}"\n}` 
        });
    }
}
