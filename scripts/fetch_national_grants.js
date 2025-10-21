const https = require('https');
const http = require('http');
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');

// 簡単なHTMLパーサー
function parseHTML(html) {
  const links = [];
  const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi;
  let match;
  
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const title = match[2].trim();
    
    if (title && href && (title.includes('補助') || title.includes('助成') || title.includes('支援'))) {
      links.push({ title, href });
    }
  }
  
  return links;
}

// URLからHTMLを取得
function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// URLを正規化
function normalizeUrl(url, baseUrl) {
  if (url.startsWith('http')) {
    return url;
  }
  
  if (url.startsWith('/')) {
    const base = new URL(baseUrl);
    return `${base.protocol}//${base.host}${url}`;
  }
  
  return `${baseUrl}${url}`;
}

async function fetchNationalGrants() {
  const results = [];
  
  console.log('🔍 全国レベルの補助金・助成金情報を取得中...');
  
  try {
    // 1️⃣ 観光庁
    console.log('📡 観光庁の情報を取得中...');
    const kankoHtml = await fetchHTML('https://www.mlit.go.jp/kankocho/');
    const kankoLinks = parseHTML(kankoHtml);
    
    kankoLinks.forEach(link => {
      const fullUrl = normalizeUrl(link.href, 'https://www.mlit.go.jp');
      results.push({
        type: '補助金',
        title: link.title,
        description: '観光庁公式サイトより取得',
        organization: '観光庁',
        level: 'national',
        area_prefecture: '全国',
        area_city: '',
        industry: '旅館業',
        target_type: '法人',
        max_amount: '',
        subsidy_rate: '',
        source_url: fullUrl,
      });
    });
    
    // 2️⃣ 厚生労働省
    console.log('📡 厚生労働省の情報を取得中...');
    const mhlwHtml = await fetchHTML('https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/index.html');
    const mhlwLinks = parseHTML(mhlwHtml);
    
    mhlwLinks.forEach(link => {
      const fullUrl = normalizeUrl(link.href, 'https://www.mhlw.go.jp');
      results.push({
        type: '助成金',
        title: link.title,
        description: '厚生労働省公式サイトより取得',
        organization: '厚生労働省',
        level: 'national',
        area_prefecture: '全国',
        area_city: '',
        industry: '旅館業',
        target_type: '法人',
        max_amount: '',
        subsidy_rate: '',
        source_url: fullUrl,
      });
    });
    
    // 3️⃣ jGrants
    console.log('📡 jGrantsポータルの情報を取得中...');
    const jgrantsHtml = await fetchHTML('https://www.jgrants-portal.go.jp/');
    const jgrantsLinks = parseHTML(jgrantsHtml);
    
    jgrantsLinks.forEach(link => {
      const fullUrl = normalizeUrl(link.href, 'https://www.jgrants-portal.go.jp');
      results.push({
        type: '補助金',
        title: link.title,
        description: 'jGrantsポータルより取得',
        organization: 'jGrants',
        level: 'national',
        area_prefecture: '全国',
        area_city: '',
        industry: '旅館業',
        target_type: '法人',
        max_amount: '',
        subsidy_rate: '',
        source_url: fullUrl,
      });
    });
    
    // 重複除去
    const uniqueResults = results.filter((item, index, self) => 
      index === self.findIndex(t => t.title === item.title && t.source_url === item.source_url)
    );
    
    // CSV出力
    if (uniqueResults.length > 0) {
      // ディレクトリが存在しない場合は作成
      const dataDir = './data';
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const csvWriter = createObjectCsvWriter({
        path: './data/fetched_national_grants.csv',
        header: [
          { id: 'type', title: 'type' },
          { id: 'title', title: 'title' },
          { id: 'description', title: 'description' },
          { id: 'organization', title: 'organization' },
          { id: 'level', title: 'level' },
          { id: 'area_prefecture', title: 'area_prefecture' },
          { id: 'area_city', title: 'area_city' },
          { id: 'industry', title: 'industry' },
          { id: 'target_type', title: 'target_type' },
          { id: 'max_amount', title: 'max_amount' },
          { id: 'subsidy_rate', title: 'subsidy_rate' },
          { id: 'source_url', title: 'source_url' }
        ],
      });
      
      await csvWriter.writeRecords(uniqueResults);
      console.log(`✅ ${uniqueResults.length}件の全国助成金を取得しました`);
      console.log(`📁 出力ファイル: ./data/fetched_national_grants.csv`);
      
      // 取得結果の概要を表示
      const orgCounts = uniqueResults.reduce((acc, item) => {
        acc[item.organization] = (acc[item.organization] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\n📊 取得結果概要:');
      Object.entries(orgCounts).forEach(([org, count]) => {
        console.log(`  ${org}: ${count}件`);
      });
      
    } else {
      console.log('⚠️ 対象データが見つかりませんでした');
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

// スクリプト実行
fetchNationalGrants();
