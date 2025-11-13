/**
 * apps/web/scripts/fetch_national_grants.ts
 * 国の補助金・助成金データを公式サイトからスクレイピングしてCSVに保存
 */

// Node.js 18互換: Fileポリフィル（モジュール読み込み前に設定）
(globalThis as any).File = (globalThis as any).File || class File {};

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

// スクリプトの場所から相対的にdataディレクトリを取得
const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const OUTPUT_PATH = path.join(scriptDir, "..", "data", "fetched_national_grants.csv");

/**
 * URLからHTMLを取得（Node.js 18互換）
 */
async function fetchHTML(url: string): Promise<string> {
  try {
    // Node.js 18互換: fetchの代わりにhttps/httpモジュールを使用
    const https = require("https");
    const http = require("http");
    const { URL } = require("url");

    return new Promise((resolve, reject) => {
      const client = url.startsWith("https:") ? https : http;
      const urlObj = new URL(url);

      const req = client.get(
        {
          hostname: urlObj.hostname,
          path: urlObj.pathname + urlObj.search,
          timeout: 15000,
        },
        (res: any) => {
          let data = "";

          res.on("data", (chunk: Buffer) => {
            data += chunk.toString();
          });

          res.on("end", () => {
            resolve(data);
          });
        }
      );

      req.on("error", (err: Error) => {
        reject(err);
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new Error(`タイムアウト: ${url}`));
      });
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`取得エラー: ${url}`);
  }
}

/**
 * URLを正規化（相対URLを絶対URLに変換）
 */
function normalizeUrl(url: string, baseUrl: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("/")) {
    const base = new URL(baseUrl);
    return `${base.protocol}//${base.host}${url}`;
  }

  return `${baseUrl}/${url}`;
}

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
    const html = await fetchHTML(url);
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
 * 国の補助金・助成金データを取得
 */
async function fetchNationalGrants() {
  const results: any[] = [];
  const keywords = ["補助金", "助成金", "支援金", "奨励金"];

  console.log("🔍 全国レベルの補助金・助成金情報を取得中...\n");

  try {
    // 1️⃣ 観光庁
    console.log("📡 観光庁の情報を取得中...");
    try {
      const kankoHtml = await fetchHTML("https://www.mlit.go.jp/kankocho/");
      const $kanko = cheerio.load(kankoHtml);

      // リンクを収集してから処理（非同期処理のため）
      const kankoLinks: Array<{ title: string; href: string }> = [];
      $kanko("a").each((_: number, el: any) => {
        const title = $kanko(el).text().trim();
        const href = $kanko(el).attr("href");
        if (!href || !title) return;

        if (keywords.some((kw) => title.includes(kw))) {
          kankoLinks.push({ title, href });
        }
      });

      // 各リンクを処理（非同期対応）
      for (const link of kankoLinks) {
        const detailUrl = normalizeUrl(link.href, "https://www.mlit.go.jp");
        const listPageUrl = "https://www.mlit.go.jp/kankocho/"; // スクレイピングした一覧ページのURL
        
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
          description: "観光庁公式サイトより取得",
          organization: "観光庁",
          level: "national",
          area_prefecture: "全国",
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
      console.error(`⚠️  観光庁の取得失敗:`, err);
    }

    // 2️⃣ 厚生労働省
    console.log("📡 厚生労働省の情報を取得中...");
    try {
      const mhlwHtml = await fetchHTML(
        "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/index.html"
      );
      const $mhlw = cheerio.load(mhlwHtml);

      // リンクを収集してから処理（非同期処理のため）
      const mhlwLinks: Array<{ title: string; href: string }> = [];
      $mhlw("a").each((_: number, el: any) => {
        const title = $mhlw(el).text().trim();
        const href = $mhlw(el).attr("href");
        if (!href || !title) return;

        if (keywords.some((kw) => title.includes(kw))) {
          mhlwLinks.push({ title, href });
        }
      });

      // 各リンクを処理（非同期対応）
      for (const link of mhlwLinks) {
        const detailUrl = normalizeUrl(link.href, "https://www.mhlw.go.jp");
        const listPageUrl = "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/index.html"; // スクレイピングした一覧ページのURL
        
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
          type: "助成金",
          title: finalTitle,
          description: "厚生労働省公式サイトより取得",
          organization: "厚生労働省",
          level: "national",
          area_prefecture: "全国",
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
      console.error(`⚠️  厚生労働省の取得失敗:`, err);
    }

    // 3️⃣ 経済産業省（中小企業庁）
    console.log("📡 経済産業省（中小企業庁）の情報を取得中...");
    try {
      const metiHtml = await fetchHTML("https://www.chusho.meti.go.jp/");
      const $meti = cheerio.load(metiHtml);

      // リンクを収集してから処理（非同期処理のため）
      const metiLinks: Array<{ title: string; href: string }> = [];
      $meti("a").each((_: number, el: any) => {
        const title = $meti(el).text().trim();
        const href = $meti(el).attr("href");
        if (!href || !title) return;

        if (keywords.some((kw) => title.includes(kw))) {
          metiLinks.push({ title, href });
        }
      });

      // 各リンクを処理（非同期対応）
      for (const link of metiLinks) {
        const detailUrl = normalizeUrl(link.href, "https://www.chusho.meti.go.jp");
        const listPageUrl = "https://www.chusho.meti.go.jp/"; // スクレイピングした一覧ページのURL
        
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
          description: "経済産業省（中小企業庁）公式サイトより取得",
          organization: "経済産業省",
          level: "national",
          area_prefecture: "全国",
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
      console.error(`⚠️  経済産業省の取得失敗:`, err);
    }

    // 重複除去（title + source_url）
    const uniqueResults = results.filter(
      (item, index, self) =>
        index ===
        self.findIndex(
          (t) => t.title === item.title && t.source_url === item.source_url
        )
    );

    console.log(`\n✅ ${uniqueResults.length}件の全国助成金を取得しました`);

    if (uniqueResults.length === 0) {
      console.warn("⚠️  補助金リンクが見つかりませんでした。");
      return;
    }

    // CSV出力（urlとsource_urlを分離）
    const header =
      "type,title,description,organization,level,area_prefecture,area_city,industry,target_type,max_amount,subsidy_rate,url,source_url\n";

    const csv = uniqueResults
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

    // 取得結果の概要を表示
    const orgCounts = uniqueResults.reduce((acc: Record<string, number>, item) => {
      acc[item.organization] = (acc[item.organization] || 0) + 1;
      return acc;
    }, {});

    console.log("\n📊 取得結果概要:");
    Object.entries(orgCounts).forEach(([org, count]) => {
      console.log(`  ${org}: ${count}件`);
    });
  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
    throw error;
  }
}

fetchNationalGrants()
  .then(() => console.log("🎉 国の補助金データ取得スクリプトが正常に完了しました。"))
  .catch((err) => {
    console.error("❌ エラー:", err);
    process.exit(1);
  });
