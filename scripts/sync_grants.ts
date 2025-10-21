import fs from "fs";
import csvParser from "csv-parser";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// .env.localファイルを読み込み
config({ path: ".env.local" });

// 環境変数の確認
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ 環境変数が設定されていません:");
  console.error("  NEXT_PUBLIC_SUPABASE_URL:", !!supabaseUrl);
  console.error("  SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY:", !!supabaseKey);
  process.exit(1);
}

// Supabaseクライアントを作成
const supabase = createClient(supabaseUrl, supabaseKey);

console.log("🔑 使用するキー:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "Service Role Key" : "ANON Key");

interface GrantRecord {
  type: string;
  title: string;
  description: string;
  organization: string;
  level: string;
  area_prefecture: string;
  area_city: string;
  industry: string;
  target_type: string;
  max_amount: string;
  subsidy_rate: string;
  source_url: string;
}

// 同期関数
async function syncGrants() {
  const csvFilePath = "apps/web/data/fetched_national_grants.csv"; // CSVファイルのパス
  const records: GrantRecord[] = [];

  // CSVファイルの存在確認
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ CSVファイルが見つかりません: ${csvFilePath}`);
    console.error("先に fetch_national_grants.js を実行してください");
    process.exit(1);
  }

  console.log(`📂 CSVを読み込み中: ${csvFilePath}`);

  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csvParser())
      .on("data", (row) => {
        // データの正規化
        const record: GrantRecord = {
          type: row.type || "",
          title: row.title || "",
          description: row.description || "",
          organization: row.organization || "",
          level: row.level || "national",
          area_prefecture: row.area_prefecture || "全国",
          area_city: row.area_city || "",
          industry: row.industry || "旅館業",
          target_type: row.target_type || "法人",
          max_amount: row.max_amount || "",
          subsidy_rate: row.subsidy_rate || "",
          source_url: row.source_url || "",
        };
        records.push(record);
      })
      .on("end", async () => {
        try {
          console.log(`📦 ${records.length} 件のデータをSupabaseへ同期開始...`);

          if (records.length === 0) {
            console.log("⚠️ 同期するデータがありません");
            resolve();
            return;
          }

          // Supabaseにinsert（重複チェックは事前に行う）
          const { data, error } = await supabase
            .from("grants")
            .insert(records);

          if (error) {
            console.error("❌ 同期エラー:", error.message);
            console.error("詳細:", error);
            reject(error);
          } else {
            console.log(`✅ Supabaseへ ${records.length} 件を同期完了！`);
            
            // 同期結果の詳細表示
            console.log("\n📊 同期結果概要:");
            const orgCounts = records.reduce((acc, item) => {
              acc[item.organization] = (acc[item.organization] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
            
            Object.entries(orgCounts).forEach(([org, count]) => {
              console.log(`  ${org}: ${count}件`);
            });
            
            resolve();
          }
        } catch (err) {
          console.error("❌ 予期しないエラー:", err);
          reject(err);
        }
      })
      .on("error", (err) => {
        console.error("❌ CSV読み込みエラー:", err);
        reject(err);
      });
  });
}

// メイン実行
async function main() {
  console.log("🚀 Supabase同期スクリプト開始");
  console.log("=".repeat(50));
  
  try {
    await syncGrants();
    console.log("=".repeat(50));
    console.log("🎉 同期処理が正常に完了しました");
  } catch (error) {
    console.log("=".repeat(50));
    console.error("💥 同期処理でエラーが発生しました");
    process.exit(1);
  }
}

// スクリプト実行
main();
