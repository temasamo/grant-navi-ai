const fs = require("fs");
const path = require("path");
const https = require("https");

const OUTPUT_PATH = path.join(process.cwd(), "apps/web/data/fetched_pref_yamagata.csv");

/**
 * 山形県公式サイトから「補助金・助成金・支援金」を含むリンク情報を収集
 */
async function fetchYamagataPrefGrants() {
  const BASE_URL = "https://www.pref.yamagata.jp";
  const SEARCH_PAGES = [
    `${BASE_URL}/`,
    `${BASE_URL}/bunka/`,
    `${BASE_URL}/kenmin/`,
    `${BASE_URL}/sangyo/`,
    `${BASE_URL}/kanko/`,
  ];

  const keywords = ["補助金", "助成金", "支援金", "奨励金"];
  const results = [];

  console.log("🔍 山形県公式サイトの補助金情報を検索中...");

  for (const page of SEARCH_PAGES) {
    try {
      console.log(`📄 取得中: ${page}`);
      const html = await fetchPage(page);
      
      // デバッグ: HTMLの一部を表示
      console.log(`📄 HTML長: ${html.length}文字`);
      console.log(`📄 サンプル: ${html.substring(0, 500)}...`);
      
      // 簡単なHTMLパース（補助金・助成金を含むリンクを抽出）
      const linkMatches = html.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi);
      
      if (linkMatches) {
        linkMatches.forEach(match => {
          const hrefMatch = match.match(/href="([^"]*)"/);
          const titleMatch = match.match(/>([^<]*)</);
          
          if (hrefMatch && titleMatch) {
            const href = hrefMatch[1];
            const title = titleMatch[1].trim();
            
            // キーワードを含むタイトルのみを抽出
            if (keywords.some(keyword => title.includes(keyword))) {
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
          }
        });
      }
    } catch (err) {
      console.error(`⚠️ 取得失敗: ${page} - ${err.message}`);
    }
  }

  console.log(`✅ 抽出完了: ${results.length} 件`);

  if (results.length === 0) {
    console.warn("⚠️ 補助金リンクが見つかりませんでした。");
    return;
  }

  // CSV出力
  const header = "type,title,description,organization,level,area_prefecture,area_city,industry,target_type,max_amount,subsidy_rate,source_url\n";

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

  // データディレクトリを作成
  const dataDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, header + csv, "utf8");
  console.log(`📁 CSV出力完了: ${OUTPUT_PATH}`);
}

// HTTPSページを取得する関数
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      response.on('end', () => {
        resolve(data);
      });
    });
    
    request.on('error', (err) => {
      reject(err);
    });
    
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

fetchYamagataPrefGrants()
  .then(() => console.log("🎉 山形県の補助金データ取得スクリプトが正常に完了しました。"))
  .catch((err) => console.error("❌ エラー:", err));
