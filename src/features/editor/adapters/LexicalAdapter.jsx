import React from 'react';
import PlaygroundApp from '../../../components/LexicalEditor/App';
import { createHtmlDocumentBody, isHtmlDocumentBody } from '../types';

const normalizeHtmlValue = (value) => {
  if (isHtmlDocumentBody(value)) return value;
  if (typeof value === 'string') return createHtmlDocumentBody(value);
  return createHtmlDocumentBody('');
};

const LexicalAdapter = ({ value, onChange, editorInstanceRef }) => {
  const normalizedValue = normalizeHtmlValue(value);

  return (
    <div className="h-full overflow-auto bg-[#d9e0ea]">
      <div className="px-6 py-6">
        <PlaygroundApp
          initialHtml={normalizedValue.html}
          onChangeHtml={(html) => onChange?.(createHtmlDocumentBody(html))}
          editorInstanceRef={editorInstanceRef}
        />
      </div>
    </div>
  );
};

export default LexicalAdapter;
