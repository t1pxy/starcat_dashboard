# Starcat Dashboard

Dashboard อุปกรณ์ (device dashboard) ที่ดึงข้อมูลสดจากฐานข้อมูล MSSQL ของ
Starcat Helpdesk — กรองได้ทุกมิติ และ export เป็นไฟล์ Excel ที่อ่านรู้เรื่อง

## เริ่มใช้งาน

```bash
cp .env.example .env.local   # แล้วกรอกข้อมูลการเชื่อมต่อ MSSQL
pnpm install
pnpm dev                     # http://localhost:3000/devices
```

บัญชีที่ใช้ต้องการแค่สิทธิ์ **อ่าน** เท่านั้น — dashboard ไม่เขียนข้อมูลใดๆ

## สิ่งที่ dashboard แสดง

| ส่วน | รายละเอียด |
| --- | --- |
| การ์ดสรุป | จำนวนทั้งหมด · ออนไลน์ · อายุเฉลี่ย · Windows ไม่ล่าสุด · เครื่องเงียบ · ประกันหมด |
| กราฟแยกกลุ่ม | หมวดหมู่ · ยี่ห้อ · รุ่น · หน่วยงาน · สถานที่ · เวอร์ชัน Windows |
| ตารางต้องอัพเดท | เครื่องที่ Windows ไม่ใช่เวอร์ชันล่าสุด หรือไม่ติดต่อเกิน 30 วัน พร้อมเหตุผลรายเครื่อง |
| ตารางอุปกรณ์ | รายการทั้งหมด เรียงคอลัมน์ได้ แบ่งหน้า |

ตัวกรองทั้งหมดเก็บอยู่ใน URL ดังนั้น **คัดลอกลิงก์แล้วส่งต่อได้** และปุ่ม Export
จะส่งออกเฉพาะข้อมูลที่กรองอยู่เสมอ

## Export Excel

`GET /api/devices/export` รับ query string ชุดเดียวกับหน้า dashboard และคืนไฟล์ 3 ชีต

1. **สรุป (Summary)** — ตัวเลขภาพรวม + รายการตัวกรองที่ใช้ + วันที่ออกรายงาน
2. **อุปกรณ์ (Devices)** — ทุกแถวที่ตรงตัวกรอง หัวตารางไทย/อังกฤษ วันที่เป็น date จริง
   (เรียง/กรองใน Excel ได้) พร้อม autofilter และตรึงแถวหัว
3. **ต้องอัพเดท (Needs Update)** — เฉพาะเครื่องที่ควรจัดการ

คอลัมน์ที่ไม่จำเป็นถูกตัดออกแล้ว โดยดูจากข้อมูลจริง ไม่ใช่การเดา — `building`,
`floor`, `room`, `assetHolder`, `antivirus` ว่างทั้ง 100% ของทุกแถว และ
`organization` มีค่าเดียว (`Unassigned`) ทั้งฐานข้อมูล จึงไม่ถูกดึงมาเลย

## โครงสร้างโค้ด

```
src/lib/db.ts                 connection pool + parameterised query/batch helpers
src/lib/devices/schema.ts     ★ ที่เดียวที่รู้ว่า Starcat เก็บข้อมูลยังไง
src/lib/devices/query.ts      filter → SQL, materialise #dev, อ่านทุกอย่างจากตารางเดียว
src/lib/devices/columns.ts    นิยามคอลัมน์ที่ตารางบนจอกับไฟล์ Excel ใช้ร่วมกัน
src/lib/devices/excel.ts      สร้าง workbook ด้วย exceljs
src/app/devices/page.tsx      หน้า dashboard
src/app/api/devices/export/   route handler ของไฟล์ Excel
```

**ถ้า Starcat เปลี่ยนโครงสร้างตาราง ให้แก้ที่ `src/lib/devices/schema.ts` ที่เดียว**

## การ map ข้อมูลจาก Starcat

ตารางหลักคือ `TB_SYSTEMDEVICE` (หนึ่งแถวต่อหนึ่งอุปกรณ์) join กับ

| ตาราง | ได้อะไร |
| --- | --- |
| `TB_USER` → `TB_DEPARTMENT` / `TB_LOCATION` | ผู้ถือครอง หน่วยงาน สถานที่ |
| `TB_INV_SYSTEM` / `TB_INV_OS` / `TB_INV_MACHINE` | ยี่ห้อ รุ่น Windows แรม ดิสก์ |
| `TB_COMPUTER` | ติดต่อล่าสุด Office เวอร์ชัน Agent |
| `TB_EQUIPMENT` → `TB_EQUIPMENTTYPE` | อุปกรณ์ที่ไม่ใช่คอมพิวเตอร์ |
| `TB_CONTRACT_ASSET` → `TB_CONTRACT` | วันหมดประกัน/สัญญาเช่า |

### ข้อควรระวัง 2 อย่างที่ฝังไว้ในโค้ดแล้ว

1. **หน่วยงานและสถานที่อยู่ที่ "ผู้ใช้" ไม่ใช่ที่ "เครื่อง"** —
   `TB_SYSTEMDEVICE.DEP_ID` / `LOCATION_ID` แทบไม่มีข้อมูล (2 และ 0 แถว)
   จึงต้องดึงผ่าน `TB_USER` ของเจ้าของเครื่อง
2. **`TB_USER` มีแถวที่ `USER_ID` เป็นคำว่า `'Unassigned'` และเป็นพนักงานจริง** —
   มีเครื่องราว 469 เครื่องที่ `OwnerID = 'Unassigned'` ถ้า join ตรงๆ
   เครื่องเกือบครึ่งองค์กรจะถูกนับเป็นของพนักงานคนเดียว
   โค้ดจึงล้างค่า sentinel นี้ **ก่อน** join

## สำรวจโครงสร้างฐานข้อมูล

```bash
pnpm db:introspect
```

เขียนรายงานเป็น `db-introspect.md` และ `db-introspect.json` (ทั้งคู่อยู่ใน
`.gitignore` เพราะมีข้อมูลอุปกรณ์และชื่อพนักงานจริง)

## ประสิทธิภาพ

ข้อมูลที่ flatten แล้วเป็น join 10 ตาราง ถ้าถามทีละคำถามจะต้อง join ใหม่ทุกครั้ง
`getDashboard()` จึงยิง batch เดียว `SELECT * INTO #dev …` แล้วอ่าน summary,
กราฟ, ตาราง และรายการต้องอัพเดท จากตารางชั่วคราวนั้น — เหลือ 1 round trip
และ join ทำงานครั้งเดียว (~70 ms) ตัวเลือกใน dropdown cache ไว้ 60 วินาที
