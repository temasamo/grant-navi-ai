/**
 * Supabase grantsテーブルの不正なURLを修正するスクリプト
 * - https://example.com を空文字列または組織に基づくデフォルトURLに置換
 * - javascript: を含むURLを削除
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 組織に基づくデフォルトURLマッピング
const defaultOrgUrls: Record<string, string> = {
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
};

function isValidUrl(url: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  
  const trimmed = url.trim();
  
  // 空文字列、example.com、javascript: を無効と判定
  if (!trimmed || 
      trimmed === 'https://example.com' || 
      trimmed === 'http://example.com' ||
      trimmed.startsWith('javascript:') ||
      trimmed.includes('javascript:')) {
    return false;
  }
  
  // http:// または https:// で始まらない場合は無効
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return false;
  }
  
  try {
    const urlObj = new URL(trimmed);
    if (!urlObj.hostname || urlObj.hostname === 'example.com') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function fixInvalidUrls() {
  console.log("🔍 不正なURLを検索中...\n");

  // 全てのgrantsを取得
  const { data: grants, error } = await supabase
    .from("grants")
    .select("id, title, url, organization");

  if (error) {
    console.error("❌ エラー:", error.message);
    return;
  }

  if (!grants || grants.length === 0) {
    console.log("✅ 修正対象のデータはありません");
    return;
  }

  console.log(`📊 総件数: ${grants.length}\n`);

  const updates: Array<{ id: number; url: string }> = [];
  let fixedCount = 0;

  for (const grant of grants) {
    const currentUrl = grant.url;
    
    if (!isValidUrl(currentUrl)) {
      // 組織に基づくデフォルトURLを取得
      const defaultUrl = grant.organization ? defaultOrgUrls[grant.organization] || '' : '';
      
      updates.push({
        id: grant.id,
        url: defaultUrl,
      });
      
      console.log(`⚠️  修正: ${grant.title.substring(0, 40)}...`);
      console.log(`   元のURL: ${currentUrl || '(NULL)'}`);
      console.log(`   新しいURL: ${defaultUrl || '(空文字列)'}\n`);
      fixedCount++;
    }
  }

  if (updates.length === 0) {
    console.log("✅ 修正対象のURLはありません");
    return;
  }

  console.log(`\n🔄 ${updates.length}件のURLを更新中...\n`);

  // バッチで更新（Supabaseの制限を考慮して10件ずつ）
  const batchSize = 10;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    
    for (const update of batch) {
      const { error: updateError } = await supabase
        .from("grants")
        .update({ url: update.url })
        .eq("id", update.id);

      if (updateError) {
        console.error(`❌ ID ${update.id} の更新エラー:`, updateError.message);
      }
    }
  }

  console.log(`✅ ${fixedCount}件のURLを修正しました`);
}

fixInvalidUrls().catch(console.error);







