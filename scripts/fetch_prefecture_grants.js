const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const axios = require("axios");

const OUTPUT_PATH = path.join(process.cwd(), "apps/web/data/fetched_pref_yamagata.csv");

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
  const results = [];

  console.log("🔍 山形県公式サイトの補助金情報を検索中...");

  for (const page of SEARCH_PAGES) {
    try {
      const response = await axios.get(page, { timeout: 10000 });
      const $ = cheerio.load(response.data);

      $("a").each((_, el) => {
        const title = $(el).text().trim();
        const href = $(el).attr("href");
        if (!href || !title) return;

        // 補助金・助成金などのキーワードを含むリンクのみ抽出
        if (keywords.some((kw) => title.includes(kw))) {
          const url = href.startsWith("http") ? href : `${BASE_URL}${href}`;
          results.push({
            type: "補助金",
            title,
            description: "山形県の公式サイトより自動取得された補助金・助成金情報です。",
            organization: "山形県",
            level: "prefecture",
            area_prefecture: "山形県",
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
      console.error(`⚠️ 取得失敗: ${page}`);
    }
  }

  console.log(`✅ 抽出完了: ${results.length} 件`);

  if (results.length === 0) {
    console.warn("⚠️ 補助金リンクが見つかりませんでした。");
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
}

fetchYamagataPrefGrants()
  .then(() => console.log("🎉 山形県の補助金データ取得スクリプトが正常に完了しました。"))
  .catch((err) => console.error("❌ エラー:", err));
