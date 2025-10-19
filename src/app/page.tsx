import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-gray-800 px-6">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Grant Navi AI
        </h1>
        <p className="text-lg text-gray-600">
          あなたの会社が今もらえる助成金を、AIが3秒で診断します。
        </p>

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