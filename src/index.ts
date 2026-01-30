/**
 * Task MCP 主入口
 * 使用 StreamableHTTPServerTransport 实现 MCP 服务器
 */

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createServer } from 'http';
import { z } from 'zod';
import { getTasks, createTask, updateTask, deleteTask, completeTask } from './tools/task.js';

const PORT = process.env.PORT || 3000;

const server = new Server(
  {
    name: 'task-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 参数 Schema 定义
const GetTasksSchema = z.object({
  mode: z.enum(['all', 'today', 'yesterday', 'recent_7_days']).optional().default('all'),
  keyword: z.string().optional(),
  priority: z.union([z.literal(0), z.literal(1), z.literal(3), z.literal(5)]).optional(),
  project_name: z.string().optional(),
  completed: z.boolean().optional(),
});

const CreateTaskSchema = z.object({
  title: z.string(),
  content: z.string().optional(),
  priority: z.union([z.literal(0), z.literal(1), z.literal(3), z.literal(5)]).optional(),
  project_name: z.string().optional(),
  tag_names: z.array(z.string()).optional(),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  is_all_day: z.boolean().optional(),
  reminder: z.string().optional(),
  column_name: z.string().optional(),
});

const UpdateTaskSchema = z.object({
  task_id: z.string(),
  title: z.string().optional(),
  content: z.string().optional(),
  priority: z.union([z.literal(0), z.literal(1), z.literal(3), z.literal(5)]).optional(),
  project_name: z.string().optional(),
  tag_names: z.array(z.string()).optional(),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  is_all_day: z.boolean().optional(),
  reminder: z.string().optional(),
  status: z.union([z.literal(0), z.literal(2)]).optional(),
});

const DeleteTaskSchema = z.object({
  task_id: z.string(),
});

const CompleteTaskSchema = z.object({
  task_id: z.string(),
});

// 列出可用工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_current_time',
        description:
          '获取当前系统时间。在创建任务、设置日期相关操作之前，建议先调用此工具获取准确的当前时间。返回的时间包含多种格式供使用。',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_tasks',
        description:
          '获取任务列表。支持按模式、关键词、优先级、项目名称、完成状态筛选。模式支持 all(所有)、today(今天)、yesterday(昨天)、recent_7_days(最近7天)。',
        inputSchema: {
          type: 'object',
          properties: {
            mode: {
              type: 'string',
              enum: ['all', 'today', 'yesterday', 'recent_7_days'],
              description: '任务筛选模式',
            },
            keyword: {
              type: 'string',
              description: '关键词，匹配任务标题或内容',
            },
            priority: {
              type: 'number',
              enum: [0, 1, 3, 5],
              description: '优先级：0-无，1-低，3-中，5-高',
            },
            project_name: {
              type: 'string',
              description: '项目名称筛选',
            },
            completed: {
              type: 'boolean',
              description: '是否已完成：true-已完成，false-未完成，undefined-全部',
            },
          },
          required: [],
        },
      },
      {
        name: 'create_task',
        description:
          '务必先获取最新的时间，再进行创建新任务。如果不知道最新的时间是多少，请进行询问，而不是自己编写一个时间。日期格式支持 YYYY-MM-DD（全天任务）或 YYYY-MM-DD HH:MM:SS（指定时间）。如果用户提供的信息不完整（如缺少标题），会返回提示信息，请先向用户确认后再调用。建议同时提供项目名称和日期以便更好地管理任务。',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: '任务标题',
            },
            content: {
              type: 'string',
              description: '任务内容',
            },
            priority: {
              type: 'number',
              enum: [0, 1, 3, 5],
              description: '优先级：0-无，1-低，3-中，5-高',
            },
            project_name: {
              type: 'string',
              description: '项目名称，不存在时会报错',
            },
            tag_names: {
              type: 'array',
              items: { type: 'string' },
              description: '标签名称列表',
            },
            start_date: {
              type: 'string',
              description: '开始日期，格式 YYYY-MM-DD 或 YYYY-MM-DD HH:MM:SS',
            },
            due_date: {
              type: 'string',
              description: '截止日期，格式 YYYY-MM-DD 或 YYYY-MM-DD HH:MM:SS',
            },
            is_all_day: {
              type: 'boolean',
              description: '是否为全天任务',
            },
            reminder: {
              type: 'string',
              description: '提醒选项，如 "0"(准时)、"-5M"(提前5分钟)、"-1H"(提前1小时)、"-1D"(提前1天)',
            },
            column_name: {
              type: 'string',
              description: '栏目名称（仅在看板视图项目中有效）',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_task',
        description:
          '更新任务。日期格式支持 YYYY-MM-DD 或 YYYY-MM-DD HH:MM:SS。status 设置为 2 表示完成任务，设置 为 0 不支持（官方 API 限制）。',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: '任务ID或任务标题',
            },
            title: {
              type: 'string',
              description: '新任务标题',
            },
            content: {
              type: 'string',
              description: '新任务内容',
            },
            priority: {
              type: 'number',
              enum: [0, 1, 3, 5],
              description: '新优先级：0-无，1-低，3-中，5-高',
            },
            project_name: {
              type: 'string',
              description: '新项目名称',
            },
            tag_names: {
              type: 'array',
              items: { type: 'string' },
              description: '新标签名称列表',
            },
            start_date: {
              type: 'string',
              description: '新开始日期',
            },
            due_date: {
              type: 'string',
              description: '新截止日期',
            },
            is_all_day: {
              type: 'boolean',
              description: '是否为全天任务',
            },
            reminder: {
              type: 'string',
              description: '新提醒选项',
            },
            status: {
              type: 'number',
              enum: [0, 2],
              description: '新状态：0-未完成，2-已完成（设为2会调用完成任务接口）',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'delete_task',
        description: '删除任务。参数为任务ID或任务标题。',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: '任务ID或任务标题',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'complete_task',
        description: '完成任务。参数为任务ID或任务标题。',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: '任务ID或任务标题',
            },
          },
          required: ['task_id'],
        },
      },
    ],
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'get_current_time') {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const second = now.getSeconds();

      // 格式化为 YYYY-MM-DD
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      // 格式化为 YYYY-MM-DD HH:MM:SS
      const dateTimeStr = `${dateStr} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                message: '当前时间获取成功',
                current_time: {
                  iso: now.toISOString(),
                  date: dateStr,
                  datetime: dateTimeStr,
                  year,
                  month,
                  day,
                  hour,
                  minute,
                  second,
                  weekday: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()],
                  timestamp: now.getTime(),
                },
                hint: '创建任务时，请使用 date 格式（全天任务）或 datetime 格式（指定时间任务）',
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'get_tasks') {
      const parsed = GetTasksSchema.parse(args);
      const result = await getTasks({
        mode: parsed.mode,
        keyword: parsed.keyword,
        priority: parsed.priority,
        project_name: parsed.project_name,
        completed: parsed.completed,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                count: result.length,
                data: result,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'create_task') {
      const parsed = CreateTaskSchema.parse(args);

      // 检查信息完整性，收集缺失的信息
      const missingInfo: string[] = [];
      const suggestions: string[] = [];

      // 标题是必须的
      if (!parsed.title || parsed.title.trim() === '') {
        missingInfo.push('任务标题');
      }

      // 检查是否有日期信息（可选但建议提供）
      if (!parsed.start_date && !parsed.due_date) {
        suggestions.push('日期（开始日期或截止日期）');
      }

      // 检查是否有项目信息（可选但建议提供）
      if (!parsed.project_name) {
        suggestions.push('所属项目');
      }

      // 如果有必须的信息缺失，返回提示
      if (missingInfo.length > 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  needMoreInfo: true,
                  message: '创建任务需要更多信息',
                  required: missingInfo,
                  optional: suggestions,
                  hint: `请提供以下必要信息：${missingInfo.join('、')}。${suggestions.length > 0 ? `建议同时提供：${suggestions.join('、')}。` : ''}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // 如果有建议提供的信息缺失，可以选择性地提示（但不阻止创建）
      // 这里我们仍然继续创建，但在响应中包含建议
      const result = await createTask({
        title: parsed.title,
        content: parsed.content,
        priority: parsed.priority,
        project_name: parsed.project_name,
        tag_names: parsed.tag_names,
        start_date: parsed.start_date,
        due_date: parsed.due_date,
        is_all_day: parsed.is_all_day,
        reminder: parsed.reminder,
        column_name: parsed.column_name,
      });

      const response: Record<string, unknown> = {
        success: true,
        message: '任务创建成功',
        data: result,
      };

      // 如果有建议但用户未提供，添加提示
      if (suggestions.length > 0) {
        response.suggestions = `下次创建任务时，建议提供：${suggestions.join('、')}，以便更好地管理任务。`;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    }

    if (name === 'update_task') {
      const parsed = UpdateTaskSchema.parse(args);
      const result = await updateTask({
        task_id: parsed.task_id,
        title: parsed.title,
        content: parsed.content,
        priority: parsed.priority,
        project_name: parsed.project_name,
        tag_names: parsed.tag_names,
        start_date: parsed.start_date,
        due_date: parsed.due_date,
        is_all_day: parsed.is_all_day,
        reminder: parsed.reminder,
        status: parsed.status,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (name === 'delete_task') {
      const parsed = DeleteTaskSchema.parse(args);
      const result = await deleteTask({
        task_id: parsed.task_id,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (name === 'complete_task') {
      const parsed = CompleteTaskSchema.parse(args);
      const result = await completeTask({
        task_id: parsed.task_id,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `未知工具: ${name}`,
        },
      ],
      isError: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              message: `执行失败: ${errorMessage}`,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// 启动 StreamableHTTP 服务
async function main() {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);

  const httpServer = createServer(async (req, res) => {
    // 设置 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url || '', `http://localhost:${PORT}`);

    if (url.pathname === '/mcp') {
      await transport.handleRequest(req, res);
    } else if (url.pathname === '/' || url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', name: 'task-mcp' }));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  httpServer.listen(PORT, () => {
    console.log(`Task MCP StreamableHTTP 服务已启动`);
    console.log(`端点: http://localhost:${PORT}/mcp`);
  });
}

main().catch((error) => {
  console.error('服务启动失败:', error);
  process.exit(1);
});
