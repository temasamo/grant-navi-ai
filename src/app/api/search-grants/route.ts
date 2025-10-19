import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { area, industry } = await req.json();

    if (!area || !industry) {
      return NextResponse.json(
        { error: "エリアと業種の指定が必要です。" },
        { status: 400 }
      );
    }

    // データ取得
    const { data, error } = await supabase
      .from("grants")
      .select("*")
      .or(`area_prefecture.eq.${area},area_city.eq.${area},area_prefecture.eq.全国`)
      .eq("industry", industry);

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

    return NextResponse.json({ results: data }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
