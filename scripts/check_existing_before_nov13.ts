/**
 * 11月13日に作成されたデータが、11月13日以前から存在していたか確認
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkExisting() {
  console.log("🔍 11月13日のデータが以前から存在していたか確認中...\n");

  // 11月13日のデータを取得
  const nov13Start = new Date("2025-11-13T00:00:00+09:00");
  const nov13End = new Date("2025-11-13T23:59:59+09:00");

  const { data: data13, error: error13 } = await supabase
    .from("grants")
    .select("id, title, created_at, updated_at")
    .gte("created_at", nov13Start.toISOString())
    .lte("created_at", nov13End.toISOString())
    .order("created_at", { ascending: false });

  if (error13) {
    console.error("❌ エラー:", error13.message);
    return;
  }

  if (!data13 || data13.length === 0) {
    console.log("⚠️ 11月13日のデータがありません");
    return;
  }

  console.log(`📊 11月13日に作成されたデータ: ${data13.length}件\n`);

  // タイトルを正規化
  const normalizeTitle = (title: string) => {
    return (title || "").replace(/^"+|"+$/g, "").trim().replace(/\s+/g, "");
  };

  // 11月13日以前の全データを取得
  const { data: allBefore13, error: errorBefore } = await supabase
    .from("grants")
    .select("id, title, created_at, updated_at")
    .lt("created_at", nov13Start.toISOString())
    .order("created_at", { ascending: false });

  if (errorBefore) {
    console.error("❌ エラー:", errorBefore.message);
    return;
  }

  // タイトルでマッピング
  const titleMap = new Map<string, any[]>();
  (allBefore13 || []).forEach((g) => {
    const key = normalizeTitle(g.title);
    if (!titleMap.has(key)) {
      titleMap.set(key, []);
    }
    titleMap.get(key)!.push(g);
  });

  // 11月13日のデータが以前から存在していたか確認
  let existingCount = 0;
  let newCount = 0;
  const existingDetails: any[] = [];
  const newDetails: any[] = [];

  data13.forEach((g13) => {
    const key = normalizeTitle(g13.title);
    const existing = titleMap.get(key);

    if (existing && existing.length > 0) {
      existingCount++;
      existingDetails.push({
        title: g13.title,
        newId: g13.id,
        newCreated: g13.created_at,
        oldIds: existing.map((e) => e.id),
        oldCreated: existing[0].created_at,
      });
    } else {
      newCount++;
      newDetails.push({
        title: g13.title,
        id: g13.id,
        created: g13.created_at,
      });
    }
  });

  console.log(`📊 結果:`);
  console.log(`  既存データの更新: ${existingCount}件`);
  console.log(`  新規作成: ${newCount}件\n`);

  if (existingCount > 0) {
    console.log(`⚠️ ${existingCount}件のデータは、11月13日以前から存在していました（upsertで更新された可能性）:\n`);
    existingDetails.slice(0, 10).forEach((item, i) => {
      const oldCreated = item.oldCreated ? new Date(item.oldCreated).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : "不明";
      const newCreated = item.newCreated ? new Date(item.newCreated).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : "不明";
      console.log(`  ${i + 1}. ${item.title.substring(0, 50)}...`);
      console.log(`     旧ID: ${item.oldIds.join(", ")}, 作成: ${oldCreated}`);
      console.log(`     新ID: ${item.newId}, 作成: ${newCreated}`);
      console.log(`     → 同じID: ${item.oldIds.includes(item.newId) ? "✅ はい（更新）" : "❌ いいえ（新規作成）"}`);
      console.log("");
    });
    if (existingCount > 10) {
      console.log(`  ...他 ${existingCount - 10}件`);
    }
  }

  if (newCount > 0) {
    console.log(`\n✅ ${newCount}件は完全に新規作成されたデータです:\n`);
    newDetails.slice(0, 5).forEach((item, i) => {
      const created = item.created ? new Date(item.created).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : "不明";
      console.log(`  ${i + 1}. ${item.title.substring(0, 50)}...`);
      console.log(`     ID: ${item.id}, 作成: ${created}`);
    });
    if (newCount > 5) {
      console.log(`  ...他 ${newCount - 5}件`);
    }
  }
}

checkExisting().catch(console.error);

