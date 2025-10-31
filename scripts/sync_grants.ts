/**
 * 自動同期スクリプト（国・山形県・重複削除対応版）
 * - 目的: CSVをSupabaseに同期
 * - 修正点: パスをapps/web/scripts/data/に統一 + エラーハンドリング改善
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import Papa from "papaparse";

// 環境変数の読み込み（.env.localがあれば読み込む）
dotenv.config({ path: ".env.local" });

// Supabase設定
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ 環境変数が設定されていません:");
  console.error("  SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL:", !!supabaseUrl);
  console.error("  SUPABASE_SERVICE_ROLE_KEY:", !!supabaseServiceKey);
  console.error("利用可能な環境変数:");
  console.error(process.env);
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

// CSV読み込みユーティリティ（papaparseを使用して正しく解析）
function readCsv(filePath: string): any[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
  });
  return parsed.data as any[];
}

// CSV同期関数（ファイルパス修正＋upsert対応版）
async function syncCsvToSupabase(source: string, fileName: string) {
  // ✅ apps/web/data配下を参照（正しいURLデータが入っているCSVファイル）
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const webDataDir = path.join(scriptDir, "..", "data");
  const filePath = path.join(webDataDir, fileName);

  // ファイル存在確認
  if (!fs.existsSync(filePath)) {
    await logSync(source, 0, "error", `${fileName} が存在しません`);
    return;
  }

  try {
    const data = readCsv(filePath);
    if (data.length === 0) {
      await logSync(source, 0, "error", `${fileName} に有効なデータがありません`);
      return;
    }

    // CSV内容整形（papaparseでヘッダー付きとして読み込んでいるため、オブジェクトとしてアクセス）
    const formatted = data.map((r: any, index: number) => {
      // 新旧スキーマに対応
      const title = r.title || r['title'] || '';
      const description = r.description || r['description'] || '';
      const organization = r.organization || r['organization'] || '';
      // URLは source_url, url, link カラムのいずれかから取得（優先順位順）
      const url = r.source_url || r.url || r.link || r['source_url'] || r['url'] || r['link'] || '';
      
      return {
        title: title || '',
        description: description || '',
        organization: organization || '',
        url: url || '',
        created_at: new Date().toISOString(),
        // 既存スキーマ互換のために維持
        level: source === 'national' ? 'national' : 'prefecture',
        area_prefecture: source === 'yamagata' ? '山形県' : '',
        industry: '旅館業',
        target_type: '法人',
        type: '補助金',
      };
    });

    // 新規追加のみをカウントするため、既存タイトルを取得
    const titles = formatted.map((f) => f.title);
    const { data: existingGrants } = await supabase
      .from("grants")
      .select("title")
      .in("title", titles);
    
    const existingTitles = new Set(
      (existingGrants || []).map((g) => g.title)
    );
    const newRecordsCount = formatted.filter(
      (f) => !existingTitles.has(f.title)
    ).length;
    const updatedRecordsCount = formatted.length - newRecordsCount;

    // ✅ 重複をスキップ（title重複時に上書きor無視）
    const { error } = await supabase
      .from("grants")
      .upsert(formatted, { onConflict: "title" });

    if (error) throw error;

    const message = `正常に同期されました（新規: ${newRecordsCount}件, 更新: ${updatedRecordsCount}件）`;
    await logSync(source, newRecordsCount, "success", message);
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
