/**
 * apps/web/scripts/fetch_national_grants.ts
 * 国の補助金・助成金データ取得スクリプト（省庁URL自動補完付き）
 */

import fs from "fs";
import path from "path";
import Papa from "papaparse";

async function main() {
  // Node 18 互換: undiciが期待するFileを簡易ポリフィル
  (globalThis as any).File = (globalThis as any).File || class {};

  // --- Supabase 接続設定（動的importでFileポリフィル適用後に読み込む） ---
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

// --- CSVの読み込み ---
const csvPath = path.join(process.cwd(), "apps/web/data/fetched_national_grants.csv");
const csvContent = fs.readFileSync(csvPath, "utf8");
const parsed = Papa.parse(csvContent, { header: true }).data as any[];

// --- 省庁ごとの公式URLマッピング ---
const orgUrls: Record<string, string> = {
  "厚生労働省": "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/index.html",
  "経済産業省": "https://www.meti.go.jp/",
  "観光庁": "https://www.mlit.go.jp/kankocho/",
  "中小企業庁": "https://www.chusho.meti.go.jp/",
  "環境省": "https://www.env.go.jp/",
  "総務省": "https://www.soumu.go.jp/",
  "農林水産省": "https://www.maff.go.jp/",
  "文部科学省": "https://www.mext.go.jp/",
  "内閣府": "https://www.cao.go.jp/",
};

// --- データ投入処理 ---
  async function syncNationalGrants() {
  console.log("🔄 国の補助金・助成金データ同期を開始...");

  let insertedCount = 0;

  for (const grant of parsed) {
    const url =
      grant.url && grant.url.trim() !== ""
        ? grant.url
        : orgUrls[grant.organization] || "https://www.japan.go.jp/";

    const { error } = await supabase.from("grants").upsert({
      title: grant.title,
      description: grant.description,
      organization: grant.organization,
      url,
      level: "national",
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error(`❌ Error inserting ${grant.title}:`, error.message);
    } else {
      insertedCount++;
    }
  }

  console.log(`✅ 国データ同期完了: ${insertedCount}件を更新しました`);
  }

  await syncNationalGrants();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
