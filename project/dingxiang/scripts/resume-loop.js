// Keep the CDP debugger un-paused: the 顶象 JSVMP emits `debugger;` (assembled from
// "debu"+"gger;" so no source-level string patch can see it), which freezes the page
// while a debugger is attached. Polling `proxycli call resume` is the non-invasive bypass.
const { exec } = require("node:child_process");
const INTERVAL_MS = Number(process.env.RESUME_MS || 150);
const MAX_MS = Number(process.env.RESUME_MAX_MS || 20 * 60 * 1000);
const t0 = Date.now();
let busy = false;
let pausedHits = 0;

setInterval(() => {
  if (busy || Date.now() - t0 > MAX_MS) return;
  busy = true;
  exec(
    "proxycli call resume",
    { windowsHide: true, timeout: 5000, shell: true },
    (err, _out, stderr) => {
      busy = false;
      if (err) {
        if (/not paused|no paused/i.test(String(stderr) + String(err.message)))
          return;
        pausedHits++;
        if (pausedHits % 50 === 1)
          console.log(
            `resume-error x${pausedHits}: ${String(err.message).slice(0, 90)}`,
          );
      }
    },
  );
}, INTERVAL_MS);
console.log(`resume-loop started interval=${INTERVAL_MS}ms max=${MAX_MS}ms`);
