import Link from "next/link";
import { getGrantStats } from "@/lib/getGrantStats";

export default async function HomePage() {
  const { totalToday, groupedToday, diff } = await getGrantStats();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-gray-800 px-6">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Grant Navi AI
        </h1>
        <p className="text-lg text-gray-600">
          あなたの会社が今もらえる助成金を、AIが3秒で診断します。
        </p>

        {/* 統計情報表示 */}
        <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">助成金データ統計</h2>
          <p className="text-sm text-gray-600 mb-2">
            トータル件数: <span className="font-semibold text-gray-900">{totalToday}</span>{" "}
            （前日比:{" "}
            <span className={diff >= 0 ? "text-green-500" : "text-red-500"}>
              {diff >= 0 ? `＋${diff}` : diff}
            </span>
            ）
          </p>

          <div className="flex flex-col items-center gap-1 text-sm">
            {groupedToday?.map((g: any) => (
              <p key={g.source} className="text-gray-600">
                {g.source}: <span className="font-semibold text-gray-900">{g.count}</span> 件
              </p>
            ))}
          </div>
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