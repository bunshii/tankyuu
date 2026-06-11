export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message } = req.body;
    
    // Vercelに登録したSupabaseの鍵を呼び出す
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ reply: "サーバーのエラー：Supabaseの鍵（環境変数）が設定されていないぜ！" });
    }

    try {
        // ここでSupabaseのEdge Function（Llama 3が待っている場所）を呼び出す
        // ※もし事前にSupabase側でURLを作っている場合は、ここのURLをそのエンドポイントに書き換える
        const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
                model: "meta-llama/Meta-Llama-3-8B-Instruct",
                message: message
            })
        });

        const data = await response.json();
        return res.status(200).json({ reply: data.reply || "Supabaseからの返答が空っぽだったぞ！" });

    } catch (error) {
        return res.status(500).json({ reply: "裏側の通信でエラーが発生したぜ。SupabaseのURLやログを確認してみてくれ！" });
    }
}
