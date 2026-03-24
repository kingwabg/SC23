const XLSX = require('xlsx');
const path = require('path');

const headers = [
  '성명', '성별', '연락처', '주민번호', '생년월일', '학교', '학년', 
  '입소일', '퇴소일', '주소', '이용유형', '보호자', '보호자관계', '유형', 
  '보호자연락처', '담당자', '키즈콜ID', '비고'
];

const sampleData = [
  {
    '성명': '홍길동',
    '성별': '남',
    '연락처': '010-1234-5678',
    '주민번호': '150101-3******',
    '생년월일': '2015-01-01',
    '학교': '숲속초등학교',
    '학년': '4학년',
    '입소일': '2024-03-01',
    '주소': '양산시 서창동...',
    '이용유형': '일반',
    '보호자': '홍판서',
    '보호자관계': '부',
    '유형': '양부모',
    '보호자연락처': '010-5678-1234',
    '담당자': '관리자',
    '키즈콜ID': 'KID001',
    '비고': '특이사항 없음'
  }
];

const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, '아동명부_양식');

const filePath = path.join(__dirname, '아동명부_업로드_양식.xlsx');
XLSX.writeFile(workbook, filePath);

console.log(`Excel template created at: ${filePath}`);
