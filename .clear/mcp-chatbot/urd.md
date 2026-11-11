# URD — MCP layer + chatbot support for mui-template
Date: 2026-09-23   Status: APPROVED (2026-09-23)

## 1. Problem
ระบบที่ clone จาก template ใช้งานได้ทางหน้าเว็บอย่างเดียว ต้องการให้ chatbot สอบถามข้อมูลและทำงานแทนผู้ใช้ได้ โดยใช้สิทธิ์ของผู้ใช้คนนั้น
ถ้าไม่มีแบบแผนกลางใน template แต่ละระบบจะทำเองคนละแบบ และความปลอดภัยจะไม่เท่ากัน
ระหว่างสำรวจยังพบว่า template ตอนนี้อาจส่งความลับจาก ERP (access_token, twofa_secret, line_access_token) ไปถึง browser และลง log

## 2. Goal
ระบบที่ clone จาก template:
- เปิดความสามารถของระบบเป็น tools ชุดเดียว ให้ client ทั้ง 3 แบบใช้ร่วมกัน
  - A = chatbot ในระบบ
  - B = chatbot กลาง มมส หรือ LINE OA
  - C = Claude Desktop หรือ claude.ai แบบ custom connector
- ทุกการเรียกใช้สิทธิ์ของผู้ใช้จริง งานเขียนต้องยืนยันก่อน และมี audit log
- นักพัฒนาเพิ่ม tool ใหม่ได้โดยทำตาม skill เดียว

## 3. Users & stakeholders
| Role | Need | Signs off? |
| --- | --- | --- |
| เจ้าของ template (นายท่าน) | แบบแผนกลางที่ทุกระบบใช้ซ้ำได้ | ใช่ |
| บุคลากรที่ใช้ระบบ | ถามหรือสั่งงานผ่านแชท ในสิทธิ์ของตัวเอง และยืนยันก่อนระบบเปลี่ยนข้อมูล | ไม่ |
| นักพัฒนาที่ clone template | เพิ่ม tool ได้ง่าย ตั้งค่าผ่าน env | ไม่ |
| ทีม chatbot กลาง / LINE OA (B) | OAuth client และเอกสารสำหรับเชื่อมต่อ | ไม่ |
| ฝ่ายความปลอดภัยไอทีของ มมส | endpoint ที่เปิดสู่ภายนอกต้องผ่านการตรวจ | ใช่ ก่อนขึ้น production |
| ทีม ERP | ไม่ต้องแก้อะไร เพราะใช้ login ERP เดิมของระบบ | ไม่ |

## 4. Current workflow
- ใช้งานผ่านหน้าเว็บเท่านั้น
- ยังไม่มี service layer และยังไม่มี server action หรือ fetch เลย
- Auth ใช้ next-auth v4 แบบ JWT session โดย login ผ่าน ERP OAuth
  - `middleware.ts` ส่งผู้ที่ยังไม่ login ไปหน้า `/login` ทุก path ยกเว้น `/api/auth`
- `session` callback ใน `ErpAuth.ts` ส่ง token ทั้งก้อน รวมโปรไฟล์ ERP ไปให้ browser
  - `profile()` ใช้ `console.log` พิมพ์โปรไฟล์ทั้งหมด
- Cookie ของ theme (`erp-msu-pms-v1`) และของการพับเมนู (`sidebar-closed-groups`) ใช้ `path=/`
  - ถ้าหลายระบบอยู่ host เดียวกันจะใช้ค่าร่วมกัน

## 5. Inputs available / missing
| Input | Have? | Source | Notes |
| --- | --- | --- | --- |
| ERP OAuth client ของระบบ | มี | `AUTH_CLIENT_ID/SECRET`, `progcode=DigiPlan` | OAuth bridge ใช้ login นี้ซ้ำ ไม่ต้องลงทะเบียนใหม่กับ ERP |
| LLM API key (BYOK) | ยังไม่มี | นายท่าน, ใช้ OpenRouter | ใส่ใน env ของแต่ละระบบ |
| Callback URL ของ claude.ai | ต้องตรวจสอบ | เอกสาร Anthropic | ใช้เป็นค่าเริ่มต้นของ allowlist |
| Callback URL ของ chatbot กลาง | ยังไม่มี | ทีม B | ใส่ใน env เมื่อได้มา |
| Public HTTPS URL | ยังไม่มี | ตอน deploy | claude.ai ต่อ localhost ไม่ได้ ทดสอบ C ในเครื่องด้วย MCP Inspector หรือ Claude Code |
| ฐานข้อมูลจริง | ไม่มีใน template | ระบบปลายทาง | ใช้ file store เป็นค่าเริ่มต้น เปลี่ยนเป็น DB ได้ทาง interface |

## 6. Deliverables
- D0 **Auth hardening**: browser และ log ต้องไม่เห็น ERP access token, twofa_secret หรือ line_access_token
- D1 **Cookie ต่อระบบ**: ชื่อ cookie ของ theme และการพับเมนูผูกกับระบบ และ path เท่ากับ basePath
- D2 **MCP core** ประกอบด้วย:
  - แบบแผน `src/services/`
  - tool registry ที่มี schema, `minRole` และประเภท read/write
  - `/api/mcp` แบบ Streamable HTTP
  - กรองรายการ tool ตามสิทธิ์ และตรวจสิทธิ์ซ้ำทุกครั้งที่เรียก
  - audit log
  - การยืนยันสองจังหวะที่ server สำหรับ tool ประเภท write
  - tool ตัวอย่าง `whoami`, `get_help` และ write tool ตัวอย่างอีกหนึ่งตัวสำหรับสาธิตการยืนยัน
- D3 **OAuth bridge สำหรับ B/C** ประกอบด้วย:
  - metadata endpoints
  - การลงทะเบียน client ที่รับเฉพาะ redirect URI ใน allowlist
  - หน้า authorize ที่ใช้ login ERP เดิม และหน้ายินยอมภาษาไทย
  - token, refresh และ revoke
  - store แบบไฟล์ที่อยู่หลัง interface
  - หน้า "การเชื่อมต่อของฉัน" สำหรับดูและเพิกถอนการเชื่อมต่อ
- D4 **Chatbot ในระบบ (A)** ประกอบด้วย:
  - widget แชท
  - route ฝั่ง server ที่เรียก LLM แบบ OpenAI-compatible โดย BYOK ผ่าน env และค่าเริ่มต้นชี้ไป OpenRouter
  - key ไม่ถึง browser
  - เรียก tools ชุดเดียวกันด้วย session ของผู้ใช้
  - การ์ดยืนยันสำหรับงานเขียน
- D5 **เอกสาร** ประกอบด้วย:
  - กฎใน CLAUDE.md
  - skill `add-mcp-tool`
  - `docs/mcp.md` อธิบายวิธีเชื่อมต่อ B/C และ env ที่ต้องตั้ง
  - `.env.example`

## 7. Success criteria (observable)
- SC1: Response ของ `GET /digitalplan/api/auth/session` ไม่มี `access_token`, `twofa_secret` หรือ `line_access_token` และ log ของ server ไม่มีโปรไฟล์ ERP ทั้งก้อน
- SC2: Cookie ของ theme และการพับเมนูถูกเขียนด้วย `path=<basePath>` และชื่อที่ผูกกับระบบ
- SC3: `POST /api/mcp` ที่ไม่มี credential ได้ 401 พร้อม `WWW-Authenticate: Bearer resource_metadata="..."` และไม่ถูก redirect ไปหน้า login
- SC4: ใช้ session cookie (A) หรือ bearer token (B/C) แล้ว:
  - `tools/list` แสดงเฉพาะ tool ที่ `minRole` ไม่สูงกว่าสิทธิ์ผู้ใช้
  - เรียก tool ที่เกินสิทธิ์ตรง ๆ ด้วยชื่อ ได้ error
- SC5: Write tool ที่เรียกโดยไม่มีรหัสยืนยันจะไม่เปลี่ยนข้อมูลเลย และได้ตัวอย่างสิ่งที่จะทำพร้อมรหัสยืนยันกลับมา
  - รหัสยืนยันใช้ได้ครั้งเดียว ผูกกับผู้ใช้และ argument และหมดอายุได้
  - ส่งรหัสที่ใช้ไปแล้วหรือหมดอายุแล้ว ได้ error
- SC6: การเรียก tool หนึ่งครั้งสร้าง audit log หนึ่งรายการ มีผู้ใช้, tool, client และผลลัพธ์ และไม่มีความลับอยู่ใน log
- SC7: OAuth
  - redirect_uri ที่ไม่อยู่ใน allowlist ได้ 400
  - ต้องใช้ PKCE S256 ถ้า verifier ผิดได้ `invalid_grant`
  - code ใช้ได้ครั้งเดียว และ access token มีวันหมดอายุ
  - refresh ได้ token ใหม่ และ refresh token เดิมใช้ไม่ได้อีก
  - หลังผู้ใช้เพิกถอนการเชื่อมต่อ การเรียกครั้งถัดไปได้ 401
- SC8: MCP Inspector หรือ Claude Code ผ่าน OAuth flow กับ dev server ในเครื่อง แล้วเรียก `whoami` ได้
- SC9: Chatbot ในระบบ
  - เมื่อตั้ง key แล้ว ถาม "ฉันคือใคร" โมเดลเรียก `whoami` และตอบชื่อผู้ใช้
  - key ไม่ปรากฏใน network response ใดของ browser
  - ถ้าไม่ได้ตั้ง key widget แสดงว่ายังไม่ได้ตั้งค่า และส่วนอื่นของแอปยังทำงานปกติ
- SC10: นักพัฒนาเพิ่ม tool ใหม่ตาม skill โดยเพิ่มไฟล์เดียวบวกหนึ่งบรรทัดใน registry แล้ว tool ปรากฏใน `tools/list` และ typecheck ผ่าน
- SC11: `next build` และ lint ผ่าน

## 8. Constraints
- Next.js 16 แบบ `output: 'standalone'`, `basePath` เท่ากับ `/digitalplan`, next-auth v4
- ไม่มีฐานข้อมูล และ file store รองรับ Node process เดียว
- Dependency ใหม่มีได้เฉพาะ `@modelcontextprotocol/sdk` และ `zod` ที่ SDK ต้องใช้ นอกนั้นใช้ stdlib (`node:crypto`, `fetch`)
- ความลับไม่ถึง client ข้อความ UI เป็นภาษาไทย

## 9. Out of scope
- การสร้าง chatbot กลางหรือ LINE OA เอง template ให้แค่ OAuth และเอกสาร
- Tool ธุรกิจจริง เพราะ template ไม่มีฟีเจอร์ธุรกิจ
- Tool ที่ลบข้อมูลหรือทำหลายรายการพร้อมกัน
- การ deploy หลาย instance ให้แค่ interface สำหรับเปลี่ยนไปใช้ DB
- การ map สิทธิ์จริงจาก ERP (`resolveUserLevel` ยังเป็น placeholder)
- In-app tutorial และระบบถ่ายคู่มือ แยกไปทำรอบหน้า
- Widget แชทในเวอร์ชัน `html/` สำหรับ mockup
- การ deploy production และการทดสอบ claude.ai จริงผ่าน URL สาธารณะ

## 10. Risks & open questions
- R1 **basePath กับ OAuth discovery**: metadata ตาม RFC 8414 อยู่ที่ root ของ host เช่น `/.well-known/oauth-authorization-server/digitalplan` ซึ่งอยู่นอก basePath
  - แนวทางแก้: ชี้ผ่าน header `WWW-Authenticate` และ serve discovery แบบต่อท้าย path ภายใต้ basePath
  - ถ้า client บางตัวยังไปหาที่ root ต้องเพิ่มกฎใน reverse proxy และต้องทดสอบกับ client จริง
- R2 **claude.ai ต้องใช้ HTTPS สาธารณะ**: การทดสอบ C ในเครื่องทำได้แค่ด้วย Inspector หรือ Claude Code
- R3 **Prompt injection ผ่านข้อมูลที่ผู้ใช้อื่นพิมพ์ไว้**: ด่านกันหลักคือการยืนยันสองจังหวะ
- R4 **PDPA**: ข้อมูลที่ tool ส่งกลับจะไปถึงผู้ให้บริการ LLM ทาง template ทำได้เพียงลดข้อมูลให้น้อยที่สุด นโยบายเป็นเรื่องที่มหาวิทยาลัยต้องตัดสิน
- R5 **Service ที่ต้องเรียก ERP API แทนผู้ใช้ผ่าน B/C** จะต้องเก็บ ERP token แบบเข้ารหัส เลื่อนไปทำเมื่อมี service จริงที่ต้องใช้
- R6 **File store ใช้กับ PM2 cluster หรือหลาย process ไม่ได้**
- R7 **เรื่องความลับรั่ว (D0) ยังไม่ได้ยืนยันกับ response จริงของ ERP**
- R8 **`AUTH_DISABLED` ต้องไม่ทำให้ `/api/mcp` เปิดใน production**

## 11. Assumptions made without asking
- A1: BYOK หมายถึง key ต่อระบบใน env ไม่ใช่ให้ผู้ใช้แต่ละคนกรอก key เอง
  - แก้ได้ถ้า: นายท่านต้องการให้ผู้ใช้กรอก key เอง
- A2: LLM เรียกผ่าน API แบบ OpenAI-compatible ที่รองรับ tool calling (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`) โดยค่าเริ่มต้นเป็น OpenRouter
- A3: Chatbot กลาง (B) เป็น OAuth client ที่ทีมกลางสร้างเอง
- A4: File store เป็น JSON ในโฟลเดอร์ `data/` และอยู่หลัง interface `McpStore`
  - `data/mcp-store.example.json` ขึ้น git เป็นตัวอย่าง ใช้ข้อมูลปลอมที่ระบุชัดว่าเป็นตัวอย่าง
  - ไฟล์จริง `data/mcp-store.json` อยู่ใน gitignore และระบบสร้างเองตอนรันครั้งแรก
  - Token เก็บเป็น SHA-256 hash ไม่เก็บค่าจริง
- A5: Access token มีอายุ 1 ชั่วโมง ส่วน refresh token มีอายุ 30 วันและหมุนทุกครั้งที่ใช้
- A6: Scope มี `mcp:read` และ `mcp:write` ผู้ใช้เลือกให้แค่สิทธิ์อ่านได้ในหน้ายินยอม
- A7: เมื่อ `AUTH_DISABLED=true` และไม่ใช่ production, `/api/mcp` ใช้ผู้ใช้ dev คงที่เพื่อให้ทดสอบในเครื่องได้ ใน production ไม่ทำแบบนี้เด็ดขาด
- A8: ทำทุก deliverable ในรอบนี้ทีละเฟสบน branch `feat/mcp-chatbot` และให้ verifier อิสระตรวจก่อนเปิด PR
  - Merge ตามกฎ "ship it" เว้นแต่มีเกณฑ์ข้อไหน FAIL
