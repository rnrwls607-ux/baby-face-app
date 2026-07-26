import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { del } from "@vercel/blob";

export const runtime = "nodejs";

const redis = process.env.KV_REST_API_URL
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN!,
    })
  : null;

// 회원 탈퇴 — 순서가 중요하다:
// 1) 카카오 unlink 성공 확인 → 2) 클라우드 생성 기록 삭제 → 3) 세션 쿠키 삭제
// unlink 실패 시 쿠키를 지우지 않는다. (쿠키만 지우면 재로그인 때 계정이
// 그대로 살아나는 "가짜 탈퇴"가 되므로 절대 금지)
export async function POST(request: NextRequest) {
  const userCookie = request.cookies.get("kakao_user");
  if (!userCookie?.value) {
    return NextResponse.json({ error: "로그인 상태가 아니에요." }, { status: 401 });
  }

  let userId = "";
  try {
    userId = String(JSON.parse(userCookie.value).id || "");
  } catch {
    /* 파싱 실패 → 아래에서 400 */
  }
  if (!userId) {
    return NextResponse.json({ error: "사용자 정보를 확인할 수 없어요." }, { status: 400 });
  }

  const adminKey = process.env.KAKAO_ADMIN_KEY;
  if (!adminKey) {
    console.error("[withdraw] KAKAO_ADMIN_KEY 미설정 — 탈퇴 불가");
    return NextResponse.json({ error: "탈퇴 처리에 실패했어요. 다시 시도해주세요." }, { status: 500 });
  }

  try {
    // 1) 카카오 연결 해제 (admin 키 방식 — 세션에 access token 을 저장하지 않으므로)
    const res = await fetch("https://kapi.kakao.com/v1/user/unlink", {
      method: "POST",
      headers: {
        Authorization: `KakaoAK ${adminKey}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body: new URLSearchParams({ target_id_type: "user_id", target_id: userId }),
    });

    if (!res.ok) {
      const body = await res.text();
      // 이미 연결 해제된 사용자(-101)는 탈퇴 완료로 간주하고 계속 진행 —
      // 아니면 unlink 가 영원히 실패해 탈퇴할 수 없는 상태에 갇힌다.
      const alreadyUnlinked = body.includes("-101");
      if (!alreadyUnlinked) {
        console.error(`[withdraw] unlink 실패 status=${res.status} body=${body.slice(0, 200)}`);
        return NextResponse.json({ error: "탈퇴 처리에 실패했어요. 다시 시도해주세요." }, { status: 502 });
      }
    }

    // 2) 클라우드 생성 기록 삭제 (Blob 파일 + Redis 목록)
    //    — 쿠키가 지워지면 클라이언트에서 지울 수 없으므로 여기서 처리한다.
    //    unlink 는 이미 성공했으므로, 여기 실패는 탈퇴를 막지 않는다 (기록만 남고 로그로 추적).
    if (redis) {
      try {
        const items = await redis.lrange<{ url: string }>(`history:${userId}`, 0, -1);
        const urls = (Array.isArray(items) ? items : [])
          .map((i) => i?.url)
          .filter((u): u is string => typeof u === "string" && u.length > 0);
        if (urls.length && process.env.BLOB_READ_WRITE_TOKEN) {
          try {
            await del(urls);
          } catch {
            /* Blob 삭제 실패는 무시 — 목록 삭제는 진행 */
          }
        }
        await redis.del(`history:${userId}`);
      } catch (e) {
        console.error("[withdraw] 클라우드 기록 삭제 실패:", (e as { message?: string })?.message);
      }

      // 2-b) 유료 생성물 원본 삭제 (originals/{uid}/… + 인덱스)
      //   방침 제1조 — "이용자가 삭제하거나 탈퇴하면 즉시 파기". 1년 만기를 기다리지 않는다
      //   (개인정보 최소보유 원칙). 만기 파기는 크론(purge-expired)이 남은 것만 처리한다.
      //   ★경로 소유권 가드 — originals/{uid}/ 를 포함하는 url만 지운다(purge-expired와 같은 관례).
      try {
        const items = await redis.lrange<{ urls?: string[] }>(`originals:${userId}`, 0, -1);
        const urls = (Array.isArray(items) ? items : [])
          .flatMap((i) => i?.urls || [])
          .filter((u): u is string => typeof u === "string" && u.includes(`/originals/${userId}/`));
        if (urls.length && process.env.BLOB_READ_WRITE_TOKEN) {
          try {
            await del(urls);
          } catch {
            /* Blob 삭제 실패는 무시 — 인덱스 삭제는 진행(고아 파일은 cleanup 대상) */
          }
        }
        await redis.del(`originals:${userId}`);
      } catch (e) {
        console.error("[withdraw] 유료 원본 삭제 실패:", (e as { message?: string })?.message);
      }

      // ★payment:{uid}:* 는 삭제하지 않는다 —
      //   전자상거래법 제6조상 계약·대금결제 기록은 5년 보존 의무가 있어, 탈퇴해도
      //   법정 기간까지 다른 정보와 분리해 보관한다(방침 제2조·제6조).
    }

    // 3) unlink 성공이 확인된 뒤에만 세션 쿠키 삭제
    const response = NextResponse.json({ ok: true });
    response.cookies.set("kakao_user", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    return response;
  } catch (e: unknown) {
    console.error("[withdraw] error:", (e as { message?: string })?.message);
    return NextResponse.json({ error: "탈퇴 처리에 실패했어요. 다시 시도해주세요." }, { status: 500 });
  }
}
