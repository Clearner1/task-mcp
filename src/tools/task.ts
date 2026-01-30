/**
 * 任务工具实现
 */

import { getApiClient } from '../api/dida.js';
import { toApiDateTime, fromApiDateTime, formatDueDate, isToday, isYesterday, isRecent7Days } from '../utils/date.js';
import type { Task, Project, SubTask, GetTasksParams, CreateTaskParams, UpdateTaskParams, DeleteTaskParams, CompleteTaskParams, Priority, Status } from '../types/index.js';

// 全局变量存储已完成栏目ID
let completedColumns = new Set<string>();

/**
 * 获取所有项目
 */
export async function getAllProjects(): Promise<Project[]> {
  const api = getApiClient();
  return api.getProjects();
}

/**
 * 获取所有任务（遍历所有项目）
 */
export async function getAllTasks(): Promise<{ tasks: Task[]; projects: Project[] }> {
  const api = getApiClient();
  const allProjects = await api.getProjects();
  // 过滤掉已关闭的项目
  const projects = allProjects.filter(p => !p.closed);
  const tasks: Task[] = [];

  // 创建项目 ID -> 名称 的映射
  const projectNameMap = new Map<string, string>();
  const projectMap = new Map<string, Project>();
  for (const p of projects) {
    if (p.id) {
      projectNameMap.set(p.id, p.name);
      projectMap.set(p.id, p);
    }
  }

  // 遍历每个项目获取任务
  for (const project of projects) {
    if (!project.id) continue;

    // 更新已完成栏目信息
    if (project.columns) {
      for (const col of project.columns) {
        if (col.type === 'COMPLETED') {
          completedColumns.add(col.id);
        }
      }
    }

    const projectTasks = await api.listTasks(project.id);
    for (const task of projectTasks) {
      // 规范化状态 (API 返回的 status 可能是 0, 1, 2，类型定义只有 0 和 2)
      const rawStatus = (task.status ?? 0) as number;
      const isCompleted = task.isCompleted || rawStatus === 2 || rawStatus === 1;
      task.isCompleted = isCompleted;
      task.status = isCompleted ? 2 : 0;

      // 转换日期字段为本地时间
      if (task.startDate) task.startDate = fromApiDateTime(task.startDate) || undefined;
      if (task.dueDate) task.dueDate = formatDueDate(task.dueDate) || undefined;
      if (task.completedTime) task.completedTime = fromApiDateTime(task.completedTime) || undefined;
      if (task.createdTime) task.createdTime = fromApiDateTime(task.createdTime) || undefined;
      if (task.modifiedTime) task.modifiedTime = fromApiDateTime(task.modifiedTime) || undefined;

      // 补齐项目名称
      if (!task.projectName && projectNameMap.has(project.id)) {
        task.projectName = projectNameMap.get(project.id);
      }
      task.projectId = project.id;
      task.projectKind = project.kind;

      // 处理子任务
      if (task.items) {
        for (const item of task.items) {
          if (item.startDate) item.startDate = fromApiDateTime(item.startDate) || undefined;
          if (item.completedTime) item.completedTime = fromApiDateTime(item.completedTime) || undefined;
        }
      }

      tasks.push(task);
    }
  }

  return { tasks, projects };
}

/**
 * 查找任务（按 ID 或标题）
 */
export function findTask(tasks: Task[], taskIdOrTitle: string): Task | undefined {
  // 先按 ID 查找
  let task = tasks.find(t => t.id === taskIdOrTitle);
  if (task) return task;

  // 按标题查找（精确匹配）
  return tasks.find(t => t.title === taskIdOrTitle);
}

/**
 * 查找项目（按名称）
 */
export function findProject(projects: Project[], projectName: string): Project | undefined {
  // 精确匹配
  let project = projects.find(p => p.name === projectName);
  if (project) return project;

  // 不区分大小写匹配
  const lowerName = projectName.toLowerCase();
  project = projects.find(p => p.name.toLowerCase() === lowerName);
  if (project) return project;

  // 部分匹配
  project = projects.find(p =>
    p.name.toLowerCase().includes(lowerName) ||
    lowerName.includes(p.name.toLowerCase())
  );
  return project;
}

/**
 * 简化任务数据
 */
export function simplifyTask(task: Task): Record<string, unknown> {
  const result: Record<string, unknown> = {
    id: task.id,
    title: task.title,
    content: task.content,
    priority: task.priority,
    status: task.status,
    isCompleted: task.isCompleted,
    projectId: task.projectId,
    projectName: task.projectName || '默认清单',
    projectKind: task.projectKind,
    columnId: task.columnId,
    tags: task.tags || [],
    startDate: task.startDate,
    dueDate: task.dueDate,
    completedTime: task.completedTime,
    createdTime: task.createdTime,
    modifiedTime: task.modifiedTime,
    isAllDay: task.isAllDay,
    reminder: task.reminder,
    progress: task.progress,
    kind: task.kind,
    timeZone: 'Asia/Shanghai',
    reminders: task.reminders || [],
    creator: task.creator,
    sortOrder: task.sortOrder || 0,
    parentId: task.parentId,
  };

  // 处理子任务
  if (task.items && task.items.length > 0) {
    result.items = task.items.map(item => ({
      id: item.id,
      title: item.title,
      content: item.content,
      priority: item.priority,
      status: item.status,
      isCompleted: item.isCompleted,
      startDate: item.startDate,
      completedTime: item.completedTime,
      progress: item.progress,
      kind: item.kind,
      sortOrder: item.sortOrder || 0,
      parentId: item.parentId,
    }));
  }

  // 移除 undefined 和 null 值
  Object.keys(result).forEach(key => {
    if (result[key] === undefined || result[key] === null) {
      delete result[key];
    }
  });

  return result;
}

/**
 * 获取任务列表
 */
export async function getTasks(params: GetTasksParams): Promise<Task[]> {
  const { mode = 'all', keyword, priority, project_name, completed } = params;

  // 如果是查询今天的任务，默认只显示未完成的任务
  const effectiveCompleted = mode === 'today' && completed === undefined ? false : completed;

  const { tasks, projects } = await getAllTasks();

  // 确保所有任务都有正确的 projectName
  for (const task of tasks) {
    if (task.projectId && !task.projectName) {
      const project = projects.find(p => p.id === task.projectId);
      task.projectName = project?.name || '默认清单';
    }
  }

  // 过滤任务
  return tasks.filter(task => {
    // 根据完成状态筛选
    if (effectiveCompleted !== undefined) {
      const taskCompleted = task.isCompleted || false;
      if (taskCompleted !== effectiveCompleted) return false;
    }

    // 根据模式筛选
    if (mode === 'today' && !isToday(task.startDate) && !isToday(task.dueDate)) {
      // 检查任务是否跨越今天
      const startDate = task.startDate ? new Date(task.startDate) : null;
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate && startDate < today) {
        if (!dueDate || dueDate >= today) {
          return true;
        }
      }
      return false;
    }

    if (mode === 'yesterday' && !isYesterday(task.startDate) && !isYesterday(task.dueDate)) {
      return false;
    }

    if (mode === 'recent_7_days') {
      const startDate = task.startDate ? new Date(task.startDate) : null;
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const taskDate = dueDate || startDate;
      if (taskDate && taskDate < sevenDaysAgo) {
        if (!startDate || startDate >= sevenDaysAgo) {
          return true;
        }
        return false;
      }
    }

    // 根据关键词筛选
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      const titleMatch = task.title?.toLowerCase().includes(lowerKeyword);
      const contentMatch = task.content?.toLowerCase().includes(lowerKeyword);
      if (!titleMatch && !contentMatch) return false;
    }

    // 根据优先级筛选
    if (priority !== undefined && task.priority !== priority) {
      return false;
    }

    // 根据项目名称筛选
    if (project_name && project_name !== '') {
      if (!task.projectName?.includes(project_name)) return false;
    }

    return true;
  });
}

/**
 * 创建任务
 */
export async function createTask(params: CreateTaskParams): Promise<Task> {
  const api = getApiClient();
  const { title, content, priority, project_name, tag_names, start_date, due_date, is_all_day, reminder, project_id, desc, time_zone, reminders, repeat_flag, sort_order, items, column_name } = params;

  // 查找项目 ID（过滤掉已关闭的项目）
  let resolvedProjectId = project_id;
  let resolvedColumnId: string | undefined;

  if (!resolvedProjectId && project_name) {
    const allProjects = await api.getProjects();
    const projects = allProjects.filter(p => !p.closed);
    const project = findProject(projects, project_name);
    resolvedProjectId = project?.id;
  }

  // 如果指定了栏目名称，查找栏目 ID
  if (resolvedProjectId && column_name) {
    try {
      const projectData = await api.getProjectData(resolvedProjectId);
      // 查找匹配的栏目
      const column = projectData.columns.find(
        c => c.name === column_name || c.name.toLowerCase() === column_name.toLowerCase()
      );

      if (column) {
        resolvedColumnId = column.id;
      } else {
        console.warn(`未找到名称为 '${column_name}' 的栏目，将使用默认栏目`);
      }
    } catch (error) {
      console.error(`获取项目栏目失败: ${error}`);
    }
  }

  // 构建任务数据
  const taskData: Record<string, unknown> = {
    title,
    content: content || desc,
    priority: priority ?? 0,
    projectId: resolvedProjectId,
    columnId: resolvedColumnId,
    isAllDay: is_all_day,
    status: 0,
    kind: 'TEXT',
  };

  // 处理日期
  if (start_date) {
    taskData.startDate = toApiDateTime(start_date);
  }
  if (due_date) {
    taskData.dueDate = toApiDateTime(due_date);
  }

  // 处理提醒
  if (reminder) {
    taskData.reminder = reminder;
  }
  if (reminders) {
    taskData.reminders = reminders;
  }

  // 其他字段
  if (time_zone) {
    taskData.timeZone = time_zone;
  } else {
    taskData.timeZone = 'Asia/Shanghai';
  }
  if (repeat_flag) taskData.repeatFlag = repeat_flag;
  if (sort_order !== undefined) taskData.sortOrder = sort_order;
  if (items) taskData.items = items;

  // 移除 undefined 值
  Object.keys(taskData).forEach(key => {
    if (taskData[key] === undefined) {
      delete taskData[key];
    }
  });

  const task = await api.createTask(taskData);

  // 转换返回数据
  const result = { ...task };
  if (result.startDate) result.startDate = fromApiDateTime(result.startDate as string) || undefined;
  if (result.dueDate) result.dueDate = formatDueDate(result.dueDate as string) || undefined;
  if (result.completedTime) result.completedTime = fromApiDateTime(result.completedTime as string) || undefined;
  if (result.createdTime) result.createdTime = fromApiDateTime(result.createdTime as string) || undefined;
  if (result.modifiedTime) result.modifiedTime = fromApiDateTime(result.modifiedTime as string) || undefined;

  result.projectName = project_name || '默认清单';
  result.projectId = resolvedProjectId;

  return result as Task;
}

/**
 * 更新任务
 */
export async function updateTask(params: UpdateTaskParams): Promise<{ success: boolean; info: string; data?: Task }> {
  const api = getApiClient();
  const { task_id, title, content, priority, project_name, start_date, due_date, is_all_day, reminder, status, project_id, desc, time_zone, reminders, repeat_flag, sort_order, items } = params;

  // 获取所有任务
  const { tasks, projects } = await getAllTasks();

  // 查找任务
  const task = findTask(tasks, task_id);
  if (!task) {
    return {
      success: false,
      info: `未找到ID或标题为 '${task_id}' 的任务`,
    };
  }

  const taskId = task.id!;
  const currentProjectId = task.projectId;

  // 处理状态变更（完成任务）
  if (status === 2) {
    if (!currentProjectId) {
      return { success: false, info: '完成任务失败：缺少 projectId' };
    }
    try {
      await api.completeTask(currentProjectId, taskId);
      // 刷新任务
      const refreshedTasks = await api.listTasks(currentProjectId);
      const freshTask = refreshedTasks.find(t => t.id === taskId);

      if (freshTask) {
        const result = simplifyTaskResponse(freshTask, projects, currentProjectId);
        return { success: true, info: '任务已完成', data: result };
      }

      // 无法刷新则构造完成态
      const taskAfter = { ...task, status: 2, isCompleted: true };
      return { success: true, info: '任务已完成', data: taskAfter as Task };
    } catch (error) {
      return { success: false, info: `完成任务失败: ${error}` };
    }
  }

  // 取消完成不支持
  if (status === 0) {
    return { success: false, info: '取消完成未在官方开放API中提供，暂不支持' };
  }

  // 查找项目 ID
  let resolvedProjectId = project_id || currentProjectId;
  if (project_name && !resolvedProjectId) {
    const project = findProject(projects, project_name);
    resolvedProjectId = project?.id;
  }

  // 构建更新数据
  const updateData: Record<string, unknown> = {
    id: taskId,
    title: title ?? task.title,
    content: content ?? task.content ?? desc,
    priority: priority ?? task.priority,
    projectId: resolvedProjectId,
    isAllDay: is_all_day ?? task.isAllDay,
    status: status ?? task.status,
    kind: task.kind || 'TEXT',
  };

  // 处理日期
  if (start_date !== undefined) {
    updateData.startDate = toApiDateTime(start_date);
  } else if (task.startDate) {
    updateData.startDate = task.startDate;
  }

  if (due_date !== undefined) {
    updateData.dueDate = toApiDateTime(due_date);
  } else if (task.dueDate) {
    updateData.dueDate = task.dueDate;
  }

  // 处理提醒
  if (reminder !== undefined) {
    updateData.reminder = reminder;
  } else if (task.reminder) {
    updateData.reminder = task.reminder;
  }

  if (reminders !== undefined) {
    updateData.reminders = reminders;
  }

  // 其他字段
  if (time_zone !== undefined) {
    updateData.timeZone = time_zone;
  } else {
    updateData.timeZone = 'Asia/Shanghai';
  }
  if (repeat_flag !== undefined) updateData.repeatFlag = repeat_flag;
  if (sort_order !== undefined) updateData.sortOrder = sort_order;
  if (items !== undefined) updateData.items = items;

  // 移除 undefined 值
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  try {
    const response = await api.updateTask(taskId, updateData);
    const result = simplifyTaskResponse(response, projects, resolvedProjectId || currentProjectId);
    return { success: true, info: '任务更新成功', data: result };
  } catch (error) {
    return { success: false, info: `更新任务失败: ${error}` };
  }
}

/**
 * 简化 API 响应任务数据
 */
function simplifyTaskResponse(task: Task, projects: Project[], projectId?: string): Task {
  const result = { ...task };

  if (result.startDate) result.startDate = fromApiDateTime(result.startDate as string) || undefined;
  if (result.dueDate) result.dueDate = formatDueDate(result.dueDate as string) || undefined;
  if (result.completedTime) result.completedTime = fromApiDateTime(result.completedTime as string) || undefined;
  if (result.createdTime) result.createdTime = fromApiDateTime(result.createdTime as string) || undefined;
  if (result.modifiedTime) result.modifiedTime = fromApiDateTime(result.modifiedTime as string) || undefined;

  if (!result.projectName) {
    const pid = projectId || result.projectId;
    const project = projects.find(p => p.id === pid);
    result.projectName = project?.name || '默认清单';
  }

  return result;
}

/**
 * 删除任务
 */
export async function deleteTask(params: DeleteTaskParams): Promise<{ success: boolean; info: string; data?: Task }> {
  const api = getApiClient();
  const { task_id } = params;

  // 获取所有任务
  const { tasks, projects } = await getAllTasks();

  // 查找任务
  const task = findTask(tasks, task_id);
  if (!task) {
    return {
      success: false,
      info: `未找到ID或标题为 '${task_id}' 的任务`,
    };
  }

  const taskId = task.id!;
  const projectId = task.projectId;

  if (!projectId) {
    return { success: false, info: '删除任务失败：缺少 projectId' };
  }

  try {
    await api.deleteTask(projectId, taskId);
    const result = simplifyTaskResponse(task, projects, projectId);
    return {
      success: true,
      info: `成功删除任务 '${task.title}'`,
      data: result,
    };
  } catch (error) {
    return { success: false, info: `删除任务失败: ${error}` };
  }
}

/**
 * 完成任务
 */
export async function completeTask(params: CompleteTaskParams): Promise<{ success: boolean; info: string; data?: Task }> {
  const api = getApiClient();
  const { task_id } = params;

  // 获取所有任务
  const { tasks, projects } = await getAllTasks();

  // 查找任务
  const task = findTask(tasks, task_id);
  if (!task) {
    return {
      success: false,
      info: `未找到ID或标题为 '${task_id}' 的任务`,
    };
  }

  const taskId = task.id!;
  const projectId = task.projectId;

  if (!projectId) {
    return { success: false, info: '完成任务失败：缺少 projectId' };
  }

  try {
    await api.completeTask(projectId, taskId);

    // 刷新任务
    const refreshedTasks = await api.listTasks(projectId);
    const freshTask = refreshedTasks.find(t => t.id === taskId);

    if (freshTask) {
      const result = simplifyTaskResponse(freshTask, projects, projectId);
      return { success: true, info: '任务已完成', data: result };
    }

    // 无法刷新则构造完成态
    const taskAfter = { ...task, status: 2, isCompleted: true };
    return { success: true, info: '任务已完成', data: taskAfter as Task };
  } catch (error) {
    return { success: false, info: `完成任务失败: ${error}` };
  }
}
