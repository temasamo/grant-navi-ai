/**
 * apps/web/scripts/fetch_city_grants.ts
 * 市町村の補助金・助成金データを公式サイトからスクレイピングしてCSVに保存
 * 山形県の主要市町村を対象
 */

// Node.js 18互換: Fileポリフィル
(globalThis as any).File = (globalThis as any).File || class File {};

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

// スクリプトの場所から相対的にdataディレクトリを取得
const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const OUTPUT_PATH = path.join(scriptDir, "..", "data", "fetched_city_yamagata.csv");

/**
 * URLからHTMLを取得（Node.js 18互換）
 */
async function fetchHTML(url: string): Promise<string> {
  try {
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
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; GrantNaviBot/1.0)',
          },
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
 * 山形県の主要市町村リストと公式サイトURL
 */
const YAMAGATA_CITIES = [
  { name: "山形市", baseUrl: "https://www.city.yamagata.yamagata.jp" },
  { name: "米沢市", baseUrl: "https://www.city.yonezawa.lg.jp" },
  { name: "鶴岡市", baseUrl: "https://www.city.tsuruoka.lg.jp" },
  { name: "酒田市", baseUrl: "https://www.city.sakata.lg.jp" },
  { name: "新庄市", baseUrl: "https://www.city.shinjo.yamagata.jp" },
  { name: "寒河江市", baseUrl: "https://www.city.sagae.yamagata.jp" },
  { name: "上山市", baseUrl: "https://www.city.kaminoyama.yamagata.jp" },
  { name: "村山市", baseUrl: "https://www.city.murayama.yamagata.jp" },
  { name: "長井市", baseUrl: "https://www.city.nagai.yamagata.jp" },
  { name: "天童市", baseUrl: "https://www.city.tendo.yamagata.jp" },
  { name: "東根市", baseUrl: "https://www.city.higashine.yamagata.jp" },
  { name: "尾花沢市", baseUrl: "https://www.city.obanazawa.yamagata.jp" },
  { name: "南陽市", baseUrl: "https://www.city.nanyo.yamagata.jp" },
  // 町
  { name: "山辺町", baseUrl: "https://www.town.yamanobe.yamagata.jp" },
  { name: "中山町", baseUrl: "https://www.town.nakayama.yamagata.jp" },
  { name: "河北町", baseUrl: "https://www.town.kahoku.yamagata.jp" },
  { name: "西川町", baseUrl: "https://www.town.nishikawa.yamagata.jp" },
  { name: "朝日町", baseUrl: "https://www.town.asahi.yamagata.jp" },
  { name: "大江町", baseUrl: "https://www.town.oe.yamagata.jp" },
  { name: "大石田町", baseUrl: "https://www.town.oishida.yamagata.jp" },
  { name: "金山町", baseUrl: "https://www.town.kaneyama.yamagata.jp" },
  { name: "最上町", baseUrl: "https://www.town.mogami.yamagata.jp" },
  { name: "舟形町", baseUrl: "https://www.town.funagata.yamagata.jp" },
  { name: "真室川町", baseUrl: "https://www.town.mamurogawa.yamagata.jp" },
  { name: "高畠町", baseUrl: "https://www.town.takahata.yamagata.jp" },
  { name: "川西町", baseUrl: "https://www.town.kawanishi.yamagata.jp" },
  { name: "小国町", baseUrl: "https://www.town.oguni.yamagata.jp" },
  { name: "白鷹町", baseUrl: "https://www.town.shirataka.yamagata.jp" },
  { name: "飯豊町", baseUrl: "https://www.town.iide.yamagata.jp" },
  { name: "庄内町", baseUrl: "https://www.town.shonai.yamagata.jp" },
  { name: "遊佐町", baseUrl: "https://www.town.yuza.yamagata.jp" },
  // 村
  { name: "大蔵村", baseUrl: "https://www.vill.okura.yamagata.jp" },
  { name: "鮭川村", baseUrl: "https://www.vill.sakegawa.yamagata.jp" },
  { name: "戸沢村", baseUrl: "https://www.vill.tozawa.yamagata.jp" },
];

/**
 * 市町村の補助金・助成金データを取得
 */
async function fetchCityGrants() {
  const results: any[] = [];
  const keywords = ["補助金", "助成金", "支援金", "奨励金"];

  console.log("🔍 山形県の市町村の補助金・助成金情報を取得中...\n");

  for (const city of YAMAGATA_CITIES) {
    try {
      console.log(`📡 ${city.name}の情報を取得中...`);

      // 一般的な補助金ページのURLパターンを試す
      const searchPaths = [
        "/",
        "/josei/",
        "/shoko/",
        "/kanko/",
        "/sangyo/",
        "/jigyo/",
      ];

      let found = false;

      for (const searchPath of searchPaths) {
        try {
          const url = `${city.baseUrl}${searchPath}`;
          const html = await fetchHTML(url);
          const $ = cheerio.load(html);

          $("a").each((_: number, el: any) => {
            const title = $(el).text().trim();
            const href = $(el).attr("href");
            if (!href || !title) return;

            // 補助金・助成金などのキーワードを含むリンクのみ抽出
            if (keywords.some((kw) => title.includes(kw))) {
              const fullUrl = normalizeUrl(href, city.baseUrl);
              
              // 重複チェック（同じタイトルとURLの組み合わせ）
              const isDuplicate = results.some(
                (r) => r.title === title && r.source_url === fullUrl
              );

              if (!isDuplicate) {
                results.push({
                  type: "補助金",
                  title,
                  description: `${city.name}の公式サイトより自動取得された補助金・助成金情報です。`,
                  organization: city.name,
                  level: "prefecture",
                  area_prefecture: "山形県",
                  area_city: city.name,
                  industry: "旅館業",
                  target_type: "法人",
                  max_amount: "",
                  subsidy_rate: "",
                  source_url: fullUrl,
                });
                found = true;
              }
            }
          });

          // 1つのパスで見つかれば次の市町村に進む（効率化）
          if (found) {
            break;
          }
        } catch (err) {
          // 個別のパスのエラーは無視して続行
          continue;
        }
      }

      if (!found) {
        console.log(`  ⚠️  ${city.name}から補助金情報が見つかりませんでした`);
      }

      // レート制限対策：少し待機
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`  ❌ ${city.name}の取得失敗:`, err instanceof Error ? err.message : String(err));
    }
  }

  console.log(`\n✅ ${results.length}件の市町村助成金を取得しました`);

  if (results.length === 0) {
    console.warn("⚠️  補助金リンクが見つかりませんでした。");
    return;
  }

  // CSV出力
  const header =
    "type,title,description,organization,level,area_prefecture,area_city,industry,target_type,max_amount,subsidy_rate,source_url\n";

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
        r.source_url,
      ].join(",")
    )
    .join("\n");

  fs.writeFileSync(OUTPUT_PATH, header + csv, "utf8");
  console.log(`📁 CSV出力完了: ${OUTPUT_PATH}`);

  // 取得結果の概要を表示
  const cityCounts = results.reduce((acc: Record<string, number>, item) => {
    acc[item.organization] = (acc[item.organization] || 0) + 1;
    return acc;
  }, {});

  console.log("\n📊 取得結果概要:");
  Object.entries(cityCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .forEach(([city, count]) => {
      console.log(`  ${city}: ${count}件`);
    });
}

fetchCityGrants()
  .then(() => console.log("🎉 市町村の補助金データ取得スクリプトが正常に完了しました。"))
  .catch((err) => {
    console.error("❌ エラー:", err);
    process.exit(1);
  });

