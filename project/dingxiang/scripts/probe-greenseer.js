// 在活页面里定位 greenseer 运行时对象, 打印候选全局与其上的方法名。
(() => {
  const pats = [
    /dx/i,
    /green/i,
    /seer/i,
    /captcha/i,
    /tso/i,
    /dingxiang/i,
    /sdk/i,
    /^_?d/i,
  ];
  const hits = [];
  for (const k of Object.getOwnPropertyNames(window)) {
    if (!pats.some((p) => p.test(k))) continue;
    let v;
    try {
      v = window[k];
    } catch {
      continue;
    }
    const t = typeof v;
    if (t !== "object" && t !== "function") continue;
    let keys = [];
    try {
      keys = Object.keys(v).slice(0, 40);
    } catch {
      /* cross-realm */
    }
    hits.push({ k, t, keys });
  }
  // 找带 getTM/app/encrypt_ 的对象
  const probe = (obj, path, depth, out) => {
    if (!obj || depth > 3 || out.length > 6) return;
    let ks = [];
    try {
      ks = Object.keys(obj);
    } catch {
      return;
    }
    if (
      ks.some((x) => /^encrypt_/.test(x)) ||
      ks.includes("getTM") ||
      ks.includes("app")
    ) {
      out.push({ path, keys: ks.slice(0, 60) });
    }
    for (const key of ks.slice(0, 40)) {
      try {
        const c = obj[key];
        if (c && typeof c === "object")
          probe(c, `${path}.${key}`, depth + 1, out);
      } catch {
        /* getter 抛错 */
      }
    }
  };
  const found = [];
  for (const h of hits) probe(window[h.k], `window.${h.k}`, 0, found);
  return JSON.stringify({ globals: hits.slice(0, 15), found }, null, 1);
})();
