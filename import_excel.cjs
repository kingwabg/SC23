const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '아동명부_업로드_양식.xlsx');
if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rawData = XLSX.utils.sheet_to_json(worksheet);

const parseDate = (val) => {
  if (!val) return '';
  // 만약 엑셀 시리얼 넘버(숫자)라면 시스템 날짜로 변환
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val);
    const f = (n) => n.toString().padStart(2, '0');
    return `${date.y}-${f(date.m)}-${f(date.d)}`;
  }
  // 문자열 형태(예: 2024-03-01)라면 그대로 반환
  if (typeof val === 'string') {
    const clean = val.replace(/\./g, '-').trim(); // 2024.03.01 같은 경우도 대응
    return clean;
  }
  return '';
};

const mapped = rawData.map((r, i) => {
  const enrollment = parseDate(r['입소일']);
  const dischargeDate = parseDate(r['퇴소일']);
  const birth = parseDate(r['생년월일']);
  
  return {
    id: Date.now() + i,
    name: String(r['성명'] || '').trim(),
    gender: String(r['성별'] || '').trim(),
    phone: String(r['연락처'] || '').trim(),
    ssn: String(r['주민번호'] || '').trim(),
    birth: birth,
    enrollment: enrollment,
    dischargeDate: dischargeDate,
    familyType: String(r['유형'] || '').trim(),
    manager: String(r['담당자'] || '').trim(),
    kidsCallId: String(r['키즈콜ID'] || '').trim(),
    notes: String(r['비고'] || '').trim(),
    yearlyData: {
      2026: {
        school: String(r['학교'] || '').trim(),
        grade: String(r['학년'] || '').replace(/[^0-9]/g, ''),
        address: String(r['주소'] || '').trim(),
        guardian: String(r['보호자'] || '').trim(),
        guardianRel: String(r['보호자관계'] || '').trim(),
        contact: String(r['보호자연락처'] || '').trim(),
        useType: String(r['이용유형'] || '').trim(),
        enrollment: enrollment,
        dischargeDate: dischargeDate,
      }
    },
    logs: { 2026: { observation: [], h1: null, h2: null } },
    attendance: {}
  };
});

const output = `export const IMPORTED_CHILDREN = ${JSON.stringify(mapped, null, 2)};`;
fs.writeFileSync(path.join(__dirname, 'src', 'imported_children.js'), output);

console.log(`Successfully imported ${mapped.length} children with dates.`);
