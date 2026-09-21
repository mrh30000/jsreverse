
(function () {
  var CONFIG = {
    siteName: "猿人学练习平台",
    title: "请使用电脑访问",
    desc: "当前练习平台主要面向 PC 浏览器设计，题目阅读、控制台调试、抓包分析与脚本运行都依赖桌面环境。为了获得完整体验，请使用电脑访问。",
    subDesc: "手机端暂不开放，给你带来不便，敬请谅解。",
    minWidth: 900,          // 小于这个宽度，且命中移动端特征时触发
    blockTablet: false      // 是否连平板一起拦截，true=拦平板，false=默认只拦手机
  };

  function isMobileUA() {
    var ua = navigator.userAgent || navigator.vendor || window.opera || "";
    return /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Windows Phone/i.test(ua);
  }

  function isTabletUA() {
    var ua = navigator.userAgent || "";
    return /iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua));
  }

  function isSmallScreen() {
    return Math.min(window.innerWidth || 0, window.innerHeight || 0) < CONFIG.minWidth;
  }

  function shouldBlock() {
    if (CONFIG.blockTablet) {
      return (isMobileUA() || isTabletUA()) && isSmallScreen();
    }
    return isMobileUA() && isSmallScreen();
  }

  if (!shouldBlock()) return;
  if (window.__yrxMobileBlocked__) return;
  window.__yrxMobileBlocked__ = true;

  var style = document.createElement("style");
  style.innerHTML = `
    html.yrx-mobile-blocked,
    body.yrx-mobile-blocked{
      overflow:hidden !important;
      height:100% !important;
      touch-action:none !important;
    }

    .yrx-mobile-mask{
      position:fixed;
      inset:0;
      z-index:999999;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:24px;
      box-sizing:border-box;
      background:
        radial-gradient(circle at top left, rgba(255,193,120,.20), transparent 32%),
        radial-gradient(circle at top right, rgba(255,140,60,.16), transparent 30%),
        linear-gradient(180deg, rgba(255,248,240,.98), rgba(255,252,248,.98));
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;
    }

    .yrx-mobile-card{
      width:min(92vw, 420px);
      background:rgba(255,255,255,.96);
      border:1px solid rgba(241,127,25,.14);
      border-radius:22px;
      box-shadow:
        0 20px 60px rgba(0,0,0,.10),
        0 8px 24px rgba(241,127,25,.08);
      overflow:hidden;
      animation: yrxMobileFadeUp .28s cubic-bezier(.2,.9,.2,1);
    }

    @keyframes yrxMobileFadeUp{
      from{ opacity:0; transform:translateY(16px) scale(.98); }
      to{ opacity:1; transform:translateY(0) scale(1); }
    }

    .yrx-mobile-head{
      padding:20px 22px 14px;
      display:flex;
      align-items:center;
      gap:12px;
      background:linear-gradient(180deg, rgba(255,247,235,.95), rgba(255,255,255,.92));
      border-bottom:1px solid rgba(0,0,0,.04);
    }

    .yrx-mobile-icon{
      width:44px;
      height:44px;
      border-radius:14px;
      flex:0 0 44px;
      display:flex;
      align-items:center;
      justify-content:center;
      background:linear-gradient(180deg, rgba(255,138,48,.14), rgba(255,122,0,.08));
      border:1px solid rgba(255,122,0,.12);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.7);
      font-size:22px;
    }

    .yrx-mobile-head-text{
      min-width:0;
    }

    .yrx-mobile-site{
      font-size:12px;
      color:#9a6a30;
      font-weight:700;
      margin-bottom:4px;
      letter-spacing:.2px;
    }

    .yrx-mobile-title{
      font-size:20px;
      line-height:1.3;
      color:#1f1f1f;
      font-weight:900;
      margin:0;
    }

    .yrx-mobile-body{
      padding:18px 22px 12px;
      color:#444;
    }

    .yrx-mobile-desc{
      margin:0 0 12px;
      font-size:14px;
      line-height:1.9;
      color:#444;
    }

    .yrx-mobile-sub{
      margin:0;
      font-size:13px;
      line-height:1.8;
      color:#8a6b42;
      background:rgba(255,247,230,.75);
      border:1px solid rgba(255,122,0,.10);
      border-radius:14px;
      padding:10px 12px;
    }

    .yrx-mobile-footer{
      padding:14px 22px 22px;
    }

    .yrx-mobile-btn{
      width:100%;
      height:46px;
      border:none;
      border-radius:14px;
      background:linear-gradient(180deg, #f59a39, #f17f19);
      color:#fff;
      font-size:15px;
      font-weight:800;
      letter-spacing:.2px;
      box-shadow:0 10px 24px rgba(241,127,25,.22);
    }

    .yrx-mobile-tips{
      margin-top:10px;
      text-align:center;
      font-size:12px;
      color:#9a8b7a;
      line-height:1.7;
    }
  `;
  document.head.appendChild(style);

  function mountBlocker() {
    document.documentElement.classList.add("yrx-mobile-blocked");
    document.body.classList.add("yrx-mobile-blocked");

    var wrap = document.createElement("div");
    wrap.className = "yrx-mobile-mask";
    wrap.innerHTML = `
      <div class="yrx-mobile-card" role="dialog" aria-modal="true" aria-label="请使用电脑访问">
        <div class="yrx-mobile-head">
          <div class="yrx-mobile-icon">💻</div>
          <div class="yrx-mobile-head-text">
            <div class="yrx-mobile-site">${CONFIG.siteName}</div>
            <h2 class="yrx-mobile-title">${CONFIG.title}</h2>
          </div>
        </div>
        <div class="yrx-mobile-body">
          <p class="yrx-mobile-desc">${CONFIG.desc}</p>
          <p class="yrx-mobile-sub">${CONFIG.subDesc}</p>
        </div>
        <div class="yrx-mobile-footer">
          <button class="yrx-mobile-btn" type="button">我知道了</button>
          <div class="yrx-mobile-tips">建议使用 Chrome / Edge 等桌面浏览器访问</div>
        </div>
      </div>
    `;

    document.body.appendChild(wrap);

    var btn = wrap.querySelector(".yrx-mobile-btn");
    btn.addEventListener("click", function () {
      // 不关闭遮罩，只做轻微反馈，避免用户误以为还能继续使用
      btn.innerText = "请使用电脑访问";
      btn.style.opacity = "0.92";
    });

    ["touchmove", "wheel", "scroll"].forEach(function (evt) {
      wrap.addEventListener(evt, function (e) {
        e.preventDefault();
      }, { passive: false });
    });
  }

  if (document.body) {
    mountBlocker();
  } else {
    document.addEventListener("DOMContentLoaded", mountBlocker);
  }
})();
