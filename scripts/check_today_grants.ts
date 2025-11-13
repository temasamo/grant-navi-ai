/**
 * 今日（11月13日）に作成された補助金・助成金データを確認
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTodayGrants() {
  console.log("🔍 11月13日（JST）に作成された補助金・助成金データを確認中...\n");

  // 11月13日（JST）の範囲をUTCに変換
  // JST 2025-11-13 00:00:00 → UTC 2025-11-12 15:00:00
  // JST 2025-11-13 23:59:59 → UTC 2025-11-13 14:59:59
  const jstStart = new Date("2025-11-13T00:00:00+09:00");
  const jstEnd = new Date("2025-11-13T23:59:59+09:00");
  
  const utcStart = jstStart.toISOString();
  const utcEnd = jstEnd.toISOString();

  console.log(`📅 検索範囲（JST）: 2025-11-13 00:00:00 ～ 23:59:59`);
  console.log(`📅 検索範囲（UTC）: ${utcStart} ～ ${utcEnd}\n`);

  const { data, error } = await supabase
    .from("grants")
    .select("id, title, level, area_prefecture, area_city, created_at, url, organization")
    .gte("created_at", utcStart)
    .lte("created_at", utcEnd)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ エラー:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log("⚠️ 11月13日に作成されたデータはありませんでした。\n");
    
    // 最新10件を表示して参考にする
    console.log("📊 参考: 最新10件のデータ:");
    const { data: recent } = await supabase
      .from("grants")
      .select("id, title, level, area_prefecture, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    
    recent?.forEach((g, i) => {
      const createdDate = g.created_at ? new Date(g.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : "不明";
      console.log(`  ${i + 1}. [${g.level}] ${g.title.substring(0, 40)}...`);
      console.log(`     作成日時（JST）: ${createdDate}`);
    });
    return;
  }

  console.log(`✅ 11月13日に作成されたデータ: ${data.length}件\n`);

  // レベル別に分類
  const byLevel = {
    national: data.filter((g) => g.level === "national"),
    prefecture: data.filter((g) => g.level === "prefecture" && !g.area_city),
    city: data.filter((g) => g.area_city && g.area_city.trim() !== ""),
  };

  console.log("📊 レベル別内訳:");
  console.log(`  国: ${byLevel.national.length}件`);
  console.log(`  都道府県: ${byLevel.prefecture.length}件`);
  console.log(`  市町村: ${byLevel.city.length}件\n`);

  console.log("📋 詳細一覧:\n");
  data.forEach((g, i) => {
    const createdDate = g.created_at ? new Date(g.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : "不明";
    const levelLabel = g.level === "national" ? "国" : g.area_city ? `市町村（${g.area_city}）` : `都道府県（${g.area_prefecture || "不明"}）`;
    const urlStatus = g.url && g.url !== "https://example.com" && g.url.trim() !== "" ? "✅" : "❌";
    
    console.log(`${i + 1}. [${levelLabel}] ${g.title}`);
    console.log(`   ID: ${g.id}`);
    console.log(`   作成日時（JST）: ${createdDate}`);
    console.log(`   URL: ${urlStatus} ${g.url || "(なし)"}`);
    console.log(`   組織: ${g.organization || "(なし)"}`);
    console.log("");
  });
}

checkTodayGrants().catch(console.error);


