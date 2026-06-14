export default async function handler(req, res) {
  try {
    const hfToken = process.env.HF_TOKEN;

    if (!hfToken) {
      return res.status(500).json({ error: "no token" });
    }

    const { message } = req.body;

    const response = await fetch(
      "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: message,
        }),
      }
    );

    const data = await response.json();

    return res.status(200).json({
      raw: data,
    });
  } catch (e) {
    return res.status(500).json({
      error: e.message,
    });
  }
}
