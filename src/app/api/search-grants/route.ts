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

    // 山形県内の市町村リスト（暫定静的定義）
    const yamagataCities = [
      "山形市", "上山市", "天童市", "寒河江市", "村山市", "東根市", "尾花沢市",
      "米沢市", "南陽市", "長井市", "新庄市", "酒田市", "鶴岡市",
      "河北町", "西川町", "朝日町", "大江町", "大石田町", "中山町", "山辺町",
      "最上町", "舟形町", "真室川町", "金山町", "大蔵村", "鮭川村", "戸沢村",
      "小国町", "白鷹町", "飯豊町", "高畠町", "川西町", "三川町", "庄内町", "遊佐町"
    ];

    // 検索条件の組み立て
    let query = supabase.from("grants").select("*").eq("industry", industry);

    if (area === "山形県") {
      // 山形県選択時：県と全市町村を対象
      const cityConditions = yamagataCities.map(city => `area_city.eq.${city}`).join(",");
      query = query.or(`area_prefecture.eq.山形県,${cityConditions},area_prefecture.eq.全国`);
    } else {
      // 通常処理（市区町村・他県など）
      query = query.or(`area_prefecture.eq.${area},area_city.eq.${area},area_prefecture.eq.全国`);
    }

    const { data, error } = await query;

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
      if (area === "山形県") {
        // 山形県選択時：市町村 > 県 > 全国
        if (yamagataCities.includes(item.area_city)) priority = 3;
        else if (item.area_prefecture === "山形県") priority = 2;
        else if (item.area_prefecture === "全国") priority = 1;
      } else {
        // 通常処理：市区町村 > 都道府県 > 全国
        if (item.area_city === area) priority = 3;
        else if (item.area_prefecture === area) priority = 2;
        else if (item.area_prefecture === "全国") priority = 1;
      }
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
