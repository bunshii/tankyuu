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

        // 💡 Hugging Faceで最も安定して稼働している Llama-3 のエンドポイントに突撃！
        const response = await fetch("https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${hfToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                inputs: message,
                options: {
                    wait_for_model: true // 眠っていたら起こす
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
        
        let replyText = "";
        if (Array.isArray(data) && data[0]?.generated_text) {
            replyText = data[0].generated_text;
        } else if (data.generated_text) {
            replyText = data.generated_text;
        } else {
            replyText = JSON.stringify(data);
        }

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
