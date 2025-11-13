/**
 * 既存のSupabaseデータとスクレイピング結果を比較
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function compareData() {
  console.log("🔍 既存データとスクレイピング結果を比較中...\n");

  // 1. Supabaseから既存の市町村データを取得
  const { data: existingGrants, error } = await supabase
    .from("grants")
    .select("id, title, organization, url, created_at")
    .or("organization.ilike.%市%,organization.ilike.%町%,organization.ilike.%村%")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ エラー:", error.message);
    return;
  }

  console.log(`📊 Supabaseの既存市町村データ: ${existingGrants?.length || 0}件\n`);

  // 2. スクレイピングで取得したCSVを読み込む
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const csvPath = path.join(scriptDir, "..", "data", "fetched_city_yamagata.csv");

  if (!fs.existsSync(csvPath)) {
    console.log("⚠️ スクレイピングCSVが見つかりません");
    return;
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const scrapedGrants = parsed.data as any[];
  console.log(`📊 スクレイピングで取得したデータ: ${scrapedGrants.length}件\n`);

  // 3. 比較
  const existingTitles = new Set(
    (existingGrants || []).map((g) => g.title.replace(/"/g, ""))
  );
  const scrapedTitles = new Set(
    scrapedGrants.map((g) => (g.title || "").replace(/"/g, ""))
  );

  // Supabaseにあってスクレイピング結果にないデータ
  const onlyInSupabase = (existingGrants || []).filter(
    (g) => !scrapedTitles.has(g.title.replace(/"/g, ""))
  );

  // スクレイピングにあってSupabaseにないデータ
  const onlyInScraped = scrapedGrants.filter(
    (g) => !existingTitles.has((g.title || "").replace(/"/g, ""))
  );

  console.log("📈 比較結果:\n");
  console.log(
    `🔴 Supabaseにのみ存在（スクレイピング未取得）: ${onlyInSupabase.length}件`
  );
  if (onlyInSupabase.length > 0) {
    console.log("\n  これらのデータは手動追加またはテストデータの可能性があります:");
    onlyInSupabase.slice(0, 10).forEach((g, i) => {
      console.log(
        `  ${i + 1}. ${g.title.substring(0, 40)}... (${g.organization})`
      );
      console.log(`     URL: ${g.url || "(NULL)"}`);
      console.log(`     作成日時: ${g.created_at}`);
    });
    if (onlyInSupabase.length > 10) {
      console.log(`  ...他 ${onlyInSupabase.length - 10}件`);
    }
  }

  console.log(
    `\n🟢 スクレイピングにのみ存在（Supabase未同期）: ${onlyInScraped.length}件`
  );
  if (onlyInScraped.length > 0) {
    console.log("\n  これらのデータは次回sync_grants.tsで追加されます:");
    onlyInScraped.slice(0, 5).forEach((g, i) => {
      console.log(`  ${i + 1}. ${(g.title || "").substring(0, 40)}... (${g.organization})`);
    });
  }

  // 4. URLがNULLまたは不正な既存データの内訳
  const invalidUrlsInSupabase = (existingGrants || []).filter(
    (g) =>
      !g.url ||
      g.url === "https://example.com" ||
      g.url.includes("javascript:")
  );

  console.log(
    `\n⚠️ 既存データでURLが不正またはNULL: ${invalidUrlsInSupabase.length}件`
  );
  console.log(
    `   → これらのデータは手動追加またはスクレイピング以前のデータの可能性が高い`
  );

  // 5. 結論
  console.log("\n💡 結論:");
  if (onlyInSupabase.length > scrapedGrants.length) {
    console.log(
      `  Supabaseに${onlyInSupabase.length}件の市町村データがありますが、\n  スクレイピングでは${scrapedGrants.length}件しか取得できませんでした。\n  → 既存データの多くは手動追加またはテストデータの可能性が高いです。`
    );
  } else {
    console.log(
      "  スクレイピングで取得できるデータと既存データの件数に大きな差はありません。"
    );
  }
}

compareData().catch(console.error);






