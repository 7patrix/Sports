# 部署

本应用有两个运行进程,外加两个托管依赖:

- Web 服务:`npm run start`(Next.js 应用 + API 路由)
- Worker 服务:`npm run worker`(BullMQ 消费者,负责报告生成)
- PostgreSQL(托管)
- Redis(托管)

Postgres 是唯一事实来源;队列只传递任务 ID。如果只部署 Web 服务而不部署 worker,报告任务会一直停在 `PENDING`。

## 环境变量

| 变量 | 是否必填 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 是 | Postgres 连接串 |
| `REDIS_URL` | 是 | Redis 连接串 |
| `APP_URL` | 是 | Web 服务的公网 URL |
| `MOCK_AI` | 否 | `true`(默认)使用确定性兜底 writer;设为 `false` 启用真实 AI writer |
| `OPENAI_API_KEY` | `MOCK_AI=false` 时必填 | OpenAI 兼容端点的密钥 |
| `OPENAI_BASE_URL` | 否 | 默认 `https://api.openai.com/v1`;可指向任何兼容端点 |
| `AI_MODEL` | 否 | 默认 `gpt-4o-mini` |

AI writer 只生成叙述性文案(总结 + 教练备注)。涉及安全的训练结构始终是确定性的,且任何 AI 失败都会自动回退。

## 数据库迁移

每次发布、启动应用之前运行:

```bash
npm run db:deploy   # prisma migrate deploy
```

可选:写入演示数据(非生产,或首次上线时执行一次):

```bash
npm run db:seed
```

## 方案 A:Railway(推荐)

1. 创建 Railway 项目,添加 **PostgreSQL** 和 **Redis** 插件。
2. 从仓库创建 **Web** 服务:
   - 构建命令:`npm run build`
   - 启动命令:`npm run start`
   - 部署/发布命令(Pre-Deploy):`npm run db:deploy`
   - 环境变量:`DATABASE_URL`、`REDIS_URL`、`APP_URL`,以及(可选)AI 相关变量。
3. 从同一仓库创建 **Worker** 服务:
   - 启动命令:`npm run worker`
   - 环境变量:`DATABASE_URL`、`REDIS_URL` 和 AI 变量(与 web 相同)。
4. `prisma generate` 会通过 `postinstall` 脚本自动运行。

> 保持网站长期在线:Railway 默认会让服务持续运行,不需要你本地开着任何东西(见下方「常见问题」)。

## 方案 B:Docker

提供了两个 Dockerfile:

```bash
# Web
docker build -t health-funnel-web -f Dockerfile .
docker run -p 3000:3000 --env-file .env health-funnel-web

# Worker
docker build -t health-funnel-worker -f Dockerfile.worker .
docker run --env-file .env health-funnel-worker
```

首次启动前,对目标数据库运行一次 `npm run db:deploy`。

## 健康检查

`GET /api/health` 校验 Postgres 和 Redis 连通性,任一不可用时返回 503。把平台的健康检查指向这个路由即可。

## 常见问题

- **网站需要我本地开着电脑吗?** 不需要。线上站点跑在 Railway 的云服务器上,和你本地的电脑、docker 无关。你关机它照样在线。
- **本地那套(docker compose、npm run dev)是干嘛的?** 只用于本地开发和跑测试,不影响线上。
- **什么情况下线上会打不开?** Railway 服务被手动暂停/删除、免费额度用尽导致休眠、或环境变量/数据库配置被改错。保持服务处于运行状态、账户额度充足即可长期在线。
