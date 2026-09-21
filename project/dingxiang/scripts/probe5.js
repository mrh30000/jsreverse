(() => {
  const g = (sel) => {
    const e = document.querySelector(sel);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      bg: (getComputedStyle(e).backgroundImage || "").slice(0, 60),
    };
  };
  return JSON.stringify({
    state: document.querySelector(".dx_captcha_basic_lang_smart_checking")
      ? "smart_checking"
      : (
          document.body.innerText.match(
            /\u62d6\u52a8|\u9a8c\u8bc1|\u6210\u529f|\u5931\u8d25/g,
          ) || []
        ).slice(0, 6),
    slider: g("#dx_captcha_basic_slider_1"),
    subslider: g("#dx_captcha_basic_sub-slider_1"),
    bar: g("#dx_captcha_basic_bar_1"),
    pic: g("#dx_captcha_basic_pic_1"),
    bg: g("#dx_captcha_basic_bg_1"),
    box: g("#dx_captcha_basic_box_1"),
    wrapper: g("#dx_captcha_basic_wrapper_1"),
  });
})();
