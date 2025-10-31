/**
 * 補助金・助成金データを「正しい情報」と「ダミー（可能性あり）」に分類
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

// URLバリデーション
function isValidUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (
    !trimmed ||
    trimmed === "https://example.com" ||
    trimmed.startsWith("javascript:") ||
    !trimmed.startsWith("http://") && !trimmed.startsWith("https://")
  ) {
    return false;
  }
  try {
    const urlObj = new URL(trimmed);
    // hostname は string。左辺にそのまま置くと string | boolean になり型エラーとなるため
    // 真偽値へ明示的に変換してから比較する
    return !!urlObj.hostname && urlObj.hostname !== "example.com";
  } catch {
    return false;
  }
}

async function classifyGrants() {
  console.log("🔍 補助金・助成金データを分類中...\n");

  // 1. Supabaseから全データを取得
  const { data: allGrants, error } = await supabase
    .from("grants")
    .select("id, title, organization, url, created_at, level, area_prefecture, area_city")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ エラー:", error.message);
    return;
  }

  if (!allGrants || allGrants.length === 0) {
    console.log("⚠️ データがありません");
    return;
  }

  // 2. スクレイピングで取得したCSVを読み込む
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const scrapedFiles = [
    path.join(scriptDir, "..", "data", "fetched_national_grants.csv"),
    path.join(scriptDir, "..", "data", "fetched_pref_yamagata.csv"),
    path.join(scriptDir, "..", "data", "fetched_city_yamagata.csv"),
  ];

  const scrapedTitles = new Set<string>();
  for (const filePath of scrapedFiles) {
    if (fs.existsSync(filePath)) {
      const csvContent = fs.readFileSync(filePath, "utf-8");
      const parsed = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
      });
      (parsed.data as any[]).forEach((row: any) => {
        const title = (row.title || "").replace(/^"+|"+$/g, "").trim();
        if (title) {
          scrapedTitles.add(title);
        }
      });
    }
  }

  console.log(`📊 総データ数: ${allGrants.length}件`);
  console.log(`📊 スクレイピングで取得済みタイトル: ${scrapedTitles.size}件\n`);

  // 3. 分類基準で判定（改善版）
  const validGrants: any[] = [];
  const dummyGrants: any[] = [];

  allGrants.forEach((grant) => {
    const cleanTitle = (grant.title || "").replace(/^"+|"+$/g, "").trim();
    const hasValidUrl = isValidUrl(grant.url);
    const isInScraped = scrapedTitles.has(cleanTitle);
    const createdDate = grant.created_at ? grant.created_at.substring(0, 10) : "";

    // 判定基準（優先順位順）
    let isDummy = false;
    const reasons: string[] = [];

    // 基準1: タイトルが明らかにダミー（最優先）
    if (cleanTitle === "title" || cleanTitle.length < 3) {
      isDummy = true;
      reasons.push("タイトルが不自然");
    }
    // 基準2: 特定の日に一括作成（テストデータの可能性が高い）
    else if (createdDate === "2025-10-21") {
      isDummy = true;
      reasons.push("2025-10-21に一括作成（テストデータの可能性）");
    }
    // 基準3: URLが無効またはNULL + スクレイピングで未取得
    // → ただし、URLがあれば正しい情報として扱う（今日取得したデータも含む）
    else if (!hasValidUrl && !isInScraped) {
      isDummy = true;
      reasons.push("URLが無効またはNULL かつ スクレイピングで未取得");
    }
    // URLが有効なら、スクレイピングで未取得でも正しい情報として扱う
    // （今日取得したデータがCSVに反映される前に実行された場合など）

    if (isDummy) {
      dummyGrants.push({
        ...grant,
        cleanTitle,
        reasons,
      });
    } else {
      validGrants.push({
        ...grant,
        cleanTitle,
        hasValidUrl,
        isInScraped,
      });
    }
  });

  // 4. 結果を表示
  console.log(`✅ 正しい情報: ${validGrants.length}件`);
  console.log(`🔴 ダミー（可能性あり）: ${dummyGrants.length}件\n`);

  console.log("📋 分類結果詳細:\n");

  if (validGrants.length > 0) {
    console.log("✅ 正しい情報（先頭10件）:");
    validGrants.slice(0, 10).forEach((g, i) => {
      console.log(
        `  ${i + 1}. ${g.cleanTitle.substring(0, 50)}...`
      );
      console.log(`     ID: ${g.id}, URL: ${g.url ? "✅" : "❌"}, 作成: ${g.created_at?.substring(0, 10)}`);
      console.log(`     組織: ${g.organization || "(なし)"}`);
    });
    if (validGrants.length > 10) {
      console.log(`  ...他 ${validGrants.length - 10}件`);
    }
    console.log("");
  }

  if (dummyGrants.length > 0) {
    console.log("🔴 ダミー（可能性あり）:");
    dummyGrants.slice(0, 20).forEach((g, i) => {
      console.log(`  ${i + 1}. ${g.cleanTitle.substring(0, 50)}...`);
      console.log(`     ID: ${g.id}, 理由: ${g.reasons.join(", ")}`);
      console.log(`     URL: ${g.url || "(NULL)"}, 作成: ${g.created_at?.substring(0, 10)}`);
      console.log(`     組織: ${g.organization || "(なし)"}`);
    });
    if (dummyGrants.length > 20) {
      console.log(`  ...他 ${dummyGrants.length - 20}件`);
    }
    console.log("");
  }

  // 5. 統計（area_cityがある場合は市町村として分類）
  const byLevel = {
    valid: { national: 0, prefecture: 0, city: 0 },
    dummy: { national: 0, prefecture: 0, city: 0 },
  };

  validGrants.forEach((g) => {
    if (g.level === "national") byLevel.valid.national++;
    else if (g.area_city && g.area_city.trim() !== "") byLevel.valid.city++;
    else if (g.level === "prefecture") byLevel.valid.prefecture++;
    else if (g.level === "city") byLevel.valid.city++;
  });

  dummyGrants.forEach((g) => {
    if (g.level === "national") byLevel.dummy.national++;
    else if (g.area_city && g.area_city.trim() !== "") byLevel.dummy.city++;
    else if (g.level === "prefecture") byLevel.dummy.prefecture++;
    else if (g.level === "city") byLevel.dummy.city++;
  });

  console.log("📊 レベル別内訳:");
  console.log("  正しい情報:");
  console.log(`    国: ${byLevel.valid.national}件, 都道府県: ${byLevel.valid.prefecture}件, 市町村: ${byLevel.valid.city}件`);
  console.log("  ダミー（可能性あり）:");
  console.log(`    国: ${byLevel.dummy.national}件, 都道府県: ${byLevel.dummy.prefecture}件, 市町村: ${byLevel.dummy.city}件`);

  // 6. 判定理由の内訳
  const reasonCounts: Record<string, number> = {};
  dummyGrants.forEach((g) => {
    g.reasons.forEach((r: string) => {
      reasonCounts[r] = (reasonCounts[r] || 0) + 1;
    });
  });

  console.log("\n📊 ダミー判定理由の内訳:");
  Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([reason, count]) => {
      console.log(`  ${reason}: ${count}件`);
    });
}

classifyGrants().catch(console.error);

