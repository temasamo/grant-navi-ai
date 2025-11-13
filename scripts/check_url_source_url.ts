import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUrlAndSourceUrl() {
  console.log("🔍 urlとsource_urlの実際のデータを確認中...\n");

  // 最新10件を取得（urlとsource_urlの両方を含む）
  const { data, error } = await supabase
    .from("grants")
    .select("id, title, url, source_url, level, area_prefecture, area_city")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("❌ エラー:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log("⚠️ データがありません");
    return;
  }

  console.log(`📊 最新10件のデータ:\n`);

  data.forEach((grant, index) => {
    console.log(`${index + 1}. ID: ${grant.id}`);
    console.log(`   タイトル: ${grant.title.substring(0, 50)}...`);
    console.log(`   url: ${grant.url || "(NULL)"}`);
    console.log(`   source_url: ${grant.source_url || "(NULL)"}`);
    console.log(`   レベル: ${grant.level === "national" ? "国" : grant.area_prefecture || "都道府県"}`);
    if (grant.area_city) {
      console.log(`   市区町村: ${grant.area_city}`);
    }
    console.log("");
  });

  // 統計
  const { count: total } = await supabase
    .from("grants")
    .select("*", { count: "exact", head: true });

  const { count: hasUrl } = await supabase
    .from("grants")
    .select("*", { count: "exact", head: true })
    .not("url", "is", null)
    .neq("url", "")
    .neq("url", "https://example.com");

  const { count: hasSourceUrl } = await supabase
    .from("grants")
    .select("*", { count: "exact", head: true })
    .not("source_url", "is", null)
    .neq("source_url", "");

  console.log("\n📈 統計:");
  console.log(`   総件数: ${total}`);
  console.log(`   urlあり: ${hasUrl}`);
  console.log(`   source_urlあり: ${hasSourceUrl}`);
}

checkUrlAndSourceUrl().catch(console.error);

