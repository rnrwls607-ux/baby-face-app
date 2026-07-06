# MOSPIC 컨셉 프롬프트 V2 (강화판) — Claude Code 교체용

작성 2026-07-06 · 대상: MOSPIC 33개 컨셉(증명사진 id-*, 비즈프로필 biz-* 제외)
목적: 3대 부작용(닮지 않음 / 없던 특징 생성 / 입력 구도 유출)을 최소화하고, "잠금 강도 3단계"로 컨셉별 목적에 맞게 재설계한 강화 프롬프트.

---

## ★ Claude Code 실행 지침 (반드시 이 규칙대로)

너는 이 문서를 받은 Claude Code다. 아래 규칙을 지켜 프롬프트를 교체하라. 사용자는 비개발자다.

### 교체 방식(공통)
- 각 컨셉의 파일은 `app/api/<컨셉명>/route.ts` 다.
- 그 파일 안에서 **이미지/텍스트 생성 프롬프트로 쓰이는 템플릿 리터럴**(모델에 `text`로 전달되거나 `const prompt` / `const PROMPT` / `BASE_RULE` / `*_PROMPTS` 레코드에 담긴 백틱 문자열)의 **내용만** 아래 V2 프롬프트로 교체하라.
- **프롬프트 문자열 외의 코드(fetch 호출, cropToRatio, 에러 처리, POST 핸들러 등)는 절대 건드리지 마라.**
- 프롬프트 안의 코드 변수(`${imgs.length}`, `${styleLine}`, `${faceCount}`, `${BASE_RULE}` 등)는 V2에도 그대로 유지돼 있으니 그대로 둬라.

### 특수 케이스
- **era**: `BASE_RULE` 상수의 내용만 아래 [era BASE_RULE V2]로 교체. 5개 변형(joseon/gyeongseong/retro/medieval/future) 문구는 그대로 둔다(그들은 `${BASE_RULE}`를 참조).
- **petcostume**: 위와 동일 — `BASE_RULE`만 [petcostume BASE_RULE V2]로 교체. 5개 코스튬 변형은 그대로.
- **age**: 프롬프트가 2개(노화 old / 아기 baby)다. 둘 다 각각 V2로 교체.
- **petreceipt**: 이미지가 아니라 JSON 텍스트 프롬프트(한국어)다. 해당 한국어 프롬프트를 V2로 교체.

### 안전 절차(중요 — 한 번에 다 하지 말 것)
1. **군(A~E) 단위로** 교체하라. 한 군을 끝낼 때마다 멈춰라.
2. 각 군 교체 후 반드시 `npm run build`(또는 next build)를 실행해 **에러 0**을 확인하라. 에러가 나면 그 군을 롤백하고 사용자에게 어떤 파일에서 무슨 에러인지 보고하라.
3. 빌드 성공 시: 변경 파일 목록을 보여주고, 사용자에게 "이 군 배포할까요?"를 물어라. 배포는 사용자가 승인하면 `git add . && git commit -m "..." && git push`.
4. 각 컨셉 교체 시 **프롬프트 문자열만** 바뀌었는지(코드 diff가 문자열 내부에 한정되는지) 스스로 검증하라.
5. 교체 전 원본 프롬프트를 주석이나 별도 메모로 남기지 말고, git 이력으로만 관리하라(파일을 깔끔히 유지).

### 권장 순서
E군(food 등 상업 보정, 사용자가 실제 사고를 겪은 라인) → A군 → B군 → C군 → D군. 단, 사용자가 특정 군을 먼저 원하면 그 지시를 따른다.

---

# A. 인물 화보·프로필 (6종)

## 1. `lifeshot` — 강도 2 · 교체: const prompt

```text
TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must be instantly recognizable as the SAME person as the input, side by side. Make them look their absolute best through LIGHTING, GROOMING, and STYLING — never by reshaping facial features. "Them, on their best day," never a prettier different person.
2. COMPOSITION — the output is ALWAYS a vertical upper-body portrait as specified below. The input photos' framing, zoom, crop, and angle have ZERO influence on the output composition — even an extreme close-up selfie comes out as the standard upper-body portrait.

You are a high-end portrait photographer creating a trendy "lifeshot" profile photo. Take the person shown in the photo(s) and create a beautiful, natural, magazine-quality vertical portrait.

HOW TO USE THE INPUT PHOTOS
- The inputs are a reference for IDENTITY ONLY (face and hairstyle). Ignore their framing, zoom, background, lighting, and clothing completely.
- Do NOT average the faces across photos. Treat the clearest, most front-facing photo as the single primary reference; use the others only to confirm the true shape and proportions of the same features.

IDENTITY LOCK (highest priority — beauty comes from styling, never from changing the face):
- Reproduce the facial structure faithfully: the same face shape and width-to-length ratio, the same jaw and chin, the same cheek fullness, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing between all features. Keep natural asymmetries — they are part of the identity.
- Do NOT enlarge eyes, slim the jaw, raise the nose, or shift facial proportions in any way.
- Keep the apparent age and the person's TRUE skin tone (correct any color cast from the source lighting; the lighting color must never become the skin color).

SKIN
- Perfectly clean, smooth, healthy skin with a natural glow — treat shadows, contrast edges, and compression noise in the source as clean skin; do not invent moles, marks, or blemishes that are not there. Only a large, unmistakably real mole may remain, smaller and fainter. Soften pores and fine lines to about half strength — polished but real, never plastic.

LIFESHOT STYLING (where the magic is allowed — go all in here):
- Light, natural "no-makeup makeup" grooming that suits the person; neat, softly styled hair with natural shine (keep their own hairstyle and color, beautifully groomed).
- Soft natural lighting, gentle film-like color grading, shallow depth of field with a softly blurred background.
- Flattering but realistic; clean modern aesthetic like a Korean studio profile / SNS lifeshot.
- Tasteful, effortlessly stylish casual outfit that suits the person.
- Natural relaxed expression with an easy, warm micro-smile, looking toward camera.
- Tasteful neutral background (studio paper, soft gradient, or softly blurred cafe/outdoor). Upper-body vertical framing.

FINAL SELF-CHECK before output: next to the source photo, a family member must instantly say "same person — this is just a really good photo of them." If it reads as a different, prettier person, the result is wrong.

Photorealistic, high resolution, no text, no watermark, no border. Remember the two absolute rules: the SAME face, beautified only through light and styling, inside the SAME fixed composition.
```

## 2. `fashion` — 강도 3(인물·의상 잠금) · 교체: const prompt

```text
TWO ABSOLUTE RULES (these override everything else):
1. THE PERSON AND THE OUTFIT ARE UNTOUCHABLE — same recognizable face, same body shape and proportions, same pose, and the EXACT same clothing: every garment, color, pattern, layer, shoe, and accessory must stay identical, like a photo-retouch. NEVER invent, add, swap, restyle, or replace any item. Do not slim, elongate, or reshape the body.
2. COMPOSITION — keep the same framing and camera angle as the original photo so the full outfit remains visible exactly as shot. Only the background, lighting, and color grading change.

You are a professional fashion photographer shooting a brand lookbook. Transform this casual outfit photo into a polished fashion-lookbook editorial image.

PRESERVE (pixel-faithful intent):
- The person: their recognizable face and identity — same face shape and proportions, same eye shape and eyelid type, same nose, mouth, and eyebrows, keeping natural asymmetries. Keep their TRUE skin tone (correct only the color cast from bad source lighting). Clean natural skin — do not invent moles or blemishes that are not in the source.
- The outfit: every visible design detail — necklines, buttons, zippers, prints, logos, text on clothing (keep any lettering exactly as written), fabric type, fit, and how the clothes drape on the body. If a detail is unclear in the source, keep it neutral rather than inventing a new design.
- The pose and body: same stance, same limb positions, same body shape.

LOOKBOOK TREATMENT (the only changes allowed):
- Replace the messy or ordinary background with a clean editorial setting (studio seamless paper, minimal architectural wall, or softly blurred urban street) that complements the outfit's colors.
- Professional fashion lighting: soft, flattering, with natural skin tones and rich, accurate fabric colors and textures — make the TRUE colors of the clothing look their best, never shift them to different colors.
- Subtle magazine-grade color grading; crisp detail on the clothing; light cleanup of dust or wrinkles that are clearly accidental (keep intentional design creases and distressing).

FINAL SELF-CHECK before output: ① the owner of these clothes must be able to point at every item and say "yes, that's exactly my ○○"; ② the person must be instantly recognizable. If any garment changed design or color, the result is wrong.

Final look: photorealistic, high-resolution fashion lookbook photography. No text, no watermark, no border. Remember the two absolute rules: the person and outfit untouched, only the stage upgraded, in the original framing.
```

## 3. `idol` — 강도 2(스타일링 최대 허용) · 교체: const prompt

```text
TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must still be unmistakably the SAME person, but FULLY TRANSFORMED by professional idol makeup, hair, and styling. The goal is "them, debuting as an idol" — a real person after 3 hours in a top agency's styling room — never a generic pretty idol face and never an existing celebrity. Transform through MAKEUP, HAIR, STYLING, and LIGHTING at full strength; NEVER by reshaping the facial features themselves.
2. COMPOSITION — the output is ALWAYS a vertical upper-body portrait as specified below. The input photo's framing, zoom, crop, and angle have ZERO influence on the output composition.

You are a top K-pop entertainment company's profile photographer and chief stylist. Take the person in this photo and create their "idol debut profile" — the same person, styled and photographed like a K-pop idol.

HOW TO USE THE INPUT PHOTOS
- The inputs are a reference for IDENTITY ONLY (facial structure and features). Ignore their framing, zoom, background, lighting, clothing, and even their current grooming — the idol styling below replaces it.
- Do NOT average the faces across photos. Treat the clearest, most front-facing photo as the single primary reference; use the others only to confirm the true shape and proportions of the same features.

IDENTITY FOUNDATION (what makeup must be built ON TOP OF, never instead of):
- The same face shape and width-to-length ratio, the same jawline and chin, the same cheekbone structure, the same eye SIZE and shape and eyelid type (double eyelid stays double, monolid stays monolid — style the monolid beautifully as monolid idols do), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrow position, and the same spacing between all features. Keep the person's natural asymmetries.
- HARD LIMITS: do not enlarge the eyes, do not slim or sharpen the jaw, do not raise or narrow the nose, do not plump the lips, do not shift any facial proportion. Makeup may create the ILLUSION of definition (that is its job) — the underlying structure must not move.
- Keep the apparent age and sex characteristics.

FULL IDOL STYLING (go all in — this is the product):
- Makeup: complete, polished K-pop idol makeup that suits this person — flawless glowing "glass skin" base in their TRUE skin tone (correct source color cast; never lighten or darken their actual tone), defined eyeliner and idol-style eye makeup, softly shaded aegyo-sal if it suits them, groomed and shaped brows, gradient or full idol lip color, subtle face-definition shading and highlight done as visible MAKEUP.
- Hair: a trendy K-pop idol hairstyle and color that suits the person — restyling and recoloring the hair IS allowed and encouraged for this concept (clean salon-grade finish, natural hairline).
- Outfit: stylish stage-ready or photoshoot outfit (modern, tasteful — like an idol profile or album concept photo).
- Set: professional studio lighting with a clean, modern backdrop (soft solid tone or tasteful gradient); flawless but real skin texture — luminous, never plastic.
- Expression: confident, charming idol expression with presence; eyes engaged with the camera. Vertical upper-body framing.

FINAL SELF-CHECK before output: friends must react exactly like this — "no way, is that YOU?! You look like an idol!" It must be surprising (full transformation) AND instantly recognizable (same person). If it looks like a different person or a generic idol, the result is wrong.

Final look: photorealistic, high-resolution idol profile photography. No text, no watermark, no border. Remember the two absolute rules: the SAME facial structure underneath, FULL idol styling on top, inside the SAME fixed composition.
```

## 4. `graduation` — 강도 2(라이트) · 교체: const prompt

```text
TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must be instantly recognizable as the SAME person as the input, side by side. This is a graduation KEEPSAKE the family will frame — the face must be truly theirs. Enhance through grooming, lighting, and attire only; NEVER reshape facial features.
2. COMPOSITION — the output is ALWAYS a vertical upper-body portrait as specified below. The input photo's framing, zoom, crop, and angle have ZERO influence on the output composition — even an extreme close-up selfie comes out as the standard upper-body portrait.

You are a professional studio photographer shooting a graduation portrait. Take the person in this photo and create a proud, polished graduation photo of them.

HOW TO USE THE INPUT PHOTOS
- The inputs are a reference for IDENTITY ONLY (face and hairstyle). Ignore their framing, zoom, background, lighting, and clothing completely.
- Do NOT average the faces across photos. Treat the clearest, most front-facing photo as the single primary reference; use the others only to confirm the true shape and proportions of the same features.

IDENTITY LOCK (highest priority):
- Reproduce the facial structure faithfully: the same face shape and width-to-length ratio, the same jaw and chin, the same cheek fullness, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing between all features. Keep natural asymmetries — they are part of the identity.
- Keep the apparent age and the person's TRUE skin tone (correct any color cast from the source lighting; the lighting color must never become the skin color).
- Clean, natural skin: treat shadows, contrast edges, and compression noise as clean skin; do not invent moles or blemishes. Light, natural grooming only — this is a keepsake, not a fashion editorial.

GRADUATION STYLING:
- Dress them in a CLASSIC, universal graduation gown and mortarboard cap — timeless black academic dress with a simple neutral stole or collar, fitting naturally, with neat attire visible underneath. Do NOT imitate any specific school's official gown, crest, or colors — keep it elegant and generic.
- The mortarboard sits naturally on the head: keep their real hairline and hairstyle visible and natural beneath it — the face under the cap must remain 100% the same person.
- They may hold a diploma scroll or a small bouquet — if hands are visible, render them naturally with the correct number of fingers; if a hand would look awkward, keep it relaxed and simple or out of frame.
- Background: a clean graduation studio setting — soft neutral backdrop or a softly blurred campus scene with elegant, bright tones.
- Clean, soft, professional studio lighting; proud, happy, natural expression.
- Vertical upper-body portrait framing.

FINAL SELF-CHECK before output: next to the source photo, a family member must instantly say "same person — look at them graduating!" If not, the result is wrong.

Final look: photorealistic, high-resolution graduation studio photography. No text, no watermark, no border. Remember the two absolute rules: the SAME face under the cap, inside the SAME fixed composition.
```

## 5. `wedding` — 강도 2(스타일링 허용 높음) · 교체: const prompt

```text
TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must be unmistakably the SAME person as the input, transformed by full bridal/groom styling. The goal is "them, on their wedding day" — never a generic bride or groom. Transform through MAKEUP, HAIR, ATTIRE, and LIGHTING; NEVER by reshaping facial features.
2. COMPOSITION — the output is ALWAYS a vertical upper-body portrait of exactly ONE person, as specified below. The input photo's framing, zoom, crop, and angle have ZERO influence on the output composition.

You are a professional wedding photographer shooting a solo bridal / groom portrait. Take the person in this photo and create an elegant wedding studio portrait of them alone.

HOW TO USE THE INPUT PHOTOS
- The inputs are a reference for IDENTITY ONLY (facial structure and features). Ignore their framing, zoom, background, lighting, clothing, and current grooming — the wedding styling below replaces it.
- Do NOT average the faces across photos. Treat the clearest, most front-facing photo as the single primary reference; use the others only to confirm the true shape and proportions of the same features.
- Exactly ONE person in the output — the person from the photo, alone. Never add a partner or anyone else.

IDENTITY FOUNDATION (styling is built ON TOP OF this, never instead of it):
- The same face shape and width-to-length ratio, the same jawline and chin, the same cheekbones, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrow position, and the same spacing between all features. Keep natural asymmetries.
- HARD LIMITS: do not enlarge the eyes, slim the jaw, raise the nose, or shift any facial proportion. Makeup may create the ILLUSION of definition — the underlying structure must not move.
- Keep the apparent age and the person's TRUE skin tone (correct source color cast; never lighten or darken their actual tone). Clean skin — do not invent moles or blemishes; treat shadows and compression noise as clean skin.

WEDDING STYLING (go all in — this is the product):
- If the person presents as a woman: an elegant white wedding dress with refined detailing, a tasteful bridal hairstyle (updo or soft styling that suits her — restyling the hair IS allowed and encouraged for this concept), and complete soft bridal makeup: luminous base in her true tone, gentle eye definition, soft blush, an elegant lip — radiant but classic, built on her real features.
- If the person presents as a man: a refined tuxedo or classic wedding suit with a crisp shirt and bow tie or necktie, neat groom hair styling, clean subtle grooming.
- Render the attire with premium detail: realistic fabric behavior (satin sheen, lace texture, wool structure), clean seams and edges — the dress/suit must look expensive and real, never melted, smudged, or warped.
- If hands are visible, render them naturally with the correct number of fingers; a small bouquet is welcome if natural — otherwise keep hands relaxed and simple or out of frame.
- Background: a luxurious, airy wedding studio set — soft white and cream tones, elegant drapery or floral arrangements, dreamy soft-focus depth.
- Bright, soft, romantic studio lighting; graceful, happy, natural expression.
- Vertical upper-body portrait framing.

FINAL SELF-CHECK before output: next to the source photo, a family member must instantly say "same person — they look beautiful on their wedding day." If it reads as a different, generic bride or groom, the result is wrong.

Final look: photorealistic, high-resolution wedding studio photography. No text, no watermark, no border. Remember the two absolute rules: the SAME facial structure under the styling, exactly ONE person, inside the SAME fixed composition.
```

## 6. `xmas` — 강도 2(라이트, 사람/펫 이원) · 교체: const prompt

```text
TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must be instantly recognizable as the SAME person (or the SAME pet) as the input, side by side. Festive attire and the Christmas set are the transformation; the face — or the pet's face, breed, and markings — stays truly theirs. Never reshape facial features.
2. COMPOSITION — the output is ALWAYS a vertical upper-body portrait as specified below, with the subject as the clear HERO of the frame. The input photo's framing, zoom, crop, and angle have ZERO influence on the output composition.

You are a professional studio photographer shooting a warm Christmas portrait. Take the person (or pet) in this photo and create a cozy, festive Christmas studio portrait of them.

HOW TO USE THE INPUT PHOTOS
- The inputs are a reference for IDENTITY ONLY. Ignore their framing, zoom, background, lighting, and clothing completely.
- Do NOT average across photos. Treat the clearest, most front-facing photo as the single primary reference; use the others only to confirm the true features.

IDENTITY LOCK:
- For a PERSON: the same face shape and width-to-length ratio, the same jaw and chin, the same cheek fullness, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing between all features. Keep natural asymmetries, the apparent age, and their TRUE skin tone (correct any color cast from the source lighting). Clean natural skin — do not invent moles or blemishes; light cozy grooming is welcome.
- For a PET: the same breed, the same fur color and patterns, the same unique markings, the same eye color, the same face. The owner must instantly recognize their own pet.

CHRISTMAS STYLING (the allowed transformation):
- Dress them in cozy, tasteful Christmas attire that suits them (knit sweater, santa hat, scarf, or festive outfit — warm and charming, not costume-cheap). A santa hat must sit naturally without hiding the face: keep the hairline and face fully recognizable beneath it. For a pet, the outfit must fit naturally and look comfortable — never distorted anatomy, and the pet's face stays fully visible.
- Background: a beautifully decorated Christmas studio set — Christmas tree with warm fairy lights, soft bokeh, wrapped gifts, warm wooden tones.
- PROP BALANCE (important): the person/pet is the HERO and fills the frame as a portrait; the tree, lights, and gifts stay BEHIND and around them as a softly blurred backdrop. Props must never crowd, overlap, or outshine the subject.
- Warm, soft, golden studio lighting; cozy and joyful holiday mood; natural happy expression.
- Vertical upper-body portrait framing.

FINAL SELF-CHECK before output: next to the source photo, a family member (or the pet's owner) must instantly say "same person / same pet — how festive!" If the subject is lost among the decorations or looks like someone else, the result is wrong.

Final look: photorealistic, high-resolution holiday studio photography. No text, no watermark, no border. Remember the two absolute rules: the SAME subject, festive styling on top, hero of the SAME fixed composition.
```

---

# B. 시대·변신·아트 (6종)

## 7. `age` — 강도 2 · 교체: 프롬프트 2개(old, baby) 각각

### [age V2 — PROMPT_OLD (70세)]

```text
TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must be THIS exact person aged to ~70: instantly recognizable as the same individual, side by side with the source. Aging is the ONLY transformation allowed.
2. COMPOSITION — the output is ALWAYS a vertical upper-body portrait as specified below. The input photo's framing, zoom, crop, and angle have ZERO influence on the output composition — even an extreme close-up selfie comes out as the standard upper-body portrait.

You are a professional, photorealistic age-progression artist. Take the person in this photo and show how they will naturally look as a healthy, graceful person around 70 years old.

HOW TO USE THE INPUT PHOTO
- The input is a reference for IDENTITY ONLY (face, features, true coloring). Ignore its framing, zoom, background, lighting, and clothing completely.

STEP 1 — Read the person first:
Note their gender, ethnicity, skin tone, face shape, and distinctive features. The aged result MUST keep the same gender, the same ethnicity and skin tone, and the same core facial structure. This is an older version of THIS specific person — never a different elderly person.

STEP 2 — Preserve identity (MOST IMPORTANT):
- Keep the exact same face shape and width-to-length ratio, bone structure, eye size and shape, eyelid type (double eyelid stays double, monolid stays monolid), ears, nose bridge/width/tip, philtrum, mouth and lip shape, eyebrows, and the spacing/proportions between all features.
- Keep the person's natural asymmetries — they are part of the identity.
- Keep the same hairline pattern and a hairstyle that is a natural evolution of their current one — just grayed or whitened.
- Keep distinctive features (moles, dimples, single/double eyelids) exactly where they are. Do NOT invent new moles, marks, or scars that are not in the source — natural aging texture only.
- Anyone who knows them must instantly recognize this as the SAME person, simply much older.

STEP 3 — Apply realistic, natural aging to about 70:
- Gray or white hair with natural texture (somewhat thinner is fine), in a style that suits them.
- Believable signs of aging for around 70: forehead lines, crow's feet, nasolabial folds, gentle neck aging, softer facial contours, natural age spots and realistic skin texture. Subtle and believable — not exaggerated, not frail, not 90+.
- Render the skin in the person's TRUE tone — correct any color cast from the source lighting; the lighting color must never become the skin color.
- A warm, kind, natural expression. Neat, modern clothing suitable for a dignified senior.

Clean, soft studio-like lighting; simple neutral background; vertical upper-body portrait framing.

ABSOLUTELY AVOID:
- Changing gender, ethnicity, or skin tone.
- Turning them into a generic, unrelated elderly person.
- Over-aging (looking 90+, sickly, or frail), or any cartoon/illustration look.
- Any text, letters, watermark, or border.

FINAL SELF-CHECK before output: placed next to the source photo, a family member must instantly say "that's the same person, older." If not, the result is wrong.

Photorealistic, high resolution. Remember the two absolute rules: the SAME person's identity, inside the SAME fixed upper-body composition — regardless of how the input was framed.
```

### [age V2 — PROMPT_BABY (아기)]

```text
TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must be THIS exact person as a baby (2–3 years old): a believable younger version of the same individual, never a generic baby. Age-regression is the ONLY transformation allowed.
2. COMPOSITION — the output is ALWAYS a vertical upper-body portrait as specified below. The input photo's framing, zoom, crop, and angle have ZERO influence on the output composition.

You are a professional, photorealistic age-regression artist. Take the person in this photo and show how they looked as an adorable baby around 2 to 3 years old.

HOW TO USE THE INPUT PHOTO
- The input is a reference for IDENTITY ONLY (features, true coloring). Ignore its framing, zoom, background, lighting, and clothing completely.

STEP 1 — Read the person first:
Note their gender, ethnicity, skin tone, and distinctive facial features. The baby MUST keep the same gender, the same ethnicity and skin tone, and recognizable feature cues. This is THIS specific person as a baby — never a generic, unrelated baby.

STEP 2 — Preserve identity (MOST IMPORTANT):
- Make the baby a believable younger version of the same person: same eye shape and eyelid type (double eyelid stays double, monolid stays monolid), same (where natural) eye color, a similar nose and mouth impression, similar face width-to-length impression, and the same overall facial impression.
- Keep distinctive cues that translate to a baby (single/double eyelids, dimples, etc.). Do NOT invent moles or marks that are not in the source.
- Anyone who knows them should instantly say "that's definitely them as a baby."

STEP 3 — Render a healthy, happy toddler (about 2–3 years old):
- Natural, realistic toddler proportions: rounder face and fuller cheeks, larger eyes relative to the face, a small soft nose, soft baby skin. This must look like a real toddler — NOT an adult face shrunk down.
- Soft baby hair similar in color to the person's hair (sparse is fine, as is natural for a toddler).
- Render the skin in the person's TRUE tone — correct any color cast from the source lighting.
- A cute, simple toddler outfit; a bright, cheerful, natural expression.

Soft natural daylight, bright cozy mood; simple clean background; vertical upper-body portrait framing.

ABSOLUTELY AVOID:
- Changing gender, ethnicity, or skin tone.
- An uncanny "tiny adult" look (an adult-proportioned face on a baby).
- A generic baby that does not resemble the person.
- Any cartoon/illustration style, text, letters, watermark, or border.

FINAL SELF-CHECK before output: a family member must instantly say "that's them as a baby." If not, the result is wrong.

Photorealistic, high resolution. Remember the two absolute rules: the SAME person's identity as a toddler, inside the SAME fixed composition.
```

## 8. `era` — 강도 2 · 교체: BASE_RULE 상수만 (5개 변형은 그대로)

### [era BASE_RULE V2]

```text
TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — the output must be instantly recognizable as the SAME person as the input, side by side: same face shape and width-to-length ratio, same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), same ears, same nose bridge/width/tip, same philtrum, same lip shape and thickness, same eyebrows, same spacing between all features, keeping their natural asymmetries. Era-appropriate MAKEUP, HAIRSTYLING, and grooming ARE welcome and encouraged — style the person fully and beautifully for the era — but NEVER reshape the facial features themselves (no enlarging eyes, no slimming the jaw, no raising the nose). The goal is "the same person, styled for that era," never a different person.
2. COMPOSITION — the output is ALWAYS a vertical upper-body portrait, regardless of the input photo's framing, zoom, crop, or angle. Even an extreme close-up selfie must come out as the standard upper-body composition.

The input photo is a reference for IDENTITY ONLY — ignore its framing, background, lighting, and clothing. Render the skin in the person's TRUE tone (correct any color cast from the source lighting); do not invent moles or marks that are not in the source — treat shadows, contrast, and compression noise as clean skin. Period makeup may be applied on top of clean skin.

FINAL SELF-CHECK: next to the source photo, a family member must instantly say "same person, in that era." If not, the result is wrong.
Photorealistic, high resolution, no text, no watermark, no border.
```

## 9. `illust` — 강도 2(매체 변환, 구도 보존) · 교체: const prompt

```text
TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — every subject must be instantly recognizable in the illustration: the same person(s)/pet(s), just drawn. Simplify the RENDERING, never the IDENTITY.
2. COMPOSITION — preserve the original photo's composition exactly: same camera angle, same framing, same crop, same poses, same positions. Nothing moves, nothing is added, nothing is removed.

Transform this photo into a premium hand-drawn digital illustration, keeping the original scene and every subject's identity intact.

STEP 1 — Read the photo first:
Identify what is in the image (a single person, a couple, a group, a pet/animal, a landscape, or an object) and illustrate it accordingly. Keep the exact same number of subjects — never add or remove anyone.

STEP 2 — Preserve composition (do not move anything):
- Keep the same composition, camera angle, framing, crop, and every pose.
- Each subject must stay in the exact same position as in the original photo.

STEP 3 — Preserve identity (MOST IMPORTANT):
- For each person, keep their recognizable likeness: the same face shape and width-to-length proportions, the same eye shape and eyelid type (double eyelid stays double, monolid stays monolid), the same nose and mouth impression, the same hairstyle and hair color, the same expression, and the same outfit — so they are unmistakably the same person, just illustrated.
- FACES GET THE HIGHEST DETAIL: backgrounds may be simplified into clean illustrated shapes, but faces must keep enough drawn detail to stay clearly recognizable. Never let the illustration style blur, average, or "prettify" a face into a generic character.
- Keep each person's natural asymmetries and distinctive cues (dimples, beauty marks that exist in the source) — and do not invent new ones.
- When several people are present, illustrate each one from their own face. NEVER blend, swap, or average features between different people.
- For pets, keep the same breed, fur color/pattern, and markings.

STEP 4 — Apply the illustration style:
- Clean, confident line work with consistent weight.
- Soft painterly shading with smooth cel-style gradients and gentle, warm directional lighting.
- A harmonious, slightly warm color palette with clear soft highlights.
- The polished look of a high-end webtoon, animation key visual, or modern editorial illustration — charming, refined, and intentional.
- Simplify busy background details into clean illustrated shapes, while keeping the location clearly recognizable.

ABSOLUTELY AVOID:
- 3D render / CGI / plastic look.
- Childish doodle, chibi, caricature, or distorted proportions.
- A cheap photo filter — no leftover photographic textures, noise, or realism.
- Any text, letters, watermark, signature, frame, or border.

FINAL SELF-CHECK before output: someone who knows the people in the photo must instantly recognize each of them in the illustration. If any face reads as a generic character, the result is wrong.

Final result: one cohesive, hand-crafted digital illustration with no photo textures remaining. Remember the two absolute rules: same identities, same composition — only the medium changes.
```

## 10. `voxel` — 하이브리드(인물 완전 잠금 + 배경 블록화, 구도 보존) · 교체: const prompt

```text
TWO ABSOLUTE RULES (these override everything else):
1. THE PERSON IS UNTOUCHABLE — any person(s) in the photo must remain EXACTLY as in the original photograph: photorealistic, same face, same body, same pose, same clothing, same position, pixel-faithful. The blocky style must NEVER touch, restyle, or leak into the person — not the face, not the hair edges, not the clothing. The contrast between the REAL person and the blocky world is the whole point of this image.
2. COMPOSITION — preserve the original photo's composition exactly: same camera angle, same framing, same crop, same subject positions. Only the environment is rebuilt.

Transform this photo into a striking scene where the BACKGROUND and environment are completely rebuilt out of large, clearly identifiable 3D cube blocks — like a blocky 3D sandbox building game.

Background reconstruction:
- Rebuild buildings, walls, structures, terrain, and scenery using big, distinct cubic blocks (stone-like, brick-like, wood-like, grass/dirt, sand, glass cubes) chosen to match the colors and materials of the original scene.
- Keep large structures, architecture, and landscape shapes clearly recognizable — someone who knows the place should still recognize it, now made of blocks.
- Omit small noisy details (text, small signs, distant cars, random clutter) for a clean, bold block look.
- Use large, crisp blocks with visible cube faces and stair-stepped edges; avoid tiny noisy textures.
- Bright sunny daylight, defined blocky shadows, clear blue sky.
- The transition at the person's outline must be clean: the real person stands in front of the blocky world with a crisp, natural edge — no blocky pixels bleeding onto their silhouette, no photorealistic patches left in the background.

First-person game HUD overlay (generic blocky sandbox-game style):
- Add a centered crosshair, a bottom row item hotbar (square slots), simple health and hunger style icon bars above the hotbar, and the player's first-person arm/hand in the lower-right corner.
- Add small coordinate-style text (e.g., "XYZ: 128 / 64 / 256") in a corner.
- Keep the HUD generic — do not copy any specific company's exact logo or trademarked interface.

FINAL SELF-CHECK before output: ① the person must look like they were photographed and pasted from the real world — zero style change on them; ② the background must be fully blocky with no photorealistic leftovers. If either fails, the result is wrong.

High detail, bold, clean. No watermark; no text anywhere except the HUD elements described above. Remember the two absolute rules: the person untouched, the world rebuilt in blocks, in the original composition.
```

## 11. `figure` — 강도 2(매체 변환, 구도 보존) · 교체: const prompt

```text
TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — every person/pet must be instantly recognizable as themselves in figure form: the same face, hairstyle, expression, and outfit, faithfully sculpted. Translate the MATERIAL into figure form, never the IDENTITY.
2. COMPOSITION — preserve the original photo's composition exactly: same camera angle, same framing, same poses, same positions, recreated as a miniature. Nothing added, nothing removed, nothing moved.

Transform this photo into a HYPER-REALISTIC MACRO PHOTOGRAPH of a premium handcrafted miniature figure diorama — as if a beautifully sculpted collectible model of this exact scene is sitting on a real desk, photographed up close with a real camera.

SCENE PRESERVATION (most important):
- Keep the SAME composition, camera angle, framing, and poses. The viewer must instantly recognize it as the exact same scene, faithfully recreated in miniature.
- Keep the exact same number of subjects — never add or remove anyone.

IDENTITY IN FIGURE FORM (highest priority):
- For each person: sculpt and paint the FACE with the HIGHEST detail of the whole figure — the same face shape and width-to-length proportions, the same eye shape and eyelid type (double eyelid stays double, monolid stays monolid), the same nose and mouth impression, the same eyebrows, the same hairstyle and hair color, the same expression, and the same outfit with its real colors and patterns. Someone who knows them must instantly say "that's a figure of them."
- Keep each person's distinctive cues (dimples, glasses, beard) — and do not invent new ones. Keep natural facial asymmetries; do not "prettify" or average the face into a generic anime-style or doll-style character.
- When several people are present, sculpt each one from their own face. NEVER blend, swap, or average features between different people.
- Tasteful, lifelike figure proportions matching the real people's body proportions (NOT extreme chibi, NOT elongated, NOT a different person).
- For pets, keep the same breed, fur color/pattern, and markings in sculpted form.

FIGURE MATERIAL & SCULPT (make it look like a real collectible):
- High-end collectible PVC/resin figure: smooth surfaces with a subtle satin sheen, crisp hand-painted detail, fine visible brush/airbrush shading, clean sculpted edges, tiny realistic highlights on raised areas.
- Believable miniature scale cues: slightly soft sculpted micro-details, gentle seam lines, realistic paint depth.

DIORAMA BASE & SET:
- Place the whole scene on a small detailed diorama base / round display stand with realistic miniature materials (tiny textured ground, mini props, scaled-down environment rebuilt from the original background).
- The base sits on a real wooden desk or tabletop.

MACRO / TILT-SHIFT LOOK (this sells the "tiny real model" illusion):
- Strong shallow depth of field: the figure is razor-sharp in focus while the foreground and background fall off into a soft creamy blur (pronounced tilt-shift / macro bokeh).
- Real studio product-shot lighting: soft key light, gentle rim light, realistic soft shadows on the desk.
- Slightly blurred real-world room/desk in the background to reinforce that this is a physical object on a real table.

FINAL SELF-CHECK before output: someone who knows the people must instantly recognize each figure as that specific person. If any figure reads as a generic doll or anime character, the result is wrong.

FINAL LOOK: a crisp, professional macro product photograph of an adorable, highly detailed figure diorama you'd want to collect. Photorealistic — like a real photo of a real figure, NOT a 3D render, NOT a cartoon. No text, no logos, no watermark, no border. Remember the two absolute rules: same identities in figure form, same composition — only the material changes.
```

## 12. `hairstyle` — 얼굴 강도 1급 잠금(헤어만 변환) · 교체: const prompt

```text
TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY — ONLY the hair changes. The face must remain EXACTLY the same person: this is a salon PREVIEW, so if the face changes even slightly, the preview becomes useless. No beautifying, no reshaping, no makeup changes — the person's real face under a new hairstyle.
2. COMPOSITION — the output is ALWAYS a vertical upper-body portrait as specified below. The input photo's framing, zoom, crop, and angle have ZERO influence on the output composition — even an extreme close-up selfie comes out as the standard upper-body portrait.

You are a professional hair-salon visualization artist. Take the person in the photo(s) and show them with a fresh, trendy new hairstyle so they can preview a salon change before committing.

HOW TO USE THE INPUT PHOTOS
- The inputs are a reference for the FACE (identity) only. Ignore their framing, zoom, background, lighting, and clothing. The original hairstyle is replaced by this concept.
- Do NOT average the faces across photos. Treat the clearest, most front-facing photo as the single primary reference; use the others only to confirm the true shape and proportions of the same features.

FACE LOCK (highest priority — replicate, do not redesign):
- Reproduce the face exactly as in the primary photo: the same face shape and width-to-length ratio, the same jaw and chin, the same cheek fullness, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing between all features. Keep natural asymmetries — they are part of the identity.
- Keep the person's TRUE skin tone (correct any color cast from the source lighting; the lighting color must never become the skin color). Keep clean, natural skin — do not invent moles, marks, or blemishes that are not in the source; treat shadows, contrast edges, and compression noise as clean skin.
- Keep the apparent age, expression character, glasses (if worn), and facial hair exactly as in the source.

THE NEW HAIR (the only transformation):
- Apply a natural, fashionable hairstyle that suits this person's face shape (modern Korean salon style) — a style a real stylist would actually recommend for them.
- Keep the hair realistic with natural texture, volume, and a believable hairline that matches the person's real hairline position; blend it naturally with the face and lighting. No wig-like edges, no floating hair.
- Render the new hair in a realistic color that suits them (natural tones unless the source hair is already vividly colored).

Clean, even lighting; simple neutral background; vertical portrait framing, upper body. Photorealistic, high resolution, no text, no watermark, no border.

FINAL SELF-CHECK before output: cover the hair with your hand — the face alone must be instantly identifiable as this exact person. If not, the result is wrong.

Remember the two absolute rules: the SAME face, ONLY the hair changed, inside the SAME fixed composition.
```

---

# C. 2인·다인원·네컷 (9종)

## 13. `couple` — 강도 2 × 2인 개별 잠금 · 교체: const prompt

```text
TWO ABSOLUTE RULES (these override everything else):
1. BOTH IDENTITIES ARE LOCKED INDIVIDUALLY — person A's face must match image 1 exactly, and person B's face must match image 2 exactly, each judged on its own. Treat this as TWO separate identity-preservation jobs happening in one photo: NEVER mix, blend, average, or swap any feature between the two people, and never let their faces drift toward looking alike.
2. COMPOSITION — the output is ALWAYS one vertical portrait with EXACTLY TWO people, both clearly visible from the waist up, both faces at a similar scale and the same level of detail. The input photos' framing, zoom, crop, and angle have ZERO influence on the output composition.

Image 1 shows person A. Image 2 shows person B. Create ONE single photorealistic studio couple portrait showing BOTH people together in the same photo, standing or sitting close together like a loving couple.

HOW TO USE THE INPUT PHOTOS
- Each image is an identity reference for ITS person only (face and hairstyle): image 1 → person A, image 2 → person B. Ignore each input's framing, zoom, background, lighting, and clothing.
- If an input photo contains more than one person, use the clearest, most prominent person in that photo.
- Place person A on the LEFT and person B on the RIGHT, so each person is easy to identify.

PER-PERSON IDENTITY LOCK (apply to EACH person separately):
- The same face shape and width-to-length ratio, the same jaw and chin, the same cheek fullness, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing between features. Keep each person's natural asymmetries and apparent age.
- Keep each person's TRUE skin tone individually — the two people may have different skin tones; correct source color casts per person and never unify their tones.
- Clean natural skin on both — do not invent moles or blemishes on either person; treat shadows, contrast edges, and compression noise as clean skin.

ANTI-BLEND (the #1 failure mode of two-person shots):
- Do NOT unify or harmonize their faces. If one face is rounder and the other sharper, keep that contrast. Realistic height and build differences stay true to each person.

Studio styling:
- A premium couple studio photoshoot: coordinated neat outfits (smart casual or semi-formal that suit each person), natural affectionate poses (side by side, slight lean-in, or gentle hand on shoulder).
- Clean studio backdrop in a soft tasteful tone, professional soft lighting, gentle depth of field.
- Warm, happy, natural expressions on both, eyes engaged with the camera.
- If hands are visible (holding hands, hand on shoulder), render them naturally with the correct number of fingers; if a hand would look awkward, keep it relaxed and simple or out of frame.

FINAL SELF-CHECK before output: cover person B with your hand — A's family must instantly say "that's A." Cover person A — B's family must instantly say "that's B." If either face reads as a stranger, or as a mix of the two, the result is wrong.

Vertical framing with both people clearly visible from the waist up. Photorealistic, high resolution, no text, no watermark, no border. Remember the two absolute rules: TWO people, each exactly themselves, inside the fixed waist-up composition.
```

## 14. `friend` — 강도 2 × 2인 개별 잠금(손 리스크 높음) · 교체: const prompt

```text
TWO ABSOLUTE RULES (these override everything else):
1. BOTH IDENTITIES ARE LOCKED INDIVIDUALLY — person A's face must match image 1 exactly, and person B's face must match image 2 exactly, each judged on its own. Treat this as TWO separate identity-preservation jobs in one photo: NEVER mix, blend, average, or swap any feature between the two friends, and never let their faces drift toward looking alike.
2. COMPOSITION — the output is ALWAYS one vertical snap with EXACTLY TWO people, both clearly visible from the waist up, both faces at a similar scale and the same level of detail. The input photos' framing, zoom, crop, and angle have ZERO influence on the output composition.

Image 1 shows person A. Image 2 shows person B. Create ONE single photorealistic friendship snap photo showing BOTH friends together in the same photo, having fun side by side.

HOW TO USE THE INPUT PHOTOS
- Each image is an identity reference for ITS person only (face and hairstyle): image 1 → person A, image 2 → person B. Ignore each input's framing, zoom, background, lighting, and clothing.
- If an input photo contains more than one person, use the clearest, most prominent person in that photo.
- Place person A on the LEFT and person B on the RIGHT.

PER-PERSON IDENTITY LOCK (apply to EACH person separately):
- The same face shape and width-to-length ratio, the same jaw and chin, the same cheek fullness, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing between features. Keep each person's natural asymmetries, apparent age, and TRUE skin tone (corrected per person, never unified).
- Clean natural skin on both — do not invent moles or blemishes; treat shadows and compression noise as clean skin.

ANTI-BLEND:
- Do NOT unify or harmonize their faces or builds — real friends look different, and that contrast is the charm of the photo.

Friendship snap styling:
- A trendy "bestie" photo: cheerful natural poses (shoulder to shoulder, playful peace signs, or laughing together), stylish casual outfits that suit each person.
- HANDS (high-risk in playful poses): every visible hand must have exactly five correct fingers with natural proportions — a peace sign shows exactly two raised fingers. If any gesture would look awkward or tangled, simplify it (relaxed hands, arms around shoulders) rather than forcing it.
- Background: a bright clean studio backdrop OR a softly blurred trendy street/cafe scene with warm film-like color grading.
- Bright, joyful, genuine expressions on both — natural laughter is welcome, but each face must stay clearly recognizable (no extreme distortion from exaggerated expressions).

FINAL SELF-CHECK before output: cover person B — A's family must instantly say "that's A." Cover person A — B's family must instantly say "that's B." Count the fingers on every visible hand. If a face reads as a stranger or a mix, or any hand is wrong, the result is wrong.

Vertical framing with both people clearly visible from the waist up. Photorealistic, high resolution, no text, no watermark, no border. Remember the two absolute rules: TWO friends, each exactly themselves, inside the fixed waist-up composition.
```

## 15. `hanbokcouple` — 강도 2(스타일링 높음) × 2인 잠금 + 한복 구조 잠금 · 교체: const prompt

```text
TWO ABSOLUTE RULES (these override everything else):
1. BOTH IDENTITIES ARE LOCKED INDIVIDUALLY — person A's face must match image 1 exactly, and person B's face must match image 2 exactly, each judged on its own. Full traditional wedding styling is the product, but it is built ON TOP of each person's real face: NEVER mix, blend, or average features between the two, and NEVER reshape either face.
2. COMPOSITION — the output is ALWAYS one vertical portrait with EXACTLY TWO people, both clearly visible from the waist up, both faces at a similar scale and detail. The input photos' framing, zoom, crop, and angle have ZERO influence on the output composition.

Image 1 shows person A. Image 2 shows person B. Create ONE single photorealistic traditional Korean wedding portrait showing BOTH people together in the same photo, dressed in beautiful wedding hanbok.

HOW TO USE THE INPUT PHOTOS
- Each image is an identity reference for ITS person only (face): image 1 → person A, image 2 → person B. Ignore each input's framing, zoom, background, lighting, clothing, and current grooming — the wedding hanbok styling below replaces it.
- If an input photo contains more than one person, use the clearest, most prominent person.
- Place person A on the LEFT and person B on the RIGHT.

PER-PERSON IDENTITY LOCK (styling is built on top of this, never instead of it):
- For EACH person: the same face shape and width-to-length ratio, the same jaw and chin, the same cheekbones, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing between features. Keep natural asymmetries, apparent age, and each person's TRUE skin tone (corrected per person, never unified).
- HARD LIMITS: no enlarging eyes, no slimming jaws, no raising noses. Elegant traditional-style makeup and neat hair styling that suit each person ARE welcome — as visible styling on their real features.
- Clean skin — do not invent moles or blemishes.

HANBOK WEDDING STYLING (go all in — this is the product):
- Dress each person in an elegant traditional Korean wedding hanbok that suits them: rich silk fabrics, refined traditional colors, tasteful norigae or traditional accessories; for a woman, an elegant chima-jeogori in festive bridal tones with a tasteful hair ornament; for a man, a dignified jeogori-baji with a vest or durumagi in deep tones.
- HANBOK STRUCTURE MUST BE CORRECT (critical): a clean white dongjeong collar line on each jeogori; the otgoreum (front ribbon) properly tied with a natural bow shape and smoothly hanging tails — never melted, tangled, fused, or floating ties; if saekdong (rainbow stripes) appears, the stripes stay crisp, parallel, and evenly colored; silk drapes and folds behave like real fabric.
- Background: a graceful traditional Korean setting — a hanok courtyard or an elegant studio with hanji tones and subtle traditional patterns, soft warm lighting.
- Warm, happy, loving expressions; natural couple poses standing close together. If hands are visible, render them naturally with the correct number of fingers; hands gently clasped in traditional style are welcome — if a gesture would look awkward, simplify it.

FINAL SELF-CHECK before output: cover person B — A's family must instantly say "that's A in wedding hanbok." Cover person A — B's family must say the same for B. Check the otgoreum ties and collar lines on both hanbok — if any tie is melted or any face reads as a mix, the result is wrong.

Vertical framing with both people clearly visible from the waist up. Photorealistic, high resolution, no text, no watermark, no border. Remember the two absolute rules: TWO people, each exactly themselves under the styling, inside the fixed waist-up composition.
```

## 16. `family` — 강도 2 × N인 개별 잠금 + 인원수 잠금 · 교체: const prompt (${imgs.length} 유지)

```text
TWO ABSOLUTE RULES (these override everything else):
1. EVERY IDENTITY IS LOCKED INDIVIDUALLY — each person's face must exactly match their own source image, judged one by one. Treat this as ${imgs.length} separate identity-preservation jobs happening in one photo: NEVER mix, blend, average, or swap features between ANY two people. Real family members may naturally resemble each other, but each face must be built ONLY from its own source photo — never nudged toward a "family average." Exactly ${imgs.length} people appear, each exactly once: never add, remove, or duplicate anyone.
2. COMPOSITION — the output is ALWAYS one vertical family portrait with all ${imgs.length} people clearly visible from the waist up, every face unobstructed, at a similar scale and the same level of detail. The input photos' framing, zoom, crop, and angle have ZERO influence on the output composition.

Each of the ${imgs.length} input images shows ONE member of the same family. Create ONE single photorealistic family studio portrait showing ALL ${imgs.length} of them together in the same photo.

HOW TO USE THE INPUT PHOTOS
- Each image is an identity reference for ITS person only (face and hairstyle). Ignore each input's framing, zoom, background, lighting, and clothing.
- If an input photo contains more than one person, use the clearest, most prominent person in that photo.

PER-PERSON IDENTITY LOCK (apply to EACH of the ${imgs.length} people separately):
- The same face shape and width-to-length ratio, the same jaw and chin, the same cheek fullness, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing between features. Keep each person's natural asymmetries.
- AGE IS PART OF IDENTITY: keep each person's apparent age exactly — children stay children at their real age, adults stay their age, seniors stay seniors. Never de-age a grandparent or age up a child.
- Keep each person's TRUE skin tone individually (correct source color casts per person; family members' tones may differ — never unify them).
- Clean natural skin on everyone — do not invent moles or blemishes on anyone; treat shadows, contrast edges, and compression noise as clean skin.

ANTI-BLEND (the #1 failure mode as the group grows):
- The more people in the frame, the stronger the pull toward averaged, similar faces — resist it completely. Each face keeps its own distinct structure, and realistic height/build/age differences between members stay true.

Family studio styling:
- A premium family photo studio shoot: coordinated neat outfits in harmonious tones that suit each person (age-appropriate for children and seniors), natural warm family poses — standing/sitting close together, arms around shoulders, taller members naturally behind or beside shorter ones.
- Clean studio backdrop in a soft tasteful tone, professional soft lighting, gentle depth of field.
- Warm, happy, natural expressions on everyone, eyes toward the camera.
- If hands are visible (arms around shoulders, holding hands), render every hand naturally with the correct number of fingers; if a gesture would look awkward or tangled between people, simplify it.

FINAL SELF-CHECK before output: count the people — exactly ${imgs.length}. Then go face by face: covering everyone else, each person's own family must instantly say "that's them." If the count is wrong, or any face reads as a stranger or a blend of relatives, the result is wrong.

Vertical framing with every person clearly visible from the waist up. Photorealistic, high resolution, no text, no watermark, no border. Remember the two absolute rules: ${imgs.length} people, each exactly themselves, inside the fixed waist-up composition.
```

## 17. `familypet` — 강도 2 × N인 잠금 + 펫 강도 3급 잠금 · 교체: const prompt

```text
TWO ABSOLUTE RULES (these override everything else):
1. EVERY IDENTITY IS LOCKED INDIVIDUALLY — the PET must exactly match image 1: the same breed, the same fur color and patterns, the same unique markings, the same eye color, the same face; the owner must instantly recognize their own pet — never a different animal or a different individual of the same breed. Each PERSON's face must exactly match their own source image, judged one by one — NEVER mix, blend, or average features between any two people. Everyone appears exactly once: all the people AND the pet, nobody added, removed, or duplicated.
2. COMPOSITION — the output is ALWAYS one vertical family portrait with every person clearly visible from the waist up and the pet fully visible (face unobstructed), all faces at a similar scale and the same level of detail. The input photos' framing, zoom, crop, and angle have ZERO influence on the output composition.

Image 1 shows the family's beloved PET. Each of the remaining input images shows ONE human member of the same family. Create ONE single photorealistic family studio portrait showing ALL the people AND the pet together in the same photo.

HOW TO USE THE INPUT PHOTOS
- Image 1 is the identity reference for the PET only. Each remaining image is the identity reference for ITS person only (face and hairstyle). Ignore each input's framing, zoom, background, lighting, and clothing.
- If an input photo contains more than one subject, use the clearest, most prominent one.

PET IDENTITY LOCK (image 1 — treat like a photo-retouch subject):
- Same breed, same size class and body proportions for that breed (a small dog stays small, a large dog stays large — never resize the pet unnaturally), same fur length and texture, same color patches in the same places, same unique markings, same eye color, same ear shape and posture, same face.
- The pet's anatomy stays natural and comfortable in the pose — held in someone's arms or sitting beside the family with realistic weight and posture; never distorted, stretched, or doll-like. The pet's face stays fully visible.

PER-PERSON IDENTITY LOCK (apply to EACH person separately):
- The same face shape and width-to-length ratio, the same jaw and chin, the same cheek fullness, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing between features. Keep natural asymmetries.
- AGE IS PART OF IDENTITY: children stay children, adults stay their age, seniors stay seniors.
- Keep each person's TRUE skin tone individually (never unified), and clean natural skin on everyone — no invented moles or blemishes.

ANTI-BLEND:
- Never average faces toward a "family look," and never let the pet drift toward a generic animal of its breed. Every subject is a specific individual.

Family studio styling:
- A premium family photo studio shoot: coordinated neat outfits, the pet held naturally in someone's arms or sitting adorably beside the family.
- If the pet is held: the holder's hands and arms wrap the pet naturally with the correct number of fingers, supporting its real weight; the pet's body is not squashed or bent unnaturally.
- Clean studio backdrop in a soft tasteful tone, professional soft lighting; warm, happy, natural expressions on everyone — the pet calm and bright-eyed.

FINAL SELF-CHECK before output: first, the owner must instantly say "that's MY pet" (breed, markings, size all correct). Then go person by person — each must be instantly recognizable to their own family. If the pet reads as a different animal, or any face reads as a stranger or a blend, the result is wrong.

Vertical framing with everyone (including the pet) clearly visible. Photorealistic, high resolution, no text, no watermark, no border. Remember the two absolute rules: every person exactly themselves AND the exact same pet, inside the fixed composition.
```

## 18. `familyhanbok` — 강도 2 × N인 잠금 + 한복 구조 잠금 · 교체: const prompt (${imgs.length} 유지)

```text
TWO ABSOLUTE RULES (these override everything else):
1. EVERY IDENTITY IS LOCKED INDIVIDUALLY — each person's face must exactly match their own source image, judged one by one. This is ${imgs.length} separate identity-preservation jobs in one photo: NEVER mix, blend, or average features between ANY two people, and never nudge faces toward a "family average" — each face is built ONLY from its own source photo. Exactly ${imgs.length} people appear, each exactly once. Full festive hanbok styling is the product, built ON TOP of each person's real face — never by reshaping any face.
2. COMPOSITION — the output is ALWAYS one vertical family portrait with all ${imgs.length} people clearly visible from the waist up, every face unobstructed, at a similar scale and the same level of detail. The input photos' framing, zoom, crop, and angle have ZERO influence on the output composition.

Each of the ${imgs.length} input images shows ONE member of the same family. Create ONE single photorealistic traditional Korean holiday family portrait showing ALL ${imgs.length} of them together in beautiful hanbok.

HOW TO USE THE INPUT PHOTOS
- Each image is an identity reference for ITS person only (face). Ignore each input's framing, zoom, background, lighting, clothing, and current grooming — the hanbok styling below replaces it.
- If an input photo contains more than one person, use the clearest, most prominent person.

PER-PERSON IDENTITY LOCK (apply to EACH of the ${imgs.length} people separately):
- The same face shape and width-to-length ratio, the same jaw and chin, the same cheek fullness, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing between features. Keep natural asymmetries.
- AGE IS PART OF IDENTITY: children stay children at their real age, adults stay their age, seniors stay seniors — never de-age or age up anyone.
- Keep each person's TRUE skin tone individually (never unified), and clean natural skin on everyone — no invented moles or blemishes. Neat, light traditional grooming that suits each person is welcome; never reshape features.

ANTI-BLEND:
- Resist the pull toward averaged faces as the group grows — each face keeps its own distinct structure, and realistic height/build/age differences stay true.

HANBOK HOLIDAY STYLING (go all in — this is the product):
- Dress everyone in elegant traditional Korean hanbok in harmonious festive colors that suit each person: silk fabrics with refined details, age-appropriate designs — bright saekdong or cheerful tones for children, elegant deeper tones for adults and seniors.
- HANBOK STRUCTURE MUST BE CORRECT on every person (critical): a clean white dongjeong collar line on each jeogori; each otgoreum (front ribbon) properly tied with a natural bow shape and smoothly hanging tails — never melted, tangled, fused, or floating; saekdong stripes stay crisp, parallel, and evenly colored; silk drapes and folds behave like real fabric on every figure.
- Background: a warm traditional Korean holiday setting — a hanok interior or courtyard with soft warm lighting, like a Lunar New Year / Chuseok family greeting photo.
- Warm, happy, natural expressions; close family poses (standing/sitting together, children in front, arms around shoulders). If hands are visible — including traditional polite hand positions — render every hand with the correct number of fingers; simplify any gesture that would look awkward.

FINAL SELF-CHECK before output: count the people — exactly ${imgs.length}. Check every jeogori's collar and otgoreum. Then face by face: each person must be instantly recognizable to their own family. If the count is wrong, any tie is melted, or any face reads as a blend, the result is wrong.

Vertical framing with every person clearly visible from the waist up. Photorealistic, high resolution, no text, no watermark, no border. Remember the two absolute rules: ${imgs.length} people, each exactly themselves in correct hanbok, inside the fixed composition.
```

## 19. `fourcut` — 강도 2 × 4프레임 일관성 · 교체: const prompt

```text
TWO ABSOLUTE RULES (these override everything else):
1. ONE PERSON, FOUR TIMES — all four frames show the SAME person, and every frame must be instantly recognizable as that person ON ITS OWN. This is four identity-preservation jobs in one strip: the face must not drift, morph, or change between frames — only the pose and expression change.
2. COMPOSITION — the output is ALWAYS one tall vertical photo-booth strip: exactly FOUR square frames stacked top to bottom (frame 1 on top, frame 4 at the bottom), with small, even white gaps between the frames and a thin clean white border framing the whole strip. The input photo's framing, zoom, crop, and angle have ZERO influence on this layout — even an extreme close-up selfie produces the standard four-cut strip.

Create ONE single vertical photo-booth strip image in the popular Korean "인생네컷 (life four-cut)" style, using the person in the input photo.

HOW TO USE THE INPUT PHOTOS
- The inputs are a reference for IDENTITY ONLY (face and hairstyle). Ignore their framing, zoom, background, lighting, and clothing.
- Do NOT average the faces across photos. Treat the clearest, most front-facing photo as the single primary reference; use the others only to confirm the true shape and proportions of the same features.

ONE BOOTH SESSION (the key to frame consistency):
- All four frames were shot seconds apart in the same booth: the SAME hairstyle, the SAME outfit, the SAME lighting, and the SAME background tone in every frame. Only the pose and expression change from frame to frame.

IDENTITY LOCK (must hold in every single frame):
- The same face shape and width-to-length ratio, the same jaw and chin, the same cheek fullness, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing between features. Keep natural asymmetries, the apparent age, and the person's TRUE skin tone (correct source color casts; identical tone in all four frames).
- Clean natural skin — do not invent moles or blemishes; treat shadows, contrast edges, and compression noise as clean skin.

THE FOUR FRAMES (different, but the same person):
- Frames 1–4 each show a different fun pose and expression (e.g. warm smile, peace sign, playful surprise, candid laugh).
- EXPRESSIONS stay within natural range: lively and fun, but never so exaggerated that the face distorts — every frame must still read instantly as this person.
- HANDS: a peace sign shows exactly two raised fingers; every visible hand has five correct fingers. If a gesture would look awkward in a small square frame, simplify it.

Styling:
- Trendy Korean photo-booth look: clean bright studio lighting, a simple tasteful background tone (consistent across all four frames), modern fashionable feel.

FINAL SELF-CHECK before output: count the frames — exactly four, evenly sized, cleanly separated. Then look at each frame ALONE: each must be instantly recognizable as the same person, in the same outfit and hair. If any single frame reads as a different person, or the count/layout is wrong, the result is wrong.

Photorealistic, high resolution. No text, no captions, no watermark. Remember the two absolute rules: ONE person in all FOUR frames, inside the fixed strip layout.
```

## 20. `fourcutcouple` — 강도 2 × 2인 잠금 × 4프레임(얼굴 검증 8회) · 교체: const prompt

```text
TWO ABSOLUTE RULES (these override everything else):
1. TWO PEOPLE, LOCKED IN EVERY FRAME — person A's face must match image 1 exactly and person B's face must match image 2 exactly, in ALL FOUR frames: that is eight face checks in one strip. NEVER mix, blend, or average features between the two people, never let either face drift between frames, and keep exactly TWO people in every frame — nobody added, removed, or duplicated.
2. COMPOSITION — the output is ALWAYS one tall vertical photo-booth strip: exactly FOUR frames stacked top to bottom, small even white gaps between the frames, a thin clean white border around the whole strip, and BOTH faces clearly visible at a similar scale in every frame. The input photos' framing, zoom, crop, and angle have ZERO influence on this layout.

Image 1 shows person A. Image 2 shows person B. Create ONE single vertical photo-booth strip image in the popular Korean "인생네컷 (life four-cut)" style, showing BOTH people together.

HOW TO USE THE INPUT PHOTOS
- Each image is an identity reference for ITS person only: image 1 → person A, image 2 → person B. Ignore each input's framing, zoom, background, lighting, and clothing.
- If an input photo contains more than one person, use the clearest, most prominent person.
- POSITION CONSISTENCY: person A stays on the LEFT and person B stays on the RIGHT in ALL four frames — never swap sides between frames.

ONE BOOTH SESSION (the key to frame consistency):
- All four frames were shot seconds apart in the same booth: each person keeps the SAME hairstyle and the SAME outfit in every frame, under the SAME lighting and background tone. Only the poses and expressions change.

PER-PERSON IDENTITY LOCK (apply to EACH person, in EVERY frame):
- The same face shape and width-to-length ratio, the same jaw and chin, the same cheek fullness, the same eye size/shape and eyelid type (double eyelid stays double, monolid stays monolid), the same ears, the same nose bridge/width/tip, the same philtrum, the same lip shape and thickness, the same eyebrows, and the same spacing between features. Keep each person's natural asymmetries, apparent age, and TRUE skin tone (corrected per person, never unified).
- Clean natural skin on both — do not invent moles or blemishes on either person.

ANTI-BLEND:
- Do NOT unify or harmonize their faces or builds — their real differences stay true in every frame.

THE FOUR FRAMES:
- Each frame shows BOTH people together in a different fun couple pose (smiling side by side, peace signs, laughing, leaning in).
- Expressions stay natural — lively but never so exaggerated that either face distorts.
- HANDS: a peace sign shows exactly two raised fingers; every visible hand has five correct fingers; if a gesture would tangle between the two people in a small frame, simplify it.

Style:
- Trendy Korean photo-booth look: clean bright lighting, a simple tasteful background tone (consistent across all four frames), modern fashionable feel.

FINAL SELF-CHECK before output: count the frames — exactly four. In each frame, count the people — exactly two, A on the left, B on the right. Then check all eight faces: covering the other person, each face in each frame must be instantly recognizable as A or as B. If any face in any frame reads as a stranger or a mix, the result is wrong.

Photorealistic, high resolution. No text, no captions, no watermark. Remember the two absolute rules: the SAME two people in all FOUR frames, inside the fixed strip layout.
```

## 21. `fourcutillust` — 강도 2(일러스트) × 4프레임 일관성 · 교체: const prompt (★끝줄 photorealistic→high resolution 버그 수정 반영됨)

```text
TWO ABSOLUTE RULES (these override everything else):
1. ONE PERSON, FOUR TIMES, ILLUSTRATED — all four frames show the SAME person in drawn form, and every frame must be instantly recognizable as that person on its own. Simplify the RENDERING, never the IDENTITY: the illustrated face must not drift or change between frames — only the pose and expression change.
2. COMPOSITION & STYLE CONSISTENCY — the output is ALWAYS one tall vertical photo-booth strip: exactly FOUR square frames stacked top to bottom, small even white gaps between the frames, a thin clean white border around the whole strip; and ONE consistent illustration style across all four frames — the same line weight, the same color palette, the same shading technique, as if one artist drew all four cuts in one sitting. The input photo's framing, zoom, crop, and angle have ZERO influence on this layout.

Create ONE single vertical photo-booth strip image in the popular Korean "인생네컷 (life four-cut)" style, drawn as a polished digital illustration, using the person in the input photo.

HOW TO USE THE INPUT PHOTOS
- The inputs are a reference for IDENTITY ONLY (face and hairstyle). Ignore their framing, zoom, background, lighting, and clothing.
- Do NOT average the faces across photos. Treat the clearest, most front-facing photo as the single primary reference; use the others only to confirm the true features.

ONE BOOTH SESSION:
- All four frames are the same booth session: the SAME illustrated hairstyle, the SAME outfit, and the SAME background tone in every frame. Only the pose and expression change.

IDENTITY IN ILLUSTRATED FORM (must hold in every frame):
- Keep the recognizable likeness: the same face shape and width-to-length proportions, the same eye shape and eyelid type (double eyelid stays double, monolid stays monolid), the same nose and mouth impression, the same eyebrows, and the same hairstyle and hair color — clearly the same person, just drawn.
- FACES GET THE HIGHEST DETAIL: backgrounds may be flat and simple, but every face keeps enough drawn detail to stay instantly recognizable. Never let the style blur or "prettify" the face into a generic character — and never drift toward chibi or caricature proportions in any frame.
- Keep distinctive cues that exist in the source (glasses, dimples); do not invent new ones.

THE FOUR FRAMES:
- Each frame shows a different fun pose and expression (warm smile, peace sign, playful surprise, candid laugh) — expressive but never distorting the likeness.
- HANDS: drawn cleanly — a peace sign shows exactly two raised fingers; every visible hand has five fingers; simplify any gesture that would look awkward in a small square frame.

Illustration style:
- Premium hand-drawn webtoon / animation illustration: clean, confident line work with consistent weight, soft painterly shading, warm harmonious colors. Charming and modern — NOT a childish doodle, NOT a photo filter, and no leftover photographic textures anywhere in the strip.

FINAL SELF-CHECK before output: count the frames — exactly four, all in ONE consistent art style. Then look at each frame alone: someone who knows this person must instantly recognize them in every single cut. If any frame reads as a different person or a different art style, the result is wrong.

High resolution. No text, no captions, no watermark, no signature. Remember the two absolute rules: the SAME person in all FOUR frames, one consistent illustration style, inside the fixed strip layout.
```

---

# D. 펫 (4종)

## 22. `pet` — 강도 2(정장 변신) × 펫 강도 3급 잠금 · 교체: const prompt

```text
TWO ABSOLUTE RULES (these override everything else):
1. THE PET'S IDENTITY IS UNTOUCHABLE — the output must show the EXACT same animal as the input: the same species and breed, the same size class and head shape for that breed, the same fur color, pattern, and length, the same unique markings in the same places, the same eye color, the same ear shape and posture, the same face. The owner must instantly recognize their own pet — never a different animal, never a generic stock animal of the same breed, and never a different individual. Do NOT invent new markings, patches, or eye colors that are not in the source.
2. COMPOSITION — the output is ALWAYS the fixed ID-photo framing described below, regardless of the input photo's framing, zoom, crop, or angle. Even an extreme close-up of the pet's face comes out as the standard head-and-shoulders ID composition.

Create a funny and adorable professional ID/passport-style headshot of the PET (dog or cat) shown in the photo, as if the pet were a person taking an employee ID photo.

HOW TO USE THE INPUT PHOTO
- The input is a reference for the PET'S IDENTITY ONLY. Ignore its framing, zoom, background, lighting, and any accessories — the suit below replaces them.
- Render the fur in its TRUE color under neutral studio light — warm/yellow tints from the source lighting must not become the fur's actual color.

OUTFIT (the fun — built on top of the identity):
- Dress the pet in a tiny formal business suit — a small black blazer with a white dress shirt collar, fitted naturally around the pet's neck and shoulders, as if wearing a real little suit. Cute and believable, not pasted on.
- The suit must fit the pet's real body naturally and comfortably — never distorted anatomy, never a humanized body; this is the real pet wearing a tiny suit. The face and head markings stay fully visible.

COMPOSITION (fixed ID-photo framing):
- Front-facing, the pet looking straight toward the camera.
- Head and upper body (shoulders) centered in the frame, with a small even margin above the head (ears and the top of the head never cropped).
- Calm, neutral, cute expression. Mouth closed or gently relaxed.
- Vertical portrait orientation.

BACKGROUND: a clean, perfectly uniform solid light background (soft white or light blue), flat with NO gradient, NO texture, NO objects.

LIGHTING & SHADOWS: soft even studio lighting. NO shadow cast on the background behind the pet. Background stays flat and evenly lit.

QUALITY: photorealistic, sharp focus, natural realistic fur texture with fine detail, high-resolution studio photo. The suit looks real, the pet looks real.

FINAL SELF-CHECK before output: the owner must instantly say "that's MY baby in a suit!" — same breed, same markings, same eyes, same size impression. If it reads as a different or generic animal, the result is wrong.

DO NOT INCLUDE: no text, no watermark, no logo, no border, no human, no extra props, no shadow on background. Remember the two absolute rules: the SAME pet, inside the SAME fixed ID composition.
```

## 23. `petstudio` — 펫 강도 3급 잠금 + 스튜디오 연출(라이트) · 교체: const prompt

```text
TWO ABSOLUTE RULES (these override everything else):
1. THE PET'S IDENTITY IS UNTOUCHABLE — the exact same pet: the same breed, the same size class and body proportions for that breed (a small dog stays small, a large dog stays large), the same fur color, pattern, length, and texture, the same unique markings in the same places, the same eye color, the same ear shape, the same face. The owner must instantly recognize their own pet. Never a different animal, never a different individual, never a generic stock animal — and never invent markings or colors that are not in the source.
2. COMPOSITION — the output is ALWAYS a vertical portrait centered on the pet, the pet as the clear HERO of the frame, regardless of the input photo's framing, zoom, crop, or angle.

You are a luxury pet studio photographer. Take the pet in this photo and create a premium studio portrait of them — like an expensive pet photo studio package shot.

HOW TO USE THE INPUT PHOTO
- The input is a reference for the PET'S IDENTITY ONLY. Ignore its framing, zoom, background, and lighting.
- Render the fur in its TRUE color under the studio light — color casts from the source lighting must not become the fur's actual color.

STUDIO TREATMENT (the product — style boldly here):
- Elegant studio setting: soft seamless backdrop in a tasteful tone that complements the pet's fur, with premium soft studio lighting and a gentle rim light that makes the fur look fluffy and richly detailed.
- The pet posed naturally and adorably (sitting or lying) in an anatomically comfortable, breed-realistic posture — never stretched, twisted, or doll-like — looking toward the camera with bright, lively eyes.
- PROP BALANCE: at most one tasteful prop (a small cushion or ribbon) placed beside or under the pet — clean and classy, never cluttered, never covering the pet's face, markings, or body. The pet is the hero; everything else stays subtle.
- Vertical portrait framing centered on the pet, with the ears and top of the head never cropped.

FINAL SELF-CHECK before output: the owner must instantly say "that's MY pet — this looks like an expensive studio shoot." Same breed, same markings, same size impression, same eyes. If it reads as a different or generic animal, the result is wrong.

Final look: photorealistic, high-resolution premium pet studio photography — sharp fur detail, beautiful bokeh. No text, no watermark, no border, no human. Remember the two absolute rules: the SAME pet, hero of the SAME fixed composition.
```

## 24. `petcostume` — 강도 2(코스튬 변신) × 펫 잠금 · 교체: BASE_RULE 상수만 (5개 코스튬 변형은 그대로)

### [petcostume BASE_RULE V2]

```text
TWO ABSOLUTE RULES (these override everything else):
1. THE PET'S IDENTITY IS UNTOUCHABLE — the exact same pet: the same breed, the same size class and body proportions for that breed, the same fur color, pattern, length, and texture, the same unique markings in the same places, the same eye color, the same ear shape, the same face. The owner must instantly recognize their own pet — never a different animal, never a different individual, never a generic animal of the breed. Do NOT invent markings or colors that are not in the source. The costume is worn ON TOP of the real pet — it must fit the pet's actual body naturally and look comfortable, with correct animal anatomy: never distorted, humanized, stretched, or doll-like. The pet's FACE and head markings stay fully visible — no costume piece may cover or reshape the face.
2. COMPOSITION — the output is ALWAYS a vertical portrait centered on the pet, regardless of the input photo's framing, zoom, crop, or angle, with the ears, head, and any hat never cropped at the top.

The input photo is a reference for the PET'S IDENTITY ONLY — ignore its framing, zoom, background, lighting, and any existing accessories. Render the fur in its TRUE color under the scene's lighting; color casts from the source photo must not become the fur's actual color.

Premium studio lighting, photorealistic, high resolution, sharp fur detail.
FINAL SELF-CHECK: the owner must instantly say "that's MY pet in a costume!" — same breed, markings, size, and eyes. If it reads as a different or generic animal, or the anatomy looks unnatural, the result is wrong.
No text, no watermark, no border, no human.
```

## 25. `petreceipt` — 특수(이미지 아님, JSON 텍스트) · 교체: 한국어 프롬프트

```text
당신은 따뜻하고 재치있는 한국의 반려동물 관상 전문가입니다.
사진 속 반려동물의 얼굴을 보고 재미있고 긍정적인 관상 풀이를 해주세요.

[형식 절대 규칙 — 최우선]
응답은 JSON 객체 하나뿐입니다. 첫 글자는 { 이고 마지막 글자는 } 입니다.
마크다운 코드펜스, 인사말, 설명, 이모지, JSON 밖의 어떤 텍스트도 절대 금지.
모든 키와 문자열은 큰따옴표 사용, 후행 쉼표 금지, 아래 스키마의 키 이름을 정확히 그대로 사용:
{"petType":"강아지/고양이 등 동물 종류(품종이 보이면 품종까지, 예: 강아지(비숑))","items":[{"name":"관상 항목 이름","desc":"한 줄 풀이 (18자 이내)","score":92}],"total":95,"summary":"따뜻하고 귀여운 한 줄 총평 (35자 이내)"}

[개인화 규칙 — 이 아이만의 풀이]
- 사진에서 실제로 보이는 특징을 근거로 항목을 만드세요: 귀 모양, 눈매와 눈빛, 코 색과 크기, 털 색·무늬·복슬함, 수염, 입매·미소, 이마, 표정.
- 아무 반려동물에나 쓸 수 있는 범용 문구는 금지 — desc에 그 특징이 드러나서 주인이 "우리 애 얘기네!" 하고 느끼게.
- 항목 이름은 실제 관상 용어 느낌으로 재치있게 (복코, 재물눈, 장수 귀, 금전수염, 대박 이마, 애교 광대 등).

[내용 규칙]
- items는 정확히 5개. score는 80~100 사이 정수. total은 5개 score의 평균을 반올림한 정수.
- 전부 긍정적이고 사랑스럽게. 부정적 표현, 건강·질병 관련 언급, 진단성 표현 절대 금지 — 이것은 재미를 위한 덕담입니다.
- desc는 18자 이내, summary는 35자 이내. 모든 텍스트는 한국어.

다시 한번 — 출력은 위 스키마의 JSON 객체 하나뿐, 다른 글자는 하나도 없습니다.
```

---

# E. 실무·상업 보정 (8종)

## 26. `food` — 강도 3 · 교체: const prompt (★돈까스→함박, 깻잎 문제 해결)

```text
TWO ABSOLUTE RULES (these override everything else):
1. THE DISH IS UNTOUCHABLE — this is a PHOTO-RETOUCH task, NOT a re-generation. The output must show the EXACT same dish as the input: the same food type, the same ingredients, the same preparation and CUT STYLE of every ingredient, the same count and placement of every topping and side, the same plating, the same portion, on the same kind of dish. NEVER invent, add, swap, remove, or replace any food element. Concrete examples of forbidden changes: a breaded pork cutlet (donkatsu) must stay a breaded pork cutlet — never morph into a hamburg steak or any other dish; finely shredded perilla leaves must stay finely shredded — never become one whole leaf; three shrimp must stay exactly three shrimp in the same spots; a garnish's cut style (shredded / julienned / sliced / diced / whole) must stay identical.
2. WHAT MAY CHANGE — photographic quality ONLY: lighting, color accuracy, sharpness, natural gloss and freshness cues, removal of mess and clutter, and the surface/background. Be bold HERE — and only here.

You are a world-class commercial food photographer and retoucher. Make this casually-taken photo of the dish look stunning, mouth-watering, and thumbnail-worthy — while keeping it unmistakably the SAME dish the owner cooked.

FIRST, identify what the dish is, then apply the freshness cues that make THAT specific type of food most appetizing (never changing the food itself):
- Soup/stew/hot pot: glossy broth, gentle rising steam; the visible ingredients stay the same ingredients.
- Grilled meat / BBQ: caramelized sear marks, juicy glistening surface, light oil sheen — on the same cuts, same count.
- Noodles: glossy strands, steam for hot noodles — same noodle type, same toppings.
- Fried food: crispy golden-brown texture, dry-crunchy (not greasy) surface — same coating, same shape.
- Rice dishes: separate glistening grains, steam — same toppings in the same places.
- Salad/vegetables/fruit: crisp freshness, dewy droplets, vibrant natural color — same produce, same cut style.
- Dessert/bread: moist crumb, flaky layers, soft highlights — same item, same decoration.
- Cold drinks: condensation droplets, refreshing clarity — same drink, same garnish.

CLEAN UP AND REPAIR (bold, but identity-safe):
- Erase spills, drips, smudges, stains, crumbs, fingerprints, and dirty edges on the plate, bowl rim, or table.
- Remove distractions: table clutter, phones, hands, used utensils, napkins, receipts, background noise.
- If a part has been eaten, bitten, or is missing: restore it with MORE OF THE EXACT SAME food (fill a missing cutlet slice with an identical cutlet slice; never with different food), so the dish looks whole and untouched.
- Revive dull, dried-out, or soggy areas to look fresh and just-served — the same ingredient at its peak, never a different ingredient.

PRO FOOD-PHOTOGRAPHY TREATMENT:
- Camera & lens: as if shot on a 100mm macro lens at f/2.8, shallow depth of field; sharp focus on the hero element, softly blurred background. Most flattering angle for this dish (45° for most plated food, top-down for pizzas/spreads, eye-level for layered items).
- Lighting: soft, bright, directional side-lighting at ~5500K that sculpts texture; recover shadow and highlight detail; no flat yellow restaurant light.
- Color: accurate white balance, rich appetizing tones, vivid and true-to-life — the food's REAL colors at their best, never shifted to different colors, never oversaturated.
- Freshness signals: subtle steam for hot dishes, droplets for fresh produce and cold drinks, natural glisten on sauces — only where it makes sense, never adding new garnish or ingredients that weren't there.
- Background & composition: place the dish on a clean, tasteful surface that complements the food's own colors; balanced framing without cropping out any of the food.

FINAL SELF-CHECK before output: the restaurant owner must say "that's exactly the dish I cooked — just photographed beautifully," and a customer comparing photo to delivery must find zero differences in what's actually in the dish. If any ingredient changed type, cut style, count, or position, the result is wrong.

FINAL LOOK: ultra-photorealistic, high-resolution, delivery-app-thumbnail quality. NO cartoon, plastic, CGI, or wax look. No text, no watermark, no border. Remember the two absolute rules: the SAME dish, only the photography improved.
```

## 27. `menu` — 강도 3 · 교체: const prompt (${styleLine} 유지)

```text
TWO ABSOLUTE RULES (these override everything else):
1. THE FOOD IS UNTOUCHABLE — this is a PHOTO-RETOUCH task, NOT a re-generation. The customer must receive exactly what this photo shows: the same dish, the same ingredients, the same preparation and CUT STYLE of every ingredient (shredded stays shredded, sliced stays sliced, whole stays whole), the same count and placement of toppings and sides, the same portion, the same plating. NEVER add, remove, swap, or replace any food. Never make the portion look bigger. A breaded cutlet stays a breaded cutlet; finely shredded garnish stays finely shredded.
2. WHAT MAY CHANGE — photographic quality ONLY: lighting, true-color accuracy, sharpness, natural freshness cues, cleanup of clutter, and the background/surface. This is where you work boldly.

You are a professional food and delivery-app photographer. Take this casually-taken food photo and turn it into a clean, appetizing, high-converting photo ready for a restaurant menu, poster, or delivery app (Baemin, Coupang Eats) — while staying completely TRUE to the actual dish, because a photo that overpromises creates refunds and bad reviews.

STEP 1 - READ THE DISH, THEN ADAPT (freshness cues only — never changing the food):
- Soup/stew: gentle rising steam, rich glossy broth — same visible ingredients.
- Grilled meat: glossy, juicy, sizzling look — same cuts, same count.
- Stir-fry/noodles: fresh, vibrant, glossy — same components.
- Fried food: crisp, golden texture — same coating, same shape.
- Dessert/bakery: bright, clean, soft — same item, same decoration.
- Drinks/coffee: fresh, natural condensation for cold drinks — same drink, same garnish.

MAKE IT APPETIZING (within honesty):
- Bring out fresh, natural, vibrant color; glossy sauces; gentle steam for hot food; crispness for fried; condensation for cold drinks. The existing food at its freshest — never different food, never invented garnish.

CLEAN IT UP AND STYLE IT:
- Remove all clutter: hands, phones, receipts, napkins, messy table items.
- Background: place the dish on ${styleLine}.
- Composition: balanced and centered with comfortable margins so text could be added later — but do NOT add any text, letters, or numbers yourself.

PHOTOGRAPHY SPEC:
- Bright, soft, even studio lighting; crisp focus on the dish; gentle separation from the background (shallow depth of field); an appetizing straight-on or 45-degree angle. High-end delivery-app thumbnail quality.

KEEP IT REAL:
- Photorealistic only. Real food textures, real light. NOT a CGI render, NOT a 3D model, NOT over-processed or plastic-looking. No fake garnish.

FINAL SELF-CHECK before output: the owner must recognize it as their exact menu item, and a customer comparing this photo to the delivered dish must find zero differences in the food itself. If anything about the food changed, the result is wrong.

OUTPUT: high-resolution, clean, appetizing, professional. No text, no watermark, no logo, no border. Remember the two absolute rules: the SAME honest dish, only the photography improved.
```

## 28. `product` — 강도 3 · 교체: const prompt

```text
TWO ABSOLUTE RULES (these override everything else):
1. THE PRODUCT IS UNTOUCHABLE — this is a PHOTO-RETOUCH task, NOT a re-generation. The shopper must receive exactly what this photo shows: ① every letter, word, number, logo, and label EXACTLY as in the original — same spelling, same font, same position, same size; if text is small, keep it pixel-faithful rather than regenerating it; ② the product's REAL colors exactly (fix only the lighting color-cast, never "prettify" the color); ③ the exact shape, proportions, part count, and real material features — fabric weave, leather grain, stitching, intentional distressing are NOT flaws. NEVER redraw, translate, invent, remove, reshape, slim, or stretch anything on the product. If a detail is unclear in the source, keep it neutral and faithful — never invent a new design.
2. WHAT MAY CHANGE — photographic quality ONLY: lighting, white balance, sharpness, removal of dust/fingerprints/clutter, straightening the camera tilt, and the background/surface. Work boldly here — and only here.

You are a world-class e-commerce product photographer and retoucher. Transform this casual product photo into a clean, premium online-store product image that makes shoppers trust it and want to buy — because the photo matching reality is exactly what earns that trust.

FIRST, identify the product type, then apply the treatment that best presents THAT kind of product (never changing the product itself):
- Clothing/fashion: smooth out accidental fold wrinkles (keep intentional design creases), show true fabric texture and color, natural drape.
- Cosmetics/bottles: keep glossy or matte finish as-is, crisp label text, elegant soft reflections.
- Electronics/gadgets: sleek clean surfaces, sharp edges, remove fingerprints and dust.
- Food packaging/drinks: vivid TRUE packaging color, crisp label, fresh appealing look.
- Jewelry/accessories: sparkle and material shine, fine detail, tasteful macro feel.
- Home goods/furniture: show real material (wood grain, fabric, ceramic) and true proportions.

CLEAN UP ONLY THESE (bold, identity-safe):
- Erase what is clearly dirt or handling, NOT part of the product: dust, fingerprints, smudges, lint, stray threads, temporary creases from folding or shipping.
- Remove distractions around the product: background clutter, hands, price tags, stray cables, room reflections.
- Straighten a tilted photo to an upright, flattering angle — WITHOUT changing the product's real proportions or perspective identity.

PRO PRODUCT-PHOTOGRAPHY TREATMENT:
- Background: a clean, seamless studio background — pure white for a marketplace look, or a soft light neutral tone that makes the product's own colors pop. Grounded with a soft, realistic contact shadow directly beneath the product (no floating, no fake angled shadows).
- Camera & lighting: as if shot on a 100mm product lens with crisp focus across the product; bright, even, soft studio lighting at ~5500K; recover shadow/highlight detail; remove harsh glare and blown-out spots.
- Material fidelity: glossy stays glossy, matte stays matte, transparent stays clear — faithful texture and micro-detail, never turning real material into plastic or CGI.

FINAL SELF-CHECK before output: the seller must say "that's exactly my product," and a buyer comparing photo to delivery must find zero differences — same text, same color, same shape, same parts. If any of those changed, the result is wrong.

FINAL LOOK: ultra-photorealistic, high-resolution commercial product photography — clean, crisp, premium, trustworthy. The product itself (text, color, shape, material, part count) IDENTICAL to reality; only background, lighting, cleanliness, and framing improved. No invented reflections, no altered branding, no text overlay, no watermark, no border. Remember the two absolute rules: the SAME product, only the photography improved.
```

## 29. `interior` — 하이브리드(뼈대 잠금 + 가구·마감 변환) · 교체: const prompt (${styleLine} 유지)

```text
TWO ABSOLUTE RULES (these override everything else):
1. THE ROOM'S IDENTITY IS UNTOUCHABLE — the architectural shell must remain EXACTLY the same room: the same position, number, size, and shape of every wall, window, door, ceiling, column, stair, and built-in structural fixture (kitchen counters, fixed bathroom fixtures); the same ceiling height, the same room dimensions and proportions, and the same camera angle, perspective, and framing. NEVER add, remove, move, or resize any structural element, window, or door. The viewer must instantly recognize it as the SAME room — only styled.
2. WHAT MAY CHANGE — furnishing and finish ONLY: furniture, decor, textiles, art, plants, lighting fixtures, and surface finishes (paint and flooring refresh following the existing surface areas). This is the product — work boldly and confidently HERE, and only here.

You are an elite interior-design and real-estate staging artist. Take this photo of a room and transform it into a beautifully furnished, styled, magazine-quality interior in a specific style — while keeping it unmistakably the SAME room. Be a confident designer: the result should look professionally styled and aspirational, not a timid edit. Suit a modern Korean home (apartment / villa / house) or commercial space — natural and livable, not oversized or cluttered.

STEP 1 - READ THE ROOM, THEN ADAPT
First identify the room type and its current state, then style it appropriately:
- Room type: living room / bedroom / kitchen / bathroom / entryway / study-office / dining / kids room / commercial space (cafe, shop, office). Furnish and style to fit that purpose.
- Current state:
  - If the room is EMPTY or bare: add a complete, tasteful set of furniture and decor appropriate to the room's purpose (virtual staging).
  - If the room is already FURNISHED but outdated or cluttered: restyle it — replace or rearrange furniture and decor into a clean modern look, declutter, and refresh tired finishes.

STYLE BOLDLY in this EXACT style:
- Apply this specific interior style throughout — furniture, palette, materials, and mood: ${styleLine}. Commit fully to this style.
- Furniture and decor: realistic, well-proportioned pieces in a balanced, intentional layout with a clear focal point. Ground everything correctly — real scale for THIS room's actual size, contact shadows, matching perspective. Tasteful and livable; do NOT overcrowd the room, no floating or duplicated items, and never block doors or windows with furniture.
- Accents: a few plants, soft textiles, simple art, layered lighting — consistent with the chosen style.
- Surfaces: refresh flooring, walls, and ceiling to clean finishes that suit the style, strictly following the existing surfaces (no structural change).
- Windows: keep whatever is actually visible outside the windows — balance the exposure naturally, never invent a different view.
- Lighting: bright, even, and inviting; balance natural daylight from the existing windows with warm interior lighting. Make it feel airy and welcoming.

PHOTOGRAPHY SPEC (make it look professionally shot):
- Wide interior lens with CORRECTED perspective: vertical lines stay straight, no fisheye bulge, no leaning walls.
- Balanced even exposure (open shadows, controlled highlights), neutral-to-warm white balance, crisp focus. Professional real-estate / interior photography quality.

KEEP IT REAL (anti-fake):
- Photorealistic only. Real materials, real light physics, real reflections and shadows.
- NOT a CGI render, NOT a 3D model, NOT a video-game look, NOT over-smoothed plastic surfaces.
- No people. Do NOT generate fake or garbled text on books, screens, posters, or art — keep wall art simple, abstract, or blank; never melted lettering.

FINAL SELF-CHECK before output: the owner must instantly say "that's MY room — beautifully staged," recognizing every wall, window, and door in its exact place. If the structure changed or it reads as a different space, the result is wrong.

OUTPUT: high-resolution, sharp, and professional. No watermark, no text overlay, no added borders or logos. Remember the two absolute rules: the SAME room's shell, boldly restyled contents.
```

## 30. `realestate` — 강도 3 최엄격 · 교체: const prompt

```text
TWO ABSOLUTE RULES (these override everything else):
1. THE PROPERTY IS UNTOUCHABLE — this is a PHOTO-RETOUCH task, NOT a renovation and NOT a re-generation. Everything real stays exactly as it is: the same room size, layout, walls, ceiling, and floor; the same number, size, and position of all windows and doors; the same furniture and objects in the same places and the same COUNT (never stage an empty room, never remove or add furniture); the same fixtures and finishes (lights, outlets, AC units, sink, tiles, flooring, wallpaper); and — critically — the same REAL CONDITION: mold, water stains, cracks, peeling wallpaper, scuffs, and damage must remain visible, because a renter or buyer relies on them. The real view outside the windows stays the real view. NEVER add, remove, hide, repair, stage, or replace anything.
2. WHAT MAY CHANGE — the PHOTOGRAPH only: brightness/exposure, accurate color (fixing yellow/blue casts), perspective correction (straightening leaning verticals), clarity/sharpness, and sensor-noise/compression cleanup. Plus one small allowance: removing small LOOSE clutter (a stray trash bag, scattered cables, a pile of laundry) — never furniture, never the room's real state.

You are a professional real-estate photo retoucher. Take this real photo of a property and make it a clean, bright, well-shot listing photo of the SAME exact space, in its SAME real condition. This is for Korean property listings (Zigbang, Dabang, Naver Real Estate, Danggeun), where a photo that misrepresents the place loses trust and causes disputes — honesty is the point.

IMPROVE (the photo only), confidently:
- Brightness/exposure: brighten dark or underexposed shots, lift shadows, and balance blown-out windows so the room is clearly visible in good, natural light.
- Color: fix color casts (yellow indoor lighting, blue shade) to neutral, accurate color.
- Perspective: correct wide-angle lens distortion so vertical lines (walls, door frames, windows) are straight and upright, not leaning or bulging — the biggest fix for amateur property photos. Keep the same camera viewpoint and framing (correct distortion, but do not re-frame into a different shot).
- Clarity: clean, crisp, even, professional real-estate look.
- Windows: if a window is blown out white, tone it down naturally to reveal the REAL view — do NOT invent a fake scenic view.

READ THE SHOT, THEN ADAPT:
Identify the space and enhance appropriately: living room / bedroom / kitchen / bathroom / entryway / full studio (one-room) / building exterior / commercial space.

KEEP IT BELIEVABLE (anti-overprocessing — this earns trust):
- The output must look like a genuine, careful photo, NOT an edited or AI image.
- No HDR halos, no oversaturation, no fake glow, no plastic-smooth surfaces, no dreamy or unreal look.

KEEP IT REAL (anti-fake):
- Photorealistic only. Real materials, real light physics, real shadows.
- No people. Do NOT invent or garble any text (signs, labels) — keep existing text exactly as photographed; if it is too small to read in the source, leave it unreadable rather than regenerating it.

FINAL SELF-CHECK before output: the agent must say "same place, same condition — just a much better photo," and a visitor comparing this photo to the real property must find ZERO differences in what is actually there — including its flaws. If anything was added, removed, hidden, or repaired, the result is wrong.

OUTPUT: high-resolution, sharp, and natural. No watermark, no text overlay, no added borders or logos. The same property, honestly and professionally photographed. Remember the two absolute rules: the SAME property in its SAME condition, only the photograph improved.
```

## 31. `car` — 강도 3 (세차는 하되 수리는 안 함) · 교체: const prompt

```text
TWO ABSOLUTE RULES (these override everything else):
1. THE CAR IS UNTOUCHABLE — this is a WASH, not a repair and not a re-generation. The output must show the EXACT same vehicle in the same spot: the same make, model, trim, and year cues (same grille, headlights, wheels, and badges — never a newer-looking or different car); the same license plate, odometer, and badge text kept pixel-faithful (never redrawn or regenerated); the same part count and configuration (no added or removed options, spoilers, or trim pieces); and — critically — every scratch, dent, scuff, chip, rust spot, crack, curb rash, and worn tire stays visible. A wash removes dirt, never damage. If dirt was hiding a flaw, cleaning makes it MORE visible, never erases it. The same background, surroundings, camera angle, and framing.
2. WHAT MAY CHANGE — the PHOTOGRAPH and the DIRT only: brightness and even lighting, accurate natural color (keeping the exact paint color and finish), sharpness and noise cleanup, and washing dirt, dust, mud, water spots, and smudges off the body, glass, and wheels — freshly washed, not repaired.

Retouch this exact photo of a used car for an honest listing (Encar, KB Chachacha, Danggeun). A photo that hides flaws causes disputes and refunds — the goal is the same car, clean and clearly visible.

CHANGE (boldly, within the wash):
- Brighten and even out the lighting so the car and its true condition are clearly visible. Fix any color cast for natural, accurate color — the exact paint color and finish stay (metallic stays metallic, matte stays matte).
- Wash off all dirt, dust, mud, water spots, and smudges from the body, glass, and wheels, giving the car its real freshly-washed gloss level. Reflections on the cleaned body must stay consistent with the actual surroundings — never paint in fake studio reflections or skies.
- Reduce photo noise and compression artifacts.

KEEP EXACTLY (do not touch):
- Every scratch, dent, scuff, chip, rust spot, crack, curb rash, and worn tire.
- The same background and surroundings, the same camera angle.
- The odometer reading, badges, and license plate exactly as photographed.

KEEP IT BELIEVABLE:
- Photorealistic and natural — it must look like the same real photo, just cleaner and brighter. Not a glossy brochure, not over-processed, not CGI. Still a used car, not a new one.

FINAL SELF-CHECK before output: the seller must say "that's my car, freshly washed," and a buyer inspecting the real car must find every mark the photo shows — and no marks the photo hid. If any damage disappeared or the car reads as a different or newer vehicle, the result is wrong.

OUTPUT: high-resolution, natural, honest. No text, no watermark, no border. Remember the two absolute rules: the SAME car with its SAME flaws — only washed and well photographed.
```

## 32. `factory` — 하이브리드(뼈대·설비 잠금 + 마감 리노베이션) · 교체: const prompt

```text
TWO ABSOLUTE RULES (these override everything else):
1. THE SPACE'S IDENTITY IS UNTOUCHABLE — the architectural shell and the existing equipment must remain EXACTLY the same place: the same position, number, size, and shape of every wall, support column, beam, window, door, stair, and mezzanine; the same ceiling height and shape; the same room dimensions and proportions; and the same camera angle, perspective, and framing. Existing major equipment and fixed machinery stay in their exact positions with their real shape, type, and COUNT — NEVER invent, add, remove, or upgrade machines, and never move a single structural element. The viewer must instantly recognize it as the SAME space — only renovated.
2. WHAT MAY CHANGE — finishes, lighting, and cleanliness ONLY: floor surface refresh, wall/ceiling repaint, modern lighting, decluttering, and refurbishing the EXISTING equipment's surfaces. This renovation preview is the product — work boldly and decisively HERE, and only here.

You are an elite architectural and real-estate retoucher specializing in INDUSTRIAL and COMMERCIAL spaces (factories, workshops, warehouses, plant offices, building exteriors). Transform this photo of an old, worn, dirty space into the SAME space after a high-end modern renovation — bright, clean, safe, and genuinely appealing. Be bold and decisive: the "after" must look dramatically upgraded, not a timid touch-up.

STEP 1 - READ THE SPACE, THEN ADAPT
First identify what you are looking at, then renovate it appropriately:
- Production floor / workshop: clean modern industrial finish, organized work zones, safe and orderly.
- Warehouse / storage: tidy racking, clear floor lanes, bright high-bay lighting.
- Office / break / meeting area inside the facility: clean modern interior, fresh walls, good lighting.
- Exterior / facade / yard: repaired and repainted cladding, clean signage area, tidy surroundings, bright clear-sky daylight — keeping the real surrounding environment and neighboring buildings exactly as they are.

AGGRESSIVELY UPGRADE (within the allowed zone, boldly):
- Floors: replace cracked, oil-stained, dusty floors with a flawless modern industrial surface — smooth polished concrete or fresh seamless epoxy — with a clean subtle sheen, following the existing floor footprint. Add crisp tidy floor line-markings only where natural for the space type.
- Walls and ceiling: repaint in clean, light, neutral tones; fully remove peeling paint, rust, water stains, mold, cracks, soot, and grime — on the same walls in the same places.
- Lighting: replace dim, yellow, uneven light with bright, even, modern LED lighting, balanced with natural daylight through the existing windows. The space should feel bright, open, and airy.
- Equipment and surfaces: clean and refurbish the existing machines, racks, pipes, and cabling so they look well-maintained — same machines, same type, same count, same positions; bundle and conceal messy exposed wiring.
- Declutter completely: remove trash, debris, clutter, random objects, stains, and any people or photographer reflections — while keeping the genuine functional character of a working industrial space (do not turn a factory into an empty showroom).

PHOTOGRAPHY SPEC (make it look professionally shot):
- Wide architectural lens look with CORRECTED perspective: vertical lines stay straight, no fisheye bulge, no leaning walls.
- Balanced even exposure (open shadows, controlled highlights), neutral 5200-5600K white balance, crisp focus front to back. Professional real-estate / architectural photography quality.

KEEP IT REAL (anti-fake):
- Photorealistic only. Real materials, real light physics, real reflections.
- NOT a CGI render, NOT a 3D model, NOT a video-game look, NOT over-smoothed plastic surfaces.
- Text and signage: keep existing legible signs and labels exactly as written (pixel-faithful); if lettering is too small or damaged to read, leave it simple or blank — NEVER invent, regenerate, or garble text.

FINAL SELF-CHECK before output: the owner must instantly say "that's MY factory — so this is what it would look like renovated," recognizing every column, wall, window, and machine in its exact place. If the structure or equipment changed, the result is wrong.

OUTPUT: high-resolution, sharp, and professional. No watermark, no text overlay, no added borders or logos. Remember the two absolute rules: the SAME space and SAME equipment, boldly renovated finishes.
```

## 33. `restore` — 강도 3 특수(인물 정체성 신성불가침, 구도 보존) · 교체: const prompt

```text
TWO ABSOLUTE RULES (these override everything else):
1. IDENTITY IS SACRED — every person in the photograph must remain EXACTLY themselves: the same face, likeness, bone structure, facial proportions, age, expression, and pose. This is a real person and a real memory. Restore the actual person — NEVER an idealized, beautified, or invented version. Where damage covers part of a face, reconstruct it conservatively from that same person's surviving features and natural symmetry — NEVER invent generic or "prettier" features to fill the gap.
2. COMPOSITION — this is a RESTORATION, not a re-creation: keep the exact same composition, framing, crop, aspect ratio, and every subject's position. Nothing is added, removed, duplicated, or moved.

You are a master photo-restoration and colorization artist. Restore this old, damaged, or faded photograph so it looks like a freshly scanned, well-preserved original — and where appropriate, add natural color. Be thorough and confident in repairing damage, but treat the people's identity as sacred and untouchable.

STEP 1 - READ THE PHOTO, THEN ADAPT
- Damage level: lightly faded vs heavily damaged (deep scratches, tears, missing chunks, water or mold stains). Repair as much as the damage demands.
- Photo type: black and white / sepia / faded-and-color-shifted color / mostly-fine color. Handle color per the rules below.
- Subject: portrait (faces are the top priority) / group photo (every face matters equally) / scene or object. Spend the most care on faces and eyes.

IDENTITY LOCK (the heart of this task):
- Keep every person's exact face: the same face shape and proportions, the same eye shape and eyelid type, the same nose, mouth, and eyebrows, the same hairstyle, and their natural asymmetries. Do NOT beautify, slim, smooth away, de-age, or "improve" any face. No modern makeup or features.
- In group photos, restore EACH face strictly from its own visible information — NEVER blend, average, or borrow features between people, and never let two damaged faces converge into similar-looking faces.
- CRITICAL DISTINCTION — damage on the PRINT vs features of the PERSON: scratches, stains, mold, and dust are damage ON the photograph and must be removed completely; moles, scars, wrinkles, and dimples are features OF the person and must be preserved faithfully. Never convert a scratch or stain into a facial mark, and never erase a real feature as if it were damage. When a small dark spot is genuinely ambiguous, restore clean skin — never add a mark that may not have existed.
- Do NOT add, remove, duplicate, or move any person. Keep clothing, accessories, and the background composition exactly as in the original. Keep the original era and style — no modernizing of clothes, hair, or objects.
- Preserve any visible text, handwriting, dates, or studio stamps faithfully, pixel-faithful where legible; if lettering is too damaged to read, leave it as-is or softly indistinct — never invent or produce fake, garbled lettering.

RESTORE THOROUGHLY (repair damage with confidence):
- Remove scratches, tears, creases, folds, stains, spots, and dust, and fill missing or torn areas by reconstructing what was plausibly there (matching surrounding texture, pattern, and lighting).
- Reduce noise and grain and recover lost detail and sharpness — but keep a natural photographic texture. Do NOT over-smooth into a plastic, airbrushed, "AI" look; keep real skin texture (pores, fine lines) and believable film character.
- Recover the full tonal range: clean (not crushed) shadows, bright (not blown-out) highlights, balanced midtones. Fix fading, yellowing, and discoloration.

COLOR:
- If the photo is BLACK AND WHITE or SEPIA: add natural, believable, period-appropriate color to skin, hair, eyes, clothing, and background. Skin tones must stay true to each person's apparent complexion in the original tonal values — conservative and natural, never shifted lighter or darker, never neon, never oversaturated.
- If the photo is FADED or COLOR-SHIFTED color: do not recolor from scratch — correct the color cast and revive the original colors to look natural and vivid-but-real.
- If the color is already fine: focus on damage repair and keep the palette faithful.

FINAL SELF-CHECK before output: a family member who remembers these people must instantly say "yes — that's them, that's our photo, good as new." If any face reads as a stranger or an "improved" version, the result is wrong.

FINAL LOOK: a faithfully restored real photograph, as if scanned from a pristine original. Photorealistic, natural, respectful of the era. Lifelike eyes and skin. No watermark, no text overlay, no borders, no added logos. Restore the memory — do not reinvent it. Remember the two absolute rules: the SAME people exactly as they were, in the SAME frame.
```

---

## 부록 — 이 문서에 없는 컨셉
- **증명사진(id-*, idstyle)·비즈프로필(biz-*)**: 별도 "궁극 프롬프트" 작업으로 관리(이 문서 범위 밖).
- **nukki(누끼)·upscale(업스케일)**: Replicate 직접 호출이라 프롬프트 없음(교체 대상 아님).
