# 蜻蜓FM 电台地址 workflow

> 算法侧结论与不确定性见 `metadata.json`；本文件只给可执行步骤。
> 可复算实现：`skills/stream-drm-reverse/scripts/playback_address.py qingting --id <id>`。

1. 打开任意一个蜻蜓FM 电台播放页，Network 过滤 `lhttp.qtfm.cn`，抓一条成功请求的 URL。
   - 期望形态：`https://lhttp.qtfm.cn/live/<id>/64k.mp3?app_id=web&ts=<hex>&sign=<32位hex>`。
2. 用抓到的 `ts` 反推「是不是未来一小时」：`int(ts, 16)` 应比当前 Unix 秒大约 +3600（源文口径）。
   这一条能立刻确认「+1 小时」而不是「当前时间」。
3. **先量大小写**：把抓到的 URL 里的 `ts` 与 `sign` 抄下来，与本机算的 upper / lower 两版对比。
   源文**未给示例**，因此大小写只能靠这一步实测确定（这也是本蓝图第一个要落地的 gap）。
4. 用第 3 步确定的口径算 sign：
   ```bash
   python skills/stream-drm-reverse/scripts/playback_address.py qingting --id <id> --json
   # 复现到抓包那一秒：加 --ts-unix <抓包时的 Unix 秒>
   ```
5. 对照：本机算出的 `sign` 必须与抓包值逐字符相同（**同一 `ts`** 下）。
6. 验收：把本机拼的地址丢给播放器实播一次；若 403，回到第 3 步确认大小写，
   再确认待签串里 `path` 的 `/` **没有被 urlencode**。

## 排错顺序

1. 403 且长度对 ⇒ 大小写（ts 的十六进制）或待签串被改了顺序 / 被 urlencode。
2. 403 且 sign 与抓包值完全不同 ⇒ 口令不对（应逐字为 `Lwrpu$K5oP`）。
3. 404 ⇒ path 拼错（`/live/<id>/64k.mp3` 三段都不能少）。
4. 抓包 URL 里 `ts` 是「当前时间」而不是「+1 小时」⇒ 站点口径已变，本蓝图的 `ts_offset` 需重新实测。

## 明确留白（原文未给出，不要臆测）

- 十六进制大小写；
- 示例 URL / 示例 sign；
- `id` 的来源接口；
- `+1 小时` 偏移的取值集合。
