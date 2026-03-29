import React from 'react';
import RoosterApp from '../../../components/RoosterEditor/RoosterApp';
import { createHtmlDocumentBody, isHtmlDocumentBody } from '../types';

const normalizeHtmlValue = (value) => {
  if (isHtmlDocumentBody(value)) return value;
  if (typeof value === 'string') return createHtmlDocumentBody(value);
  return createHtmlDocumentBody('');
};

const RoosterAdapter = ({ value, onChange, editorInstanceRef }) => {
  const normalizedValue = normalizeHtmlValue(value);

  return (
    <RoosterApp
      initialHtml={normalizedValue.html}
      onChangeHtml={(html) => onChange?.(createHtmlDocumentBody(html))}
      editorInstanceRef={editorInstanceRef}
    />
  );
};

export default RoosterAdapter;

