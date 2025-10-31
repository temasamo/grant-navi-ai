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

// URLバリデーション関数
function validateUrl(url: string | undefined | null, organization?: string): string {
  if (!url || typeof url !== 'string') return '';
  
  const trimmed = url.trim();
  
  // 空文字列、example.com、javascript: を無効と判定
  if (!trimmed || 
      trimmed === 'https://example.com' || 
      trimmed.startsWith('javascript:') ||
      trimmed.includes('javascript:')) {
    return '';
  }
  
  // http:// または https:// で始まらない場合は無効
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return '';
  }
  
  // URL形式をチェック（基本的な形式）
  try {
    const urlObj = new URL(trimmed);
    if (!urlObj.hostname || urlObj.hostname === 'example.com') {
      return '';
    }
    return trimmed;
  } catch {
    return '';
  }
}

// 組織に基づくデフォルトURLマッピング
const defaultOrgUrls: Record<string, string> = {
  "厚生労働省": "https://www.mhlw.go.jp/",
  "経済産業省": "https://www.meti.go.jp/",
  "観光庁": "https://www.mlit.go.jp/kankocho/",
  "中小企業庁": "https://www.chusho.meti.go.jp/",
  "環境省": "https://www.env.go.jp/",
  "総務省": "https://www.soumu.go.jp/",
  "農林水産省": "https://www.maff.go.jp/",
  "文部科学省": "https://www.mext.go.jp/",
  "内閣府": "https://www.cao.go.jp/",
  "山形県": "https://www.pref.yamagata.jp/",
};

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
      const rawUrl = r.source_url || r.url || r.link || r['source_url'] || r['url'] || r['link'] || '';
      
      // URLバリデーション（不正なURLは空文字列またはデフォルトURLに）
      let validatedUrl = validateUrl(rawUrl, organization);
      
      // URLが無効な場合は、組織に基づくデフォルトURLを試す
      if (!validatedUrl && organization) {
        validatedUrl = defaultOrgUrls[organization] || '';
      }
      
      // バリデーション結果をログ出力（デバッグ用）
      if (rawUrl && !validatedUrl) {
        console.log(`⚠️  不正なURLをスキップ: "${rawUrl}" (${title.substring(0, 30)}...)`);
      }
      
      // area_cityフィールドを読み込む
      const areaCity = r.area_city || r['area_city'] || '';
      
      return {
        title: title || '',
        description: description || '',
        organization: organization || '',
        url: validatedUrl,
        created_at: new Date().toISOString(),
        // 既存スキーマ互換のために維持
        level: source === 'national' ? 'national' : 'prefecture',
        area_prefecture: source === 'yamagata' ? (r.area_prefecture || r['area_prefecture'] || '山形県') : '',
        area_city: areaCity, // 市町村データ用
        industry: '旅館業',
        target_type: '法人',
        type: '補助金',
      };
    });

    // CSV内の重複タイトルを削除（最初の1件のみ残す）
    const seenTitles = new Set<string>();
    const uniqueFormatted = formatted.filter((f) => {
      if (seenTitles.has(f.title)) {
        console.log(`⚠️  重複タイトルをスキップ: ${f.title}`);
        return false;
      }
      seenTitles.add(f.title);
      return true;
    });

    // 新規追加のみをカウントするため、既存タイトルを取得
    const titles = uniqueFormatted.map((f) => f.title);
    const { data: existingGrants } = await supabase
      .from("grants")
      .select("title")
      .in("title", titles);
    
    const existingTitles = new Set(
      (existingGrants || []).map((g) => g.title)
    );
    const newRecordsCount = uniqueFormatted.filter(
      (f) => !existingTitles.has(f.title)
    ).length;
    const updatedRecordsCount = uniqueFormatted.length - newRecordsCount;

    // ✅ 重複をスキップ（title重複時に上書きor無視）
    const { error } = await supabase
      .from("grants")
      .upsert(uniqueFormatted, { onConflict: "title" });

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
  await syncCsvToSupabase("yamagata", "fetched_city_yamagata.csv"); // 市町村データも追加
  await deduplicateGrants();
  console.log("✅ 全同期完了");
}

main();
