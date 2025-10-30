import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * 今日登録・更新された補助金・助成金データを取得（JST基準）
 */
export type NewGrant = {
  id: string | number;
  title: string;
  level: string | null;
  area_prefecture: string | null;
  updated_at: string;
  url?: string | null;
  label: string;
};

type RawGrant = {
  id: string | number;
  title: string;
  level: string | null;
  area_prefecture: string | null;
  created_at: string;
  url: string | null;
};

export async function getTodayNewGrants(): Promise<NewGrant[]> {
  try {
    // JST当日範囲をUTCに変換してフィルタ
    const now = new Date();
    const jstOffsetMs = 9 * 60 * 60 * 1000;

    const jstNow = new Date(now.getTime() + jstOffsetMs);
    const jstStart = new Date(jstNow);
    jstStart.setHours(0, 0, 0, 0);
    const jstEnd = new Date(jstNow);
    jstEnd.setHours(23, 59, 59, 999);

    // 指示に基づく補正（実運用ではサーバー側UTC保存と整合させて再調整予定）
    const utcStartIso = new Date(jstStart.getTime() - jstOffsetMs * 2).toISOString();
    const utcEndIso = new Date(jstEnd.getTime() - jstOffsetMs * 2).toISOString();

    const { data, error } = await supabase
      .from("grants")
      .select("id, title, level, area_prefecture, created_at, url")
      .gte("created_at", utcStartIso)
      .lte("created_at", utcEndIso)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("❌ Error fetching new grants:", error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.log("ℹ️ 今日の新着データはありません（UTC変換後範囲内なし）");
      console.log("🧭 UTC範囲:", utcStartIso, "→", utcEndIso);
      return [];
    }

    const rows: RawGrant[] = Array.isArray(data) ? (data as RawGrant[]) : [];
    const withLabel: NewGrant[] = rows.map((g: RawGrant) => {
      const cleanedUrl = typeof g.url === "string" ? g.url.replace(/^"+|"+$/g, "") : null;
      return {
        id: g.id,
        title: g.title,
        level: g.level,
        area_prefecture: g.area_prefecture,
        updated_at: g.created_at,
        url: cleanedUrl,
        label: g.level === "national" ? "national" : g.area_prefecture || "prefecture",
      };
    });

    console.log("✅ 今日の新着データ:", withLabel);
    return withLabel;
  } catch (err: any) {
    console.error("⚠️ Unexpected error in getTodayNewGrants:", err);
    return [];
  }
}
