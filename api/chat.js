export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers });
    }

    try {
        const { message } = await req.json();
        const hfToken = process.env.HF_TOKEN;

        if (!hfToken) {
            return new Response(JSON.stringify({ reply: "エラー：HF_TOKENが登録されてないぜ！" }), {
                status: 500,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }

        // 💡 Edge環境からHugging FaceのQwenへ、最もエラーが起きにくい標準形式で通信！
        const response = await fetch("https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${hfToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                inputs: message, // 最もシンプルな入力形式に変更
                options: {
                    wait_for_model: true // 💡 相手のサーバーが混んでいたら、起動するまで少し待つ魔法のオプション
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            return new Response(JSON.stringify({ reply: `HFエラー(${response.status}): ${errorText}` }), {
                status: response.status,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }

        const data = await response.json();
        
        // 返ってきたデータからテキストを取り出す（標準形式用の解析）
        let replyText = "";
        if (Array.isArray(data) && data[0]?.generated_text) {
            replyText = data[0].generated_text;
        } else if (data.generated_text) {
            replyText = data.generated_text;
        } else {
            replyText = JSON.stringify(data);
        }

        // もし返答に自分の送った質問が含まれていたら、それ以降を綺麗に切り取る処理
        if (replyText.includes(message)) {
            replyText = replyText.replace(message, "").trim();
        }

        return new Response(JSON.stringify({ reply: replyText }), {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ reply: `Edge最終エラー: ${error.message}` }), {
            status: 500,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    }
}
