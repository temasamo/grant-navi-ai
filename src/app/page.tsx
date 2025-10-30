import Link from "next/link";
import { getGrantStats, type GroupedStat } from "@/lib/getGrantStats";
import { getTodayNewGrants, type NewGrant } from "@/lib/getTodayNewGrants";

export const metadata = {
  title: "Grant Navi AI | 補助金・助成金診断",
  description: "あなたの会社が今もらえる補助金・助成金を、AIが3秒で診断します。",
};

export default async function HomePage() {
  const { totalToday, groupedToday, diff } = await getGrantStats();
  const newGrants = await getTodayNewGrants();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-gray-800 px-6">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Grant Navi AI
        </h1>
        <p className="text-lg text-gray-600">
          あなたの会社が今もらえる補助金・助成金を、AIが3秒で診断します。
        </p>

        {/* 統計情報表示 */}
        <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">補助金・助成金データ統計</h2>
          <p className="text-sm text-gray-600 mb-2">
            トータル件数: <span className="font-semibold text-gray-900">{totalToday}</span>{" "}
            （前日比:{" "}
            <span className={diff >= 0 ? "text-green-500" : "text-red-500"}>
              {diff >= 0 ? `＋${diff}` : diff}
            </span>
            ）
          </p>

          <div className="flex flex-col items-center gap-1 text-sm">
            {groupedToday?.map((g: GroupedStat) => (
              <p key={g.label} className="text-gray-600">
                {g.label}: <span className="font-semibold text-gray-900">{g.count}</span> 件
              </p>
            ))}
          </div>
        </div>

        {/* 🆕 新着一覧 */}
        <div className="mt-2 mx-auto max-w-md text-left">
          <h3 className="text-md font-semibold mb-2">🆕 本日の新着補助金・助成金</h3>
          {newGrants.length > 0 ? (
            <ul className="space-y-2">
              {newGrants.map((g: NewGrant) => (
                <li key={g.id} className="border-b border-gray-200 pb-2">
                  <p className="font-medium">{g.title}</p>
                  <p className="text-xs text-gray-500">
                    {g.label} ／ {new Date(g.updated_at).toLocaleTimeString("ja-JP")}
                  </p>
                  {/* 🔗 詳細リンク表示 */}
                  {g.url && (
                    <a
                      href={g.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm mt-1 inline-block"
                    >
                      🔗 詳しく見る
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">本日の新着はありません。</p>
          )}
        </div>

        <div className="space-y-4">
          <Link
            href="/diagnose"
            className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition w-full"
          >
            AI診断を始める（チャット型） →
          </Link>
          
          <Link
            href="/search"
            className="inline-block rounded-lg bg-green-600 px-6 py-3 text-white font-medium hover:bg-green-700 transition w-full"
          >
            AI診断を始める（地域×業種検索） →
          </Link>
        </div>
      </div>
    </main>
  );
}