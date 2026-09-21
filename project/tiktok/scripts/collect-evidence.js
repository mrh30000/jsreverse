/**
 * 从页面采集 oracle 样本：rawQuery（剔除签名参数）→ SDK 生成的签名参数。
 * 用法：proxycli call evaluate_script --file tiktok/scripts/collect-evidence.js
 */
() => {
  const log = (window.__ttSigLog || []).filter(r => r.where === 'URL.ctor' && r.sigParams && r.sigParams['X-Gnarly'] && r.sigParams['X-Dynosaur']);
  const seen = new Set();
  const samples = [];
  for (const r of log) {
    const key = r.rawQuery.slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    const q = r.rawQuery.indexOf('?');
    samples.push({
      url: r.rawQuery.slice(0, r.rawQuery.indexOf('?')),
      rawQuery: q === -1 ? '' : r.rawQuery.slice(q + 1),
      fullQuery: r.text.slice(r.text.indexOf('?') + 1),
      sig: { 'X-Bogus': r.sigParams['X-Bogus'], 'X-Gnarly': r.sigParams['X-Gnarly'], 'X-Dynosaur': r.sigParams['X-Dynosaur'] },
      msToken: r.sigParams['msToken'] ? r.sigParams['msToken'].slice(0, 20) + '...' : null,
      lengths: {
        gnarly: (r.sigParams['X-Gnarly'] || '').length,
        dynosaur: (r.sigParams['X-Dynosaur'] || '').length
      }
    });
  }
  return {
    n: samples.length,
    lengthStats: {
      gnarly: samples.map(s => s.lengths.gnarly),
      dynosaur: samples.map(s => s.lengths.dynosaur)
    },
    charset: (() => {
      const set = new Set();
      samples.forEach(s => { (s.sig['X-Gnarly'] + s.sig['X-Dynosaur']).split('').forEach(c => set.add(c)); });
      return Array.from(set).sort().join('');
    })(),
    samples: samples.slice(0, 5)
  };
}
