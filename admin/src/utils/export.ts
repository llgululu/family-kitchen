/**
 * 简易 CSV 导出工具。
 * 列定义里 key 用 `dot.path` 表示嵌套字段；formatter 可重写显示。
 */
export interface CsvColumn<T> {
  key: string;
  label: string;
  formatter?: (row: T, value: unknown) => string;
}

function getNested(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object' && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, obj);
}

function escape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escape(c.label)).join(',');
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const raw = getNested(row, c.key);
        const displayed = c.formatter ? c.formatter(row, raw) : String(raw ?? '');
        return escape(displayed);
      })
      .join(','),
  );
  return [header, ...lines].join('\r\n');
}

export function downloadCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]): void {
  const csv = toCsv(rows, columns);
  // BOM 让 Excel 不乱码
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
