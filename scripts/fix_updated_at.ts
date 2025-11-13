/**
 * 11月13日のデータのupdated_atを修正（created_atと同じ値に設定）
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUpdatedAt() {
  console.log("🔧 11月13日のデータのupdated_atを修正中...\n");

  // 11月13日に作成されたデータを取得
  const nov13Start = new Date("2025-11-13T00:00:00+09:00");
  const nov13End = new Date("2025-11-13T23:59:59+09:00");

  const { data, error: fetchError } = await supabase
    .from("grants")
    .select("id, title, created_at, updated_at")
    .gte("created_at", nov13Start.toISOString())
    .lte("created_at", nov13End.toISOString())
    .order("created_at", { ascending: false });

  if (fetchError) {
    console.error("❌ エラー:", fetchError.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log("⚠️ 修正対象のデータがありません");
    return;
  }

  console.log(`📊 修正対象: ${data.length}件\n`);

  // updated_atがcreated_atより古いデータを修正
  let fixedCount = 0;
  for (const grant of data) {
    const created = grant.created_at ? new Date(grant.created_at) : null;
    const updated = grant.updated_at ? new Date(grant.updated_at) : null;

    if (created && updated && updated < created) {
      // updated_atをcreated_atと同じ値に更新
      const { error: updateError } = await supabase
        .from("grants")
        .update({ updated_at: grant.created_at })
        .eq("id", grant.id);

      if (updateError) {
        console.error(`❌ ID ${grant.id} の更新に失敗:`, updateError.message);
      } else {
        fixedCount++;
        console.log(`✅ ID ${grant.id}: ${grant.title.substring(0, 40)}...`);
      }
    }
  }

  console.log(`\n📊 修正完了: ${fixedCount}件`);
}

fixUpdatedAt().catch(console.error);


