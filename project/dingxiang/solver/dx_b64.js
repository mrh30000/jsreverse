// 顶象 custom-alphabet base64 decoder.
// Evidence: greenseer.js contains "XmYj3u1PnvisIZUF8ThR/a6DfO+kW4JHrCELycAzSxleoQp02MtwV9Nd57qGgbKB="
// Usage: node dx_b64.js <base64payload> [--urlsafe]
const STD = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const CUSTOM =
  "XmYj3u1PnvisIZUF8ThR/a6DfO+kW4JHrCELycAzSxleoQp02MtwV9Nd57qGgbKB";

function decode(payload, alpha) {
  const map = new Map([...alpha].map((ch, i) => [ch, STD[i]]));
  const mapped = [...payload].map((ch) => (ch === "=" ? "=" : map.get(ch)));
  if (mapped.some((c) => c === undefined)) return null;
  const std = mapped.join("");
  try {
    return Buffer.from(std, "base64");
  } catch {
    return null;
  }
}

function preview(buf) {
  const printable = [...buf].filter(
    (b) => b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127),
  ).length;
  return {
    ratio: buf.length ? printable / buf.length : 0,
    text: buf.toString("utf8").slice(0, 400),
  };
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const payload = (argv[0] || "").trim();
  if (!payload) {
    console.log("usage: node dx_b64.js <payload> [more payloads...]");
    process.exit(0);
  }
  const urlsafe = CUSTOM.replace("+", "-").replace("/", "_");
  for (const p of argv) {
    for (const [name, alpha] of [
      ["direct", CUSTOM],
      ["urlsafe", urlsafe],
    ]) {
      const buf = decode(
        p.replace(/=+$/, "") + "=".repeat((4 - (p.length % 4)) % 4),
        alpha,
      );
      if (!buf) continue;
      const { ratio, text } = preview(buf);
      console.log(
        `\n--- ${p.slice(0, 24)}... [${name}] printable=${(ratio * 100).toFixed(0)}%`,
      );
      if (ratio > 0.9) console.log(text);
      else console.log(buf.toString("hex").slice(0, 160));
    }
  }
}

module.exports = {
  decode,
  CUSTOM,
  urlsafe: CUSTOM.replace("+", "-").replace("/", "_"),
};
