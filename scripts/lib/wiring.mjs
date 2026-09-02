// scripts/lib/wiring.mjs — 8지점 배선. 지난 배치(4583041·0001765·9dac378)의 wire4.mjs를
// 키 하드코딩 없이 일반화한 것이다. 새 로직을 발명하지 않았다 — 앵커를 손으로 적던 것을
// "지금 리포의 꼬리 키"에서 자동으로 뽑아내게만 바꿨다.
//
// 8지점이 무엇인가 (지난 배치에서 확정된 목록)
//   ① concepts.ts  start 유니온에 키 추가
//   ② concepts.ts  CONCEPTS 객체에 블록 추가
//   ③ concepts.ts  conceptForGo 분기 추가
//   ④ page.tsx     GO_CATEGORIES 칩 매핑 추가
//   ⑤ page.tsx     홈 카드 추가(신설 시엔 ★주석 잠금 상태로)
//   ⑥ page.tsx     onClick 라우팅 분기 추가
//   ⑦ app/api/{키}/route.ts 실재
//   ⑧ app/{키}/page.tsx 실재
//   (+ Pro면 proConcepts.ts 배열)

import { load, exists, fail, planner } from "./repo.mjs";

// 지금 리포에서 "마지막으로 배선된 키" — 유니온 꼬리에서 읽는다.
// 앵커를 이 키로 잡으면 항상 꼬리에 이어 붙게 되어 기존 줄을 건드리지 않는다.
export function lastWiredKey(conText) {
  const m = conText.match(/\|\s*"([a-z0-9_]+)"\s*\|\s*"soon";/);
  if (!m) fail('concepts.ts에서 start 유니온 꼬리(| "…" | "soon";)를 못 찾았다');
  return m[1];
}

export function readWiringState() {
  const con = load("app/lib/concepts.ts");
  const home = load("app/page.tsx");
  const pro = load("app/lib/proConcepts.ts");
  return { con, home, pro, last: lastWiredKey(con.t) };
}

// 한 키의 배선 8지점 현재 상태 — 게이트와 멱등성 판정에 함께 쓴다.
export function wiringOf(key, st) {
  const cardRe = new RegExp(`^(\\s*)(//\\s*)?\\{ id: "${key}"`, "m");
  const card = st.home.t.match(cardRe);
  return {
    union: st.con.t.includes(`| "${key}" `),
    concepts: st.con.t.includes(`\n  ${key}: {`),
    forGo: st.con.t.includes(`if (go === "${key}") return CONCEPTS.${key};`),
    goCat: new RegExp(`^  ${key}: \\[`, "m").test(st.home.t),
    card: !!card,
    cardLocked: !!card && !!card[2],
    onClick: st.home.t.includes(`detail.start === "${key}"`),
    route: exists(`app/api/${key}/route.ts`),
    page: exists(`app/${key}/page.tsx`),
    pro: st.pro.t.includes(`"${key}"`),
    baLive: baLiveArray(st.con.t).includes(key),
    detailImage: st.con.t.includes(`detailImage: "/details/${key}.webp"`),
  };
}
export const wiredPoints = (w) => ["union", "concepts", "forGo", "goCat", "card", "onClick", "route", "page"].filter((k) => w[k]).length;

export function baLiveArray(conText) {
  const line = conText.split("\n").find((l) => l.startsWith("export const BA_LIVE"));
  if (!line) fail("concepts.ts에서 BA_LIVE 줄을 못 찾았다");
  return JSON.parse(line.replace(/^export const BA_LIVE: string\[\] = /, "").replace(/;$/, ""));
}

// CONCEPTS 안에서 한 키의 블록 전체(닫는 `  },\n` 포함)를 잘라낸다 — 꼬리 앵커로 쓴다.
export function conceptBlock(conText, key) {
  const head = `  ${key}: {\n`;
  const i = conText.indexOf(head);
  if (i < 0) return null;
  const end = conText.indexOf("\n  },\n", i);
  if (end < 0) return null;
  return conText.slice(i, end + "\n  },\n".length);
}

/**
 * 신규 키 배선을 계획한다. 실제 쓰기는 반환된 planner.apply()에서 일어난다.
 * card.locked=true면 홈 카드를 주석으로 넣는다(신설 단계 관례 — 자산 준비 전 노출 차단).
 */
export function planWiring(st, key, c, { locked = true } = {}) {
  const p = planner();
  const last = st.last;

  // ── 사전 조건: 신규 키가 어디에도 없어야 하고, route/page는 이미 있어야 한다
  const w = wiringOf(key, st);
  for (const [pt, on] of Object.entries({ union: w.union, concepts: w.concepts, forGo: w.forGo, goCat: w.goCat, card: w.card, onClick: w.onClick })) {
    if (on) p.note(`${key}: ${pt} 이미 배선돼 있다 — 신설이 아니다`);
  }
  if (!w.route) p.note(`app/api/${key}/route.ts 가 없다 — route 생성이 먼저다`);
  if (!w.page) p.note(`app/${key}/page.tsx 가 없다 — page 생성이 먼저다`);

  // ① 유니온 — 꼬리 "| soon" 앞에 끼운다
  p.plan(st.con, "①유니온", `| "${last}" | "soon";`, `| "${last}" | "${key}" | "soon";`);

  // ② CONCEPTS 블록 — 꼬리 키의 블록 바로 뒤. ★꼬리 개행을 지우지 않는다
  //    (2-A에서 개행을 지워 다음 블록이 같은 줄에 붙은 사고가 있었다.)
  const tailBlock = conceptBlock(st.con.t, last);
  if (!tailBlock) p.note(`concepts.ts에서 꼬리 키 ${last} 블록을 못 잘랐다`);
  else p.plan(st.con, "②CONCEPTS", tailBlock, tailBlock + conceptBlockText(key, c));

  // ③ conceptForGo
  const forGo = `  if (go === "${last}") return CONCEPTS.${last};\n`;
  p.plan(st.con, "③conceptForGo", forGo, forGo + `  if (go === "${key}") return CONCEPTS.${key};\n`);

  // ④ GO_CATEGORIES — 꼬리 키의 줄 뒤
  const goCatLine = (st.home.t.match(new RegExp(`^  ${last}: \\[[^\\]]*\\],\\n`, "m")) || [])[0];
  if (!goCatLine) p.note(`page.tsx GO_CATEGORIES에서 꼬리 키 ${last} 줄을 못 찾았다`);
  else p.plan(st.home, "④GO_CATEGORIES", goCatLine, goCatLine + `  ${key}: ${JSON.stringify(c.go)},\n`);

  // ⑤ 홈 카드 — 꼬리 키의 카드 줄 뒤(주석 상태 그대로 매칭)
  const cardLine = (st.home.t.match(new RegExp(`^\\s*(?://\\s*)?\\{ id: "${last}",.*\\n`, "m")) || [])[0];
  if (!cardLine) p.note(`page.tsx에서 꼬리 키 ${last} 카드 줄을 못 찾았다`);
  else p.plan(st.home, "⑤홈카드", cardLine, cardLine + cardText(key, c, locked));

  // ⑥ onClick — 꼬리 키 분기 뒤
  const click = ` else if (detail.start === "${last}") { window.location.replace("/${last}"); }`;
  p.plan(st.home, "⑥onClick", click, click + ` else if (detail.start === "${key}") { window.location.replace("/${key}"); }`);

  // Pro 배열 — 꼬리 원소 뒤
  if (c.engine === "pro") {
    const m = st.pro.t.match(/(\n)(\s*)("[a-z0-9_]+"(?:,\s*"[a-z0-9_]+")*,?)(\n\];)/);
    if (!m) p.note("proConcepts.ts 배열 꼬리를 못 찾았다");
    else p.plan(st.pro, "PRO_CONCEPTS", m[0], `${m[1]}${m[2]}${m[3]}${m[1]}${m[2]}"${key}",${m[4]}`);
  }
  return p;
}

export function conceptBlockText(key, c) {
  const ex = (c.examples || []).map(([e, a]) => `      { emoji: "${e}", accent: "${a}" },`).join("\n");
  return [
    `  ${key}: {`,
    `    key: "${key}", audience: "${c.audience || "all"}",`,
    `    coinCost: ${c.coinCost ?? 3},`,
    `    title: ${JSON.stringify(c.title)},`,
    `    subtitle: ${JSON.stringify(c.subtitle)},`,
    `    emoji: ${JSON.stringify(c.emoji)},`,
    `    accent: ${JSON.stringify(c.accent)},`,
    `    description: ${JSON.stringify(c.description)},`,
    `    examples: [`,
    ex,
    `    ],`,
    `    start: "${key}",`,
    ...(c.inputRule ? [`    inputRule: "${c.inputRule}",`] : []),
    `  },`,
    ``,
  ].join("\n");
}

export function cardText(key, c, locked) {
  const line = `      { id: "${key}", title: ${JSON.stringify(c.title)}, subtitle: ${JSON.stringify(c.subtitle)}, emoji: ${JSON.stringify(c.emoji)}, accent: ${JSON.stringify(c.accent)}, image: "/cards/${key}.webp", badge: "NEW", tags: ${JSON.stringify(c.tags)}, go: "${key}" },\n`;
  return locked ? `      // ★상세·썸네일 나올 때까지 잠금 — 자산 준비되면 이 줄의 // 만 지운다\n      // ${line.trimStart()}` : line;
}
