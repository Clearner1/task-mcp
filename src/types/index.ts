/**
 * 任务相关类型定义
 */

// 优先级常量
export const Priority = {
  NONE: 0,   // 无优先级
  LOW: 1,    // 低优先级
  MEDIUM: 3, // 中优先级
  HIGH: 5,   // 高优先级
} as const;

export type Priority = typeof Priority[keyof typeof Priority];

// 状态常量
export const Status = {
  TODO: 0,       // 未完成
  COMPLETED: 2,  // 已完成
} as const;

export type Status = typeof Status[keyof typeof Status];

// 任务模式
export const TaskMode = {
  ALL: 'all',
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  RECENT_7_DAYS: 'recent_7_days',
} as const;

export type TaskMode = typeof TaskMode[keyof typeof TaskMode];

// 任务接口
export interface Task {
  id?: string;
  title: string;
  content?: string;
  priority?: Priority;
  status?: Status;
  isCompleted?: boolean;
  projectId?: string;
  projectName?: string;
  projectKind?: string;
  columnId?: string;
  tags?: string[];
  tagDetails?: TagDetail[];
  startDate?: string;
  dueDate?: string;
  completedTime?: string;
  createdTime?: string;
  modifiedTime?: string;
  isAllDay?: boolean;
  reminder?: string;
  reminders?: string[];
  progress?: number;
  kind?: string;
  items?: SubTask[];
  timeZone?: string;
  creator?: number;
  sortOrder?: number;
  parentId?: string;
  children?: SubTask[];
  repeatFlag?: string;
  exDate?: string[];
  deleted?: number;
  etag?: string;
  attachments?: unknown[];
  desc?: string;
}

// 子任务接口
export interface SubTask {
  id?: string;
  title?: string;
  content?: string;
  priority?: Priority;
  status?: Status;
  isCompleted?: boolean;
  startDate?: string;
  completedTime?: string;
  progress?: number;
  kind?: string;
  sortOrder?: number;
  parentId?: string;
  timeZone?: string;
}

// 标签详情
export interface TagDetail {
  name: string;
  label?: string;
}

// 项目接口
export interface Project {
  id: string;
  name: string;
  color?: string;
  sortOrder?: number;
  sortType?: string;
  modifiedTime?: string;
  kind?: string;
  groupId?: string;
  showMode?: number;
  avatar?: string;
  columns?: ProjectColumn[];
  closed?: boolean;
  viewMode?: string;
}

// 项目栏目
export interface ProjectColumn {
  id: string;
  projectId: string;
  name: string;
  sortOrder?: number;
  type?: string;
}

// 别名 Column 以保持一致性
export type Column = ProjectColumn;

// 工具参数类型
export interface GetTasksParams {
  mode?: TaskMode;
  keyword?: string;
  priority?: Priority;
  project_name?: string;
  completed?: boolean;
}

export interface CreateTaskParams {
  title: string;
  content?: string;
  priority?: Priority;
  project_name?: string;
  tag_names?: string[];
  start_date?: string;
  due_date?: string;
  is_all_day?: boolean;
  reminder?: string;
  project_id?: string;
  desc?: string;
  time_zone?: string;
  reminders?: string[];
  repeat_flag?: string;
  sort_order?: number;
  items?: SubTask[];
  column_name?: string;
}

export interface UpdateTaskParams {
  task_id: string;
  title?: string;
  content?: string;
  priority?: Priority;
  project_name?: string;
  tag_names?: string[];
  start_date?: string;
  due_date?: string;
  is_all_day?: boolean;
  reminder?: string;
  status?: Status;
  project_id?: string;
  desc?: string;
  time_zone?: string;
  reminders?: string[];
  repeat_flag?: string;
  sort_order?: number;
  items?: SubTask[];
}

export interface DeleteTaskParams {
  task_id: string;
}

export interface CompleteTaskParams {
  task_id: string;
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  info?: string;
  error?: string;
}
