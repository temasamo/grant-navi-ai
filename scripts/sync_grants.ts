import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import csv from "csv-parser";

// ========== Supabase接続 ==========
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ========== ユーティリティ：CSV読込 ==========
async function readCSV(filePath: string) {
  const results: any[] = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}

// ========== ログ記録 ==========
async function logSyncResult(source: string, records: number, status: string, message: string) {
  await supabase.from("sync_logs").insert([
    {
      source,
      records_synced: records,
      status,
      message,
    },
  ]);
  console.log(`📝 [${source}] ${message} (${records}件)`);
}

// ========== CSVファイルパス定義 ==========
const nationalPath = "apps/web/scripts/data/fetched_national_grants.csv";
const yamagataPath = "apps/web/scripts/data/fetched_pref_yamagata.csv";

// ========== メイン処理 ==========
async function syncCSVtoSupabase(filePath: string, source: string) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ ${filePath} が見つかりません。スキップします。`);
      await logSyncResult(source, 0, "error", `${filePath} が見つかりません`);
      return;
    }

    const records = (await readCSV(filePath)) as any[];

    if (records.length === 0) {
      console.warn(`⚠️ ${source}: CSVが空のため同期スキップ`);
      await logSyncResult(source, 0, "success", "CSVが空のため更新なし");
      return;
    }

    console.log(`🧠 ${source}: ${records.length}件をSupabaseに同期開始...`);

    const { data, error } = await supabase
      .from("grants")
      .upsert(records, { onConflict: "title" }) // titleをキーに重複回避
      .select();

    const syncedCount = data ? data.length : 0;

    if (error) {
      console.error(`❌ ${source}: 同期中にエラー発生 - ${error.message}`);
      await logSyncResult(source, 0, "error", error.message);
    } else if (syncedCount === 0) {
      console.log(`✅ ${source}: 更新なし（既存データと同一）`);
      await logSyncResult(source, 0, "success", "更新なし（新規データなし）");
    } else {
      console.log(`✅ ${source}: ${syncedCount}件のデータを同期完了`);
      await logSyncResult(source, syncedCount, "success", "正常に同期されました");
    }
  } catch (err: any) {
    console.error(`💥 ${source}: 想定外のエラー`, err.message);
    await logSyncResult(source, 0, "error", err.message);
  }
}

// ================================
// 重複削除ロジック
// ================================
async function removeDuplicates() {
  console.log("🧹 重複データをチェックしています...");

  const { data: duplicates, error } = await supabase
    .from("grants")
    .select("id, title");

  if (error) {
    console.error("重複検出エラー:", error.message);
    await logSyncResult("deduplication", 0, "error", error.message);
    return;
  }

  const titleMap = new Map<string, number[]>();

  // タイトルごとにグルーピング（空白・全角半角を無視）
  duplicates?.forEach((row: { id: number; title: string }) => {
    const key = (row.title || "").replace(/\s+/g, "").trim();
    if (!titleMap.has(key)) {
      titleMap.set(key, []);
    }
    titleMap.get(key)!.push(row.id);
  });

  // 削除対象IDを抽出
  const idsToDelete: number[] = [];
  for (const [, ids] of titleMap.entries()) {
    if (ids.length > 1) {
      ids.sort((a, b) => a - b);
      idsToDelete.push(...ids.slice(1)); // 最新1件のみ残す（id最小を残す想定）
    }
  }

  if (idsToDelete.length === 0) {
    console.log("✅ 重複は検出されませんでした。");
    await logSyncResult("deduplication", 0, "success", "重複なし");
    return;
  }

  // 重複削除を実行
  const { error: deleteError } = await supabase
    .from("grants")
    .delete()
    .in("id", idsToDelete);

  if (deleteError) {
    console.error("❌ 重複削除エラー:", deleteError.message);
    await logSyncResult("deduplication", 0, "error", deleteError.message);
  } else {
    console.log(`🧹 ${idsToDelete.length}件の重複データを削除しました。`);
    await logSyncResult("deduplication", idsToDelete.length, "success", "重複削除完了");
  }
}

// ========== 実行 ==========
async function main() {
  console.log("🚀 補助金データの同期を開始します...");
  await syncCSVtoSupabase(nationalPath, "national");
  await syncCSVtoSupabase(yamagataPath, "yamagata");
  await removeDuplicates(); // ✅ 重複削除を追加
  console.log("🎉 全ての同期処理が完了しました！");
}

main();