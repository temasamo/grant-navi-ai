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

import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";
import { createObjectCsvWriter } from "csv-writer";

interface GrantData {
  type: string;
  title: string;
  description: string;
  organization: string;
  level: string;
  area_prefecture: string;
  area_city: string;
  industry: string;
  target_type: string;
  max_amount: string;
  subsidy_rate: string;
  source_url: string;
}

async function fetchNationalGrants() {
  const results: GrantData[] = [];

  console.log("🔍 全国レベルの補助金・助成金情報を取得中...");

  try {
    // 1️⃣ 観光庁
    console.log("📡 観光庁の情報を取得中...");
    const kankoRes = await fetch("https://www.mlit.go.jp/kankocho/");
    const kankoHtml = await kankoRes.text();
    const $kanko = cheerio.load(kankoHtml);
    
    $kanko("a").each((_, el) => {
      const title = $kanko(el).text().trim();
      const href = $kanko(el).attr("href");
      
      if (title && href && (title.includes("補助") || title.includes("助成") || title.includes("支援"))) {
        const fullUrl = href.startsWith("http") ? href : `https://www.mlit.go.jp${href}`;
        
        results.push({
          type: "補助金",
          title,
          description: "観光庁公式サイトより取得",
          organization: "観光庁",
          level: "national",
          area_prefecture: "全国",
          area_city: "",
          industry: "旅館業",
          target_type: "法人",
          max_amount: "",
          subsidy_rate: "",
          source_url: fullUrl,
        });
      }
    });

    // 2️⃣ 厚生労働省
    console.log("📡 厚生労働省の情報を取得中...");
    const mhlwRes = await fetch("https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/index.html");
    const mhlwHtml = await mhlwRes.text();
    const $mhlw = cheerio.load(mhlwHtml);
    
    $mhlw("a").each((_, el) => {
      const title = $mhlw(el).text().trim();
      const href = $mhlw(el).attr("href");
      
      if (title && href && (title.includes("助成") || title.includes("支援") || title.includes("補助"))) {
        const fullUrl = href.startsWith("http") ? href : `https://www.mhlw.go.jp${href}`;
        
        results.push({
          type: "助成金",
          title,
          description: "厚生労働省公式サイトより取得",
          organization: "厚生労働省",
          level: "national",
          area_prefecture: "全国",
          area_city: "",
          industry: "旅館業",
          target_type: "法人",
          max_amount: "",
          subsidy_rate: "",
          source_url: fullUrl,
        });
      }
    });

    // 3️⃣ jGrants
    console.log("📡 jGrantsポータルの情報を取得中...");
    const jgrantsRes = await fetch("https://www.jgrants-portal.go.jp/");
    const jgrantsHtml = await jgrantsRes.text();
    const $jg = cheerio.load(jgrantsHtml);
    
    $jg("a").each((_, el) => {
      const title = $jg(el).text().trim();
      const href = $jg(el).attr("href");
      
      if (title && href && (title.includes("補助") || title.includes("助成") || title.includes("支援"))) {
        const fullUrl = href.startsWith("http") ? href : `https://www.jgrants-portal.go.jp${href}`;
        
        results.push({
          type: "補助金",
          title,
          description: "jGrantsポータルより取得",
          organization: "jGrants",
          level: "national",
          area_prefecture: "全国",
          area_city: "",
          industry: "旅館業",
          target_type: "法人",
          max_amount: "",
          subsidy_rate: "",
          source_url: fullUrl,
        });
      }
    });

    // 重複除去
    const uniqueResults = results.filter((item, index, self) => 
      index === self.findIndex(t => t.title === item.title && t.source_url === item.source_url)
    );

    // CSV出力
    if (uniqueResults.length > 0) {
      const csvWriter = createObjectCsvWriter({
        path: "apps/web/data/fetched_national_grants.csv",
        header: [
          { id: "title", title: "title" },
          { id: "description", title: "description" },
          { id: "organization", title: "organization" },
          { id: "source_url", title: "url" },
        ],
      });
      
      await csvWriter.writeRecords(uniqueResults);
      console.log(`✅ ${uniqueResults.length}件の全国助成金を取得しました`);
      console.log(`📁 出力ファイル: apps/web/data/fetched_national_grants.csv`);
      
      // 取得結果の概要を表示
      const orgCounts = uniqueResults.reduce((acc, item) => {
        acc[item.organization] = (acc[item.organization] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log("\n📊 取得結果概要:");
      Object.entries(orgCounts).forEach(([org, count]) => {
        console.log(`  ${org}: ${count}件`);
      });
      
    } else {
      console.log("⚠️ 対象データが見つかりませんでした");
    }

  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
  }
}

// スクリプト実行
fetchNationalGrants();
