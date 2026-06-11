import * as XLSX from "xlsx";
import type { DailyRecord, Item } from "./types";

// Generates Sheet2 (Final Result) only — see APP_ARCHITECTURE.md section 7
export function exportSheet2(record: DailyRecord, items: Item[]) {
  const rows = items.map((item) => {
    const entry = record.sheet2[item.id];
    return {
      Item: item.name,
      Back: entry?.back ?? 0,
      Front: entry?.front ?? 0,
      Closing: entry?.closing ?? 0,
      Total: entry?.total ?? 0,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet2");

  XLSX.writeFile(workbook, `${record.date}.xlsx`);
}
