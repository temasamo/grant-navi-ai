/**
 * ID 220-231の市町村データのURLを確認
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCityUrls() {
  console.log("🔍 ID 220-231の市町村データのURLを確認中...\n");

  const { data: grants, error } = await supabase
    .from("grants")
    .select("id, title, organization, url, level, area_prefecture, area_city, created_at")
    .in("id", [220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231])
    .order("id", { ascending: true });

  if (error) {
    console.error("❌ エラー:", error.message);
    return;
  }

  if (!grants || grants.length === 0) {
    console.log("⚠️ データがありません");
    return;
  }

  console.log(`📊 該当データ: ${grants.length}件\n`);

  grants.forEach((grant) => {
    const cleanTitle = (grant.title || "").replace(/^"+|"+$/g, "").trim();
    console.log(`ID ${grant.id}: ${cleanTitle.substring(0, 50)}...`);
    console.log(`  組織: ${grant.organization || "(なし)"}`);
    console.log(`  URL: ${grant.url || "(NULL)"}`);
    console.log(`  level: ${grant.level || "(なし)"}`);
    console.log(`  area_prefecture: ${grant.area_prefecture || "(なし)"}`);
    console.log(`  area_city: ${grant.area_city || "(なし)"}`);
    console.log(`  作成: ${grant.created_at?.substring(0, 10)}`);
    console.log("");
  });

  // URLがあるデータとないデータを分類
  const withUrl = grants.filter((g) => g.url && g.url.trim() !== "");
  const withoutUrl = grants.filter((g) => !g.url || g.url.trim() === "");

  console.log(`✅ URLあり: ${withUrl.length}件`);
  console.log(`❌ URLなし: ${withoutUrl.length}件`);
}

checkCityUrls().catch(console.error);

