#!/usr/bin/env node
// scripts/new-concept.mjs — 컨셉 자동화 3호: route / launch / ba 오케스트레이터
//
// 무엇인가
//   지난 배치에서 사람이 스크래치 스크립트를 매번 새로 써서 돌리던 3단 공정을,
//   spec.json 하나로 실행하는 스테이지로 굳혔다. ★새 로직을 발명하지 않았다 —
//   6bd7c46·4583041·0001765·9dac378(route) / 034e419·5a87413(launch) /
//   b7f5d1e·9496d31·3b24b41(ba) 에서 검증된 절차를 그대로 옮긴 것이다.
//
// ★모든 스테이지가 지키는 3가지
//   1. 시작 전 작업 트리가 깨끗해야 한다 — 남의 변경에 내 변경을 섞지 않는다.
//   2. 앵커는 전수 사전검증한다 — 하나라도 어긋나면 파일을 한 글자도 안 쓰고 멈춘다.
//   3. 게이트가 하나라도 FAIL이면 커밋하지 않고 되돌린다(git checkout + 새 파일 삭제).
//
// ★기본이 dry-run이다. --run 없이는 파일을 쓰지 않는다.
//
// 사용법
//   node scripts/new-concept.mjs --spec specs/{키}.json --stage route
//   node scripts/new-concept.mjs --spec specs/{키}.json --stage route --run
//   node scripts/new-concept.mjs --spec specs/{키}.json --stage launch --run --no-push
//   node scripts/new-concept.mjs --spec specs/{키}.json --stage ba --run --no-commit

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT, abs, rel, md5, exists, load, readText, fail, need, planner } from "./lib/repo.mjs";
import { readWiringState, wiringOf, wiredPoints, planWiring, baLiveArray } from "./lib/wiring.mjs";
import { pickTemplate, checkPromptText, buildRoute, buildPage, writeRoute, writePage } from "./lib/templates.mjs";
import { extractPrompt, evalConst } from "./lib/prompt.mjs";
import * as G from "./lib/git.mjs";
import { prepend } from "./lib/worklog.mjs";
import { glamCheck, glamLabel } from "./lib/glam-check.mjs";

const sharp = need("sharp", "npm i -D sharp");

// ── CLI ─────────────────────────────────────────────────────────────────────
const args = { spec: null, stage: null, run: false, push: true, commit: true };
{
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--spec") args.spec = a[++i];
    else if (a[i] === "--stage") args.stage = a[++i];
    else if (a[i] === "--run") args.run = true;
    else if (a[i] === "--dry-run") args.run = false;
    else if (a[i] === "--no-push") args.push = false;
    else if (a[i] === "--no-commit") args.commit = false;
    else fail(`모르는 플래그: ${a[i]}`);
  }
  if (!args.spec) fail("--spec specs/{키}.json 이 필요하다");
  if (!["route", "launch", "ba"].includes(args.stage)) fail("--stage route|launch|ba 중 하나여야 한다");
}

const spec = JSON.parse(readText(args.spec));
const key = spec.key;
if (!Number.isInteger(spec.glam) || spec.glam < 1 || spec.glam > 5) fail(`spec에 "glam"(외모 1~5단계)이 없거나 범위 밖이다: ${JSON.stringify(spec.glam)}`);
const specPath = args.spec.split(path.sep).join("/");

// ── 게이트 보고 틀 ───────────────────────────────────────────────────────────
const gates = [];
const gate = (name, ok, note = "") => { gates.push({ name, ok: !!ok, note }); return !!ok; };
function report() {
  console.log(`\n  ── 게이트`);
  for (const g of gates) console.log(`     ${g.ok ? "PASS" : "★FAIL"}  ${g.name.padEnd(30)} ${g.note}`);
  return gates.every((g) => g.ok);
}

function build() {
  const t0 = Date.now();
  const out = execFileSync("npm", ["run", "build"], { cwd: ROOT, encoding: "utf8", maxBuffer: 128 * 1024 * 1024, shell: true });
  const line = out.split("\n").find((l) => l.includes("Compiled successfully"));
  return { ok: !!line, line: (line || "(Compiled successfully 줄 없음)").trim(), sec: ((Date.now() - t0) / 1000).toFixed(0) };
}

console.log(`\n■ ${key} — ${spec.name || ""}   [stage=${args.stage} · ${args.run ? "RUN" : "dry-run"} · ${glamLabel(spec.glam)}]`);

// ════════════════════════════════════════════════════════════════════════════
// stage: route — 4583041 공정
// ════════════════════════════════════════════════════════════════════════════
async function stageRoute() {
  const st = readWiringState();
  const w = wiringOf(key, st);

  // 멱등성 — 이미 배선돼 있으면 아무것도 하지 않는다
  if (wiredPoints(w) > 0) {
    console.log(`  배선 상태: ${wiredPoints(w)}/8 지점 이미 존재`);
    if (wiredPoints(w) === 8) fail(`${key}는 이미 8/8 배선돼 있다 — route 스테이지는 신설 전용이다(멱등: 변경 0)`);
    fail(`${key}가 ${wiredPoints(w)}/8 만 배선된 어중간한 상태다 — 손으로 확인할 것`);
  }

  const tpl = pickTemplate(spec);
  console.log(`  템플릿: ${tpl.combo} → ${tpl.tpl} (guide=${tpl.guide} · camera=${tpl.camera || "기본 user"} · faceCheck=${tpl.faceCheck} · label=${tpl.uploadLabel || "-"})`);

  // 프롬프트 확보 — 반드시 파일에서. route에서 뽑는 건 "이미 있는 컨셉"에만 쓴다.
  if (spec.prompt?.source !== "file") fail(`route 스테이지는 prompt.source="file"이어야 한다(현재 "${spec.prompt?.source}")`);
  if (!exists(spec.prompt.path)) fail(`프롬프트 파일이 없다: ${spec.prompt.path}`);
  const promptText = checkPromptText(readText(spec.prompt.path), key);
  const wantMd5 = md5(promptText);
  console.log(`  프롬프트: ${spec.prompt.path} · ${promptText.length}자 · md5 ${wantMd5.slice(0, 8)}`);

  // ★외모 코어 잠금 — 파일을 한 글자도 쓰기 전에. 실패면 진행 금지.
  const gc = glamCheck(promptText, { glam: spec.glam, inputType: spec.inputType });
  console.log(gc.report());
  if (!gc.ok) fail(`glam-check 실패 — 코어 정본(scripts/lib/glam-core)과 문자 일치시킬 것`);

  // 템플릿 원본 md5 — 나중에 무접촉 확인용
  const tplMd5 = {
    route: md5(readText(`app/api/${tpl.tpl}/route.ts`)),
    page: md5(readText(`app/${tpl.tpl}/page.tsx`)),
  };

  // 조립 (메모리에서만)
  const routeText = buildRoute(key, spec, tpl, promptText);
  const built = buildPage(key, spec, tpl);
  const pageText = built.text;
  if (built.koLeft) console.log(`  ⚠ 템플릿 한글 문구 "${spec.route.tplName}" 가 page에 ${built.koLeft}건 남았다 — route.replace 로 마저 바꿀 것`);

  const c = {
    engine: spec.engine, title: spec.name, subtitle: spec.route.subtitle, emoji: spec.route.emoji,
    accent: spec.route.color, description: spec.route.description, audience: spec.route.audience || "all",
    examples: spec.route.examples || [[spec.route.emoji, spec.route.color]],
    go: goCatOf(st, spec.route.chipFrom), tags: tagsOf(st, spec.route.chipFrom),
    inputRule: tpl.faceCheck ? "solo_face" : null, coinCost: spec.route.coinCost ?? 3,
  };
  console.log(`  칩 복사원 ${spec.route.chipFrom} → go=${JSON.stringify(c.go)} tags=${JSON.stringify(c.tags)}`);

  const newFiles = [`app/api/${key}/route.ts`, `app/${key}/page.tsx`];

  if (!args.run) {
    // dry-run: 배선 계획만 세워 앵커를 검증한다(쓰기 없음). route/page가 아직 없어
    // planWiring이 그걸 지적하는 건 정상 — 그 두 건만 걸러 보고한다.
    console.log(`\n  [dry-run] 만들 파일: ${newFiles.join(", ")}`);
    console.log(`  [dry-run] route ${routeText.length}자 · page ${pageText.length}자 (메모리에서만 조립)`);
    const p = planWiring(st, key, c, { locked: true });
    const real = p.errors.filter((e) => !/route\.ts 가 없다|page\.tsx 가 없다/.test(e));
    console.log(`  [dry-run] 배선 앵커 ${p.count}건 확인: ${p.labels.join(" · ")}`);
    console.log(`  [dry-run] 앵커 문제: ${real.length ? "★" + real.join(" / ") : "0건"}`);
    console.log(`\n  [dry-run] 외부 변경 0건. 적용하려면 --run.\n`);
    return true;
  }

  G.requireClean();
  writeRoute(key, routeText);
  writePage(key, pageText);
  const st2 = readWiringState();
  const p = planWiring(st2, key, c, { locked: true });
  const applied = p.apply();
  console.log(`  배선 적용 — ${applied.jobs}지점 · ${applied.files.join(", ")}`);

  // ── 게이트 ──
  const st3 = readWiringState();
  const w3 = wiringOf(key, st3);
  gate("배선 8/8", wiredPoints(w3) === 8, `${wiredPoints(w3)}/8`);
  gate("홈 카드 잠금", w3.cardLocked, w3.cardLocked ? "주석 상태" : "★열려 있음");
  gate("PRO_CONCEPTS 정합", spec.engine !== "pro" || w3.pro, spec.engine === "pro" ? (w3.pro ? "등록됨" : "★누락") : "해당 없음");

  let CONCEPTS = null;
  try { CONCEPTS = evalConst(st3.con.t, "CONCEPTS"); } catch (e) { /* 아래에서 FAIL */ }
  gate("CONCEPTS 직조회", !!CONCEPTS?.[key], CONCEPTS?.[key] ? `title=${CONCEPTS[key].title}` : "★조회 실패");

  // 프롬프트 재추출 md5 — 손으로 옮긴 구간이 0이라는 증명
  try {
    const got = extractPrompt(key, { duoGenders: spec.duo?.genders || null });
    if (spec.duo?.genders) {
      const base = got[0].text;
      const diffs = got.slice(1).map((g) => ({ label: g.label, n: diffLines(base, g.text) }));
      gate("프롬프트 재추출(duo)", diffs.every((d) => d.n === 5), diffs.map((d) => `${d.label}:${d.n}행`).join(" · ") + " (5행 단독이어야)");
    } else {
      gate("프롬프트 재추출 md5", md5(got[0].text) === wantMd5, `${md5(got[0].text).slice(0, 8)} vs 원본 ${wantMd5.slice(0, 8)}`);
    }
  } catch (e) { gate("프롬프트 재추출 md5", false, `★${String(e.message).slice(0, 90)}`); }

  gate("템플릿 무접촉", md5(readText(`app/api/${tpl.tpl}/route.ts`)) === tplMd5.route && md5(readText(`app/${tpl.tpl}/page.tsx`)) === tplMd5.page, tpl.tpl);
  gate("glam-check", gc.ok, `${glamLabel(spec.glam)}${gc.level ? ` · 코어 ${gc.level} 문자 일치` : " · 코어 검사 없음"}`);

  const changed = G.trackedChanges().map((l) => l.slice(3));
  const expect = ["app/lib/concepts.ts", "app/page.tsx", ...(spec.engine === "pro" ? ["app/lib/proConcepts.ts"] : [])];
  gate("변경 파일 = 예상", changed.every((f) => expect.includes(f)) && expect.every((f) => changed.includes(f)), changed.join(", ") || "(없음)");
  gate("이미지 변경 0", !changed.some((f) => G.IMG_RE.test(f)), "0건");

  const b = build();
  gate("빌드", b.ok, `${b.line} (${b.sec}s)`);

  const allPass = report();
  if (!allPass) {
    const r = G.rollback(newFiles);
    console.log(`\n  ★게이트 실패 — 되돌렸다. 복구 ${r.restored.length}파일 · 삭제 ${r.removed.length}파일\n`);
    process.exit(1);
  }
  if (!args.commit) {
    const r = G.rollback(newFiles);
    console.log(`\n  [--no-commit] 게이트 전항 PASS 확인 후 되돌렸다. 복구 ${r.restored.length} · 삭제 ${r.removed.length}\n`);
    return true;
  }

  // spec.prompt.source → "route" 로 승격 (이제 진실원이 route다)
  const s2 = JSON.parse(readText(specPath));
  s2.prompt = { source: "route" };
  fs.writeFileSync(abs(specPath), JSON.stringify(s2, null, 2) + "\n", "utf8");

  prepend(`${today()} — 신규 컨셉 신설: ${key} (${spec.name})`, [
    `[스테이지] new-concept.mjs --stage route · 템플릿 ${tpl.combo} → ${tpl.tpl}`,
    `[프롬프트] ${spec.prompt.path} → route 삽입 · md5 ${wantMd5.slice(0, 8)} · 재추출 일치`,
    `[외모] ${glamLabel(spec.glam)} · glam-check PASS${gc.level ? `(코어 ${gc.level})` : ""}`,
    `[배선] 8/8 · 홈 카드는 ★주석 잠금(자산 준비 후 launch 스테이지가 연다)`,
    `[게이트] ${gates.map((g) => g.name).join(" · ")} 전항 PASS`,
  ]);

  const staged = G.add([...expect, ...newFiles, specPath, "WORKLOG.md"]);
  console.log(`\n  스테이징 ${staged.length}개: ${staged.join(", ")}`);
  const hash = G.commit(`신규 컨셉 신설 — ${key} (홈 잠금, 기존 무접촉)`);
  console.log(`  커밋 ${hash}`);
  if (args.push) console.log(`  푸시 ${G.push()}`);
  return true;
}

// ════════════════════════════════════════════════════════════════════════════
// stage: launch — 5a87413 공정
// ════════════════════════════════════════════════════════════════════════════
async function stageLaunch() {
  const st = readWiringState();
  const w = wiringOf(key, st);
  if (wiredPoints(w) !== 8) fail(`배선이 ${wiredPoints(w)}/8 이다 — route 스테이지를 먼저 돌릴 것`);

  // 멱등성 — 이미 열려 있고 detailImage도 있으면 변경 0
  if (!w.cardLocked && w.detailImage) {
    console.log(`  이미 출시됨 — 카드 열림 · detailImage 있음 · webp ${["cards", "details"].filter((d) => exists(`public/${d}/${key}.webp`)).length}/2`);
    console.log(`\n  [멱등] 변경 0건.\n`);
    return true;
  }

  const src = { card: `public/cards/${key}.png`, detail: `public/details/${key}.png` };
  for (const [k, p] of Object.entries(src)) if (!exists(p)) fail(`${p} 가 없다 — detail-page.mjs 산출이 먼저다`);

  const plan = [];
  for (const [kind, p] of Object.entries(src)) {
    const dst = `public/${kind === "card" ? "cards" : "details"}/${key}.webp`;
    const m = await sharp(abs(p)).metadata();
    plan.push({ kind, p, dst, w: m.width, h: m.height });
  }
  console.log(`  webp 변환 계획:`);
  for (const j of plan) console.log(`     ${j.p} ${j.w}×${j.h} → ${j.dst}${j.kind === "card" && j.w > 1080 ? " (1080 축소)" : ""}`);

  if (!args.run) {
    console.log(`\n  [dry-run] 변경 예정: webp 2장 · concepts.ts detailImage · page.tsx 카드 주석 해제`);
    console.log(`  [dry-run] 외부 변경 0건.\n`);
    return true;
  }

  G.requireClean();
  const made = [];
  for (const j of plan) {
    // ★상세는 축소하지 않는다(글자 가독). 카드만 1080 초과 시 줄인다. 16383은 webp 한계.
    let img = sharp(abs(j.p), { limitInputPixels: false });
    if (j.kind === "card" && j.w > 1080) img = img.resize(1080);
    if (j.h > 16383) img = img.resize({ height: 16383, fit: "inside" });
    await img.webp({ quality: 85 }).toFile(abs(j.dst));
    const m = await sharp(abs(j.dst)).metadata();
    made.push(j.dst);
    console.log(`     ✔ ${j.dst} ${m.width}×${m.height} ${(fs.statSync(abs(j.dst)).size / 1024).toFixed(0)}KB`);
  }

  const st2 = readWiringState();
  const p = planner();
  const hasRule = st2.con.t.includes(`    start: "${key}",\n    inputRule:`);
  const from = hasRule ? `    start: "${key}",\n    inputRule:` : `    start: "${key}",\n  },`;
  const to = hasRule ? `    start: "${key}",\n    detailImage: "/details/${key}.webp",\n    inputRule:` : `    start: "${key}",\n    detailImage: "/details/${key}.webp",\n  },`;
  p.plan(st2.con, "detailImage", from, to);
  p.plan(st2.home, "카드 주석 해제", `      // { id: "${key}",`, `      { id: "${key}",`);
  const lockNote = (st2.home.t.match(new RegExp(`^      // ★상세·썸네일 나올 때까지 잠금[^\\n]*\\n(?=      \\{ id: "${key}",)`, "m")) || [])[0];
  if (lockNote) p.plan(st2.home, "잠금 주석 제거", lockNote, "");
  p.apply();

  const st3 = readWiringState();
  const w3 = wiringOf(key, st3);
  gate("배선 8/8 유지", wiredPoints(w3) === 8, `${wiredPoints(w3)}/8`);
  gate("카드 열림", !w3.cardLocked, w3.cardLocked ? "★잠김" : "노출");
  gate("detailImage", w3.detailImage, w3.detailImage ? "등록" : "★없음");
  gate("webp 2장", made.length === 2 && made.every((f) => exists(f)), made.join(", "));
  let CONCEPTS = null;
  try { CONCEPTS = evalConst(st3.con.t, "CONCEPTS"); } catch { /* 아래 FAIL */ }
  gate("CONCEPTS 직조회", CONCEPTS?.[key]?.detailImage === `/details/${key}.webp`, CONCEPTS?.[key]?.detailImage || "★없음");
  const changed = G.trackedChanges().map((l) => l.slice(3));
  gate("변경 파일 = 예상", changed.every((f) => ["app/lib/concepts.ts", "app/page.tsx"].includes(f)), changed.join(", "));
  gate("PNG 스테이징 0", !G.status().some((l) => !l.startsWith("??") && /\.png$/i.test(l)), "0건");
  const b = build();
  gate("빌드", b.ok, `${b.line} (${b.sec}s)`);

  if (!report()) { const r = G.rollback(made); console.log(`\n  ★되돌렸다 — 복구 ${r.restored.length} · 삭제 ${r.removed.length}\n`); process.exit(1); }
  if (!args.commit) { const r = G.rollback(made); console.log(`\n  [--no-commit] PASS 후 되돌렸다.\n`); return true; }

  prepend(`${today()} — ${key} 출시: 홈 노출 + 배선`, [
    `[스테이지] new-concept.mjs --stage launch`,
    `[자산] webp 2장(cards·details, q85) · 카드 1080 상한 · 상세 무축소`,
    `[배선] detailImage 등록 + 홈 카드 주석 해제`,
    `[게이트] ${gates.map((g) => g.name).join(" · ")} 전항 PASS`,
  ]);
  const staged = G.addWithImages(["app/lib/concepts.ts", "app/page.tsx", "WORKLOG.md"], made);
  console.log(`\n  스테이징 ${staged.length}개`);
  const hash = G.commit(`feat: ${key} 출시 — 홈 노출+배선`);
  console.log(`  커밋 ${hash}`);
  if (args.push) console.log(`  푸시 ${G.push()}`);
  return true;
}

// ════════════════════════════════════════════════════════════════════════════
// stage: ba — 9496d31 공정
// ════════════════════════════════════════════════════════════════════════════
async function stageBa() {
  const st = readWiringState();
  const w = wiringOf(key, st);
  if (wiredPoints(w) !== 8) fail(`배선이 ${wiredPoints(w)}/8 이다 — route 스테이지를 먼저 돌릴 것`);
  if (w.baLive) {
    const n = (readText(`app/${key}/page.tsx`).match(/pairs=\{\[([\d, ]+)\]/) || [])[1];
    console.log(`  이미 BA 등록됨 — BA_LIVE 포함 · pairs=[${n}]`);
    console.log(`\n  [멱등] 변경 0건.\n`);
    return true;
  }

  const pairs = spec.ba?.pairs;
  if (!pairs?.length) fail(`spec.ba.pairs 가 없다`);
  const srcDir = `examples/ba/${key}`;
  const dup = new Map();
  const jobs = [];
  for (const [i, pr] of pairs.entries()) {
    const n = i + 1;
    const [bIdx, aIdx] = pr;
    const bFiles = (Array.isArray(bIdx) ? bIdx : [bIdx]).map((x) => `${srcDir}/${key}_비포${x}.png`);
    const aFile = `${srcDir}/${key}_애프터${aIdx}.png`;
    for (const f of [...bFiles, aFile]) {
      if (!exists(f)) fail(`원료가 없다: ${f}`);
      const h = md5(fs.readFileSync(abs(f)).toString("base64").slice(0, 4096));
      dup.set(h, [...(dup.get(h) || []), f]);
    }
    jobs.push({ n, bFiles, aFile, duo: Array.isArray(bIdx) });
  }
  const dups = [...dup.values()].filter((v) => v.length > 1);
  console.log(`  원료 ${jobs.length}쌍 확인 · 중복 ${dups.length ? dups.map((v) => v.map((f) => path.basename(f)).join("=")).join(" / ") + " (썸네일 겹침은 무해)" : "0건"}`);

  if (!args.run) {
    console.log(`\n  [dry-run] 만들 webp: ${jobs.length * 2}장 → public/examples/ba/${key}-{before,after}-N.webp`);
    console.log(`  [dry-run] BA_LIVE 등록 + pairs=[${jobs.map((j) => j.n).join(", ")}]`);
    console.log(`  [dry-run] 외부 변경 0건.\n`);
    return true;
  }

  G.requireClean();
  const made = [];
  for (const j of jobs) {
    made.push(await makeBefore(j, key));
    made.push(await makePanel(j.aFile, `public/examples/ba/${key}-after-${j.n}.webp`));
  }
  console.log(`  자산 ${made.length}장 생성`);

  const st2 = readWiringState();
  const p = planner();
  const arr = baLiveArray(st2.con.t);
  const tail = `"${arr[arr.length - 1]}"];`;
  p.plan(st2.con, "BA_LIVE", tail, `"${arr[arr.length - 1]}", "${key}"];`);
  const pageF = load(`app/${key}/page.tsx`);
  const pm = pageF.t.match(/<BeforeAfterHero pairs=\{\[([\d, ]+)\]\.flatMap/);
  if (!pm) p.note(`${key} page에서 BeforeAfterHero pairs 앵커를 못 찾았다`);
  else {
    const want = jobs.map((j) => j.n).join(", ");
    if (pm[1] !== want) p.plan(pageF, "pairs", `pairs={[${pm[1]}].flatMap`, `pairs={[${want}].flatMap`);
  }
  p.apply();

  const st3 = readWiringState();
  const arr2 = baLiveArray(st3.con.t);
  gate("BA_LIVE 등록", arr2.includes(key), `${arr2.length}종 · 중복 ${arr2.length - new Set(arr2).size}건`);
  const pn = (readText(`app/${key}/page.tsx`).match(/pairs=\{\[([\d, ]+)\]/) || [])[1];
  gate("pairs = 실제 쌍 수", pn === jobs.map((j) => j.n).join(", "), `pairs=[${pn}] · 쌍 ${jobs.length}`);
  gate("자산 실재", made.every((f) => exists(f)), `${made.length}장`);
  gate("기존 BA 무접촉", arr2.slice(0, -1).join(",") === arr.join(","), "꼬리에만 추가");
  const changed = G.trackedChanges().map((l) => l.slice(3));
  gate("변경 파일 = 예상", changed.every((f) => ["app/lib/concepts.ts", `app/${key}/page.tsx`].includes(f)), changed.join(", ") || "(없음)");
  gate("원료 스테이징 0", !G.status().some((l) => l.includes("examples/ba/" + key + "/")), "0건");
  const b = build();
  gate("빌드", b.ok, `${b.line} (${b.sec}s)`);

  if (!report()) { const r = G.rollback(made); console.log(`\n  ★되돌렸다 — 복구 ${r.restored.length} · 삭제 ${r.removed.length}\n`); process.exit(1); }
  if (!args.commit) { const r = G.rollback(made); console.log(`\n  [--no-commit] PASS 후 되돌렸다.\n`); return true; }

  prepend(`${today()} — BA 배선: ${key} ${jobs.length}쌍`, [
    `[스테이지] new-concept.mjs --stage ba`,
    `[자산] 768×960(4:5) webp q85 ${made.length}장${jobs.some((j) => j.duo) ? " · 2인은 380+8+380 합성" : ""}`,
    `[배선] BA_LIVE 등록(${arr2.length}종) + pairs=[${pn}]`,
    `[게이트] ${gates.map((g) => g.name).join(" · ")} 전항 PASS`,
  ]);
  const staged = G.addWithImages(["app/lib/concepts.ts", `app/${key}/page.tsx`, "WORKLOG.md"], made);
  console.log(`\n  스테이징 ${staged.length}개`);
  const hash = G.commit(`BA 배선 — ${key} ${jobs.length}쌍`);
  console.log(`  커밋 ${hash}`);
  if (args.push) console.log(`  푸시 ${G.push()}`);
  return true;
}

// ── BA 패널 만들기 ───────────────────────────────────────────────────────────
const PW = 768, PH = 960;
// 세로비가 목표(4:5=0.8)보다 15% 넘게 길면 크게 잘라내야 한다 → 크롭 위치를 골라야 한다.
const NEEDS_CHOICE = (w, h) => h / w > (PH / PW) * 1.15;

async function makePanel(srcRel, dstRel) {
  const m = await sharp(abs(srcRel)).metadata();
  // 사람은 attention이 얼굴로 폭주해 정수리를 자른 전례가 있다 → 많이 잘라야 할 때만 top.
  const person = ["person", "duo"].includes(spec.inputType);
  const pos = NEEDS_CHOICE(m.width, m.height) ? (person ? "top" : "centre") : "attention";
  await sharp(abs(srcRel)).flatten({ background: "#ffffff" })
    .resize(PW, PH, { fit: "cover", position: pos === "attention" ? sharp.strategy.attention : pos })
    .webp({ quality: 85 }).toFile(abs(dstRel));
  console.log(`     ✔ ${dstRel}  ${m.width}×${m.height} → ${PW}×${PH}  crop=${pos}`);
  return dstRel;
}

// 2인 비포는 좌 380 + 흰 8 + 우 380 = 768×960 합성(라이브 관례 실측치)
async function makeBefore(j, k) {
  const dst = `public/examples/ba/${k}-before-${j.n}.webp`;
  if (!j.duo) return makePanel(j.bFiles[0], dst);
  const HW = 380, DIV = 8;
  const half = (f) => sharp(abs(f)).flatten({ background: "#ffffff" })
    .resize(HW, PH, { fit: "cover", position: sharp.strategy.attention }).png().toBuffer();
  await sharp({ create: { width: 2 * HW + DIV, height: PH, channels: 3, background: "#ffffff" } })
    .composite([{ input: await half(j.bFiles[0]), left: 0, top: 0 }, { input: await half(j.bFiles[1]), left: HW + DIV, top: 0 }])
    .webp({ quality: 85 }).toFile(abs(dst));
  console.log(`     ✔ ${dst}  2인 합성 ${HW}+${DIV}+${HW}×${PH}`);
  return dst;
}

// ── 잡동사니 ────────────────────────────────────────────────────────────────
function goCatOf(st, fromKey) {
  const m = st.home.t.match(new RegExp(`^  ${fromKey}: (\\[[^\\]]*\\]),`, "m"));
  if (!m) fail(`chipFrom "${fromKey}"의 GO_CATEGORIES 줄을 못 찾았다`);
  return JSON.parse(m[1]);
}
function tagsOf(st, fromKey) {
  const m = st.home.t.match(new RegExp(`\\{ id: "${fromKey}",.*?tags: (\\[[^\\]]*\\])`, "s"));
  if (!m) fail(`chipFrom "${fromKey}"의 홈 카드 tags를 못 찾았다`);
  return JSON.parse(m[1]);
}
const diffLines = (a, b) => {
  const A = a.split("\n"), B = b.split("\n");
  let n = 0;
  for (let i = 0; i < Math.max(A.length, B.length); i++) if (A[i] !== B[i]) n++;
  return n;
};
const today = () => new Date().toISOString().slice(0, 10);

// ── 실행 ────────────────────────────────────────────────────────────────────
const run = { route: stageRoute, launch: stageLaunch, ba: stageBa }[args.stage];
await run();
if (args.run && args.commit) console.log(`\n■ ${args.stage} 스테이지 완료\n`);
