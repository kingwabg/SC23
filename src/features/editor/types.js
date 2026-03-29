export const DOCUMENT_BODY_KIND = {
  HTML: 'html',
  HWPX: 'hwpx',
};

export const createHtmlDocumentBody = (html = '') => ({
  kind: DOCUMENT_BODY_KIND.HTML,
  html,
});

export const createHwpxDocumentBody = (fileId, version) => ({
  kind: DOCUMENT_BODY_KIND.HWPX,
  fileId,
  version,
});

export const isHtmlDocumentBody = (value) => value?.kind === DOCUMENT_BODY_KIND.HTML;

