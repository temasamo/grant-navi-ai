import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type AdminGrant = {
  id: number;
  title: string;
  description: string | null;
  organization: string | null;
  level: string | null;
  area_prefecture: string | null;
  area_city: string | null;
  type: string | null;
  url: string | null;
  source_url: string | null;
  created_at: string;
  updated_at: string;
};

export type GrantFilters = {
  level?: "national" | "prefecture" | "city" | null;
  type?: "補助金" | "助成金" | null;
  area_prefecture?: string | null;
  area_city?: string | null;
};

export async function getAdminGrants(filters?: GrantFilters): Promise<AdminGrant[]> {
  try {
    let query = supabase
      .from("grants")
      .select("*")
      .order("created_at", { ascending: false });

    // フィルタリング
    if (filters?.level) {
      if (filters.level === "city") {
        // 市区町村は level="prefecture" かつ area_city が存在するもの
        query = query.eq("level", "prefecture").not("area_city", "is", null);
      } else {
        query = query.eq("level", filters.level);
        if (filters.level === "prefecture") {
          // 都道府県は level="prefecture" かつ area_city が null のもの
          query = query.is("area_city", null);
        }
      }
    }

    if (filters?.type) {
      query = query.eq("type", filters.type);
    }

    if (filters?.area_prefecture) {
      query = query.eq("area_prefecture", filters.area_prefecture);
    }

    if (filters?.area_city) {
      query = query.eq("area_city", filters.area_city);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Error fetching admin grants:", error.message);
      return [];
    }

    return (data as AdminGrant[]) || [];
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("⚠️ Unexpected error in getAdminGrants:", message);
    return [];
  }
}

export async function getGrantStatsForAdmin() {
  try {
    const { count: total } = await supabase
      .from("grants")
      .select("*", { count: "exact", head: true });

    // 補助金のレベル別統計
    const { count: nationalSubsidy } = await supabase
      .from("grants")
      .select("*", { count: "exact", head: true })
      .eq("level", "national")
      .eq("type", "補助金");

    const { count: prefectureSubsidy } = await supabase
      .from("grants")
      .select("*", { count: "exact", head: true })
      .eq("level", "prefecture")
      .eq("type", "補助金")
      .is("area_city", null);

    const { count: citySubsidy } = await supabase
      .from("grants")
      .select("*", { count: "exact", head: true })
      .eq("level", "prefecture")
      .eq("type", "補助金")
      .not("area_city", "is", null);

    // 助成金のレベル別統計
    const { count: nationalGrant } = await supabase
      .from("grants")
      .select("*", { count: "exact", head: true })
      .eq("level", "national")
      .eq("type", "助成金");

    const { count: prefectureGrant } = await supabase
      .from("grants")
      .select("*", { count: "exact", head: true })
      .eq("level", "prefecture")
      .eq("type", "助成金")
      .is("area_city", null);

    const { count: cityGrant } = await supabase
      .from("grants")
      .select("*", { count: "exact", head: true })
      .eq("level", "prefecture")
      .eq("type", "助成金")
      .not("area_city", "is", null);

    // 全体のレベル別統計（補助金+助成金）
    const { count: national } = await supabase
      .from("grants")
      .select("*", { count: "exact", head: true })
      .eq("level", "national");

    const { count: prefecture } = await supabase
      .from("grants")
      .select("*", { count: "exact", head: true })
      .eq("level", "prefecture")
      .is("area_city", null);

    const { count: city } = await supabase
      .from("grants")
      .select("*", { count: "exact", head: true })
      .eq("level", "prefecture")
      .not("area_city", "is", null);

    // 種類別統計
    const { count: subsidy } = await supabase
      .from("grants")
      .select("*", { count: "exact", head: true })
      .eq("type", "補助金");

    const { count: grant } = await supabase
      .from("grants")
      .select("*", { count: "exact", head: true })
      .eq("type", "助成金");

    return {
      total: total || 0,
      national: national || 0,
      prefecture: prefecture || 0,
      city: city || 0,
      subsidy: subsidy || 0,
      grant: grant || 0,
      // 補助金のレベル別
      nationalSubsidy: nationalSubsidy || 0,
      prefectureSubsidy: prefectureSubsidy || 0,
      citySubsidy: citySubsidy || 0,
      // 助成金のレベル別
      nationalGrant: nationalGrant || 0,
      prefectureGrant: prefectureGrant || 0,
      cityGrant: cityGrant || 0,
    };
  } catch (err: unknown) {
    console.error("⚠️ Error in getGrantStatsForAdmin:", err);
    return {
      total: 0,
      national: 0,
      prefecture: 0,
      city: 0,
      subsidy: 0,
      grant: 0,
      nationalSubsidy: 0,
      prefectureSubsidy: 0,
      citySubsidy: 0,
      nationalGrant: 0,
      prefectureGrant: 0,
      cityGrant: 0,
    };
  }
}

