# แผนการ Refactor — Starcat Dashboard

> สร้างตาม `CLAUDE.md` § 16 (Refactoring Process) — เอกสารนี้คือผลลัพธ์ของ **Phase 1 (Analyze)** และ **Phase 2 (Prioritize)** เท่านั้น ยังไม่มีการแก้โค้ดใดๆ

**สแนปช็อตของโค้ด:** ~7,085 บรรทัดใน `src/` · 3 routes · 25 components · 12 lib modules · ไม่มี test suite

---

## สารบัญ

1. [ต้องตัดสินใจก่อนแตะโค้ด (Stage 0)](#stage-0)
2. [ตารางสรุปตาม Severity](#severity-summary)
3. [รายละเอียดปัญหาทั้ง 12 หมวด](#findings)
4. [แผนดำเนินการ (Stage 1–5)](#plan)

---

<a id="stage-0"></a>
## Stage 0 — ต้องตัดสินใจก่อนแตะโค้ด

ตาม CLAUDE.md ข้อ 1: *"If the existing behavior appears incorrect, do not silently change it. Report the issue."* — 3 ข้อนี้ต้องได้คำตอบก่อนเริ่ม Stage 3–4

| # | คำถาม | ทำไมต้องถาม |
|---|---|---|
| Q4 | นิยาม "เครื่องไม่ติดต่อ" (stale) ควรนับเครื่องที่ **ไม่เคยติดต่อเลย** (`daysSinceSeen IS NULL`) ด้วยไหม และควรจำกัดเฉพาะ `deviceType = 'COMPUTER'` ไหม | ตอนนี้ 4 จุดในโค้ดใช้นิยามไม่ตรงกัน 2 แบบ — แก้แล้วตัวเลขบน KPI tile จะเปลี่ยน |
| SEC1 | องค์กรมีระบบยืนยันตัวตนอะไรอยู่แล้ว (AD / SSO / reverse-proxy) ที่จะเอามาต่อ | แอปทั้งหมดไม่มี auth เลย ต้องรู้ก่อนถึงจะออกแบบ middleware ได้ |
| DC5 | `api.http` ที่ถูกลบใน working tree (ยังไม่ commit) ตั้งใจลบหรือไม่ | ไฟล์ scratch ที่ค้างสถานะ ไม่ใช่ของที่ผมสร้าง |

---

<a id="severity-summary"></a>
## ตารางสรุปตาม Severity

| Severity | จำนวน | รายการ |
|---|---|---|
| 🔴 **Critical** | 3 | `SEC1` ไม่มี auth เลยทั้งแอป · `Q3` query param ไม่ clamp ทำให้เกิด 500 · `Q4` นิยาม "stale" ไม่ตรงกัน 3 จุด |
| 🟠 **High** | 7 | `D1` DIMENSIONS ซ้ำ 2 ชั้น · `D3` bucket ตัวเลขซ้ำ SQL↔TS · `S1` device-rows ทั้งไฟล์เป็น client โดยไม่จำเป็น · `S2/P1` windows-releases 20KB ในทุก client bundle · `S4/Q5` facet ไม่ตรง fleet definition · `SEC2` TLS insecure-by-default · `TD1` ไม่มี test เลย |
| 🟡 **Medium** | 8 | `D2` clamp ซ้ำ · `D4` buildQueryString 2 implementation · `S3/P2` RSC payload ใหญ่ · `T2` sort column ไม่ validate · `T3` `.find()!` 4 จุด · `T4` queryBatch cast ไม่มี type guarantee · `F3` ไม่มี caching strategy ที่ตั้งใจ · `SEC3/SEC5` information disclosure + ไม่มี rate limit |
| 🟢 **Low** | 12 | `D5` `D6` `L4` `L5` `T1` `N1` `N3` `N4` `F2` `Q6` `Q7` `P3` `P4` `DC1` `DC2` `DC5` `TD2` `TD3` |

---

<a id="findings"></a>
## รายละเอียดปัญหาทั้ง 12 หมวด

### 1. Architecture

| # | ปัญหา | Severity | ที่ตั้ง |
|---|---|---|---|
| A1 | ไม่มี authentication/authorization layer เลยทั้งแอป — เปิดเผย PII (ชื่อ, อีเมล, IP, serial) ให้ทุกคนใน network | 🔴 Critical | ทั้งแอป, `next.config.ts` |
| A2 | Layer แยกดี: `schema → query → filters/format/columns → components` ไม่มี circular dependency, `server-only` guard ถูกวางถูกจุด | ✅ จุดแข็ง | — |
| A3 | `department-health.tsx` ยังใช้ ad-hoc `<table>` markup ไม่ผ่าน `DataTable` component กลาง | 🟡 Medium | `department-health.tsx:44-113` |

### 2. Code Duplication

| # | ปัญหา | Severity | ที่ตั้ง |
|---|---|---|---|
| D1 | รายชื่อ dimension ประกาศซ้ำคนละชั้น — `DIMENSIONS` (server) กับ `MULTI_KEYS` (client) ต้องตรงกันเป๊ะแต่ไม่มีอะไรบังคับ | 🟠 High | `query.ts:43-51`, `filters.ts:8-16` |
| D2 | Clamp `1–3650` วันซ้ำ 2 ที่ (comment ในโค้ดยอมรับเอง) | 🟡 Medium | `filters.ts:43-47`, `filters/stale-filter.tsx:24-28` |
| D3 | Age/Contact bucket ตัวเลขซ้ำข้าม SQL ↔ TypeScript (5/7 ปี, 7 วัน) | 🟠 High | `query.ts:274-298`, `status.ts:56-118` |
| D4 | `buildQueryString` มี 2 implementation คนละที่ (server/client) ต่างกันเรื่อง reset `page` | 🟡 Medium | `filters.ts:129-153`, `filters/use-query-updater.ts:10-42` |
| D5 | Bilingual heading pattern ยังไม่ใช้ `<Bilingual>` ครบทุกจุด | 🟢 Low | `department-health.tsx:118-141`, `composition-charts.tsx:97-118` |
| D6 | `Tone`/`TONE_TEXT` (UI) กับ `StatusTone`/`STATUS_COLOR` (chart) เป็นคำศัพท์ 2 ชุดคล้ายกันมาก เสี่ยงสับสน | 🟢 Low | `ui/tone.ts` vs `lib/devices/status.ts` |

### 3. Large / Complex Components

| # | ไฟล์ | บรรทัด | ปัญหา |
|---|---|---|---|
| L1 | `lib/devices/query.ts` | 707 | รวม WHERE builder + 6 SQL template + 5 normaliser + 3 public function + cache ในไฟล์เดียว |
| L2 | `app/devices/wall/page.tsx` | 348 | รวม 6 component ท้องถิ่นในไฟล์เดียว ไม่แยกไป `components/` เหมือนหน้าอื่น |
| L3 | `components/device-rows.tsx` | 320 | รวม table rows + detail dialog + patch summary — ทั้งไฟล์เป็น client เพราะ dialog เดียว |
| L4 | `scripts/*.mjs` | 254, 235 | นอก `src/`, ไม่ type-check, ไม่ lint (ยอมรับได้สำหรับ build-time tooling) |
| L5 | `lib/devices/excel.ts` | 265 | รวม cell formatting + sheet building + summary composition (ตรรกะเชื่อมกันแน่น การแยกอาจไม่คุ้ม) |

### 4. Poor Separation of Concerns

| # | ปัญหา | Severity | ที่ตั้ง |
|---|---|---|---|
| S1 | `device-rows.tsx` ทั้งไฟล์เป็น Client Component เพราะ dialog เดียว — table rows และ patch summary ไม่มี state ของตัวเองแต่ถูกลากเข้า client bundle | 🟠 High | `device-rows.tsx:1,44-115` |
| S2 | `windows-releases.ts` (20 KB) ไหลเข้า client bundle ทั้งที่ `patchStatus()` เป็น pure function คำนวณฝั่ง server ได้ | 🟠 High | `windows-servicing.ts:23`, `device-cell.tsx:1-17` |
| S3 | RSC payload ส่ง `Device` เต็ม 35 field × ~450 แถวต่อการโหลดหน้า ทั้งที่ตารางแสดงจริง 7-12 คอลัมน์ | 🟡 Medium (ต้องวัดจริงก่อน) | `device-table.tsx`, `queue-table.tsx` |
| S4 | Business rule "เครื่องไม่นับใน fleet" ถูก encode ซ้ำ 2 จุดคนละความหมาย — `buildWhere` กรองด้วย `nameMatchesScheme` แต่ `loadFacets` ไม่กรอง | 🟠 High | `query.ts:95-97` vs `:683-697` |

### 5. TypeScript Problems

| # | ปัญหา | Severity | ที่ตั้ง |
|---|---|---|---|
| T1 | `RawDevice = Omit<Device,"online"> & {online: boolean}` — ไม่ทำอะไรเพราะ `Device.online` เป็น `boolean` อยู่แล้ว | 🟢 Low | `query.ts:377-380` |
| T2 | `parseSort` cast `as DeviceSort["column"]` โดยไม่ validate (ปลอดภัยจริงเพราะมี whitelist ที่ `orderBy()` แต่ type โกหก) | 🟡 Medium | `filters.ts:98-105` |
| T3 | `.find(...)!` non-null assertion 4 จุด — พิมพ์ key ผิดพังตอน runtime ไม่ใช่ compile | 🟡 Medium | `columns.ts:91,112,126,194` |
| T4 | `queryBatch` คืน `Record<string,unknown>[][]` แล้ว cast เป็น type จริงที่จุดเรียกทุกครั้ง (10+ จุด) ไม่มี compile-time guarantee ว่า SQL column ตรงกับ type | 🟡 Medium | `query.ts` ตลอดทั้งไฟล์ |
| T6 | ไม่มี `any` เปลือยเลยทั้งโปรเจกต์, `strict: true` เปิดอยู่ | ✅ จุดแข็ง | — |

### 6. Next.js Problems

| # | ปัญหา | Severity | ที่ตั้ง |
|---|---|---|---|
| N1 | `loading.tsx` inheritance ข้าม route — แก้ไปแล้วบางส่วน (เพิ่ม `charts/loading.tsx`, `wall/loading.tsx`) ยังไม่ verify ด้วย build output ครบ | 🟢 Low | `devices/loading.tsx` |
| N2 | 13 client components — ตรวจแล้วส่วนใหญ่มีเหตุผลจริง (filter state ใน URL, dialog, timer) | ✅ ส่วนใหญ่ชอบธรรม | — |
| N3 | `useEffect` 11 จุด กระจาย 8 ไฟล์ — ยังไม่พบจุดที่ derive-able เป็น render-time value ได้ ต้อง audit ทีละจุด | 🟢 Low | กระจาย 8 ไฟล์ |
| N4 | root `page.tsx` ใช้ `redirect()` แทน `redirects()` ใน config (ช้ากว่าเล็กน้อยเพราะต้อง render ก่อน) | 🟢 Low | `app/page.tsx` |

### 7. Data Fetching Problems

| # | ปัญหา | Severity | ที่ตั้ง |
|---|---|---|---|
| F1 | `getTables`/`getCharts` และ `getFacets` รันขนานผ่าน `Promise.all` — เป็น trade-off ที่ตั้งใจ (facet cache ข้าม request ได้) ไม่ใช่บั๊ก | ✅ ออกแบบถูก | `query.ts:664-676` |
| F2 | `getExportData` รัน unpaginated query เต็มทุกครั้งที่กด export ไม่มี rate limit/debounce ฝั่ง server | 🟢 Low | `app/api/devices/export/route.ts` |
| F3 | ไม่มี caching/revalidation strategy ที่ Next.js-native เลย ทุกหน้า dynamic เต็มรูปแบบ ยกเว้น in-memory `facetCache` มือเขียนเอง | 🟡 Medium | ทั้งแอป |

### 8. MSSQL / Query Problems

| # | ปัญหา | Severity | ที่ตั้ง |
|---|---|---|---|
| Q1 | ไม่มี `SELECT *` แม้แต่จุดเดียว | ✅ จุดแข็ง | `schema.ts` |
| Q2 | Parameter binding ครบทุกจุด, `ORDER BY` ใช้ whitelist ป้องกัน injection ถูกวิธี | ✅ จุดแข็ง | `query.ts:22-40`, `db.ts:80-91` |
| Q3 | `OFFSET`/`FETCH NEXT`/`TOP N` ถูก interpolate เป็นตัวเลขดิบลง SQL โดยไม่ผ่าน parameter และไม่ clamp — `?page=1e21` → SQL syntax error → 500 ที่โชว์ raw error | 🔴 Critical (reliability) | `query.ts:548,555,557,560`, `filters.ts:73,75,107-109` |
| Q4 | นิยาม "เครื่องไม่ติดต่อ" ไม่ตรงกัน 3 จุด — KPI tile ไม่รวม `daysSinceSeen IS NULL` และไม่จำกัด COMPUTER แต่ department health/queue รวม → ตัวเลขขัดแย้งกันในหน้าเดียวกัน | 🔴 Critical (data correctness) | `query.ts:212` vs `:259` vs `:361-363` vs `:148-150` |
| Q5 | `loadFacets` ไม่ใช้ `nameMatchesScheme` เหมือน query หลัก (ซ้ำกับ S4) | 🟠 High | `query.ts:683-697` |
| Q6 | `%${search}%` ไม่ escape `%` `_` `[` — ผลลัพธ์ผิดจากที่ user คาด ไม่ใช่ช่องโหว่ (ผ่าน parameter แล้ว) | 🟢 Low | `query.ts:111-127` |
| Q7 | `SELECT COUNT(*) AS total FROM #dev` ซ้ำซ้อนกับ `COUNT(*)` ใน `SUMMARY_SELECT` ที่อ่านจาก `#dev` เดียวกัน | 🟢 Low | `query.ts:556` |
| Q8 | `#dev` materialised table + batch design ป้องกัน N+1 ถูกวิธี (ประเมิน 10-way join ครั้งเดียวต่อ request) | ✅ จุดแข็ง | `query.ts:178-200` |

### 9. Performance Issues

| # | ปัญหา | Severity | ที่ตั้ง |
|---|---|---|---|
| P1 | (= S2) Windows revision table 20 KB ในทุก client bundle | 🟠 High | ดู S2 |
| P2 | (= S3) RSC payload ใหญ่เกินจำเป็น (ยังไม่วัดขนาดจริง) | 🟡 Medium | ดู S3 |
| P3 | `columnFor()` ทำ linear `.find()` ทุก cell ทุกแถว (~5,400 scan/หน้าในสเกลปัจจุบัน ผลกระทบต่ำ) | 🟢 Low | `columns.ts:193-195` |
| P4 | `live-refresh.tsx` re-render ทั้งหน้าทุก 5 นาทีผ่าน `router.refresh()` — เป็นการออกแบบที่ตั้งใจและบันทึกเหตุผลไว้แล้ว | 🟢 Low (trade-off ที่ตั้งใจ) | `live-refresh.tsx:83-105` |

### 10. Security Issues

| # | ปัญหา | Severity | ที่ตั้ง |
|---|---|---|---|
| SEC1 | ไม่มี authentication เลยทั้งแอป — `--hostname 0.0.0.0` เปิดให้ทั้ง network เข้าถึง PII เต็มรูปแบบและ export Excel ได้โดยไม่ต้องยืนยันตัวตน | 🔴 **Critical** | ทั้งแอป |
| SEC2 | `MSSQL_TRUST_SERVER_CERTIFICATE` default เป็น `true` (`!== "false"`) — insecure-by-default | 🟠 **High** | `db.ts:40-41`, `.env.example:25` |
| SEC3 | Query param ที่ไม่ clamp (Q3) ทำให้เกิด 500 ที่อาจโชว์รายละเอียด mssql driver error หลุดออกมาถ้าเปิด `<details>` | 🟡 Medium | ดู Q3 |
| SEC4 | ไม่พบ hardcoded secret ใดๆ, `.gitignore` ครอบคลุมถูกต้อง, `introspect-db.mjs` กัน password column ไม่ให้ print | ✅ จุดแข็ง | — |
| SEC5 | ไม่มี rate limiting บน `/api/devices/export` — ยิง full-dataset export ซ้ำได้ไม่จำกัด (ผูกกับ SEC1) | 🟡 Medium | `app/api/devices/export/route.ts` |

### 11. Dead Code

| # | ปัญหา | Severity | ที่ตั้ง |
|---|---|---|---|
| DC1 | `TABLE_COLUMN_KEYS`, `OUTDATED_COLUMN_KEYS`, `STALE_COLUMN_KEYS` export แต่ไม่มีใครอื่น import | 🟢 Low | `columns.ts:75,100,115` |
| DC2 | `getPool` export แต่ใช้แค่ภายใน `db.ts` เอง | 🟢 Low | `db.ts:56` |
| DC3 | ไม่พบ debug `console.log` ตกค้าง — มีแค่ `console.error` 2 จุดที่ใช้ถูกต้อง | ✅ สะอาด | — |
| DC4 | ไม่พบ TODO/FIXME/HACK เลยทั้งโปรเจกต์ | ✅ สะอาด | — |
| DC5 | `api.http` ถูกลบใน working tree แต่ยังไม่ commit — ต้องถามก่อนแตะ | 🟢 Low | `api.http` |

### 12. Technical Debt

| # | ปัญหา | Severity |
|---|---|---|
| TD1 | ไม่มี test suite เลยทั้งโปรเจกต์ — ไม่มี regression safety net เวลา refactor `query.ts` ซึ่งมี business logic หนาแน่นที่สุด | 🟠 High |
| TD2 | `excel.ts` JSDoc comment บอกชื่อไฟล์ผิด (โกหก code จริง) | 🟢 Low |
| TD3 | `next.config.ts:4` เหลือ comment scaffold ตกค้าง | 🟢 Low |

---

<a id="plan"></a>
## แผนดำเนินการ

### Stage 1 — Fix ที่ไม่เปลี่ยน behavior เลย (ทำได้ทันที)

| ลำดับ | งาน | แก้ข้อ |
|---|---|---|
| 1 | เพิ่ม `toBoundedInt(value, min, max)` ใช้กับ `page`/`warrantyWithinDays`/`minAgeYears` + bind `OFFSET`/`FETCH`/`TOP` เป็น SQL parameter | Q3 |
| 2 | ลบ `SELECT COUNT(*)` ซ้ำซ้อนใน `getTables` ใช้ `summary.total` แทน | Q7 |
| 3 | เอา `export` ที่ไม่จำเป็นออก: `getPool`, `TABLE_COLUMN_KEYS`, `OUTDATED_COLUMN_KEYS`, `STALE_COLUMN_KEYS` | DC1, DC2 |
| 4 | แก้ comment ผิดใน `excel.ts`, ลบ comment scaffold ใน `next.config.ts` | TD2, TD3 |
| 5 | ลบ `Omit<Device,"online"> & {online:boolean}` ที่ไม่มีผล | T1 |

### Stage 2 — Maintainability (behavior เดิม, โครงสร้างดีขึ้น)

| ลำดับ | งาน | แก้ข้อ |
|---|---|---|
| 6 | รวม `DIMENSIONS`/`MULTI_KEYS` เป็นแหล่งเดียว (ไฟล์ที่ไม่มี `server-only`) | D1 |
| 7 | รวม clamp `1–3650` เป็นฟังก์ชันเดียว export ให้ทั้ง server/client ใช้ร่วมกัน | D2 |
| 8 | ยกตัวเลข bucket (5/7 ปี, 7 วัน) เป็น named constant เดียว ให้ SQL template และ `status.ts` อ้างอิงร่วมกัน | D3 |
| 9 | แยก `PatchSummary` ออกจาก `device-rows.tsx` เป็น Server Component ต่างหาก คำนวณ `patchStatus` ฝั่ง server | S1, S2, P1 |
| 10 | ย้าย 6 component ท้องถิ่นใน `wall/page.tsx` ไป `components/wall/` | L2 |
| 11 | เพิ่ม type-safe wrapper รอบผลลัพธ์ `queryBatch` | T4 |
| 12 | เปลี่ยน `.find()!` เป็น `Map` lookup ใน `columns.ts` | T3, P3 |

### Stage 3 — Data correctness (ต้องได้คำตอบ Stage 0 ก่อน)

| ลำดับ | งาน | แก้ข้อ |
|---|---|---|
| 13 | รวมนิยาม "stale" เป็น SQL constant เดียว ใช้ทั้ง 4 จุด | Q4 |
| 14 | `loadFacets` ใช้ `nameMatchesScheme` เดียวกับ `buildWhere` | S4, Q5 |

### Stage 4 — Security (ต้องได้คำตอบ Stage 0 ก่อน)

| ลำดับ | งาน | แก้ข้อ |
|---|---|---|
| 15 | เพิ่ม middleware auth ครอบ `/devices` และ `/api/*` | SEC1 |
| 16 | กลับ default `trustServerCertificate` เป็น opt-in (`=== "true"`) | SEC2 |
| 17 | เพิ่ม rate limit เบื้องต้นบน export route | SEC5 |

### Stage 5 — ที่เหลือ (Low priority)

D5, D6, N1 (verify), N3 (audit ทีละจุด), N4, F2, F3 (บันทึก caching decision), Q6, P4, T2

---

## หมายเหตุ

- เอกสารนี้คือผลลัพธ์จาก Phase 1–2 เท่านั้น **ยังไม่มีการแก้โค้ด**
- ก่อนเริ่ม Stage ใดๆ ให้ทำตาม CLAUDE.md § 17 (Git Safety): `git status` ก่อนเสมอ
- หลังแก้แต่ละ Stage ต้องรัน TypeScript check, ESLint, build, และ review diff ตาม § 16 Phase 5
