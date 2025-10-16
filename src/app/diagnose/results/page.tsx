"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function DiagnoseResults() {
  const [result, setResult] = useState<string>("診断結果を読み込み中...");

  useEffect(() => {
    const data = localStorage.getItem("grantResult");
    if (data) setResult(data);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-gray-800 px-6 py-10">
      <div className="max-w-2xl w-full bg-white shadow-md rounded-lg p-6 space-y-6">
        <h1 className="text-2xl font-bold text-center">助成金診断AI 結果</h1>
        <div className="whitespace-pre-wrap text-gray-700 border rounded-md p-4 bg-gray-50">
          {result}
        </div>

        <div className="text-center pt-4">
          <Link
            href="/"
            className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
