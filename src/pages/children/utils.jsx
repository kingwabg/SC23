import React, { useRef, useEffect } from 'react';

export const ResizableTh = ({ children, className = '', onClick, columnKey }) => {
  const thRef = useRef(null);

  useEffect(() => {
    if (columnKey && thRef.current) {
      const savedWidths = JSON.parse(localStorage.getItem('forestColumnWidths') || '{}');
      if (savedWidths[columnKey]) {
        const w = savedWidths[columnKey];
        thRef.current.style.width = `${w}px`;
        thRef.current.style.minWidth = `${w}px`;
        thRef.current.style.maxWidth = `${w}px`;
      }
    }
  }, [columnKey]);

  return (
    <th ref={thRef} className={`relative group ${className}`} onClick={onClick}>
      {children}
      <div 
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 opacity-0 group-hover:opacity-100 z-20"
        onMouseDown={(e) => {
          e.stopPropagation();
          const th = thRef.current;
          const startX = e.clientX;
          const startWidth = th.offsetWidth;
          
          const onMouseMove = (moveEvent) => {
            const newWidth = startWidth + (moveEvent.clientX - startX);
            const clampedWidth = Math.max(30, newWidth);
            th.style.width = `${clampedWidth}px`;
            th.style.minWidth = `${clampedWidth}px`;
            th.style.maxWidth = `${clampedWidth}px`;
          };
          const onMouseUp = () => {
            if (columnKey) {
              const finalWidth = th.offsetWidth;
              const savedWidths = JSON.parse(localStorage.getItem('forestColumnWidths') || '{}');
              savedWidths[columnKey] = finalWidth;
              localStorage.setItem('forestColumnWidths', JSON.stringify(savedWidths));
            }
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
          };
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        }}
      />
    </th>
  );
};

export const calculateAge = (birth) => {
  if (!birth) return '';
  const today = new Date();
  const b = new Date(birth);
  if (isNaN(b)) return '';
  let age = today.getFullYear() - b.getFullYear();
  if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--;
  return age >= 0 ? age : '';
};

export const maskSsn = (v) => {
  if (!v) return '';
  const s = String(v).replace(/\s/g, '');
  return s.length > 8 ? `${s.slice(0, 8)}******` : s;
};

export const YEAR_RANGE = Array.from({ length: 15 }, (_, i) => 2015 + i).reverse();

export const EMPTY_YEAR_DATA = () => ({
  school: '', grade: '', address: '', guardian: '', guardianRel: '', guardianType: '',
  contact: '', useType: '일반', ssn: '', phone: '', manager: '', kidsCallId: '',
  enrollment: '', prevEnrollment: '', dischargeDate: '', notes: '',
  incomeRate: '', disabilityType: '', healthNotes: '',
});
