import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
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

// ========== メイン処理 ==========
async function syncCSVtoSupabase(fileName: string, source: string) {
  try {
    const filePath = path.resolve("apps/web/data", fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ ${fileName} が見つかりません。スキップします。`);
      await logSyncResult(source, 0, "error", `${fileName} が見つかりません`);
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

// ========== 実行 ==========
async function main() {
  console.log("🚀 補助金データの同期を開始します...");
  await syncCSVtoSupabase("fetched_national_grants.csv", "national");
  await syncCSVtoSupabase("fetched_pref_yamagata.csv", "yamagata");
  console.log("🎉 全ての同期処理が完了しました！");
}

main();