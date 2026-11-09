import { rememberRelease, reportBrowserError } from "#errors/browser.ts";

// Errors nothing caught in the browser, reported to the server. Next runs
// this before React hydrates the page. A cross-origin script's error says
// nothing ("Script error."), and is left out.
rememberRelease();

window.addEventListener("error", (event) => {
  if (event.error === null && event.filename === "") {
    return;
  }

  reportBrowserError(event.error ?? event.message, "uncaught");
});

window.addEventListener("unhandledrejection", (event) => {
  reportBrowserError(event.reason, "unhandledRejection");
});
