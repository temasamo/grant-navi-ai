import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { businessType, employees, goal, support } = body;

    const prompt = `
あなたは中小企業支援に詳しい専門AIです。
以下の企業情報に基づいて、該当しそうな助成金を3件提案してください。

【企業情報】
- 事業形態: ${businessType}
- 従業員数: ${employees}
- 今後の取組: ${goal}
- 支援希望: ${support}

各助成金は次の形式で出力してください：
1. 助成金名：
   概要：
   対象企業：
   最大支給額：
   参考リンク：
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const aiText = completion.choices[0].message?.content || "";

    return NextResponse.json({ results: aiText });
  } catch (error) {
    console.error("AI診断エラー:", error);
    return NextResponse.json(
      { error: "AI診断で問題が発生しました。" },
      { status: 500 }
    );
  }
}















