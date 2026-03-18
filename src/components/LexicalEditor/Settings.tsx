/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {useMemo, useState} from 'react';

import {isDevPlayground} from './appSettings';
import {useSettings} from './context/SettingsContext';
import Switch from './ui/Switch';

export default function Settings(): JSX.Element {
  const windowLocation = window.location;
  const {
    setOption,
    settings: {
      measureTypingPerf,
      isCollab,
      isRichText,
      hasNestedTables,
      hasFitNestedTables,
      isMaxLength,
      hasLinkAttributes,
      isCharLimit,
      isCharLimitUtf8,
      isAutocomplete,
      showTreeView,
      showNestedEditorTreeView,
      showTableOfContents,
      shouldUseLexicalContextMenu,
      shouldPreserveNewLinesInMarkdown,
      shouldAllowHighlightingWithBrackets,
      selectionAlwaysOnDisplay,
      isCodeHighlighted,
      isCodeShiki,
    },
  } = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [isSplitScreen, search] = useMemo(() => {
    const parentWindow = window.parent;
    const _search = windowLocation.search;
    const _isSplitScreen =
      parentWindow && parentWindow.location.pathname === '/split/';
    return [_isSplitScreen, _search];
  }, [windowLocation]);

  return (
    <>
      <button
        id="options-button"
        data-test-id="options-button"
        className={`editor-dev-button ${showSettings ? 'active' : ''}`}
        onClick={() => setShowSettings(!showSettings)}
      />
      {showSettings ? (
        <div className="switches">
          {isRichText && isDevPlayground && (
            <Switch
              onClick={() => {
                setOption('isCollab', !isCollab);
                window.location.reload();
              }}
              checked={isCollab}
              text="협업 모드"
            />
          )}
          {isDevPlayground && (
            <Switch
              onClick={() => {
                if (isSplitScreen) {
                  window.parent.location.href = `/${search}`;
                } else {
                  window.location.href = `/split/${search}`;
                }
              }}
              checked={isSplitScreen}
              text="화면 분할"
            />
          )}
          <Switch
            onClick={() => setOption('measureTypingPerf', !measureTypingPerf)}
            checked={measureTypingPerf}
            text="성능 측정"
          />
          <Switch
            onClick={() => setOption('showTreeView', !showTreeView)}
            checked={showTreeView}
            text="디버그 뷰"
          />
          <Switch
            onClick={() =>
              setOption('showNestedEditorTreeView', !showNestedEditorTreeView)
            }
            checked={showNestedEditorTreeView}
            text="중첩 에디터 디버그 뷰"
          />
          <Switch
            onClick={() => {
              setOption('isRichText', !isRichText);
              setOption('isCollab', false);
            }}
            checked={isRichText}
            text="리치 텍스트"
          />
          <Switch
            onClick={() => {
              setOption('hasNestedTables', !hasNestedTables);
            }}
            checked={hasNestedTables}
            text="중첩 표"
          />
          <Switch
            onClick={() => {
              setOption('hasFitNestedTables', !hasFitNestedTables);
            }}
            checked={hasFitNestedTables}
            text="중첩 표 너비 맞춤"
          />
          <Switch
            onClick={() => setOption('isCharLimit', !isCharLimit)}
            checked={isCharLimit}
            text="글자 수 제한"
          />
          <Switch
            onClick={() => setOption('isCharLimitUtf8', !isCharLimitUtf8)}
            checked={isCharLimitUtf8}
            text="글자 수 제한 (UTF-8)"
          />
          <Switch
            onClick={() => setOption('hasLinkAttributes', !hasLinkAttributes)}
            checked={hasLinkAttributes}
            text="링크 속성"
          />
          <Switch
            onClick={() => setOption('isMaxLength', !isMaxLength)}
            checked={isMaxLength}
            text="최대 길이"
          />
          <Switch
            onClick={() => setOption('isAutocomplete', !isAutocomplete)}
            checked={isAutocomplete}
            text="자동 완성"
          />
          <Switch
            onClick={() => {
              setOption('showTableOfContents', !showTableOfContents);
            }}
            checked={showTableOfContents}
            text="목차 (TOC)"
          />
          <Switch
            onClick={() => {
              setOption(
                'shouldUseLexicalContextMenu',
                !shouldUseLexicalContextMenu,
              );
            }}
            checked={shouldUseLexicalContextMenu}
            text="Lexical 컨텍스트 메뉴 사용"
          />
          <Switch
            onClick={() => {
              setOption(
                'shouldPreserveNewLinesInMarkdown',
                !shouldPreserveNewLinesInMarkdown,
              );
            }}
            checked={shouldPreserveNewLinesInMarkdown}
            text="마크다운에서 줄바꿈 유지"
          />
          <Switch
            onClick={() => {
              setOption(
                'shouldAllowHighlightingWithBrackets',
                !shouldAllowHighlightingWithBrackets,
              );
            }}
            checked={shouldAllowHighlightingWithBrackets}
            text="대괄호로 하이라이팅 사용"
          />

          <Switch
            onClick={() => {
              setOption('selectionAlwaysOnDisplay', !selectionAlwaysOnDisplay);
            }}
            checked={selectionAlwaysOnDisplay}
            text="선택 영역 유지"
          />

          <Switch
            onClick={() => {
              setOption('isCodeHighlighted', !isCodeHighlighted);
            }}
            checked={isCodeHighlighted}
            text="코드 하이라이팅 활성화"
          />

          <Switch
            onClick={() => {
              setOption('isCodeShiki', !isCodeShiki);
            }}
            checked={isCodeShiki}
            text="코드 하이라이팅에 Shiki 사용"
          />
        </div>
      ) : null}
    </>
  );
}
