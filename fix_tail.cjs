const fs = require('fs');
const path = 'src/pages/MeetingPage.jsx';

let content = fs.readFileSync(path, 'utf8');

// The tricky part starts from `( <div className="p-20 text-center opacity-20">`
const searchKey = `<div className="p-20 text-center opacity-20">
           <ClipboardList className="w-24 h-24 mx-auto mb-4" />`;

const replacement = `<div className="p-20 text-center opacity-20">
           <ClipboardList className="w-24 h-24 mx-auto mb-4" />
           <p className="font-black tracking-widest uppercase">준비 중인 카테고리입니다</p>
        </div>
      )}
    </div>
  );
};

export default MeetingPage;
`;

const startIndex = content.indexOf(searchKey);
if (startIndex !== -1) {
  content = content.substring(0, startIndex) + replacement;
  fs.writeFileSync(path, content, 'utf8');
  console.log('Successfully fixed the bottom section!');
} else {
  console.log('Could not find the target section.');
}
