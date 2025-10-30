import { createClient } from "@supabase/supabase-js";

export type GroupedStat = { label: string; count: number };
export type GrantStats = {
  totalToday: number;
  groupedToday: GroupedStat[];
  yesterdayCount: number;
  diff: number;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type GrantRow = { level: string | null; area_prefecture: string | null };

export async function getGrantStats(): Promise<GrantStats> {
  // 全件数取得
  const { count: totalToday } = await supabase
    .from("grants")
    .select("*", { count: "exact", head: true });

  // 区分別集計（level/area_prefecture を利用）
  const { data: allGrants } = await supabase
    .from("grants")
    .select("level, area_prefecture");

  // クライアント側で集計
  const groupedTodayMap: Record<string, number> = (allGrants || []).reduce(
    (acc: Record<string, number>, grant: GrantRow) => {
      const label = grant.level === "national" ? "national" : (grant.area_prefecture || "prefecture");
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    },
    {}
  );

  // 配列形式に変換
  const groupedArray: GroupedStat[] = Object.entries(groupedTodayMap).map(
    ([label, count]) => ({ label, count })
  );

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
