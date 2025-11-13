import { getGrantStatsForAdmin } from "@/lib/getAdminGrants";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const stats = await getGrantStatsForAdmin();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">管理者ダッシュボード</h1>

      {/* 総件数 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">総件数</h2>
        <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
      </div>

      {/* 補助金セクション */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">補助金</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 補助金総数 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">補助金（総数）</h3>
            <p className="text-3xl font-bold text-orange-600">{stats.subsidy}</p>
          </div>

          {/* 国の補助金 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">国の補助金</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.nationalSubsidy}</p>
          </div>

          {/* 都道府県の補助金 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">都道府県の補助金</h3>
            <p className="text-3xl font-bold text-green-600">{stats.prefectureSubsidy}</p>
          </div>

          {/* 市区町村の補助金 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">市区町村の補助金</h3>
            <p className="text-3xl font-bold text-purple-600">{stats.citySubsidy}</p>
          </div>
        </div>

        <div className="flex gap-4">
          <Link
            href="/admin/grants?type=補助金"
            className="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition"
          >
            補助金一覧を見る →
          </Link>
          <Link
            href="/admin/grants?type=補助金&level=national"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            国の補助金 →
          </Link>
          <Link
            href="/admin/grants?type=補助金&level=prefecture"
            className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
          >
            都道府県の補助金 →
          </Link>
          <Link
            href="/admin/grants?type=補助金&level=city"
            className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition"
          >
            市区町村の補助金 →
          </Link>
        </div>
      </div>

      {/* 助成金セクション */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">助成金</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 助成金総数 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">助成金（総数）</h3>
            <p className="text-3xl font-bold text-red-600">{stats.grant}</p>
          </div>

          {/* 国の助成金 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">国の助成金</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.nationalGrant}</p>
          </div>

          {/* 都道府県の助成金 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">都道府県の助成金</h3>
            <p className="text-3xl font-bold text-green-600">{stats.prefectureGrant}</p>
          </div>

          {/* 市区町村の助成金 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">市区町村の助成金</h3>
            <p className="text-3xl font-bold text-purple-600">{stats.cityGrant}</p>
          </div>
        </div>

        <div className="flex gap-4">
          <Link
            href="/admin/grants?type=助成金"
            className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition"
          >
            助成金一覧を見る →
          </Link>
          <Link
            href="/admin/grants?type=助成金&level=national"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            国の助成金 →
          </Link>
          <Link
            href="/admin/grants?type=助成金&level=prefecture"
            className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
          >
            都道府県の助成金 →
          </Link>
          <Link
            href="/admin/grants?type=助成金&level=city"
            className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition"
          >
            市区町村の助成金 →
          </Link>
        </div>
      </div>

      {/* 全体一覧 */}
      <div className="mt-8">
        <Link
          href="/admin/grants"
          className="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition"
        >
          全補助金・助成金一覧を見る →
        </Link>
      </div>
    </div>
  );
}

