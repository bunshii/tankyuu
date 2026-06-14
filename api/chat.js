// 🔥 Vercelに「Node.jsじゃなくて、ネットワーク最強のEdge環境で動かせ」と命令する
export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    // 1. CORS設定
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers });
    }

    try {
        // Edge Runtimeでは req.body ではなく req.json() でデータを取るぜ
        const { message } = await req.json();
        const hfToken = process.env.HF_TOKEN;

        if (!hfToken) {
            return new Response(JSON.stringify({ reply: "エラー：HF_TOKENが登録されてないぜ！" }), {
                status: 500,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }

        // 2. Qwen直通の通信（Edge環境なら迷子にならない！）
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
            const errorText = await response.text();
            return new Response(JSON.stringify({ reply: `HFエラー(${response.status}): ${errorText}` }), {
                status: response.status,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }

        const data = await response.json();
        const replyText = data.choices?.[0]?.message?.content || "AIからの返答が空っぽだぜ";

        return new Response(JSON.stringify({ reply: replyText }), {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ reply: `Edge環境エラー: ${error.message}` }), {
            status: 500,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    }
}
