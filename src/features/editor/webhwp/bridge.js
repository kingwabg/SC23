export const HWPCTRL_EVENT = {
  ON_MOUSE_LBUTTON_DOWN: 0,
  ON_MOUSE_LBUTTON_UP: 1,
  ON_SCROLL: 2,
  ON_NOTIFY_MESSAGE: 3,
};

const ensureControlMethod = (control, methodName) => {
  if (!control || typeof control[methodName] !== 'function') {
    throw new Error(`webhwp_method_missing:${methodName}`);
  }
};

export const createWebHwpBridge = (control) => {
  if (!control) {
    throw new Error('webhwp_control_missing');
  }

  const addEventListener = (eventType, callback) => {
    ensureControlMethod(control, 'AddEventListener');
    control.AddEventListener(eventType, callback);
  };

  const openFile = (file, format = '', options = '') => new Promise((resolve, reject) => {
    try {
      ensureControlMethod(control, 'Open');
      control.Open(file, format, options, (...args) => resolve(args));
    } catch (error) {
      reject(error);
    }
  });

  const getTextFile = (format = 'HWP', options = '') => new Promise((resolve, reject) => {
    try {
      ensureControlMethod(control, 'GetTextFile');
      control.GetTextFile(format, options, (data) => resolve(data));
    } catch (error) {
      reject(error);
    }
  });

  const runAction = (actionName) => {
    ensureControlMethod(control, 'Run');
    return control.Run(actionName);
  };

  const moveToField = (...args) => {
    ensureControlMethod(control, 'MoveToField');
    return control.MoveToField(...args);
  };

  const putFieldText = (...args) => {
    ensureControlMethod(control, 'PutFieldText');
    return control.PutFieldText(...args);
  };

  return {
    raw: control,
    addEventListener,
    openFile,
    getTextFile,
    runAction,
    moveToField,
    putFieldText,
  };
};
