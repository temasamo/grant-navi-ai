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

      $kanko("a").each((_, el) => {
        const title = $kanko(el).text().trim();
        const href = $kanko(el).attr("href");
        if (!href || !title) return;

        if (keywords.some((kw) => title.includes(kw))) {
          const url = normalizeUrl(href, "https://www.mlit.go.jp");
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
            source_url: url,
          });
        }
      });
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

      $mhlw("a").each((_, el) => {
        const title = $mhlw(el).text().trim();
        const href = $mhlw(el).attr("href");
        if (!href || !title) return;

        if (keywords.some((kw) => title.includes(kw))) {
          const url = normalizeUrl(href, "https://www.mhlw.go.jp");
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
            source_url: url,
          });
        }
      });
    } catch (err) {
      console.error(`⚠️  厚生労働省の取得失敗:`, err);
    }

    // 3️⃣ 経済産業省（中小企業庁）
    console.log("📡 経済産業省（中小企業庁）の情報を取得中...");
    try {
      const metiHtml = await fetchHTML("https://www.chusho.meti.go.jp/");
      const $meti = cheerio.load(metiHtml);

      $meti("a").each((_, el) => {
        const title = $meti(el).text().trim();
        const href = $meti(el).attr("href");
        if (!href || !title) return;

        if (keywords.some((kw) => title.includes(kw))) {
          const url = normalizeUrl(href, "https://www.chusho.meti.go.jp");
          results.push({
            type: "補助金",
            title,
            description: "経済産業省（中小企業庁）公式サイトより取得",
            organization: "経済産業省",
            level: "national",
            area_prefecture: "全国",
            area_city: "",
            industry: "旅館業",
            target_type: "法人",
            max_amount: "",
            subsidy_rate: "",
            source_url: url,
          });
        }
      });
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

    // CSV出力
    const header =
      "type,title,description,organization,level,area_prefecture,area_city,industry,target_type,max_amount,subsidy_rate,source_url\n";

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
          r.source_url,
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
