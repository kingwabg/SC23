import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useEffect, useState } from 'react';
import { $getRoot, $insertNodes } from 'lexical';

interface HtmlSyncPluginProps {
  initialHtml?: string;
  onChangeHtml?: (html: string) => void;
}

export default function HtmlSyncPlugin({
  initialHtml,
  onChangeHtml,
}: HtmlSyncPluginProps) {
  const [editor] = useLexicalComposerContext();
  const [isFirstRender, setIsFirstRender] = useState(true);

  useEffect(() => {
    if (isFirstRender && initialHtml) {
      editor.update(() => {
        const parser = new DOMParser();
        const dom = parser.parseFromString(initialHtml, 'text/html');
        // generate nodes from incoming HTML
        const nodes = $generateNodesFromDOM(editor, dom);
        
        const root = $getRoot();
        root.clear();
        $insertNodes(nodes);
      });
      setIsFirstRender(false);
    } else if (isFirstRender && !initialHtml) {
        setIsFirstRender(false);
    }
  }, [editor, initialHtml, isFirstRender]);

  return (
    <OnChangePlugin
      ignoreSelectionChange={true}
      onChange={(editorState) => {
        editorState.read(() => {
          if (!isFirstRender && onChangeHtml) {
            const html = $generateHtmlFromNodes(editor, null);
            onChangeHtml(html);
          }
        });
      }}
    />
  );
}
