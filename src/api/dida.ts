/**
 * 滴答清单 API 调用层
 * 基于官方 OpenAPI: https://developer.dida365.com/docs#/openapi
 */

import type { Task, Project, SubTask, Column } from '../types/index.js';

const BASE_URL = 'https://api.dida365.com/open/v1';

interface RequestOptions {
  method: 'GET' | 'POST' | 'DELETE' | 'PUT';
  body?: unknown;
}

/**
 * 滴答清单 API 客户端
 */
export class DidaAPI {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * 发起 API 请求
   */
  private async request<T>(endpoint: string, options: RequestOptions): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };

    console.log(`[API] ${options.method} ${url}`);

    try {
      const response = await fetch(url, {
        method: options.method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`[API] 请求失败: ${error}`);
      throw error;
    }
  }

  // ---------- 项目相关 ----------

  /**
   * 获取项目列表
   * GET /project
   */
  async getProjects(): Promise<Project[]> {
    const data = await this.request<Project[]>('/project', { method: 'GET' });
    return Array.isArray(data) ? data : [];
  }

  /**
   * 创建项目
   * POST /project
   */
  async createProject(name: string, color?: string): Promise<Project> {
    const payload: Record<string, string> = { name };
    if (color) payload.color = color;
    return this.request<Project>('/project', { method: 'POST', body: payload });
  }

  // ---------- 任务相关 ----------

  /**
   * 获取项目任务列表
   * GET /project/{projectId}/data
   */
  async listTasks(projectId: string): Promise<Task[]> {
    const data = await this.request<{ tasks?: Task[] }>(`/project/${projectId}/data`, { method: 'GET' });
    return data.tasks || [];
  }

  /**
   * 获取项目完整数据（包含任务和栏目）
   * GET /project/{projectId}/data
   */
  async getProjectData(projectId: string): Promise<{ project: Project; tasks: Task[]; columns: Column[] }> {
    const data = await this.request<{ project: Project; tasks?: Task[]; columns?: Column[] }>(`/project/${projectId}/data`, { method: 'GET' });
    return {
      project: data.project,
      tasks: data.tasks || [],
      columns: data.columns || [],
    };
  }

  /**
   * 创建任务
   * POST /task
   */
  async createTask(taskData: Record<string, unknown>): Promise<Task> {
    return this.request<Task>('/task', { method: 'POST', body: taskData });
  }

  /**
   * 更新任务
   * POST /task/{taskId}
   */
  async updateTask(taskId: string, taskData: Record<string, unknown>): Promise<Task> {
    return this.request<Task>(`/task/${taskId}`, { method: 'POST', body: taskData });
  }

  /**
   * 删除任务
   * DELETE /project/{projectId}/task/{taskId}
   */
  async deleteTask(projectId: string, taskId: string): Promise<void> {
    await this.request(`/project/${projectId}/task/${taskId}`, { method: 'DELETE' });
  }

  /**
   * 完成任务
   * POST /project/{projectId}/task/{taskId}/complete
   */
  async completeTask(projectId: string, taskId: string): Promise<void> {
    await this.request(`/project/${projectId}/task/${taskId}/complete`, { method: 'POST', body: {} });
  }
}

/**
 * 获取 API 客户端实例
 */
let apiInstance: DidaAPI | null = null;

export function getApiClient(): DidaAPI {
  if (!apiInstance) {
    const accessToken = process.env.DIDA_ACCESS_TOKEN;
    console.log('[API] DIDA_ACCESS_TOKEN:', accessToken ? '已设置' : '未设置');
    if (!accessToken) {
      throw new Error('未配置 DIDA_ACCESS_TOKEN，请在 .env 文件中设置');
    }
    apiInstance = new DidaAPI(accessToken);
  }
  return apiInstance;
}

/**
 * 初始化 API 客户端
 */
export function initApi(accessToken: string): DidaAPI {
  apiInstance = new DidaAPI(accessToken);
  return apiInstance;
}
