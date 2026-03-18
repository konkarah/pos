// utils/loading.js
let start = () => {};
let stop = () => {};

export const registerLoadingHandlers = (startFn, stopFn) => {
  start = startFn;
  stop = stopFn;
};

export const startLoading = () => start();
export const stopLoading = () => stop();