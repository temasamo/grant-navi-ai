import { getAdminGrants, type GrantFilters, type AdminGrant } from "@/lib/getAdminGrants";
import GrantsList from "./GrantsList";

type SearchParams = {
  level?: string;
  type?: string;
  area_prefecture?: string;
  area_city?: string;
};

export default async function AdminGrantsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters: GrantFilters = {
    level: params.level as "national" | "prefecture" | "city" | undefined,
    type: params.type as "補助金" | "助成金" | undefined,
    area_prefecture: params.area_prefecture || undefined,
    area_city: params.area_city || undefined,
  };

  const grants = await getAdminGrants(filters);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">補助金一覧</h1>
      <GrantsList initialGrants={grants} initialFilters={filters} />
    </div>
  );
}

