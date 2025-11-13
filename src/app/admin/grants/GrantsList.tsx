"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type AdminGrant, type GrantFilters } from "@/lib/getAdminGrants";

export default function GrantsList({
  initialGrants,
  initialFilters,
}: {
  initialGrants: AdminGrant[];
  initialFilters: GrantFilters;
}) {
  const [grants] = useState<AdminGrant[]>(initialGrants);
  const [filters, setFilters] = useState<GrantFilters>(initialFilters);
  const router = useRouter();

  const updateFilters = (newFilters: Partial<GrantFilters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);

    // URLパラメータを更新
    const params = new URLSearchParams();
    if (updated.level) params.set("level", updated.level);
    if (updated.type) params.set("type", updated.type);
    if (updated.area_prefecture) params.set("area_prefecture", updated.area_prefecture);
    if (updated.area_city) params.set("area_city", updated.area_city);
    router.push(`/admin/grants?${params.toString()}`);
  };

  const clearFilters = () => {
    setFilters({});
    router.push("/admin/grants");
  };

  return (
    <div className="space-y-6">
      {/* フィルター */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">フィルター</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* レベル */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              レベル
            </label>
            <select
              value={filters.level || ""}
              onChange={(e) =>
                updateFilters({ 
                  level: (e.target.value || null) as "national" | "prefecture" | "city" | null 
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">すべて</option>
              <option value="national">国</option>
              <option value="prefecture">都道府県</option>
              <option value="city">市区町村</option>
            </select>
          </div>

          {/* 種類 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              種類
            </label>
            <select
              value={filters.type || ""}
              onChange={(e) =>
                updateFilters({ 
                  type: (e.target.value || null) as "補助金" | "助成金" | null 
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">すべて</option>
              <option value="補助金">補助金</option>
              <option value="助成金">助成金</option>
            </select>
          </div>

          {/* 都道府県 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              都道府県
            </label>
            <input
              type="text"
              value={filters.area_prefecture || ""}
              onChange={(e) =>
                updateFilters({ area_prefecture: e.target.value || null })
              }
              placeholder="例: 山形県"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
            />
          </div>

          {/* 市区町村 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              市区町村
            </label>
            <input
              type="text"
              value={filters.area_city || ""}
              onChange={(e) =>
                updateFilters({ area_city: e.target.value || null })
              }
              placeholder="例: 長井市"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm text-gray-900 bg-gray-100 rounded-md hover:bg-gray-200 font-medium"
          >
            フィルターをクリア
          </button>
        </div>
      </div>

      {/* 結果件数 */}
      <div className="text-sm text-gray-900 font-medium">
        {grants.length}件の補助金が見つかりました
      </div>

      {/* 補助金一覧 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タイトル
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  種類
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  レベル
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  地域
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  組織
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  作成日時
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {grants.map((grant) => (
                <tr key={grant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {grant.id}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {grant.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {grant.type || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {grant.level === "national"
                      ? "国"
                      : grant.area_city
                      ? "市区町村"
                      : "都道府県"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {grant.area_city
                      ? `${grant.area_prefecture}/${grant.area_city}`
                      : grant.area_prefecture || "全国"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {grant.organization || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {grant.url ? (
                      <a
                        href={grant.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        リンク
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(grant.created_at).toLocaleString("ja-JP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {grants.length === 0 && (
          <div className="text-center py-8 text-gray-900">
            該当する補助金が見つかりませんでした
          </div>
        )}
      </div>
    </div>
  );
}

