#!/usr/bin/env node
// scripts/concept-list.mjs — 컨셉 전체 목록 문서(docs/CONCEPT_LIST.md) 생성기.
//
// 진실원은 app/lib/concepts.ts 의 CONCEPTS(VM으로 실제 평가)다. 눈으로 옮겨 적지 않는다.
//   키·한글명      : CONCEPTS[key].title
//   엔진           : app/api/{키}/route.ts 의 모델 문자열. 자기 route가 없는 biz*/id* 변형은
//                    부모 route(bizprofile / idstyle)를 따른다.
//   inputType      : 저장된 칸이 없다 — specs/{키}.json > inputRule > 분류·키 휴리스틱 순으로 도출(문서 머리에 규칙 명시)
//   상태           : 홈 카드 열림=라이브 · 카드 주석/없음=숨김 · key "soon"=soon
//   시즌·분류      : 홈 카드 tags[0]. 카드가 없으면 GO 분류를 한글로
//
// 사용법
//   node scripts/concept-list.mjs            docs/CONCEPT_LIST.md 를 다시 쓴다
//   node scripts/concept-list.mjs --check    쓰지 않고 현재 파일과 다른지만 본다(exit 1 = 다름)
//
// ★launch 스테이지가 출시 커밋 직전에 이 스크립트를 돌려 목록을 같은 커밋에 싣는다(플레이북 §2).

import fs from "node:fs";
import path from "node:path";
import { ROOT, abs, readText, exists, fail } from "./lib/repo.mjs";
import { evalConst } from "./lib/prompt.mjs";
import { readWiringState, wiringOf } from "./lib/wiring.mjs";

const OUT = "docs/CONCEPT_LIST.md";
const check = process.argv.includes("--check");

// ── 탈락·보류 (재론 금지) — 근거는 WORKLOG 09-01·09-06 ──────────────────────────
const DROPPED = [
  ["oldmoney",     "탈락", "v1~v3 조명 수술 후에도 미달 — 조명 수술의 한계 판례"],
  ["marathon",     "탈락", "G1 탈락"],
  ["petid",        "탈락", "pet 컨셉과 겹침"],
  ["boxtoy",       "탈락", "글자 봉쇄 헌법과 충돌"],
  ["chibisticker", "보류", "다중 셀 일관성 리스크 — 네컷 동면과 연동해 재론"],
  ["droneview",    "확인 필요", "★리포에서는 라이브(카드 열림·BA·상세 있음, 09-02 출시). 플레이북 §7은 \"진행 중\". 보류로 볼지 MJ 확인"],
  ["filmcampus",   "보류", "09-06 G2 보류(재론 금지). spec·프롬프트·비포 3·애프터 4 보관, route 미배선"],
];

const GO_KO = { fun: "재미", business: "비즈니스", biz: "비즈니스", lifeshot: "인생샷", idcard: "증명사진", pet: "반려동물", family: "가족", beauty: "헤어·뷰티" };

function engineOf(key) {
  const own = `app/api/${key}/route.ts`;
  let rel = exists(own) ? own : null;
  let via = "";
  if (!rel) {
    if (/^biz/.test(key) && exists("app/api/bizprofile/route.ts")) { rel = "app/api/bizprofile/route.ts"; via = "bizprofile"; }
    else if (/^id/.test(key) && exists("app/api/idstyle/route.ts")) { rel = "app/api/idstyle/route.ts"; via = "idstyle"; }
    else if (key === "baby" && exists("app/api/generate/route.ts")) { rel = "app/api/generate/route.ts"; via = "generate"; }   // 아기 얼굴은 초기 공용 route
  }
  if (!rel) return "-";
  const src = readText(rel);
  const has = [];
  if (src.includes("gemini-3-pro-image")) has.push("pro");
  if (src.includes("gemini-3.1-flash-image")) has.push("flash");
  if (/gpt-image-[12]/.test(src)) has.push("gpt");
  if (src.includes("api.replicate.com")) has.push("replicate");   // nukki(배경 제거)·upscale(real-esrgan)
  const e = has.join("+") || "?";
  return via ? `${e} (${via})` : e;
}

function inputTypeOf(key, c, goCat) {
  const sp = `specs/${key}.json`;
  if (exists(sp)) { try { const t = JSON.parse(readText(sp)).inputType; if (t) return t; } catch { /* fallthrough */ } }
  if (c.inputRule === "solo_face") return "person";
  if (c.inputRule === "multi_face") return "duo";
  if (c.inputRule === "pet") return "pet";
  // inputRule이 없는 구형 컨셉 — 입력이 사람 사진이 아닌 것만 명시하고, 나머지는 GO 분류로 가른다.
  //   (실측: 홈 tags 기준 — 복원·부동산·인테리어·공장·중고차·고화질은 사진 자체가 대상, 홈카페·미니셰프는 음식)
  const NOT_PERSON = { soon: "other", restore: "other", realestate: "other", interior: "other", car: "other", factory: "other", upscale: "other",
                       nukki: "product", gravityad: "product", goods: "product", homecafe: "food", minichef: "food", selfwedding: "person",
                       baby: "duo" };   // 우리 아기 얼굴은? = 엄마+아빠 2장(app/baby/page.tsx 실측)
  if (NOT_PERSON[key]) return NOT_PERSON[key];
  if (/couple|friend|family|duo|pettwo|fourcutcouple/.test(key)) return "duo";
  if (/^pet|petstudio|petreceipt/.test(key) || goCat === "pet") return "pet";
  if (/food|menu|restaurant/.test(key)) return "food";
  if (/product|nukki/.test(key)) return "product";
  if (goCat === "family") return "duo";                                        // 가족·커플 카테고리 = 2인 이상
  if (["fun", "lifeshot", "beauty", "idcard", "business", "biz"].includes(goCat)) return "person";   // 셀카 1장 입력
  return "other";
}

function goCatOf(home, key) {
  const m = home.match(new RegExp(`^  ${key}: (\\[[^\\]]*\\]),`, "m"));
  if (!m) return null;
  try { return JSON.parse(m[1])[0] || null; } catch { return null; }
}
function cardTagOf(home, key) {
  const m = home.match(new RegExp(`\\{ id: "${key}",.*?tags: (\\[[^\\]]*\\])`, "s"));
  if (!m) return null;
  try { return JSON.parse(m[1])[0] || null; } catch { return null; }
}

const C = evalConst(readText("app/lib/concepts.ts"), "CONCEPTS");
const st = readWiringState();
const home = st.home.t;
const keys = Object.keys(C);

const rows = [];
const tally = { 라이브: 0, 숨김: 0, soon: 0 };
for (const key of keys) {
  const c = C[key];
  const w = wiringOf(key, st);
  const status = key === "soon" ? "soon" : (w.card && !w.cardLocked ? "라이브" : "숨김");
  tally[status]++;
  const goCat = goCatOf(home, key);
  const cat = cardTagOf(home, key) || (goCat ? GO_KO[goCat] || goCat : "-");
  rows.push({ key, title: c.title || "", engine: engineOf(key), input: inputTypeOf(key, c, goCat), status, cat,
              note: status === "숨김" ? (w.card ? "카드 주석 잠금" : "카드 없음") : "" });
}

const today = new Date().toISOString().slice(0, 10);
const L = [];
L.push(`# MOSPIC 컨셉 전체 목록`);
L.push(``);
L.push(`생성일 ${today} · 총 **${keys.length}종** — 라이브 ${tally.라이브} · 숨김 ${tally.숨김} · soon ${tally.soon}`);
L.push(``);
L.push(`> 이 파일은 \`node scripts/concept-list.mjs\` 가 \`app/lib/concepts.ts\`(VM 실평가)에서 만든다. 손으로 고치지 말 것 — launch 스테이지가 출시 커밋 때 다시 쓴다.`);
L.push(`> · 엔진: \`app/api/{키}/route.ts\` 모델 문자열. 자기 route 없는 biz*/id* 변형은 부모 route를 따른다(괄호 표기).`);
L.push(`> · inputType: 저장 칸이 없어 도출한다 — specs/{키}.json > inputRule(solo_face→person, multi_face→duo, pet) > 키·분류 휴리스틱(couple/friend/family→duo, pet→pet, food/menu→food, product/goods/nukki→product) > other.`);
L.push(`> · 상태: 홈 카드 열림=라이브 · 카드 주석/없음=숨김 · key "soon"=soon. 분류: 홈 카드 tags[0], 카드 없으면 GO 분류.`);
L.push(``);
L.push(`| # | 키 | 한글명 | 엔진 | inputType | 상태 | 시즌·분류 |`);
L.push(`|---:|---|---|---|---|---|---|`);
rows.forEach((r, i) => L.push(`| ${i + 1} | \`${r.key}\` | ${r.title} | ${r.engine} | ${r.input} | ${r.status}${r.note ? ` (${r.note})` : ""} | ${r.cat} |`));
L.push(``);
L.push(`## ★ 탈락·보류 (재론 금지 — 플레이북 §7)`);
L.push(``);
L.push(`| 키 | 판정 | 근거 | 리포 흔적 |`);
L.push(`|---|---|---|---|`);
for (const [k, verdict, why] of DROPPED) {
  const trace = [exists(`app/api/${k}/route.ts`) && "route", exists(`specs/${k}.json`) && "spec", exists(`examples/ba/${k}`) && "ba", C[k] && "concepts"].filter(Boolean).join("·") || "없음";
  L.push(`| \`${k}\` | ${verdict} | ${why} | ${trace} |`);
}
L.push(``);
const md = L.join("\n") + "\n";

if (check) {
  const cur = exists(OUT) ? readText(OUT) : "";
  const same = cur.replace(/^생성일 \S+/m, "") === md.replace(/^생성일 \S+/m, "");
  console.log(same ? `  ${OUT} 최신` : `  ${OUT} 갱신 필요`);
  process.exit(same ? 0 : 1);
}
fs.mkdirSync(abs("docs"), { recursive: true });
fs.writeFileSync(abs(OUT), md, "utf8");
console.log(`  ${OUT} — ${keys.length}종 (라이브 ${tally.라이브} · 숨김 ${tally.숨김} · soon ${tally.soon}) · 탈락·보류 ${DROPPED.length}`);
