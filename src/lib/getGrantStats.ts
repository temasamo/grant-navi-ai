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

  // 昨日の件数を正確に計算（JST基準）
  // 日本時間の昨日の終了時点（23:59:59）をUTCに変換
  const now = new Date();
  const jstOffsetMs = 9 * 60 * 60 * 1000; // JSTはUTC+9
  const jstNow = new Date(now.getTime() + jstOffsetMs);
  
  // 昨日の23:59:59（JST）を取得
  const yesterdayEnd = new Date(jstNow);
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
  yesterdayEnd.setHours(23, 59, 59, 999);
  
  // UTCに変換（JSTから9時間引く）
  const yesterdayEndUtc = new Date(yesterdayEnd.getTime() - jstOffsetMs);
  
  // 昨日の終了時点までに作成されたレコード数をカウント
  const { count: yesterdayCount } = await supabase
    .from("grants")
    .select("*", { count: "exact", head: true })
    .lte("created_at", yesterdayEndUtc.toISOString());

  const diff = (totalToday ?? 0) - (yesterdayCount ?? 0);

  return {
    totalToday: totalToday ?? 0,
    groupedToday: groupedArray,
    yesterdayCount: yesterdayCount ?? 0,
    diff,
  };
}
