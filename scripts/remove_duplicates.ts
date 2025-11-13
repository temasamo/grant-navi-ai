/**
 * 既存の重複データを削除
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function removeDuplicates() {
  console.log("🔍 重複データを検出して削除中...\n");

  // 全データを取得
  const { data: allGrants, error: fetchError } = await supabase
    .from("grants")
    .select("id, title, level, area_prefecture, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (fetchError) {
    console.error("❌ エラー:", fetchError.message);
    return;
  }

  if (!allGrants || allGrants.length === 0) {
    console.log("⚠️ データがありません");
    return;
  }

  console.log(`📊 総件数: ${allGrants.length}件\n`);

  // タイトルを正規化して重複をチェック（ダブルクォート除去）
  const titleMap = new Map<string, number[]>();
  allGrants.forEach((grant) => {
    const cleanTitle = (grant.title || '').replace(/^"+|"+$/g, "").trim();
    if (!titleMap.has(cleanTitle)) {
      titleMap.set(cleanTitle, []);
    }
    titleMap.get(cleanTitle)!.push(grant.id);
  });

  // 重複があるタイトルを抽出
  const duplicates = Array.from(titleMap.entries()).filter(
    ([_, ids]) => ids.length > 1
  );

  if (duplicates.length === 0) {
    console.log("✅ 重複タイトルは見つかりませんでした\n");
    return;
  }

  console.log(`🔴 重複タイトルが ${duplicates.length}件 見つかりました\n`);

  // 各重複グループで、最新の1件を残して他を削除
  let deletedCount = 0;
  for (const [title, ids] of duplicates) {
    // IDをcreated_atでソート（最新のものを残す）
    const grants = ids.map(id => {
      const grant = allGrants.find(g => g.id === id);
      return grant;
    }).filter(Boolean).sort((a, b) => {
      const timeA = new Date(a!.created_at).getTime();
      const timeB = new Date(b!.created_at).getTime();
      return timeB - timeA; // 新しい順
    });

    if (grants.length <= 1) continue;

    // 最新の1件を残して、他を削除
    const toKeep = grants[0]!.id;
    const toDelete = grants.slice(1).map(g => g!.id);

    console.log(`📝 "${title.substring(0, 50)}..."`);
    console.log(`   保持: ID ${toKeep} (作成: ${grants[0]!.created_at.substring(0, 10)})`);
    console.log(`   削除: ID ${toDelete.join(", ")} (${toDelete.length}件)`);

    // 削除実行
    const { error: deleteError } = await supabase
      .from("grants")
      .delete()
      .in("id", toDelete);

    if (deleteError) {
      console.error(`   ❌ 削除エラー: ${deleteError.message}`);
    } else {
      deletedCount += toDelete.length;
      console.log(`   ✅ 削除完了`);
    }
    console.log("");
  }

  console.log(`\n✅ 重複削除完了: ${deletedCount}件のレコードを削除しました`);
}

removeDuplicates().catch(console.error);







