const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
// Node.js v18以降ではfetchがグローバルに利用可能

const OUTPUT_PATH = path.join(process.cwd(), "apps/web/data/fetched_pref_yamagata.csv");

/**
 * 汎用的なタイトルかどうかを判定
 */
function isGenericTitle(title: string): boolean {
  const trimmed = title.trim();
  
  // 短すぎるタイトル（3文字以下）
  if (trimmed.length <= 3) {
    return true;
  }
  
  // 汎用的なタイトルパターン
  const genericPatterns = [
    /^補助金$/,
    /^助成金$/,
    /^支援金$/,
    /^奨励金$/,
    /^補助金一覧$/,
    /^助成金一覧$/,
    /^支援金一覧$/,
    /^一覧$/,
    /^助成金・補助金$/,
    /^補助金・助成金$/,
    /^詳しく見る$/,
    /^続きを読む$/,
    /^こちら$/,
    /^詳細$/,
    /^more$/i,
    /^link$/i,
  ];
  
  return genericPatterns.some(pattern => pattern.test(trimmed));
}

/**
 * 詳細ページからタイトルを取得（h1 > title の順で試す）
 */
async function fetchTitleFromDetailPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // 1. h1タグから取得を試みる
    const h1 = $("h1").first().text().trim();
    if (h1 && h1.length > 3 && !isGenericTitle(h1)) {
      return h1;
    }
    
    // 2. titleタグから取得を試みる
    const title = $("title").text().trim();
    if (title && title.length > 3 && !isGenericTitle(title)) {
      // titleタグから不要な部分を除去（例: " | サイト名"）
      const cleaned = title.split("|")[0].split("｜")[0].trim();
      if (cleaned.length > 3 && !isGenericTitle(cleaned)) {
        return cleaned;
      }
    }
    
    // 3. 見出しタグ（h2, h3）から取得を試みる
    const headings = $("h2, h3").first().text().trim();
    if (headings && headings.length > 3 && !isGenericTitle(headings)) {
      return headings;
    }
    
    return null;
  } catch (error) {
    console.error(`  ⚠️  詳細ページの取得失敗: ${url}`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * 山形県公式サイトから「補助金・助成金・支援金」を含むリンク情報を収集
 */
async function fetchYamagataPrefGrants() {
  const BASE_URL = "https://www.pref.yamagata.jp";
  const SEARCH_PAGES = [
    `${BASE_URL}/090001/industry/`,
    `${BASE_URL}/090002/tourism/`,
    `${BASE_URL}/090003/sme/`,
    `${BASE_URL}/090004/agriculture/`,
    `${BASE_URL}/090005/labor/`,
  ];

  const keywords = ["補助金", "助成金", "支援金", "奨励金"];
  const results: any[] = [];

  console.log("🔍 山形県公式サイトの補助金情報を検索中...");

  for (const page of SEARCH_PAGES) {
    try {
      // AbortControllerを使用してタイムアウトを実装
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(page, { signal: controller.signal });
      clearTimeout(timeoutId);
      const html = await response.text();
      const $ = cheerio.load(html);

      // リンクを収集してから処理（非同期処理のため）
      const links: Array<{ title: string; href: string }> = [];
      $("a").each((_: number, el: any) => {
        const title = $(el).text().trim();
        const href = $(el).attr("href");
        if (!href || !title) return;

        // 補助金・助成金などのキーワードを含むリンクのみ抽出
        if (keywords.some((kw) => title.includes(kw))) {
          links.push({ title, href });
        }
      });

      // 各リンクを処理（非同期対応）
      for (const link of links) {
        const detailUrl = link.href.startsWith("http") ? link.href : `${BASE_URL}${link.href}`;
        const listPageUrl = page; // スクレイピングした一覧ページのURL
        
        // タイトルが汎用的な場合は詳細ページから取得を試みる
        let finalTitle = link.title;
        if (isGenericTitle(link.title)) {
          console.log(`  🔍 汎用タイトルを検出: "${link.title}" → 詳細ページから取得を試みます`);
          const detailTitle = await fetchTitleFromDetailPage(detailUrl);
          if (detailTitle) {
            finalTitle = detailTitle;
            console.log(`  ✅ 詳細ページから取得: "${finalTitle}"`);
          } else {
            console.log(`  ⚠️  詳細ページからタイトルを取得できませんでした。スキップします。`);
            continue; // スキップ
          }
        }
        
        results.push({
          type: "補助金",
          title: finalTitle,
          description: "山形県の公式サイトより自動取得された補助金・助成金情報です。",
          organization: "山形県",
          level: "prefecture",
          area_prefecture: "山形県",
          area_city: "",
          industry: "旅館業",
          target_type: "法人",
          max_amount: "",
          subsidy_rate: "",
          url: detailUrl, // 詳細ページのURL
          source_url: listPageUrl, // スクレイピングした一覧ページのURL
        });
        
        // レート制限対策：少し待機
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } catch (err) {
      console.error(`⚠️ 取得失敗: ${page}`);
    }
  }

  console.log(`✅ 抽出完了: ${results.length} 件`);

  if (results.length === 0) {
    console.warn("⚠️ 補助金リンクが見つかりませんでした。");
    return;
  }

  // CSV出力（urlとsource_urlを分離）
  const header =
    "type,title,description,organization,level,area_prefecture,area_city,industry,target_type,max_amount,subsidy_rate,url,source_url\n";

  const csv = results
    .map((r) =>
      [
        r.type,
        `"${r.title.replace(/"/g, '""')}"`,
        `"${r.description.replace(/"/g, '""')}"`,
        r.organization,
        r.level,
        r.area_prefecture,
        r.area_city,
        r.industry,
        r.target_type,
        r.max_amount,
        r.subsidy_rate,
        r.url || "", // 詳細ページのURL
        r.source_url || "", // スクレイピングした一覧ページのURL
      ].join(",")
    )
    .join("\n");

  fs.writeFileSync(OUTPUT_PATH, header + csv, "utf8");
  console.log(`📁 CSV出力完了: ${OUTPUT_PATH}`);
}

fetchYamagataPrefGrants()
  .then(() => console.log("🎉 山形県の補助金データ取得スクリプトが正常に完了しました。"))
  .catch((err) => console.error("❌ エラー:", err));
