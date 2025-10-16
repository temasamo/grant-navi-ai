import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabaseクライアントを初期化
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// POSTメソッドで検索リクエストを受け取る
export async function POST(req: Request) {
  try {
    const { area, industry } = await req.json();

    if (!area || !industry) {
      return NextResponse.json(
        { error: "エリアと業種の指定が必要です。" },
        { status: 400 }
      );
    }

    // Supabaseからデータを検索
    const { data, error } = await supabase
      .from("grants_and_subsidies")
      .select("*")
      .contains("target_area", [area])
      .ilike("target_industry", `%${industry}%`);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "データ取得エラー" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { message: "該当する助成金・補助金は見つかりませんでした。" },
        { status: 200 }
      );
    }

    // 結果を返す
    return NextResponse.json({ results: data }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
