"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 簡単なパスワード認証（本番環境では適切な認証システムを使用してください）
    // デフォルトパスワード: admin123
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123";
    
    if (password === adminPassword) {
      // セッションストレージに保存（簡易実装）
      if (typeof window !== "undefined") {
        sessionStorage.setItem("admin_authenticated", "true");
        // 少し待ってからリダイレクト
        await new Promise((resolve) => setTimeout(resolve, 100));
        window.location.href = "/admin";
      }
    } else {
      setError(`パスワードが正しくありません。デフォルトパスワード: admin123`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          管理者ログイン
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              パスワード
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
          >
            ログイン
          </button>
        </form>
      </div>
    </div>
  );
}

