import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 環境変数の存在チェック
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables");
}

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function POST(req: Request) {
  try {
    const { area, industry } = await req.json();

    if (!area || !industry) {
      return NextResponse.json(
        { error: "エリアと業種の指定が必要です。" },
        { status: 400 }
      );
    }

    // Supabaseクライアントの存在チェック
    if (!supabase) {
      return NextResponse.json(
        { error: "データベース接続が設定されていません。" },
        { status: 500 }
      );
    }

    // データ取得（全国も含めて取得）
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

    // 優先順位付け
    const ranked = data.map((item) => {
      let priority = 0;
      if (item.area_city === area) priority = 3;
      else if (item.area_prefecture === area) priority = 2;
      else if (item.area_prefecture === "全国") priority = 1;
      return { ...item, priority };
    });

    // 並び替え（priority降順）
    const sorted = ranked.sort((a, b) => b.priority - a.priority);

    return NextResponse.json({ results: sorted }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
