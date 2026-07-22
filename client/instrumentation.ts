// Next.js server-instrumentation entry point (stable since Next 15, no flag
// needed on this Next 16 app). Wires witslog's Next.js adapter
// (bindings/node/frameworks/next.js in the witslog repo) so server-side
// errors are captured automatically — no per-route try/catch needed.
//
// NOTE: Next.js reserves the export name `register` for its OWN
// instrumentation lifecycle hook (called once at server boot, no args) —
// witslog's adapter also exports a function named `register(application,
// config)`. Re-exporting witslog's `register` directly under that name
// would silently replace Next's own hook with the wrong signature. Import
// it under an alias and call it from inside Next's `register()` instead.
import {
  register as registerWitslog,
  onRequestError as witslogOnRequestError,
} from "@all-wits/witslog/frameworks/next";

export function register() {
  registerWitslog("witsnote-proxy", { createProject: true });
}

export const onRequestError = witslogOnRequestError;
