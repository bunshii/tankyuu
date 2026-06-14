
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
            return new Response(JSON.stringify({ reply: "エラー：HF_TOKENなし" }), {
                status: 500,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }

        // 💡 Edge環境で確実に外に飛び出すシンプルなfetch
        const response = await fetch("https://api-inference.huggingface.co/models/Qwen/Qwen1.5-1.8B-Chat", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${hfToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                inputs: message
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            return new Response(JSON.stringify({ reply: `HFエラー: ${errorText}` }), {
                status: response.status,
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }

        const data = await response.json();
        
        // 余計な加工は一切せず、返ってきたデータをそのままテキストにする
        let replyText = "";
        if (Array.isArray(data) && data[0]?.generated_text) {
            replyText = data[0].generated_text;
        } else if (data.generated_text) {
            replyText = data.generated_text;
        } else {
            replyText = JSON.stringify(data);
        }

        return new Response(JSON.stringify({ reply: replyText }), {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ reply: `内部コードエラー: ${error.message}` }), {
            status: 500,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    }
}
