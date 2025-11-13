/**
 * source_urlがNULLのデータを確認
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMissingSourceUrl() {
  console.log("🔍 source_urlがNULLのデータを確認中...\n");

  const { data, error } = await supabase
    .from("grants")
    .select("id, title, url, source_url, source_type, created_at")
    .is("source_url", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("❌ エラー:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log("✅ source_urlがNULLのデータはありません");
    return;
  }

  console.log(`📊 source_urlがNULLのデータ: ${data.length}件\n`);

  // urlがあるデータとないデータに分類
  const withUrl = data.filter((g) => g.url && g.url.trim() !== "" && g.url !== "https://example.com");
  const withoutUrl = data.filter((g) => !g.url || g.url.trim() === "" || g.url === "https://example.com");

  console.log(`  URLがあるデータ: ${withUrl.length}件（source_urlに設定可能）`);
  console.log(`  URLがないデータ: ${withoutUrl.length}件\n`);

  if (withUrl.length > 0) {
    console.log("📋 URLがあるデータ（source_urlに設定可能）:\n");
    withUrl.slice(0, 10).forEach((g, i) => {
      const created = g.created_at ? new Date(g.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : "不明";
      console.log(`  ${i + 1}. ID: ${g.id}`);
      console.log(`     タイトル: ${g.title.substring(0, 50)}...`);
      console.log(`     URL: ${g.url}`);
      console.log(`     source_type: ${g.source_type || "(なし)"}`);
      console.log(`     作成: ${created}`);
      console.log("");
    });
    if (withUrl.length > 10) {
      console.log(`  ...他 ${withUrl.length - 10}件`);
    }
  }

  if (withoutUrl.length > 0) {
    console.log("\n📋 URLがないデータ:\n");
    withoutUrl.slice(0, 5).forEach((g, i) => {
      const created = g.created_at ? new Date(g.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : "不明";
      console.log(`  ${i + 1}. ID: ${g.id}`);
      console.log(`     タイトル: ${g.title.substring(0, 50)}...`);
      console.log(`     source_type: ${g.source_type || "(なし)"}`);
      console.log(`     作成: ${created}`);
      console.log("");
    });
    if (withoutUrl.length > 5) {
      console.log(`  ...他 ${withoutUrl.length - 5}件`);
    }
  }
}

checkMissingSourceUrl().catch(console.error);

