/**
 * 不正なURLの内訳を分析するスクリプト
 * 国、県、市町村別に分類
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function isInvalidUrl(url: string | null): boolean {
  if (!url || typeof url !== 'string') return true;
  
  const trimmed = url.trim();
  
  if (!trimmed || 
      trimmed === 'https://example.com' || 
      trimmed === 'http://example.com' ||
      trimmed.startsWith('javascript:') ||
      trimmed.includes('javascript:')) {
    return true;
  }
  
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return true;
  }
  
  try {
    const urlObj = new URL(trimmed);
    if (!urlObj.hostname || urlObj.hostname === 'example.com') {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

async function analyzeInvalidUrls() {
  console.log("🔍 不正なURLの内訳を分析中...\n");

  // 全てのgrantsを取得
  const { data: grants, error } = await supabase
    .from("grants")
    .select("id, title, url, organization, level, area_prefecture");

  if (error) {
    console.error("❌ エラー:", error.message);
    return;
  }

  if (!grants || grants.length === 0) {
    console.log("✅ データがありません");
    return;
  }

  console.log(`📊 総件数: ${grants.length}\n`);

  // 分類用のマップ
  const invalidByCategory: {
    national: Array<{ title: string; url: string | null; organization: string | null }>;
    prefecture: Array<{ title: string; url: string | null; organization: string | null }>;
    city: Array<{ title: string; url: string | null; organization: string | null }>;
  } = {
    national: [],
    prefecture: [],
    city: [],
  };

  for (const grant of grants) {
    const currentUrl = grant.url;
    
    if (isInvalidUrl(currentUrl)) {
      const entry = {
        title: grant.title,
        url: currentUrl,
        organization: grant.organization,
      };

      // レベル別に分類
      if (grant.level === 'national') {
        invalidByCategory.national.push(entry);
      } else {
        // タイトルと組織名から市町村を判定
        const title = grant.title || '';
        const org = grant.organization || '';
        const area = grant.area_prefecture || '';
        
        // 市町村のパターン（タイトルまたは組織名に含まれる）
        const isCity = /[^県都府]市|町|村/.test(title) || /[^県都府]市|町|村/.test(org);
        
        if (isCity) {
          invalidByCategory.city.push(entry);
        } else {
          invalidByCategory.prefecture.push(entry);
        }
      }
    }
  }

  // 結果を表示
  console.log("📈 不正なURLの内訳:\n");
  console.log(`🔴 国: ${invalidByCategory.national.length}件`);
  if (invalidByCategory.national.length > 0) {
    invalidByCategory.national.forEach((g, i) => {
      console.log(`   ${i + 1}. ${g.title.substring(0, 40)}...`);
      console.log(`      URL: ${g.url || '(NULL)'}`);
      console.log(`      組織: ${g.organization || '(不明)'}`);
    });
  }

  console.log(`\n🔵 都道府県: ${invalidByCategory.prefecture.length}件`);
  if (invalidByCategory.prefecture.length > 0) {
    invalidByCategory.prefecture.forEach((g, i) => {
      console.log(`   ${i + 1}. ${g.title.substring(0, 40)}...`);
      console.log(`      URL: ${g.url || '(NULL)'}`);
      console.log(`      組織: ${g.organization || '(不明)'}`);
    });
  }

  console.log(`\n🟢 市町村: ${invalidByCategory.city.length}件`);
  if (invalidByCategory.city.length > 0) {
    invalidByCategory.city.forEach((g, i) => {
      console.log(`   ${i + 1}. ${g.title.substring(0, 40)}...`);
      console.log(`      URL: ${g.url || '(NULL)'}`);
      console.log(`      組織: ${g.organization || '(不明)'}`);
    });
  }

  console.log(`\n📊 合計: ${invalidByCategory.national.length + invalidByCategory.prefecture.length + invalidByCategory.city.length}件`);
}

analyzeInvalidUrls().catch(console.error);

