require("dotenv").config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const { crawlOliveYoungReviews, getFallbackReviews } = require("./crawler");

const app = express();
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
  }),
);

app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    }),
  ]);
}

// 외부 AI API의 실패(타임아웃, 에러, 저품질 응답)에 대비하여,
// 사용자 입력 기반으로 최소한의 신뢰 가능한 추천을 반환하는 fallback 로직
function buildFallbackRecommendation({
  age,
  skinType,
  recentChanges,
  skinConcerns,
}) {
  return `1. 피부 상태 진단 (2~3문장): ${age}세 ${skinType} 피부 기준으로 볼 때 최근 변화(${recentChanges})와 고민(${skinConcerns})은 수분-장벽 저하와 탄력 저하가 함께 나타나는 패턴일 가능성이 큽니다. 자극을 줄이고 보습과 장벽 회복 중심으로 관리하는 것이 우선입니다.
2. 추천 성분 (3가지):
- 세라마이드: 피부 장벽 강화와 수분 유지에 도움
- 판테놀: 민감해진 피부 진정 및 회복 보조
- 나이아신아마이드: 피부결/톤 개선 및 피지 밸런스 보조
3. 제품 추천 (1가지만): 저자극 보습 크림(세라마이드 + 판테놀 조합) — 건조/민감/탄력 저하를 동시에 완화하기 좋습니다.
4. 리뷰 근거: 유사 연령대 리뷰에서도 건조·민감 개선과 보습 지속력이 핵심 만족 포인트로 반복됩니다.
5. 주의사항 (1문장): 고농도 산성 각질제거 성분(AHA/BHA)과 강한 향료 제품의 동시 사용은 일시적으로 자극을 높일 수 있어 주의가 필요합니다.`;
}

let cachedReviews = null;

async function getReviews() {
  if (cachedReviews) return cachedReviews;

  try {
    console.log("[크롤링 시작] 올리브영 리뷰 수집 중...");
    const url =
      "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000178590";
    const reviews = await withTimeout(crawlOliveYoungReviews(url), 15000);
    if (reviews.length > 0) {
      console.log(`[크롤링 성공] ${reviews.length}개 리뷰 수집`);
      cachedReviews = reviews;
    } else {
      console.log("[크롤링 결과 없음] fallback 데이터 사용");
      cachedReviews = getFallbackReviews();
    }
  } catch (err) {
    console.log("[크롤링 실패] fallback 데이터 사용:", err.message);
    cachedReviews = getFallbackReviews();
  }

  return cachedReviews;
}

function filterReviewsByAge(reviews, age) {
  const ageNum = parseInt(age);
  let ageTag = "";
  if (ageNum >= 40 && ageNum < 50) ageTag = "40대";
  else if (ageNum >= 50) ageTag = "50대";
  else ageTag = "30대";
  const filtered = reviews.filter((r) => r.age.includes(ageTag));
  return filtered.length >= 2 ? filtered : reviews;
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

app.post("/api/recommend", async (req, res) => {
  try {
    const { age, skinConcerns, recentChanges, skinType } = req.body;

    const allReviews = await getReviews();
    const filteredReviews = shuffleArray(filterReviewsByAge(allReviews, age));
    const reviewSummary = filteredReviews
      .slice(0, 5)
      .map((r, i) => `리뷰${i + 1} [${r.age}, ${r.skinType}]: ${r.text}`)
      .join("\n");

    const prompt = `
당신은 40~50대 여성 피부 전문 AI 어드바이저입니다.
아래 고객 정보와 실제 사용자 리뷰를 바탕으로 분석해주세요.

[고객 정보]
- 나이: ${age}세
- 피부 타입: ${skinType}
- 최근 피부 변화: ${recentChanges}
- 주요 고민: ${skinConcerns}

[실제 사용자 리뷰 (유사 연령대)]
${reviewSummary}

다음 형식으로 정확히 답변해주세요:

1. 피부 상태 진단 (2~3문장): 고객의 현재 피부 상태를 40대 호르몬 변화 맥락에서 설명
2. 추천 성분 (3가지): 각 성분명과 이유를 한 줄씩
3. 제품 추천 (1가지만): 제품명과 추천 이유를 구체적으로
4. 리뷰 근거: 위 리뷰 중 이 고객과 가장 유사한 케이스 1개를 인용하며 신뢰도 설명
5. 주의사항 (1문장): 이 피부 상태에서 피해야 할 성분 또는 주의점
`;

    let text = "";
    try {
      const completion = await withTimeout(
        openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 1000,
        }),
        15000,
      );
      text = completion.choices?.[0]?.message?.content || "";
    } catch (aiError) {
      console.error("OpenAI 호출 실패, fallback 응답 사용:", aiError.message);
      text = buildFallbackRecommendation({
        age,
        skinType,
        recentChanges,
        skinConcerns,
      });
    }

    res.json({
      success: true,
      recommendation: text,
      reviews: shuffleArray(filteredReviews).slice(0, 3),
    });
  } catch (error) {
    console.error("API 오류:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
