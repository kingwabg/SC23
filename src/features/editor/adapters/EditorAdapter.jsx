import React from 'react';
import LexicalAdapter from './LexicalAdapter';
import RoosterAdapter from './RoosterAdapter';
import WebHwpAdapter from './WebHwpAdapter';

export const EDITOR_ENGINE = {
  LEXICAL: 'lexical',
  ROOSTER: 'rooster',
  WEBHWP: 'webhwp',
};

const adapters = {
  [EDITOR_ENGINE.LEXICAL]: LexicalAdapter,
  [EDITOR_ENGINE.ROOSTER]: RoosterAdapter,
  [EDITOR_ENGINE.WEBHWP]: WebHwpAdapter,
};

const EditorAdapter = ({ engine = EDITOR_ENGINE.ROOSTER, ...props }) => {
  const ResolvedAdapter = adapters[engine] || RoosterAdapter;
  return <ResolvedAdapter {...props} />;
};

export default EditorAdapter;
