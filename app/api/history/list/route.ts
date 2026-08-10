import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { CONCEPTS } from "../../../lib/concepts";

// 배포 환경에서 GET 응답이 캐시되지 않도록 강제 (옛 빈 목록 캐싱 방지)
export const dynamic = "force-dynamic";

const redis = process.env.KV_REST_API_URL
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN!,
    })
  : null;

type CloudHistoryItem = {
  id: string;
  url: string;
  concept: string;
  createdAt: number;
  originalUrl?: string;
  recovered?: boolean; // 복구분 표시용 — history에는 없고 originals에만 있던 생성물
};

// 유료 원본 인덱스(withCoin이 차감 시 기록) — 생성은 됐는데 클라가 저장을 못 한 건이 여기 남는다.
type OriginalItem = { id?: string; urls?: string[]; concept?: string; at?: number };

function getUserId(request: NextRequest): string | null {
  const cookie = request.cookies.get("kakao_user");
  if (!cookie) return null;
  try {
    const user = JSON.parse(cookie.value);
    return user.id ? String(user.id) : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const noStore = { headers: { "Cache-Control": "no-store, max-age=0" } };
  const userId = getUserId(request);
  if (!userId || !redis) {
    return NextResponse.json({ items: [] }, noStore);
  }

  try {
    // lpush 로 최신이 앞에 오므로 그대로 최신순
    const items = await redis.lrange<CloudHistoryItem>(`history:${userId}`, 0, -1);
    const history = Array.isArray(items) ? items : [];

    // ── 이탈 손실 구제 ─────────────────────────────────────────────────────
    // 생성 중 앱을 나가면 클라의 addToHistory가 실행되지 않아 history에는 안 남는다.
    // 하지만 코인은 이미 차감됐고 원본은 Blob + originals:{uid}에 보존돼 있다.
    // 그 "고아 원본"을 찾아 목록에 합쳐 내려준다 — 조회 경로만 손대고 생성·차감은 무접촉.
    // ★중복 판정 = originalUrl 문자열 일치. Blob 경로가 originals/{uid}/{ledgerId}_{i}.{ext}로
    //   addRandomSuffix: false라 결정적이므로, 같은 생성이면 URL이 반드시 같다.
    // ★2차 판정(시각창+컨셉)이 필요한 이유: addToHistory의 originalUrl 인자를 넘기는 페이지가
    //   travel 한 곳뿐이라(나머지 161곳은 2인자 호출) history 레코드 대부분에 originalUrl이 없다.
    //   실측 500건 중 보유 2건 — URL 일치만으로는 사실상 아무것도 못 거른다.
    //   그래서 "같은 컨셉 + originals.at 직후 MATCH_WINDOW_MS 안의 history"를 같은 건으로 본다.
    //   근거(실측): 시각차 중앙 4.3초·90% 9.5초(클라가 이미지 받아 축소·저장하는 시간).
    //   30초면 매칭 49/55이고 60초·300초로 늘려도 개선이 없어, 창만 키우면 오매칭 위험만 커진다.
    //   B안(전 페이지 originalUrl 배선)이 끝나면 신규분은 1차 URL 일치로 정확히 걸러진다.
    const MATCH_WINDOW_MS = 30000;
    let recovered: CloudHistoryItem[] = [];
    try {
      const raw = await redis.lrange<OriginalItem>(`originals:${userId}`, 0, -1);
      const originals = Array.isArray(raw) ? raw : [];
      if (originals.length) {
        const seen = new Set(history.map(h => h.originalUrl).filter(Boolean) as string[]);
        // 시각창 매칭에 이미 쓰인 history 인덱스 — 한 history가 두 originals를 덮지 않게 1:1로 소비한다
        const claimed = new Set<number>();
        for (const o of originals) {
          const url = o?.urls?.[0];
          if (typeof url !== "string" || !url.startsWith("https://")) continue;
          if (seen.has(url)) continue; // ① 이미 히스토리에 있는 건(정확 일치)
          // ② 시각창 + 컨셉 매칭 — 짝을 찾으면 그 history를 소비하고 복구분에서 제외
          //    (originals의 concept은 영문 키라 화면·매칭 양쪽에 쓸 한글 제목으로 먼저 변환)
          const title = (o.concept && CONCEPTS[o.concept]?.title) || o.concept || "";
          const at = typeof o.at === "number" ? o.at : 0;
          if (at && title) {
            const hit = history.findIndex((h, i) =>
              !claimed.has(i) && h?.concept === title &&
              typeof h?.createdAt === "number" && h.createdAt >= at && h.createdAt <= at + MATCH_WINDOW_MS);
            if (hit >= 0) { claimed.add(hit); continue; }
          }
          seen.add(url); // originals 안의 중복도 한 번만
          recovered.push({
            id: `recovered_${o.id ?? url.slice(-24)}`,
            url,     // 축소본이 없으므로 원본을 그대로 표시원으로 쓴다
            concept: title, // originals의 concept은 영문 키라 위에서 한글 제목으로 변환해뒀다
            createdAt: at,
            originalUrl: url,
            recovered: true,
          });
        }
      }
    } catch {
      recovered = []; // originals 조회 실패는 무시 — 기존 히스토리는 그대로 내려간다
    }

    // 생성시각 기준 통합 정렬(최신순). 복구분이 없으면 기존 순서와 동일하다.
    const merged = recovered.length
      ? [...history, ...recovered].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      : history;

    return NextResponse.json({ items: merged }, noStore);
  } catch {
    return NextResponse.json({ items: [] }, noStore);
  }
}
