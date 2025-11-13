/**
 * 11月12日と11月13日のデータを比較して重複を確認
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function compareDates() {
  console.log("🔍 11月12日と11月13日のデータを比較中...\n");

  // 11月12日（JST）の範囲
  const nov12Start = new Date("2025-11-12T00:00:00+09:00");
  const nov12End = new Date("2025-11-12T23:59:59+09:00");
  
  // 11月13日（JST）の範囲
  const nov13Start = new Date("2025-11-13T00:00:00+09:00");
  const nov13End = new Date("2025-11-13T23:59:59+09:00");

  // 11月12日のデータ取得
  const { data: data12, error: error12 } = await supabase
    .from("grants")
    .select("id, title, level, area_prefecture, area_city, created_at, updated_at, url")
    .gte("created_at", nov12Start.toISOString())
    .lte("created_at", nov12End.toISOString())
    .order("created_at", { ascending: false });

  // 11月13日のデータ取得
  const { data: data13, error: error13 } = await supabase
    .from("grants")
    .select("id, title, level, area_prefecture, area_city, created_at, updated_at, url")
    .gte("created_at", nov13Start.toISOString())
    .lte("created_at", nov13End.toISOString())
    .order("created_at", { ascending: false });

  if (error12 || error13) {
    console.error("❌ エラー:", error12?.message || error13?.message);
    return;
  }

  console.log(`📊 11月12日に作成されたデータ: ${data12?.length || 0}件`);
  console.log(`📊 11月13日に作成されたデータ: ${data13?.length || 0}件\n`);

  // タイトルを正規化して比較（ダブルクォート除去、空白除去）
  const normalizeTitle = (title: string) => {
    return (title || "").replace(/^"+|"+$/g, "").trim().replace(/\s+/g, "");
  };

  const titles12 = new Set((data12 || []).map((g) => normalizeTitle(g.title)));
  const titles13 = new Set((data13 || []).map((g) => normalizeTitle(g.title)));

  // 重複を検出
  const duplicates: string[] = [];
  titles13.forEach((title) => {
    if (titles12.has(title)) {
      duplicates.push(title);
    }
  });

  if (duplicates.length > 0) {
    console.log(`⚠️ 重複が検出されました: ${duplicates.length}件\n`);
    console.log("📋 重複しているタイトル:");
    duplicates.forEach((title, i) => {
      console.log(`  ${i + 1}. ${title.substring(0, 60)}...`);
    });
    console.log("");

    // 重複データの詳細を表示
    console.log("📋 重複データの詳細（11月12日 vs 11月13日）:\n");
    duplicates.slice(0, 5).forEach((dupTitle) => {
      const item12 = data12?.find((g) => normalizeTitle(g.title) === dupTitle);
      const item13 = data13?.find((g) => normalizeTitle(g.title) === dupTitle);
      
      if (item12 && item13) {
        const created12 = item12.created_at ? new Date(item12.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : "不明";
        const created13 = item13.created_at ? new Date(item13.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : "不明";
        
        console.log(`  📌 ${item12.title.substring(0, 50)}...`);
        console.log(`     11月12日: ID=${item12.id}, 作成=${created12}`);
        console.log(`     11月13日: ID=${item13.id}, 作成=${created13}`);
        console.log(`     → 同じID: ${item12.id === item13.id ? "✅ はい（更新）" : "❌ いいえ（重複登録）"}`);
        console.log("");
      }
    });
  } else {
    console.log("✅ 重複は検出されませんでした。11月13日のデータは全て新規です。\n");
  }

  // 11月13日のみの新規データ
  const newOnly13 = (data13 || []).filter((g) => !titles12.has(normalizeTitle(g.title)));
  console.log(`\n📊 11月13日のみの新規データ: ${newOnly13.length}件`);
  if (newOnly13.length > 0) {
    console.log("\n📋 新規データ一覧:");
    newOnly13.forEach((g, i) => {
      const created = g.created_at ? new Date(g.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : "不明";
      const levelLabel = g.level === "national" ? "国" : g.area_city ? `市町村（${g.area_city}）` : `都道府県（${g.area_prefecture || "不明"}）`;
      console.log(`  ${i + 1}. [${levelLabel}] ${g.title.substring(0, 50)}...`);
      console.log(`     ID: ${g.id}, 作成: ${created}`);
    });
  }
}

compareDates().catch(console.error);


