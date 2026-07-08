# 演示脚本

## 1. 用产品视角开场

「这是一套健康问卷漏斗的基础设施,而不只是一个问卷 UI。重点在于展示:答案如何变成持久化数据、系统如何推导出安全的个性化内容,以及预览/完整访问是如何被分级鉴权的。」

## 2. 展示问卷

- 从第一屏开始。
- 选择一个目标感受,指出健康分身卡片会立刻变化。
- 回答一道限制类问题,展示安全提示文案。
- 说明每个答案都通过 API 保存,所以刷新/恢复都能生效。

## 3. 完成评估

- 点击「生成我的计划」。
- 解释应用会校验必填答案、计算确定性画像,并把报告任务入队。
- 展示 AI 生成的时间线各阶段。

## 4. 展示后端深度

打开 `prisma/schema.prisma`,重点讲:

- `AssessmentSession` 与 `AssessmentAnswer`
- 存派生信号的 `AssessmentProfile`(含 `healthMetrics`)
- `ReportJob`、`AgentLog`、`ReportArtifact`
- `Payment` 与 `Entitlement`

## 5. 解锁计划

- 展示支付前的预览与脱敏(热量/达标日期/预测曲线被隐藏)。
- 点击模拟订阅(或调用 `POST /api/pay`)。
- 因为权益已激活,完整 4 周计划与全部健康指标出现。

## 6. 证明质量

运行:

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run build
```

强调:打分与报告生成是确定性且经过测试的,而 worker 模式在不削弱安全的前提下,为接入真实 LLM writer 留出了空间。
