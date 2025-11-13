/**
 * 欠落しているURLを検索・補完するスクリプト
 * 
 * 方法1: タイトルと組織名でGoogle検索
 * 方法2: 組織の公式サイト内を検索
 * 方法3: jGrantsポータルサイトを検索
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 方法1: タイトルから組織の公式サイトを検索してURLを推測
 */
async function searchOrganizationSite(title: string, organization: string): Promise<string> {
  // 組織名から公式サイトのベースURLを取得
  const orgBaseUrls: Record<string, string> = {
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
    "東京都": "https://www.metro.tokyo.lg.jp/",
  };

  // 市町村のパターン
  const cityMatch = organization.match(/(.+?[市町村])/);
  if (cityMatch) {
    const cityName = cityMatch[1];
    // 市町村の場合、検索サイトで検索する必要がある
    return `https://www.google.com/search?q=${encodeURIComponent(cityName + " " + title)}`;
  }

  const baseUrl = orgBaseUrls[organization] || "";
  if (!baseUrl) {
    return "";
  }

  // 公式サイト内検索のURLを生成
  return `${baseUrl}?q=${encodeURIComponent(title)}`;
}

/**
 * 方法2: jGrantsポータルサイトで検索
 */
function generateJgrantsSearchUrl(title: string): string {
  return `https://www.jgrants-portal.go.jp/search?keyword=${encodeURIComponent(title)}`;
}

/**
 * 方法3: Google検索URLを生成（手動検索用）
 */
function generateGoogleSearchUrl(title: string, organization: string): string {
  const query = `${organization} ${title} 補助金 助成金`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/**
 * 方法4: 市町村の公式サイトURLを推測
 */
function guessCityWebsiteUrl(organization: string): string {
  const cityMatch = organization.match(/(.+?[市町村])/);
  if (!cityMatch) return "";

  const cityName = cityMatch[1];
  
  // 一般的な市町村のURLパターン
  const patterns = [
    `https://www.city.${cityName.replace(/[市町村]/g, "")}.yamagata.jp/`,
    `https://www.${cityName.replace(/[市町村]/g, "")}.lg.jp/`,
    `https://www.town.${cityName.replace(/[市町村]/g, "")}.yamagata.jp/`,
    `https://www.vill.${cityName.replace(/[市町村]/g, "")}.yamagata.jp/`,
  ];

  // 実際には、これらのURLを試して存在するか確認する必要がある
  return patterns[0]; // 暫定的に最初のパターンを返す
}

async function findMissingUrls() {
  console.log("🔍 URLが欠落している補助金・助成金を検索中...\n");

  // URLがNULLまたは不正なgrantsを取得
  const { data: grants, error } = await supabase
    .from("grants")
    .select("id, title, url, organization, level, area_prefecture")
    .or("url.is.null,url.eq.,url.eq.https://example.com");

  if (error) {
    console.error("❌ エラー:", error.message);
    return;
  }

  if (!grants || grants.length === 0) {
    console.log("✅ URLが欠落しているデータはありません");
    return;
  }

  console.log(`📊 URLが欠落しているデータ: ${grants.length}件\n`);

  console.log("🔍 各データのURL検索方法:\n");

  for (const grant of grants) {
    console.log(`\n📋 ${grant.title.substring(0, 50)}...`);
    console.log(`   組織: ${grant.organization || "(不明)"}`);
    console.log(`   レベル: ${grant.level === "national" ? "国" : grant.area_prefecture || "都道府県"}`);

    // 推奨される検索方法
    const methods: string[] = [];

    if (grant.level === "national") {
      // 国の場合は公式サイト内検索
      const orgSearchUrl = await searchOrganizationSite(grant.title, grant.organization || "");
      if (orgSearchUrl) {
        methods.push(`🔹 公式サイト検索: ${orgSearchUrl}`);
      }
      methods.push(`🔹 jGrants検索: ${generateJgrantsSearchUrl(grant.title)}`);
    } else if (grant.organization && grant.organization.includes("市") || grant.organization.includes("町") || grant.organization.includes("村")) {
      // 市町村の場合はGoogle検索が有効
      methods.push(`🔹 Google検索: ${generateGoogleSearchUrl(grant.title, grant.organization)}`);
      const cityUrl = guessCityWebsiteUrl(grant.organization);
      if (cityUrl) {
        methods.push(`🔹 推測される公式サイト: ${cityUrl} (要確認)`);
      }
    } else {
      // 都道府県の場合は公式サイト内検索
      const orgSearchUrl = await searchOrganizationSite(grant.title, grant.organization || "");
      if (orgSearchUrl) {
        methods.push(`🔹 公式サイト検索: ${orgSearchUrl}`);
      }
    }

    methods.forEach((method) => console.log(`   ${method}`));
  }

  console.log(`\n\n💡 推奨される手順:`);
  console.log(`1. 上記の検索URLを使って手動でURLを確認`);
  console.log(`2. 見つかったURLをCSVファイルに追加`);
  console.log(`3. sync_grants.tsを再実行してSupabaseに反映`);
  console.log(`\nまたは、自動取得スクリプトを実行:`);
  console.log(`- fetch_national_grants.ts（国のデータ用）`);
  console.log(`- fetch_prefecture_grants.ts（都道府県のデータ用）`);
}

findMissingUrls().catch(console.error);






