# 接口文档

## 问卷

### `GET /api/quiz/current`

返回当前生效的版本化问卷定义。

## 评估会话

### `POST /api/assessment-sessions`

创建或恢复一个匿名会话。

请求体:

```json
{
  "anonymousToken": "可选的已有 token"
}
```

### `GET /api/assessment-sessions/:sessionId`

返回会话进度、答案、画像、最新报告任务、日志、产物、结果和权益。

### `PATCH /api/assessment-sessions/:sessionId/answers`

校验并 upsert 一条答案(分步保存)。会根据题目定义校验取值:单/多选值必须在允许范围内,数字必须是有限值且在 `[min, max]` 内,刻度必须是范围内整数。非法 / 越界 / 注入值返回 `422` 且不落库。

请求体:

```json
{
  "questionId": "weight_kg",
  "value": 72
}
```

### `POST /api/assessment-sessions/:sessionId/complete`

校验必填答案,计算确定性画像,把会话标记为完成,创建报告任务并入队交给 worker 处理。

### `POST /api/assessment-sessions/:sessionId/email`

采集并保存邮箱(交付价值后的身份采集)。**仅存入数据库,不发送真实邮件。**

请求体:

```json
{
  "email": "user@example.com"
}
```

## 报告

### `GET /api/reports/:jobId`

返回报告状态、进度、时间线日志、产物,以及结果(若已就绪)。

## 结果

### `GET /api/results/:sessionId`

返回按订阅状态脱敏后的结果。

- **所有人:** `preview`、`scores`、`safety`,以及 `healthMetrics.bmi` / `bmiCategory`。
- **仅会员**(`subscriptionStatus` 为 ACTIVE 或拥有 `assessment.full_plan` 权益):
  `fullPlan`,以及 `healthMetrics` 中的具体预测数据
  (`recommendedCalories`、`macros`、`weeksToGoal`、`targetDateIso`、`projection`)。

对非会员,这些字段为 `null`,且 `healthMetrics.locked = true`。

```json
{
  "access": "preview",
  "subscriptionStatus": "FREE",
  "fullPlan": null,
  "healthMetrics": { "bmi": 25.5, "bmiCategory": "overweight", "recommendedCalories": null, "targetDateIso": null, "projection": null, "locked": true }
}
```

## 支付

### `POST /api/pay`

模拟支付回调。在同一事务里把会话 `subscriptionStatus` 翻转为 `ACTIVE`、记录一条已支付 `Payment` 并发放完整计划权益。会话必须为 `COMPLETED` 状态。

请求体:

```json
{
  "sessionId": "评估会话 id",
  "providerRef": "可选的外部支付流水号"
}
```

响应:

```json
{ "sessionId": "...", "subscriptionStatus": "ACTIVE", "alreadyActive": false, "paymentId": "..." }
```

### `POST /api/checkout/mock`

漏斗 UI 使用的向后兼容别名,与 `/api/pay` 共用同一套激活逻辑。

请求体:

```json
{
  "sessionId": "评估会话 id"
}
```

## 健康检查

### `GET /api/health`

检查 Postgres 和 Redis 连通性,任一不可用时返回 503。
