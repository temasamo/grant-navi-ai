import { NextResponse } from "next/server";

// モックデータ
const mockGrants = [
  {
    id: "50336ab8-e664-492e-affe-82970dfed227",
    type: "補助金",
    title: "観光地・観光産業支援交付金",
    description: "観光庁が行う宿泊施設の改修・魅力向上支援。温泉旅館や観光ホテルを対象とし、設備投資やバリアフリー化を補助。",
    target_industry: "旅館業",
    target_area: ["山形県", "東京都"],
    eligibility: "観光施設を運営する中小企業",
    support_category: "施設改修",
    max_amount: 2000,
    subsidy_rate: "2/3以内",
    application_period: "2025-03-31",
    authority: "観光庁",
    source_url: "https://www.mlit.go.jp/kankocho/",
    created_at: "2025-10-16T07:57:23.215511"
  },
  {
    id: "5cf713b3-2227-4c73-87c5-824015971bce",
    type: "補助金",
    title: "山形県観光施設魅力向上事業",
    description: "山形県内の旅館・ホテルの施設改修、客室リニューアル等に対する補助金。",
    target_industry: "旅館業",
    target_area: ["山形県"],
    eligibility: "県内の宿泊施設事業者",
    support_category: "施設改修",
    max_amount: 500,
    subsidy_rate: "1/2以内",
    application_period: "2025-02-28",
    authority: "山形県観光課",
    source_url: "https://www.pref.yamagata.jp/",
    created_at: "2025-10-16T07:57:23.215511"
  },
  {
    id: "fecc6512-1a01-4ffe-baa2-12b5c3e9e469",
    type: "助成金",
    title: "キャリアアップ助成金",
    description: "非正規従業員を正社員化する事業者への支援金。宿泊業を含む全業種対象。",
    target_industry: "旅館業",
    target_area: ["山形県", "東京都"],
    eligibility: "中小企業で雇用保険適用事業所",
    support_category: "人材育成・雇用安定",
    max_amount: 72,
    subsidy_rate: "定額支給",
    application_period: "通年",
    authority: "厚生労働省",
    source_url: "https://jsite.mhlw.go.jp/",
    created_at: "2025-10-16T07:57:23.215511"
  },
  {
    id: "fd551489-1018-481a-8bef-b04335288ff4",
    type: "助成金",
    title: "業務改善助成金",
    description: "最低賃金引上げに取り組む中小企業に対して、生産性向上設備投資を助成。",
    target_industry: "旅館業",
    target_area: ["山形県", "東京都"],
    eligibility: "中小企業",
    support_category: "生産性向上・賃上げ",
    max_amount: 600,
    subsidy_rate: "3/4以内",
    application_period: "通年",
    authority: "厚生労働省",
    source_url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000130793.html",
    created_at: "2025-10-16T07:57:23.215511"
  }
];

// POSTメソッドで検索リクエストを受け取る
export async function POST(req: Request) {
  try {
    const { area, industry } = await req.json();

    if (!area || !industry) {
      return NextResponse.json(
        { error: "エリアと業種の指定が必要です。" },
        { status: 400 }
      );
    }

    // モックデータからフィルタリング
    const filteredData = mockGrants.filter(grant => 
      grant.target_area.includes(area) && 
      grant.target_industry.includes(industry)
    );

    if (filteredData.length === 0) {
      return NextResponse.json(
        { message: "該当する助成金・補助金は見つかりませんでした。" },
        { status: 200 }
      );
    }

    // 結果を返す
    return NextResponse.json({ results: filteredData }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
