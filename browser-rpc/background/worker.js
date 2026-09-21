// Chrome MV3 runs this file as a module worker (manifest.background.type = "module"),
// so the background dependencies are static imports instead of runtime script fetches.
//
// The previous classic-worker approach fetched each sibling script at runtime through the
// chrome-extension:// scheme. On worker (re)start that fetch could fail with
// "Uncaught NetworkError ... An unknown error occurred when fetching the script", which
// aborted the whole background context. Static imports are resolved by the module loader
// at registration time, so there is no per-start fetch race.
//
// ESM gives each file its own scope, which is safe here: rpc-manager.js and
// browser-actions.js are fully IIFE-wrapped and export only through globalThis, so they set
// globalThis.CrawlerRpcManager / globalThis.CrawlerBrowserActions during module evaluation,
// before this file's imports finish and before background.js runs.
//
// Firefox 128+ ignores service_worker/type and still loads background.scripts in order as
// classic scripts, so both browsers keep the same three-file load order.
import './rpc-manager.js';
import './browser-actions.js';
import './background.js';
