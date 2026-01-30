/**
 * 日期工具函数
 * 处理北京时区 (Asia/Shanghai) 与 UTC 的转换
 */

const SHANGHAI_TZ_OFFSET = 8 * 60 * 60 * 1000; // 北京时间偏移量（毫秒）

/**
 * 将本地时间字符串 (YYYY-MM-DD HH:MM:SS) 转换为 API 所需的格式
 * 格式: YYYY-MM-DDThh:mm:ss.000+0800
 * 
 * 注意：用户输入的是北京时间 (Asia/Shanghai, UTC+8)，
 * 所以使用 +0800 后缀来正确标识时区，滴答清单 API 会正确解析这个时间。
 */
export function toApiDateTime(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;

  try {
    let year: number, month: number, day: number;
    let hours = 0, minutes = 0, seconds = 0;

    // 尝试解析不同格式
    if (dateStr.includes(' ') && dateStr.length > 10) {
      // 带时间格式: YYYY-MM-DD HH:MM:SS
      const parts = dateStr.split(' ');
      const dateParts = parts[0].split('-');
      const timeParts = parts[1].split(':');
      year = parseInt(dateParts[0]);
      month = parseInt(dateParts[1]);
      day = parseInt(dateParts[2]);
      hours = parseInt(timeParts[0]);
      minutes = parseInt(timeParts[1]);
      seconds = parseInt(timeParts[2]) || 0;
    } else {
      // 仅日期格式: YYYY-MM-DD
      const parts = dateStr.split('-');
      year = parseInt(parts[0]);
      month = parseInt(parts[1]);
      day = parseInt(parts[2]);
    }

    // 使用北京时间格式化，标记为 +0800
    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    const secondsStr = String(seconds).padStart(2, '0');

    return `${year}-${monthStr}-${dayStr}T${hoursStr}:${minutesStr}:${secondsStr}.000+0800`;
  } catch {
    // 如果无法解析，按原样返回
    return dateStr;
  }
}

/**
 * 将 API 的时间字符串转换为本地字符串
 * 输入格式: 2024-01-01T08:00:00.000+0800 或 2024-01-01T08:00:00.000+0000 或 2024-01-01T08:00:00.000Z
 * 输出格式: YYYY-MM-DD HH:MM:SS (北京时间)
 * 
 * 注意：如果输入是 +0000 或 Z (UTC 时间)，需要加 8 小时转换为北京时间。
 * 如果输入是 +0800，则直接使用。
 */
export function fromApiDateTime(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;

  try {
    // 检测时区后缀
    const isUTC = dateStr.includes('+0000') || dateStr.endsWith('Z');
    const isBeijing = dateStr.includes('+0800');

    // 清理格式，提取日期和时间部分
    let cleanStr = dateStr;
    if (cleanStr.includes('.')) {
      cleanStr = cleanStr.split('.')[0];
    }
    // 去掉时区后缀
    cleanStr = cleanStr.replace('+0800', '').replace('+0000', '').replace('Z', '');

    // 解析时间
    const datePart = cleanStr.split('T')[0];
    const timePart = cleanStr.split('T')[1] || '00:00:00';
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);

    // 创建 Date 对象
    let date = new Date(year, month - 1, day, hours, minutes, seconds || 0);

    // 如果是 UTC 时间，需要加 8 小时转换为北京时间
    if (isUTC && !isBeijing) {
      date = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    }

    // 格式化输出
    const outYear = date.getFullYear();
    const outMonth = String(date.getMonth() + 1).padStart(2, '0');
    const outDay = String(date.getDate()).padStart(2, '0');
    const outHours = String(date.getHours()).padStart(2, '0');
    const outMinutes = String(date.getMinutes()).padStart(2, '0');
    const outSeconds = String(date.getSeconds()).padStart(2, '0');

    return `${outYear}-${outMonth}-${outDay} ${outHours}:${outMinutes}:${outSeconds}`;
  } catch {
    return dateStr;
  }
}

/**
 * 解析日期字符串为 Date 对象（北京时间）
 * 支持两种格式：
 * 1. API 格式: "2026-01-28T16:00:00.000+0000" 或 "2026-01-28T16:00:00.000+0800"
 * 2. 本地格式: "2026-01-29 00:00:00"
 * @param dateStr 日期字符串
 * @returns Date 对象（北京时间）
 * 
 * 注意：如果是 UTC 时间 (+0000 或 Z)，会转换为北京时间。
 */
export function parseApiDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;

  try {
    // 检测是否为本地格式 (YYYY-MM-DD HH:MM:SS)
    if (dateStr.includes(' ') && !dateStr.includes('T')) {
      // 本地格式，直接解析
      const [datePart, timePart] = dateStr.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes, seconds] = timePart.split(':').map(Number);
      return new Date(year, month - 1, day, hours, minutes, seconds || 0);
    }

    // 检测时区后缀
    const isUTC = dateStr.includes('+0000') || dateStr.endsWith('Z');
    const isBeijing = dateStr.includes('+0800');

    // 清理格式
    let cleanStr = dateStr;
    if (cleanStr.includes('.')) {
      cleanStr = cleanStr.split('.')[0];
    }
    cleanStr = cleanStr.replace('+0800', '').replace('+0000', '').replace('Z', '');

    const datePart = cleanStr.split('T')[0];
    const timePart = cleanStr.split('T')[1] || '00:00:00';
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);

    // 创建 Date 对象
    let date = new Date(year, month - 1, day, hours, minutes, seconds || 0);

    // 如果是 UTC 时间，需要加 8 小时转换为北京时间
    if (isUTC && !isBeijing) {
      date = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    }

    return date;
  } catch {
    return null;
  }
}

/**
 * 格式化截止日期
 * 如果截止时间是0点，自动加1天
 */
export function formatDueDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;

  const date = parseApiDate(dateStr);
  if (!date) return dateStr;

  // 如果是0点，考虑加1天
  if (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
    date.setDate(date.getDate() + 1);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 检查日期是否为今天
 */
export function isToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;

  const date = parseApiDate(dateStr);
  if (!date) return false;

  // 获取北京时间当天的 0 点
  const today = new Date();
  const beijingToday = new Date(today.getTime() + SHANGHAI_TZ_OFFSET);
  beijingToday.setHours(0, 0, 0, 0);

  const beijingDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  return beijingDate.getTime() === beijingToday.getTime();
}

/**
 * 检查日期是否为昨天
 */
export function isYesterday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;

  const date = parseApiDate(dateStr);
  if (!date) return false;

  // 获取北京时间昨天当天的 0 点
  const today = new Date();
  const beijingToday = new Date(today.getTime() + SHANGHAI_TZ_OFFSET);
  beijingToday.setHours(0, 0, 0, 0);

  const yesterday = new Date(beijingToday.getTime() - 24 * 60 * 60 * 1000);

  const beijingDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  return beijingDate.getTime() === yesterday.getTime();
}

/**
 * 检查日期是否在最近7天内
 */
export function isRecent7Days(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;

  const date = parseApiDate(dateStr);
  if (!date) return false;

  // 使用北京时间计算7天前
  const today = new Date();
  const beijingToday = new Date(today.getTime() + SHANGHAI_TZ_OFFSET);
  beijingToday.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(beijingToday.getTime() - 7 * 24 * 60 * 60 * 1000);

  const beijingDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  return beijingDate >= sevenDaysAgo;
}

/**
 * 格式化时间为友好显示
 */
export function formatFriendly(dateStr: string | null | undefined): string {
  if (!dateStr) return '';

  const date = parseApiDate(dateStr);
  if (!date) return dateStr;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
