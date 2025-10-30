import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getGrantStats() {
  // 全件数取得
  const { count: totalToday } = await supabase
    .from("grants")
    .select("*", { count: "exact", head: true });

  // Source別集計（PostgRESTの正しい構文）
  const { data: allGrants } = await supabase
    .from("grants")
    .select("source");

  // クライアント側で集計
  const groupedToday = allGrants?.reduce((acc: any, grant: any) => {
    const source = grant.source || "unknown";
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  // 配列形式に変換
  const groupedArray = Object.entries(groupedToday || {}).map(([source, count]) => ({
    source,
    count: count as number
  }));

  // 昨日の件数（updated_at 基準）
  const { count: yesterdayCount } = await supabase
    .from("grants")
    .select("*", { count: "exact", head: true })
    .lt("updated_at", new Date().toISOString())
    .gte("updated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  return {
    totalToday: totalToday ?? 0,
    groupedToday: groupedArray,
    yesterdayCount: yesterdayCount ?? 0,
    diff: (totalToday ?? 0) - (yesterdayCount ?? 0),
  };
}
