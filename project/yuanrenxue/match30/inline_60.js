
(function () {
    // 避免重复插入
    if (document.getElementById('yrx-feedback-btn')) return;

    // 注入样式
    var style = document.createElement('style');
    style.innerHTML = `
        #yrx-feedback-btn {
            position: fixed;
            right: 28px;
            bottom: 32px;
            z-index: 99999;
            width: 132px;
            height: 46px;
            line-height: 46px;
            text-align: center;
            background: linear-gradient(135deg, #ff7a18, #ff3d00);
            color: #fff;
            font-size: 16px;
            font-weight: 700;
            border-radius: 24px;
            box-shadow: 0 8px 22px rgba(255, 90, 0, 0.35);
            cursor: pointer;
            user-select: none;
            transition: all .2s ease;
        }

        #yrx-feedback-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 26px rgba(255, 90, 0, 0.48);
        }

        #yrx-feedback-panel-mask {
            position: fixed;
            left: 0;
            top: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, .38);
            z-index: 99998;
            display: none;
        }

        #yrx-feedback-panel {
            position: fixed;
            right: 28px;
            bottom: 92px;
            z-index: 99999;
            width: 280px;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 12px 36px rgba(0, 0, 0, .18);
            padding: 20px;
            display: none;
            font-family: Arial, "Microsoft YaHei", sans-serif;
        }

        #yrx-feedback-panel h3 {
            margin: 0 0 12px;
            font-size: 18px;
            color: #222;
        }

        #yrx-feedback-panel p {
            margin: 8px 0;
            font-size: 14px;
            line-height: 1.7;
            color: #555;
        }

        #yrx-feedback-panel .qq {
            font-size: 22px;
            font-weight: 800;
            color: #ff4d00;
            letter-spacing: 1px;
        }

        #yrx-feedback-close {
            position: absolute;
            right: 14px;
            top: 10px;
            font-size: 22px;
            color: #999;
            cursor: pointer;
        }

        #yrx-feedback-close:hover {
            color: #333;
        }
    `;
    document.head.appendChild(style);

    // 遮罩
    var mask = document.createElement('div');
    mask.id = 'yrx-feedback-panel-mask';

    // 反馈面板
    var panel = document.createElement('div');
    panel.id = 'yrx-feedback-panel';
    panel.innerHTML = `
        <span id="yrx-feedback-close">×</span>
        <h3>问题反馈</h3>
        <p>如果你在使用网站时发现问题，欢迎联系我们反馈。</p>
        <p>联系 QQ：</p>
        <p class="qq">605226760</p>
    `;

    // 按钮
    var btn = document.createElement('div');
    btn.id = 'yrx-feedback-btn';
    btn.innerText = '问题反馈';

    document.body.appendChild(mask);
    document.body.appendChild(panel);
    document.body.appendChild(btn);

    function showPanel() {
        mask.style.display = 'block';
        panel.style.display = 'block';
    }

    function hidePanel() {
        mask.style.display = 'none';
        panel.style.display = 'none';
    }

    btn.addEventListener('click', showPanel);
    mask.addEventListener('click', hidePanel);
    document.getElementById('yrx-feedback-close').addEventListener('click', hidePanel);
})();
