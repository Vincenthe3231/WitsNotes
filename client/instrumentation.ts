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
  // pid/cwd/argv describe the long-lived Next.js server process itself —
  // constant-per-process (zero signal) for a server error, and actively
  // WRONG when this same log() call ends up ingesting a browser-originated
  // client event (witslogNextIngest runs in this same process). hostname
  // and git_commit stay on: both are legitimately useful ("which
  // build/machine ingested this").
  registerWitslog("witsnote-proxy", {
    createProject: true,
    enrich: { pid: false, cwd: false, argv: false },
  });
}

export const onRequestError = witslogOnRequestError;
