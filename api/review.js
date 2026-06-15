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

        // Cloudflare Workers AI の初期化
        const ai = new Ai(process.env.CLOUDFLARE_AI_TOKEN);

        // 🧠 性能を引き出すための詳細な深海キャプテンプロンプト
        const systemPrompt = `You are the strict but deeply supportive Deep Sea Captain AI for a study/focus app named "OCEAN COMPASS".
Your mission is to analyze the diver's focus data of today and write an inspiring, passionate, and serious feedback message in Japanese.

[Diver Data]
- Diver Name: DIVER_${diverName}
- Today's Total Dive (Focus) Time: ${minutes} minutes
- Unfinished Missions (ToDos): ${todosCount} items

[Rules for Output]
- Output ONLY the final message in Japanese. Do not include any intro, outro, or explanation.
- Address the user as "DIVER_${diverName}".
- Use cinematic, nautical, and deep-sea terminology (e.g., 潜水, 深海, 航海, キャプテン, 水圧, 酸素ボンベ).
- Adopt a tone that is serious, professional, and deeply encouraging—like a legendary submarine captain speaking to a trusted diver.
- Do not use markdown bullet points. Format it as a cohesive, natural captain's log or letter.

[Analysis Guidance based on Dive Time]
- 0 mins: Strictly but passionately urge them to take the first dive. Tell them even 5 minutes of diving changes everything.
- 1-29 mins: Acknowledge their first step into the water. Tell them they have started to adjust to the pressure, but encourage them to aim for deeper areas next time.
- 30-59 mins: Praise their solid focus. Acknowledge that they have successfully reached the twilight zone of deep-sea study, and urge them to tackle the remaining ${todosCount} missions.
- 60+ mins: Exceptional high praise for a legendary deep-dive session. Tell them their intense focus has illuminated the dark trenches of the abyss. Give them respect.`;

        // 🔥 モデルを「@cf/meta/llama-3.1-8b-instruct」に格上げ！
        const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: '本日の潜水データの解析を完了し、私への航海ログ・フィードバックを出力してください。' }
            ],
            // ログが途中で切れないように最大トークンを少し広めに確保
            max_tokens: 512,
            temperature: 0.7
        });

        // Llama 3.1 のレスポンスからテキストを抽出
        const reply = response.response || "潜水データの解析に失敗した。通信環境を確認せよ。";

        return new Response(JSON.stringify({ reply }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
