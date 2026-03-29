import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import type { MutableRefObject } from 'react';
import { useEffect } from 'react';

import {
  INSERT_IMAGE_COMMAND,
  type InsertImagePayload,
} from './ImagesExtension';

interface EditorBridgePluginProps {
  editorInstanceRef?: MutableRefObject<any>;
}

export default function EditorBridgePlugin({
  editorInstanceRef,
}: EditorBridgePluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editorInstanceRef) return;

    editorInstanceRef.current = {
      type: 'lexical',
      focus: () => editor.focus(),
      insertImage: (payload: string | InsertImagePayload) => {
        const normalizedPayload =
          typeof payload === 'string'
            ? { altText: '', src: payload }
            : payload;

        editor.focus();
        editor.dispatchCommand(INSERT_IMAGE_COMMAND, normalizedPayload);
      },
      insertTable: (payload?: { rows?: number | string; columns?: number | string }) => {
        const rows = String(payload?.rows ?? 4);
        const columns = String(payload?.columns ?? 4);

        editor.focus();
        editor.dispatchCommand(INSERT_TABLE_COMMAND, { rows, columns });
      },
    };

    return () => {
      if (editorInstanceRef.current?.type === 'lexical') {
        editorInstanceRef.current = null;
      }
    };
  }, [editor, editorInstanceRef]);

  return null;
}
