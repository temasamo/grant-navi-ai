/**
 * 重複データをチェック
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDuplicates() {
  console.log("🔍 重複データをチェック中...\n");

  // 全データを取得
  const { data: allGrants, error } = await supabase
    .from("grants")
    .select("id, title, level, area_prefecture, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ エラー:", error.message);
    return;
  }

  if (!allGrants || allGrants.length === 0) {
    console.log("⚠️ データがありません");
    return;
  }

  console.log(`📊 総件数: ${allGrants.length}件\n`);

  // タイトルで重複をチェック
  const titleMap = new Map<string, number[]>();
  allGrants.forEach((grant) => {
    const cleanTitle = grant.title.replace(/^"+|"+$/g, "").trim(); // 前後のダブルクォートを除去
    if (!titleMap.has(cleanTitle)) {
      titleMap.set(cleanTitle, []);
    }
    titleMap.get(cleanTitle)!.push(grant.id);
  });

  // 重複があるタイトルを抽出
  const duplicates = Array.from(titleMap.entries()).filter(
    ([_, ids]) => ids.length > 1
  );

  if (duplicates.length > 0) {
    console.log(`🔴 重複タイトルが ${duplicates.length}件 見つかりました:\n`);
    duplicates.forEach(([title, ids], index) => {
      console.log(`${index + 1}. "${title.substring(0, 50)}..."`);
      console.log(`   ID: ${ids.join(", ")} (${ids.length}件)`);
      
      // 各重複レコードの詳細を表示
      ids.forEach((id) => {
        const grant = allGrants.find((g) => g.id === id);
        if (grant) {
          console.log(`      - ID ${id}: ${grant.level} / ${grant.area_prefecture || "(なし)"} (作成: ${grant.created_at.substring(0, 10)}, 更新: ${grant.updated_at.substring(0, 10)})`);
        }
      });
      console.log("");
    });
  } else {
    console.log("✅ 重複タイトルは見つかりませんでした（タイトルベース）\n");
  }

  // 統計情報
  const byLevel = allGrants.reduce((acc, g) => {
    const level = g.level || "unknown";
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byArea = allGrants.reduce((acc, g) => {
    const area = g.area_prefecture || "全国";
    acc[area] = (acc[area] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log("📈 レベル別集計:");
  Object.entries(byLevel).forEach(([level, count]) => {
    console.log(`  ${level}: ${count}件`);
  });

  console.log("\n📈 都道府県別集計:");
  Object.entries(byArea)
    .sort((a, b) => b[1] - a[1])
    .forEach(([area, count]) => {
      console.log(`  ${area}: ${count}件`);
    });

  // 日付別の追加件数
  const byDate = allGrants.reduce((acc, g) => {
    const date = g.created_at.substring(0, 10);
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log("\n📅 日付別追加件数（最新5日）:");
  Object.entries(byDate)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 5)
    .forEach(([date, count]) => {
      console.log(`  ${date}: ${count}件`);
    });
}

checkDuplicates().catch(console.error);






