import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * 今日登録・更新された補助金データを取得
 * 日本時間ベースで当日のみ抽出
 */
export type NewGrant = {
  id: string | number;
  title: string;
  level: string | null;
  area_prefecture: string | null;
  updated_at: string;
  label: string;
};

type NewGrantRow = Omit<NewGrant, "label">;

export async function getTodayNewGrants(): Promise<NewGrant[]> {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000; // JST補正（+9時間）
  const jst = new Date(now.getTime() + jstOffset);

  // JST基準で当日の00:00を作成
  const startOfDayJST = new Date(jst);
  startOfDayJST.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("grants")
    .select("id, title, level, area_prefecture, updated_at")
    .gte("updated_at", startOfDayJST.toISOString())
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching new grants:", error.message);
    return [];
  }

  // 表示用にlabelを付与
  const withLabel: NewGrant[] = (data as NewGrantRow[] | null || []).map(
    (g) => ({
      ...g,
      label: g.level === "national" ? "national" : (g.area_prefecture || "prefecture"),
    })
  );

  return withLabel;
}

