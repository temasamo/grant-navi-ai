"use client";

import { useState, useMemo } from "react";

type Grant = {
  id: number;
  type: string;
  title: string;
  description: string;
  area_prefecture: string | null;
  area_city: string | null;
  industry: string;
  max_amount: string | null;
  subsidy_rate: string | null;
  organization: string | null;
  source_url: string | null;
};

export default function DiagnosePage() {
  const [area, setArea] = useState("山形県");
  const [industry, setIndustry] = useState("旅館業");
  const [results, setResults] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // 地域オプションを動的に生成
  const [prefectureOptions, cityOptions] = useMemo(() => {
    const prefectures = new Set<string>();
    const cities = new Set<string>();

    // デフォルトの地域を追加
    prefectures.add("山形県");
    
    // 山形県内の全市町村を追加（35市町村）
    const yamagataCities = [
      "山形市", "上山市", "天童市", "寒河江市", "村山市", "東根市", "尾花沢市",
      "米沢市", "南陽市", "長井市", "新庄市", "酒田市", "鶴岡市",
      "河北町", "西川町", "朝日町", "大江町", "大石田町", "中山町", "山辺町",
      "最上町", "舟形町", "真室川町", "金山町", "大蔵村", "鮭川村", "戸沢村",
      "小国町", "白鷹町", "飯豊町", "高畠町", "川西町", "三川町", "庄内町", "遊佐町"
    ];
    yamagataCities.forEach(city => cities.add(city));

    results.forEach(g => {
      if (g.area_prefecture) prefectures.add(g.area_prefecture);
      if (g.area_city) cities.add(g.area_city);
    });

    return [
      Array.from(prefectures).sort((a, b) => a.localeCompare(b, 'ja')),
      Array.from(cities).sort((a, b) => a.localeCompare(b, 'ja'))
    ];
  }, [results]);

  const handleSearch = async () => {
    setLoading(true);
    setResults([]);
    setMessage("");

    try {
      const res = await fetch("/api/search-grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area, industry }),
      });

      const data = await res.json();

      if (data.results) {
        setResults(data.results);
      } else if (data.message) {
        setMessage(data.message);
      } else {
        setMessage("該当する情報が見つかりませんでした。");
      }
    } catch (err) {
      console.error(err);
      setMessage("検索中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">
        助成金診断AI（旅館業向け）
      </h1>

      {/* 入力フォーム */}
      <div className="bg-gray-50 p-4 rounded-lg shadow mb-6">
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1 text-gray-800">地域</label>
          <select
            className="w-full border border-gray-300 p-2 rounded text-gray-800"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          >
            <optgroup label="都道府県">
              {prefectureOptions.map((p, i) => (
                <option key={`pref-${i}`} value={p}>{p}</option>
              ))}
            </optgroup>
            <optgroup label="市町村">
              {cityOptions.map((c, i) => (
                <option key={`city-${i}`} value={c}>{c}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1 text-gray-800">業種</label>
          <select
            className="w-full border border-gray-300 p-2 rounded text-gray-800"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          >
            <option>旅館業</option>
            <option>飲食業</option>
            <option>製造業</option>
            <option>ITサービス</option>
          </select>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          {loading ? "検索中..." : "助成金・補助金を検索"}
        </button>
      </div>

      {/* 検索結果 */}
      {message && <p className="text-center text-gray-600">{message}</p>}

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((grant) => (
            <div
              key={grant.id}
              className="border border-gray-200 rounded-lg p-4 shadow-sm bg-white"
            >
              <h2 className="font-bold text-lg text-blue-700">{grant.title}</h2>
              <p className="text-sm text-gray-600 mb-2">{grant.description}</p>
              <p className="text-sm text-gray-700">
                <strong>対象地域：</strong> {
                  grant.area_prefecture === "全国" 
                    ? "全国" 
                    : [grant.area_prefecture, grant.area_city].filter(Boolean).join("・")
                }
              </p>
              <p className="text-sm text-gray-700">
                <strong>最大金額：</strong>{" "}
                {grant.max_amount ? `${grant.max_amount}万円` : "―"}
              </p>
              <p className="text-sm text-gray-700">
                <strong>補助率：</strong> {grant.subsidy_rate ?? "―"}
              </p>
              <p className="text-sm text-gray-700">
                <strong>実施機関：</strong> {grant.organization ?? "―"}
              </p>
              {grant.source_url && (
                <a
                  href={grant.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline mt-2 inline-block"
                >
                  詳細を見る
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
