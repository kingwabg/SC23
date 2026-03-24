const fs = require('fs');
const data = JSON.parse(fs.readFileSync('children_data.json'));

const excelToDate = (serial) => {
  if (!serial || isNaN(serial)) return '';
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const info = new Date(utc_value * 1000);
  const f = (n) => n.toString().padStart(2, '0');
  return `${info.getFullYear()}-${f(info.getMonth() + 1)}-${f(info.getDate())}`;
};

const mapped = data.map((r, i) => ({
  id: Date.now() + i,
  name: r['성명'] || '',
  gender: r['성별'] || '',
  phone: r['연락처'] || '',
  ssn: r['주민번호'] || '',
  birth: r['생년월일'] ? excelToDate(r['생년월일']) : '',
  enrollment: r['입소일'] ? excelToDate(r['입소일']) : '',
  familyType: r['유형'] || '',
  manager: r['담당자'] || '',
  kidsCallId: String(r['키즈콜ID'] || ''),
  notes: r['비고'] || '',
  yearlyData: {
    2026: {
      school: r['학교'] || '',
      grade: String(r['학년'] || '').replace('학년', ''),
      address: r['주소'] || '',
      guardian: r['보호자'] || '',
      guardianRel: r['보호자관계'] || '',
      contact: r['보호자연락처'] || '',
      useType: r['이용유형'] || ''
    }
  },
  logs: { 2026: { observation: [], h1: null, h2: null } },
  attendance: {}
}));

fs.writeFileSync('src/imported_children.js', `export const IMPORTED_CHILDREN = ${JSON.stringify(mapped, null, 2)};`);
console.log('Done mapping.');
