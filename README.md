# Task MCP - 滴答清单 MCP 服务器

<p align="center">
  <img src="https://img.shields.io/badge/MCP-1.0.0-blue?style=flat-square" alt="MCP Version">
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-20+-green?style=flat-square&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="License">
</p>

一个基于 **Model Context Protocol (MCP)** 的 TypeScript 项目，用于与 **滴答清单 (Dida365)** 进行 API 集成，允许 AI 助手（如 Claude、Gemini 等）通过 MCP 协议管理用户的滴答清单任务。

## ✨ 功能特性

- 🔄 **完整的任务管理**: 支持获取、创建、更新、删除、完成任务
- 📅 **智能日期筛选**: 支持今天、昨天、最近7天等多种筛选模式
- 🏷️ **项目管理**: 自动匹配项目名称，支持模糊匹配
- 🕐 **时区处理**: 自动处理 UTC 与北京时间的转换
- ✅ **参数验证**: 使用 Zod 进行严格的输入校验

## 📁 项目结构

```
task-mcp/
├── .env                    # 环境变量配置
├── .env.example            # 环境变量示例
├── package.json            # 项目配置
├── tsconfig.json           # TypeScript 配置
├── didaAPI.md              # 滴答清单 OpenAPI 完整文档
└── src/
    ├── index.ts            # 主入口：MCP 服务器 + HTTP 端点
    ├── api/
    │   └── dida.ts         # 滴答清单 API 客户端封装
    ├── tools/
    │   └── task.ts         # 任务工具实现（核心业务逻辑）
    ├── types/
    │   └── index.ts        # TypeScript 类型定义
    └── utils/
        └── date.ts         # 日期工具（UTC ↔ 北京时间转换）
```

## 🚀 快速开始

### 1. 安装依赖

```bash
yarn install
# 或
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 滴答清单 API 访问令牌
DIDA_ACCESS_TOKEN=your_access_token_here

# 服务端口（可选，默认 3000）
PORT=3010
```

> 💡 **获取 Access Token**: 访问 [滴答清单开发者中心](https://developer.dida365.com/manage) 注册应用并完成 OAuth 授权流程。

### 3. 启动服务

```bash
# 开发模式（热重载）
yarn dev

# 生产模式
yarn start
```

服务启动后，MCP 端点为：`http://localhost:3010/mcp`

## 🔧 MCP 工具

本项目提供以下 5 个 MCP 工具：

### `get_tasks` - 获取任务列表

获取任务列表，支持多种筛选条件。

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `mode` | string | 否 | 筛选模式：`all`（默认）、`today`、`yesterday`、`recent_7_days` |
| `keyword` | string | 否 | 关键词，匹配任务标题或内容 |
| `priority` | number | 否 | 优先级：`0`-无、`1`-低、`3`-中、`5`-高 |
| `project_name` | string | 否 | 项目名称筛选 |
| `completed` | boolean | 否 | 完成状态：`true`-已完成、`false`-未完成 |

### `create_task` - 创建任务

创建新任务。

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `title` | string | ✅ | 任务标题 |
| `content` | string | 否 | 任务内容/描述 |
| `priority` | number | 否 | 优先级：`0`-无、`1`-低、`3`-中、`5`-高 |
| `project_name` | string | 否 | 项目名称 |
| `start_date` | string | 否 | 开始日期，格式：`YYYY-MM-DD` 或 `YYYY-MM-DD HH:MM:SS` |
| `due_date` | string | 否 | 截止日期，格式同上 |
| `is_all_day` | boolean | 否 | 是否全天任务 |
| `reminder` | string | 否 | 提醒选项：`"0"`(准时)、`"-5M"`(提前5分钟)、`"-1H"`(提前1小时)、`"-1D"`(提前1天) |

### `update_task` - 更新任务

更新现有任务的属性。

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `task_id` | string | ✅ | 任务 ID 或任务标题 |
| `title` | string | 否 | 新任务标题 |
| `content` | string | 否 | 新任务内容 |
| `priority` | number | 否 | 新优先级 |
| `project_name` | string | 否 | 新项目名称 |
| `start_date` | string | 否 | 新开始日期 |
| `due_date` | string | 否 | 新截止日期 |
| `status` | number | 否 | 新状态：`0`-未完成、`2`-已完成 |

> ⚠️ **注意**: 将 `status` 设置为 `2` 会调用完成任务接口。取消完成（`status=0`）不受官方 API 支持。

### `delete_task` - 删除任务

删除指定任务。

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `task_id` | string | ✅ | 任务 ID 或任务标题 |

### `complete_task` - 完成任务

将任务标记为已完成。

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `task_id` | string | ✅ | 任务 ID 或任务标题 |

## 🌐 技术架构

```
┌─────────────────┐     HTTP/MCP      ┌─────────────────┐     HTTPS     ┌─────────────────┐
│   AI 助手       │ ◄──────────────► │   Task MCP      │ ◄───────────► │  滴答清单 API   │
│ (Claude/Gemini) │                   │   (本服务)       │               │  api.dida365.com│
└─────────────────┘                   └─────────────────┘               └─────────────────┘
```

- **传输协议**: StreamableHTTPServerTransport
- **HTTP 端点**: `/mcp`（MCP 通信）、`/health`（健康检查）
- **API 客户端**: 基于 Fetch API 封装滴答清单 OpenAPI
- **时区处理**: 自动处理 UTC ↔ 北京时间 (Asia/Shanghai) 转换

## 📝 使用示例

### 在 MCP 客户端中配置

```json
{
  "mcpServers": {
    "task-mcp": {
      "url": "http://localhost:3010/mcp"
    }
  }
}
```

### 示例对话

```
用户：帮我查看今天的任务

AI：调用 get_tasks 工具，参数 mode="today"

用户：创建一个任务"完成项目报告"，高优先级，截止日期是明天

AI：调用 create_task 工具，参数 title="完成项目报告", priority=5, due_date="2026-01-30"

用户：把"完成项目报告"标记为完成

AI：调用 complete_task 工具，参数 task_id="完成项目报告"
```

## 🔑 优先级对照表

| 值 | 含义 | 滴答清单显示 |
|----|------|-------------|
| `0` | 无优先级 | 无标记 |
| `1` | 低优先级 | 🔵 蓝色 |
| `3` | 中优先级 | 🟡 黄色 |
| `5` | 高优先级 | 🔴 红色 |

## 📚 相关文档

- [滴答清单开发者中心](https://developer.dida365.com/manage)
- [MCP 官方文档](https://modelcontextprotocol.io/)
- 项目内置 API 文档：[didaAPI.md](./didaAPI.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
