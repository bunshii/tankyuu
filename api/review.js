import { Ai } from '@cloudflare/ai';

export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        const { minutes, todosCount, diverName } = await req.json();

        // 🔐 新しい環境変数名（CF_ACCOUNT_ID / CF_TOKEN）の存在チェック
        if (!process.env.CF_ACCOUNT_ID || !process.env.CF_TOKEN) {
            return new Response(JSON.stringify({ 
                error: 'Vercelの設定に CF_ACCOUNT_ID または CF_TOKEN が登録されていません。' 
            }), { status: 500 });
        }

        // ⚙️ 指定された変数名でCloudflare AIを初期化！
        const ai = new Ai({
            accountGuid: process.env.CF_ACCOUNT_ID,
            apiToken: process.env.CF_TOKEN
        });

        // 🧠 Qwenの日本語能力を100%引き出すプロンプト
        const systemPrompt = `You are the strict but deeply supportive Deep Sea Captain AI for a study/focus app named "OCEAN COMPASS".
Your mission is to analyze the diver's focus data of today and write an inspiring, passionate, and serious feedback message in Japanese.

[Diver Data]
- Diver Name: DIVER_${diverName}
- Today's Total Dive (Focus) Time: ${minutes} minutes
- Unfinished Missions (ToDos): ${todosCount} items

[Rules]
- 必ず日本語だけで出力してください。「はい、分かりました」などの余計な前置きは一切不要です。解析結果のメッセージ本文だけを直接出力してください。
- ユーザーを "DIVER_${diverName}" と呼んでください。
- 潜水、深海、航海、キャプテン、水圧、酸素ボンベなどの深海・潜水用語を交えて、映画のワンシーンのような熱いトーンで書いてください。
- 改行を適度に入れ、読みやすい手紙やログの形式にしてください（箇条書きは禁止）。

[Analysis Guidance]
- 0分: 厳しくも熱く、最初の5分の潜水（集中）を始めるよう促す。
- 1-29分: 水圧に慣れ始めた一歩を褒めつつ、次はさらに深いエリア（長時間の集中）を目指すよう鼓舞する。
- 30-59分: 素晴らしい集中力を称賛する。深海のトワイライトゾーンに到達したと告げ、残り ${todosCount} 件のミッションの撃破を促す。
- 60分以上: 圧倒的な深海ダイブを大絶賛する。暗黒の海溝を君の集中力が照らし出したと、最大級のリスペクトを送る。`;

        // 🚀 qwen モデルを使用してメッセージ生成
        const response = await ai.run('@cf/qwen/qwen1.5-14b-chat', {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: '本日の潜水データの解析を完了し、航海ログ・フィードバックを出力せよ。' }
            ],
            max_tokens: 400,
            temperature: 0.7
        });

        const reply = response.response || "潜水データの解析に失敗した。通信環境を確認せよ。";

        return new Response(JSON.stringify({ reply }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
