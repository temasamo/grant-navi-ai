/**
 * Supabase grantsテーブルのURL確認スクリプト
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUrls() {
  console.log("🔍 Supabase grantsテーブルのURLを確認中...\n");

  // 最新10件を取得
  const { data, error } = await supabase
    .from("grants")
    .select("id, title, url, level, area_prefecture")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("❌ エラー:", error.message);
    return;
  }

  console.log("📊 最新10件のURL状況:\n");
  data?.forEach((grant, index) => {
    const hasUrl = grant.url && grant.url !== "https://example.com" && grant.url.trim() !== "";
    const status = hasUrl ? "✅" : "❌";
    console.log(`${index + 1}. ${status} ${grant.title.substring(0, 30)}...`);
    console.log(`   URL: ${grant.url || "(NULL)"}`);
    console.log(`   出所: ${grant.level === "national" ? "国" : grant.area_prefecture || "不明"}\n`);
  });

  // URL統計
  const { count: total } = await supabase
    .from("grants")
    .select("*", { count: "exact", head: true });

  const { count: hasUrl } = await supabase
    .from("grants")
    .select("*", { count: "exact", head: true })
    .not("url", "is", null)
    .neq("url", "https://example.com")
    .neq("url", "");

  console.log("\n📈 URL統計:");
  console.log(`   総件数: ${total}`);
  console.log(`   有効なURLがある件数: ${hasUrl}`);
  console.log(`   URLなし/NULL/example.com: ${(total || 0) - (hasUrl || 0)}`);
}

checkUrls().catch(console.error);






