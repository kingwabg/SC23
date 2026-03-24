const XLSX = require('xlsx');
const fs = require('fs');
const filePath = 'C:\\Users\\junha\\Desktop\\통합 파일 관리1.xlsx';
try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  let out = '';
  const headerRow = rows[4]; // Has headers
  for(let i=31; i<headerRow.length; i++) {
    out += `Col ${i}: ${headerRow[i]}\n`;
  }
  fs.writeFileSync('excel_columns.txt', out);
} catch (err) { console.error(err); }
