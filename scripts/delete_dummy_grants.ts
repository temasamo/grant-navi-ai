/**
 * ダミーデータ（可能性大）を一括削除
 * 基準:
 *  - 2025-10-21に一括作成（テストデータの可能性）
 *  - タイトルが明らかにダミー（"title" 等）
 *  - URLが無効またはNULL かつ スクレイピングCSVに存在しない
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function isValidUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "https://example.com" || trimmed.startsWith("javascript:")) return false;
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return false;
  try {
    const u = new URL(trimmed);
    return !!u.hostname && u.hostname !== "example.com";
  } catch {
    return false;
  }
}

async function loadScrapedTitles(): Promise<Set<string>> {
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const files = [
    path.join(scriptDir, "..", "data", "fetched_national_grants.csv"),
    path.join(scriptDir, "..", "data", "fetched_pref_yamagata.csv"),
    path.join(scriptDir, "..", "data", "fetched_city_yamagata.csv"),
  ];
  const set = new Set<string>();
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    const csv = fs.readFileSync(f, "utf-8");
    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
    (parsed.data as any[]).forEach((row) => {
      const t = (row.title || "").replace(/^"+|"+$/g, "").trim();
      if (t) set.add(t);
    });
  }
  return set;
}

async function main() {
  console.log("🧹 ダミーデータの削除を開始します...\n");

  const scrapedTitles = await loadScrapedTitles();
  console.log(`📚 スクレイピング済みタイトル: ${scrapedTitles.size}件`);

  const { data: all, error } = await supabase
    .from("grants")
    .select("id, title, url, created_at");
  if (error) throw error;

  const toDelete: number[] = [];

  (all || []).forEach((g) => {
    const title = (g.title || "").replace(/^"+|"+$/g, "").trim();
    const created = g.created_at?.substring(0, 10);
    const urlValid = isValidUrl(g.url);
    const inScraped = scrapedTitles.has(title);

    let dummy = false;
    if (title === "title" || title.length < 3) dummy = true;
    else if (created === "2025-10-21") dummy = true;
    else if (!urlValid && !inScraped) dummy = true;

    if (dummy) toDelete.push(g.id as number);
  });

  console.log(`🗑️ 削除対象: ${toDelete.length}件`);
  if (toDelete.length === 0) {
    console.log("✅ 削除対象はありませんでした");
    return;
  }

  const { error: delErr } = await supabase.from("grants").delete().in("id", toDelete);
  if (delErr) throw delErr;

  console.log(`✅ 削除完了: ${toDelete.length}件 削除しました`);
}

main().catch((e) => {
  console.error("❌ エラー:", e.message || e);
  process.exit(1);
});






