/**
 * updated_atとcreated_atの不整合を確認
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUpdatedAt() {
  console.log("🔍 updated_atとcreated_atの不整合を確認中...\n");

  // 11月13日に作成されたデータを取得
  const nov13Start = new Date("2025-11-13T00:00:00+09:00");
  const nov13End = new Date("2025-11-13T23:59:59+09:00");

  const { data, error } = await supabase
    .from("grants")
    .select("id, title, created_at, updated_at, source_type")
    .gte("created_at", nov13Start.toISOString())
    .lte("created_at", nov13End.toISOString())
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("❌ エラー:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log("⚠️ データがありません");
    return;
  }

  console.log(`📊 11月13日に作成されたデータ: ${data.length}件\n`);

  // updated_atがcreated_atより古いデータを検出
  const inconsistent: any[] = [];
  const consistent: any[] = [];

  data.forEach((g) => {
    const created = g.created_at ? new Date(g.created_at) : null;
    const updated = g.updated_at ? new Date(g.updated_at) : null;

    if (created && updated && updated < created) {
      inconsistent.push(g);
    } else {
      consistent.push(g);
    }
  });

  if (inconsistent.length > 0) {
    console.log(`⚠️ updated_atがcreated_atより古いデータ: ${inconsistent.length}件\n`);
    inconsistent.slice(0, 10).forEach((g, i) => {
      const created = g.created_at ? new Date(g.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : "不明";
      const updated = g.updated_at ? new Date(g.updated_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : "不明";
      console.log(`  ${i + 1}. ID: ${g.id}`);
      console.log(`     タイトル: ${g.title.substring(0, 50)}...`);
      console.log(`     created_at (JST): ${created}`);
      console.log(`     updated_at (JST): ${updated}`);
      console.log(`     source_type: ${g.source_type || "(なし)"}`);
      console.log(`     → updated_atが${Math.round((new Date(g.created_at).getTime() - new Date(g.updated_at).getTime()) / (1000 * 60 * 60 * 24))}日古い`);
      console.log("");
    });
    if (inconsistent.length > 10) {
      console.log(`  ...他 ${inconsistent.length - 10}件`);
    }
  } else {
    console.log("✅ すべてのデータでupdated_at >= created_at です。\n");
  }

  console.log(`\n📊 統計:`);
  console.log(`  不整合データ: ${inconsistent.length}件`);
  console.log(`  正常データ: ${consistent.length}件`);
}

checkUpdatedAt().catch(console.error);

