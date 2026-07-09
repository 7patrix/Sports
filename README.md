# 健康评估漏斗(Standout Health Funnel)
**线上体验:** https://healthtwins.site

这不是一个简单的表单应用,而是一套 BetterMe/Noom 式健康漏斗的核心基础设施:版本化问卷、可恢复的匿名会话、服务端健康评估算法(BMI、热量目标、达标日期)、确定性打分、带独立安全审查的异步 AI 报告生成、模拟支付回调、按订阅分级的结果、埋点分析,以及完整的单元 + 集成测试和 CI。

## 交付要求对应关系

| 要求 | 实现位置 |
| --- | --- |
| 分步保存 | `PATCH /api/assessment-sessions/:id/answers` |
| 进度恢复 | 匿名 token → `POST /api/assessment-sessions`、`GET /api/assessment-sessions/:id` |
| 健康算法:BMI / 建议摄入 / 达标日期 | `src/lib/health-metrics.ts` |
| 结果持久化 | `AssessmentProfile.healthMetrics`、`AssessmentResult` |
| 订阅鉴权 + 脱敏 | `GET /api/results/:id` + `src/lib/entitlement.ts` |
| 模拟支付回调(/pay) | `POST /api/pay`(以及 `POST /api/checkout/mock`) |
| 输入校验 / 防注入 | `src/lib/answer-validation.ts` |
| 自动化测试(单元 + 集成) | `src/**/*.test.ts`、`tests/integration/**` |
| 持续集成 CI | `.github/workflows/ci.yml` |

## 技术栈

- Next.js App Router、React、TypeScript、Tailwind CSS
- Prisma + PostgreSQL
- Redis + BullMQ worker(异步 AI 报告生成)
- Zod 校验
- Vitest(单元 + 集成)、GitHub Actions CI

## 本地启动

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:deploy   # 应用数据库迁移
npm run db:seed     # 写入问卷 + 演示会话
npm run dev         # Web 应用
npm run worker      # 另开一个终端:报告 worker
```

Docker 把 Postgres 映射到 `localhost:55432`、Redis 映射到 `localhost:56379`,以避免常见的本地端口冲突。打开 `http://localhost:3000`。

## 健康评估算法

`src/lib/health-metrics.ts` 是一个纯函数、可单元测试,把性别、年龄、身高、体重、目标体重和活动量转换为:

- **BMI** 及分级(`体重 / 身高²`)
- 用 Mifflin-St Jeor(区分性别)计算 **BMR**,再用活动系数得到 **TDEE**
- **每日建议摄入**(热量目标 + 蛋白/碳水/脂肪三大营养素),并设有安全下限,使减脂方案也不会低于合理最低值
- 由建议摄入所隐含的能量平衡推算的 **预计达标日期**(7700 kcal/kg 模型),并设有合理上限
- 一条 **体重预测曲线**

## 订阅、脱敏与支付回调

非会员拿到的是脱敏结果:BMI 作为钩子展示,但 **热量目标、三大营养素、达标日期、每周预测曲线以及完整 4 周计划都在服务端被剥离**,并标记为 `locked`。`/api/pay` 回调会在同一个事务里把会话的 `subscriptionStatus` 翻转为 `ACTIVE`、记录一条已支付 `Payment` 并发放 `assessment.full_plan` 权益。此后结果接口即返回完整、解锁的内容。

### 验证流程(cURL)

seed 会创建一个稳定的**未支付**会话(token `demo-health-twin-unpaid`)和一个**已支付**会话(token `demo-health-twin-token`)。先用 token 换出 `sessionId`,再对比支付前后的差异:

```bash
APP=https://healthtwins.site

# 1. 用未支付演示会话的 token 换出 sessionId
SID=$(curl -s -X POST $APP/api/assessment-sessions \
  -H 'content-type: application/json' \
  -d '{"anonymousToken":"demo-health-twin-unpaid"}' | jq -r .session.id)

# 2. 脱敏结果(access=preview,热量/达标日期/预测曲线为 null,locked=true)
curl -s $APP/api/results/$SID | jq '{access, healthMetrics}'

# 3. 模拟支付回调
curl -s -X POST $APP/api/pay -H 'content-type: application/json' \
  -d "{\"sessionId\":\"$SID\"}" | jq

# 4. 完整结果(access=full,热量/达标日期/预测曲线均已填充)
curl -s $APP/api/results/$SID | jq '{access, healthMetrics}'

# 已支付会话本来就是解锁状态:
PSID=$(curl -s -X POST $APP/api/assessment-sessions -H 'content-type: application/json' \
  -d '{"anonymousToken":"demo-health-twin-token"}' | jq -r .session.id)
curl -s $APP/api/results/$PSID | jq '{access, healthMetrics}'
```

## 质量校验

```bash
npm run typecheck
npm run lint
npm test                   # 单元测试(无需外部依赖)
npm run test:coverage      # 单元测试 + 覆盖率报告(带阈值门禁)
npm run test:integration   # 集成测试(需要运行中的 Postgres + Redis)
npm run test:e2e           # Playwright 冒烟(自动起 next start)
npm run build
```

`npm run test:all` 会同时跑单元 + 集成两套。CI(`.github/workflows/ci.yml`)在每次 push/PR 上跑两个 job:①`verify`(Postgres + Redis):typecheck、lint、单元、迁移、集成、构建;②`e2e`(Postgres + Redis):迁移 + 种子 + 构建 + Playwright 冒烟。

## 测试覆盖 —— 测了什么、为什么、以及没测什么

当前规模:**36 个单元 + 17 个集成 + 1 个 e2e 冒烟**。`npm run test:coverage` 输出覆盖率并**带阈值门禁**(核心逻辑 statements ≥ 80% / branches ≥ 55%,当前约 90% / 72%)。

**单元测试(`npm test`,无需外部依赖):**
- `health-metrics.test.ts` —— 评估算法本身:BMI/BMR/TDEE 计算、减脂/增重/维持分支、热量下限、达标日期预测、身高/体重边界、极端体重差(封顶),以及**非法(NaN / 非正数 / Infinity)输入**。
- `answer-validation.test.ts` —— 服务端输入防护:越界数值、非数字注入(如 `"70; DROP TABLE"`、`{$gt:0}`)、非法选项值、非整数刻度、多选去重,以及**跨字段合理性校验**(目标体重相对身高的目标 BMI 边界)。
- `scoring.test.ts` —— 确定性打分,含疼痛/睡眠/营养信号。
- `report-generator.test.ts` —— schema 合法的 4 周计划 + 安全免责声明 + 约束传播。
- `rate-limit.test.ts` —— 固定窗口限流器:窗口内放行、超限阻断并给出 retry-after、窗口过期后重置、按 key 独立计数。
- `workers/assessment/handler.test.ts` —— worker 处理器(mock Prisma):**重试幂等**(先清理旧产物再写)、成功置 `SUCCEEDED` 并落库结果、异常置 `FAILED` 并且不写结果。

**集成测试(`npm run test:integration`,真实 Postgres + Redis):**
- `step-save.test.ts` —— 增量保存、`currentStep` 推进、**按 token 恢复**、**乱序**与**重复**提交(幂等 upsert)、**并发更新**(单条一致记录),以及**越界/注入返回 422** 且不落库。
- `complete.test.ts` —— 完成流程:**缺答案返回 422 + missing 列表**、**跨字段不合理返回 422**、正常完成落库画像/健康指标并入队报告任务、**重复完成幂等**(复用同一任务)。
- `subscription.test.ts` —— 端到端的 **脱敏 → /pay → 完整** 转变、数据库 `subscriptionStatus` 翻转、对不存在会话支付返回 404,以及 **/pay 幂等**(重复回调不重复计费,且 Payment 关联到 Entitlement)。
- `email-results.test.ts` —— 邮箱采集落库与 delivered 状态、非法邮箱返回 422、结果未就绪返回 404。

**E2E 冒烟(`npm run test:e2e`,Playwright,已纳入 CI):** 启动生产构建,校验落地页渲染、SEO 标题、中英文切换,以及演示辅助的重置/示例填充控件。

**为什么测这些:** 它们覆盖 API 设计、数据建模、持久化/状态一致性、订阅与支付闭环,以及边界/异常处理这些关键质量目标。

**没测什么(及原因):** BullMQ worker 的**真实 LLM 产出**没有在 CI 中断言(writer 有确定性兜底,安全审查逻辑已由 `report-generator` 覆盖),集成测试只断言任务已入队,worker 处理器逻辑由上面的单测覆盖 —— 以避免在 CI 中引入 LLM 网络依赖。完整"填完问卷 → 支付 → 解锁"的浏览器级 e2e 未做(该闭环已由集成测试覆盖),e2e 仅做落地页冒烟。

## 数据库 Schema

```mermaid
erDiagram
  QuizDefinition ||--o{ AssessmentSession : versions
  AssessmentSession ||--o{ AssessmentAnswer : has
  AssessmentSession ||--o| AssessmentProfile : derives
  AssessmentSession ||--o{ ReportJob : queues
  AssessmentSession ||--o{ AssessmentResult : produces
  AssessmentSession ||--o{ Payment : pays
  AssessmentSession ||--o{ Entitlement : grants
  AssessmentSession ||--o{ FunnelEvent : emits
  Entitlement ||--o{ Payment : "granted by"
  ReportJob ||--o{ AgentLog : logs
  ReportJob ||--o{ ReportArtifact : versions
  ReportJob ||--o{ AssessmentResult : yields

  AssessmentSession {
    string id PK
    string anonymousToken UK
    enum   status
    enum   subscriptionStatus
    int    currentStep
    string email
  }
  AssessmentAnswer {
    string sessionId FK
    string questionId
    json   value
  }
  AssessmentProfile {
    string sessionId FK "unique"
    json   scores
    json   riskFlags
    json   healthMetrics
  }
  AssessmentResult {
    string sessionId FK
    json   previewPayload
    json   fullPayload
    json   safetyPayload
  }
  Entitlement {
    string sessionId FK
    string scope
    enum   status
  }
  Payment {
    string sessionId FK
    string entitlementId FK
    string providerRef UK
    int    amountCents
    enum   status
  }
```

## 健壮性、性能与可观测性

- **异步任务幂等**:report worker 在处理开头先清理该任务的旧产物/结果/日志,BullMQ 重试(`attempts>1`)不会产生重复 `AssessmentResult`/`ReportArtifact`。
- **入队失败快速兜底**:`/complete` 若无法入队(如 Redis 不可用),立即把任务置 `FAILED` 并返回 502,前端据此展示失败与重试,而不是无限等待。
- **前端轮询**:改为指数退避(1.5s→8s 封顶)+ 标签页隐藏时暂停 + 90s 超时提示,减少无效请求。
- **AI 调用韧性**:模型请求对 429/5xx/网络错误做一次退避重试,最终失败回落到确定性文案。
- **DB 热点索引**:为 `ReportJob.sessionId`、`Payment.sessionId`(以及 `Payment.entitlementId`)建索引,覆盖 complete/pay/results 的高频查询。
- **可观测性**:`src/lib/metrics.ts` 以结构化 JSON 行输出任务耗时、AI/兜底占比等指标,可直接作为 Datadog 的 log-based metrics 接入(后续换 dd-trace/StatsD 只需改这一个文件)。
- **无障碍/SEO**:数字输入补 `aria-*`、`prefers-reduced-motion` 时降级动画;`layout.tsx` 提供 OpenGraph/Twitter/robots 元信息。

## AI 使用复盘

- **数据建模:** 用 AI 压力测试 schema —— 把 `AssessmentResult` 拆成 `previewPayload` / `fullPayload` / `safetyPayload`,让订阅边界体现在数据结构上,而不是只在视图层做。
- **算法 + 测试:** 健康指标公式及其边界/非法测试矩阵(NaN、非正数、极端差值)用 AI 起草,再对照已知的 BMI / Mifflin-St Jeor 数值人工核对。
- **Agent 架构:** 报告流水线是 writer → 独立 safety-reviewer 的反思循环(`src/lib/report-generator.ts`);只有审查员批准的文案才会被采用,否则回退到确定性文案。
- **一条我否决的 AI 建议:** AI 最初建议在会话上放一个 `isSubscribed` 布尔值,并只在 React 组件里做脱敏。我否决了 —— 那样完整计划会通过网络下发,任何用户在开发者工具里都能读到。我把脱敏移到服务端 `GET /api/results/:id`,并保留 `Entitlement` scope 模型,让鉴权是权威且可扩展的。AI 还建议把算出的热量存在浏览器、`/pay` 时信任它;出于同样的信任边界原因被否决 —— 所有指标都在服务端计算并持久化。

## 文档

- `docs/architecture.md` —— 架构
- `docs/api.md` —— 接口
- `docs/demo-script.md` —— 演示脚本
- `docs/deployment.md` —— 部署
