export const getMeetingsEditorEngine = () => (
  import.meta.env.VITE_MEETINGS_EDITOR_ENGINE || 'rooster'
);

export const isWebHwpPreviewEnabled = () => (
  import.meta.env.VITE_WEBHWP_PREVIEW === 'true'
);

export const getWebHwpClientFlags = () => ({
  bootstrapMode: import.meta.env.VITE_WEBHWP_BOOTSTRAP_MODE || 'server',
  debug: import.meta.env.VITE_WEBHWP_DEBUG === 'true',
});
