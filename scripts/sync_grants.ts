/**
 * 自動同期スクリプト（国・山形県・重複削除対応版）
 * - 目的: CSVをSupabaseに同期
 * - 修正点: パスをapps/web/scripts/data/に統一 + エラーハンドリング改善
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import csv from "csv-parser";
import dotenv from "dotenv";

// 環境変数の読み込み（.env.localがあれば読み込む）
dotenv.config({ path: ".env.local" });

// Supabase設定
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ 環境変数が設定されていません:");
  console.error("  SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL:", !!supabaseUrl);
  console.error("  SUPABASE_SERVICE_ROLE_KEY:", !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ログ記録関数
async function logSync(source: string, records: number, status: string, message: string) {
  try {
    await supabase.from("sync_logs").insert([
      {
        source,
        records_synced: records,
        status,
        message,
      },
    ]);
    console.log(`📝 [${source}] ${status}: ${message} (${records}件)`);
  } catch (err: any) {
    console.error(`❌ ログ保存エラー:`, err.message);
  }
}

// CSV読み込みユーティリティ
async function readCsv(filePath: string): Promise<any[]> {
  const results: any[] = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}

// データ挿入関数
async function syncCsvToSupabase(source: string, fileName: string) {
  const filePath = path.join(process.cwd(), "apps/web/scripts/data", fileName);

  if (!fs.existsSync(filePath)) {
    await logSync(source, 0, "error", `${fileName} が存在しません`);
    return;
  }

  try {
    const data = await readCsv(filePath);
    if (data.length === 0) {
      await logSync(source, 0, "error", `${fileName} に有効なデータがありません`);
      return;
    }

    // データを正規化（CSVのカラム構造に合わせて）
    const formatted = data.map((row: any) => ({
      type: row.type || "",
      title: row.title || "",
      description: row.description || "",
      organization: row.organization || "",
      level: row.level || "national",
      area_prefecture: row.area_prefecture || "",
      area_city: row.area_city || "",
      industry: row.industry || "旅館業",
      target_type: row.target_type || "法人",
      max_amount: row.max_amount || "",
      subsidy_rate: row.subsidy_rate || "",
      source_url: row.source_url || row.link || "",
    }));

    const { error } = await supabase.from("grants").upsert(formatted, { onConflict: "title" });
    if (error) throw error;

    await logSync(source, formatted.length, "success", "正常に同期されました");
  } catch (e: any) {
    await logSync(source, 0, "error", e.message);
  }
}

// 重複削除処理
async function deduplicateGrants() {
  try {
    console.log("🧹 重複データをチェックしています...");

    const { data: duplicates, error } = await supabase
      .from("grants")
      .select("id, title");

    if (error) {
      await logSync("deduplication", 0, "error", error.message);
      return;
    }

    const titleMap = new Map<string, number[]>();

    // タイトルごとにグルーピング（空白を無視）
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
      await logSync("deduplication", 0, "success", "重複なし");
      return;
    }

    // 重複削除を実行
    const { error: deleteError } = await supabase
      .from("grants")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      await logSync("deduplication", 0, "error", deleteError.message);
    } else {
      console.log(`🧹 ${idsToDelete.length}件の重複データを削除しました。`);
      await logSync("deduplication", idsToDelete.length, "success", "重複削除完了");
    }
  } catch (e: any) {
    await logSync("deduplication", 0, "error", e.message);
  }
}

// メイン処理
async function main() {
  console.log("🧠 補助金データ同期を開始します...");
  await syncCsvToSupabase("national", "fetched_national_grants.csv");
  await syncCsvToSupabase("yamagata", "fetched_pref_yamagata.csv");
  await deduplicateGrants();
  console.log("✅ 全同期完了");
}

main();
