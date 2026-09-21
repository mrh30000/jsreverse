# HTML5视频解密的方法（widevine的破解思路）

> **作者**: jimmyzang | **发布时间**: 2020-04-22 17:00:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 46504 / 195
> **原文**: [https://www.52pojie.cn/thread-1162942-1-1.html](https://www.52pojie.cn/thread-1162942-1-1.html)

---

*本帖最后由 jimmyzang 于 2020-4-30 07:17 编辑*

首先这是继续上一篇的m3u8通用下载， <https://www.52pojie.cn/thread-1161169-1-1.html>  这篇文章之所以没有和上一篇合并，原因主要是上篇介绍的是一个通用方法，这篇主要是针对于**widevine的加密**提供一个crack思路。

这篇文章比上一篇讨论的更深入了一些。上一篇讨论的是js调用的appendbuff 方法，这篇讨论的是widevine加密部分。

在正文开始之前，还是强调一下，**请不要问我要成型的软件工具，无论如何都不提供**，这里仅仅提供技术讨论，不提供任何工具。谢谢。

如果您在实践中遇到什么技术难题，可以回帖讨论。我会尽我所能的提供帮助。

感谢@逍遥一仙给在第一篇帖子里提了一个好问题，引导我去考虑widevine的解密。整个思路在实现过程得到了他的支持，思想碰撞才能有火花，在此表示感谢。

前言：
经常有人问为啥研究这个，不是发现m3u8后随便找个下载器就可以下载了么？

先大概介绍一下情况：
1：市面上大部分采用的都是HLS加密，通过下载m3u8文件，就可以下载绝大多数，最多就是m3u8里面隐藏一下key，换换偏移之类，这些都是js层的捉迷藏游戏，提供给浏览器底层的其实还是解密后的数据。

没有采用加密方式的，基本上随便找个m3u8下载器就可以下载。 如果有一些偏移或者aes加密的，可以用某些下载器下载，其实是下载器的作者分析过这些代码逻辑。下载后帮大家解密过了，但是如果换一个网站就不一定可以适用了。

所以我上篇文章提到过的通过编译chrome，改写appendbuff方法，从接口拦截数据，基本上可以扫清市面上能见到的js层的加密，而不用去和js捉迷藏（其实主要是我不懂js，所以才去搞了这个方法。呵呵。。。）

2：还有一些网站，比如某酷，某异 有些电影启用了google提供的widevine加密方式，这个加密方式笼统的说是解码库和解密库集成在了一起，不在js层，是在底层解密，一般的m3u8下载器都会失效。
（并非所有视频都采用widewine加密的，这些网站上还有一些视频时没有widevine加密的。一般国外电影或者注重版权的会有widevine加密）。

长话短说，先找到我们的目标网站。为了不引起版权纠纷，这里采用了某个 <https://shaka-player-demo.appspot.com/> 这个被网上广泛公开用来测试widevine是否可用的网站。
这网站打开后有五个视频，中间一个A Blender Foundation short film, protected by Widevine encryption. 就是用widevine加密，我们这次就是针对这个视频的[破解](https://www.52pojie.cn)。

让您刚刚编译的浏览器支持widevine，这一步真是让人头疼，网上没有任何文档对于windows编译的描述，我之前一直以为需要响应的sdk，这个sdk需要和google签订协议，而且要经过一次考试。。。基本上个人不可能拿到，当时就卡在这里。

后来翻遍全网连猜带蒙才发现，支持widevine在自己编译的chromium上只需要两步：

2.1 打开编译开关

[C++] *纯文本查看*

```
enable_widevine = true
```

2.2 在这个地址下载google的widevine库，**https://dl.google.com/widevine-cdm/4.10.1582.2-win-x64.zip**，在编译好的chrome目录新建一个目录，WidevineCdm，把解压缩的东西放进去，就可以成功。检查log可以发现如下字样就是成功了：

[C++] *纯文本查看*

```

Preinstalled component found for Widevine Content Decryption Module at widevine\WidevineCdm with version 4.10.1582.2.
FinishRegistration for Widevine Content Decryption Module
Component ready, version 4.10.1582.2 in E:\chrome_dev\depot_tools\chromium\src\out\widevine\WidevineCdm
Component ready, version 4.10.1582.2 in E:\chrome_dev\depot_tools\chromium\src\out\widevine\WidevineCdm
Register Widevine CDM with Chrome
Register Widevine CDM with Chrome
```

顺便说一句：
网上只看到过linux的下载地址，这个win的下载地址从来没有看到过，也许有地方记载，反正我没找到，我是根据命名规则猜出来的。
有人在linux下用chrome的自带dll也可以成功，也有人失败，我机器上不行，可能是因为缺少sig文件？反正用google的这个文件没问题。

下面解释一下widevine的解码逻辑：

万事俱备，只欠东风，用编译好的chrome打开上面提到的网站，视频应该是可以播放状态，play按钮可以点击了。播放视频，跟踪log解释一下逻辑

[C++] *纯文本查看*

```
void DecoderStream<StreamType>::OnBufferReady  //读取buff，这里buff已经把audio video分流了。video解码一路，audio解码一路
```

对应log： decoder\_stream.cc(680)] OnBufferReady<video>: 0, timestamp=0 duration=42000 size=169 side\_data\_size=0 is\_key\_frame=1 encrypted=0 discard\_padding (us)=(0, 0)

[C++] *纯文本查看*

```
void DecoderStream<StreamType>::Decode(scoped_refptr<DecoderBuffer> buffer)         //利用template，不管是audio，video继续走decode方法
```

对应log：decoder\_stream.cc(434)] Decode<video>

[C++] *纯文本查看*

```
void DecoderStream<StreamType>::DecodeInternal  //继续调用到decodeinternal
```

对应log：decoder\_stream.cc(459)] DecodeInternal<video>

[C++] *纯文本查看*

```
void DecryptingVideoDecoder::Decode(                //检查当前线程，调用这个类的DecodePendingBuffer方法。
```

对应log：decrypting\_video\_decoder.cc(95)] Decode()

[C++] *纯文本查看*

```

void MojoDecryptor::DecryptAndDecodeVideo(            //这里开始解码了。remote_decryptor_应该就是widevine的解码方法，直接出来的videoframe就是视频图片。
    scoped_refptr<DecoderBuffer> encrypted,
    const VideoDecodeCB& video_decode_cb) {
  DVLOG(3) << __func__ << ": " << encrypted->AsHumanReadableString();
  DCHECK(thread_checker_.CalledOnValidThread());

  mojom::DecoderBufferPtr mojo_buffer =
      video_buffer_writer_->WriteDecoderBuffer(std::move(encrypted));
  if (!mojo_buffer) {
    video_decode_cb.Run(kError, nullptr);
    return;
  }

  remote_decryptor_->DecryptAndDecodeVideo(
      std::move(mojo_buffer),
      base::BindOnce(&MojoDecryptor::OnVideoDecoded, weak_factory_.GetWeakPtr(),
                     mojo::WrapCallbackWithDefaultInvokeIfNotRun(
                         ToOnceCallback(video_decode_cb), kError, nullptr)));
}

对应log：mojo_decryptor.cc(180)] DecryptAndDecodeVideo: timestamp=0 duration=42000 size=169 side_data_size=0 is_key_frame=1 encrypted=0 discard_padding (us)=(0, 0)
```

**所以最后调到了MojoDecryptor::OnVideoDecoded。****video\_frame就是解密+解码后的数据。**
这个函数里面的void MojoDecryptor::OnVideoDecoded(

[C++] *纯文本查看*

```
    VideoDecodeOnceCB video_decode_cb,
    Status status,
    const scoped_refptr<VideoFrame>& video_frame,
    mojo::PendingRemote<mojom::FrameResourceReleaser> releaser) {
```

**检验是否正确也很简单我们再log里面把这个frame转换为png输出即可，具体代码如下：我把这个frame转换成png图片输出到log，看看是不是解码后的图片。**

**灰色字体是原有代码，蓝色为添加代码。主要逻辑，用libyuv转换I420到ARGB，在转换为PNG输出到log，通过查看png数据证明当前图形是解码过的实际图形而非乱码不可见。**

[C++] *纯文本查看*

```
 DCHECK(thread_checker_.CalledOnValidThread());

//added by jimmyzang
  DVLOG(1) << "this is the jimmyzang output : " << video_frame->AsHumanReadableString();

                 gfx::Rect visible_rectrc = video_frame->visible_rect();
                 auto argb_out_frame = VideoFrame::CreateFrame(
                         VideoPixelFormat::PIXEL_FORMAT_ARGB, visible_rectrc.size(), visible_rectrc, visible_rectrc.size(),
                         base::TimeDelta());
                  const int width = visible_rectrc .width();
                  const int height = visible_rectrc .height();
                  uint8_t* const dst_argb = argb_out_frame.get()->data(VideoFrame::kARGBPlane);
                  const int dst_stride = argb_out_frame.get()->stride(VideoFrame::kARGBPlane);
                  libyuv::J420ToARGB(video_frame->data(VideoFrame::kYPlane),
                                video_frame->stride(VideoFrame::kYPlane),
                                video_frame->data(VideoFrame::kVPlane),
                                video_frame->stride(VideoFrame::kVPlane),
                                video_frame->data(VideoFrame::kUPlane),
                                video_frame->stride(VideoFrame::kUPlane),
                                dst_argb, dst_stride, width, height);

        // Convert the ARGB frame to PNG.
        std::vector<uint8_t> png_output;
        gfx::PNGCodec::Encode(
                argb_out_frame->data(VideoFrame::kARGBPlane), gfx::PNGCodec::FORMAT_BGRA,
                argb_out_frame->visible_rect().size(),
                argb_out_frame->stride(VideoFrame::kARGBPlane),
                true, /* discard_transparency */
                std::vector<gfx::PNGCodec::Comment>(), &png_output);

        const int size = base::checked_cast<int>(png_output.size());

  unsigned char * memory = png_output.data();
  const char* pszNibbleToHex = {"0123456789ABCDEF"};
  size_t nNibble;
  int i;
  int infoLength = size;
  std::string text = "";

  if (infoLength > 0) {
                for (i = 0; i < infoLength; i++) {
                    nNibble = memory[i] >> 4;
                                text.append(&pszNibbleToHex[nNibble],1);
                    nNibble = memory[i] & 0x0F;
                                text.append(&pszNibbleToHex[nNibble],1);
                }
        }

         DVLOG(1) << "this is find picture: " << text;

  //end by jimmyzang

  // If using shared memory, ensure that |releaser| is closed when
  // |frame| is destroyed.
  if (video_frame && releaser) {
```

注意，这里用到了libyuv这个转化库，chromium\src\media\mojo\clients\BUILD.gn中需要加上这个的引用。

然后从log中导出对应的png文件，采用ffmpeg转换生成avi看看是不是正确。就是大家看到的附件中的那个视频了。

已知问题：
1：我代码有问题，内存没释放，反正理论验证就不改了。
2：应该不用直接写png文件经过转码后再直接输出，生成视频文件，这样就占用内存小，而且灵活。
3：audio decrpt没有做，道理是一样。
4：x酷和x异 html播放器会提示浏览器不支持，**我查看了他们js里面代码，应该是html5里面判断过，绕过即可，反正浏览器源码就在那里，我不懂js，****具体那句我不知道。。。。汗**。留给大家发挥吧。

总的来说，chromium浏览器编译进行html5视频解密告一段落了，基本上没啥挑战了，收工。。。

Widevine破解后，原帖子中写的是输出成PNG文件，今天突然想到chromium里面有一个方法是mojovideoencode，可以用这个方法编码输出成H264，
伪码贴一下，做个备忘。
 **[C++] *纯文本查看*

```
auto mock_vea_client = std::make_unique< MojoVideoEncodeAccelerator>();
      Initialize(mock_vea_client.get());
base::UnsafeSharedMemoryRegion shmem =
    base::UnsafeSharedMemoryRegion::Create(
        VideoFrame::AllocationSize(PIXEL_FORMAT_I420, kInputVisibleSize) *
        2);
base::WritableSharedMemoryMapping mapping = shmem.Map();
const scoped_refptr<VideoFrame> video_frame = VideoFrame::WrapExternalData(
    PIXEL_FORMAT_I420, kInputVisibleSize, gfx::Rect(kInputVisibleSize),
    kInputVisibleSize, mapping.GetMemoryAsSpan<uint8_t>().data(),
    mapping.size(), base::TimeDelta());
video_frame->BackWithSharedMemory(&shmem);
const bool is_keyframe = true;

EXPECT_CALL(*mock_vea_client, BitstreamBufferReady(kBistreamBufferId, _))
    .WillOnce(testing::Invoke(
        [is_keyframe](int32_t, const BitstreamBufferMetadata& metadata) {
          EXPECT_EQ(is_keyframe, metadata.key_frame);
        }));

mojo_vea()->Encode(video_frame, is_keyframe);
```**

**附件是解密过的视频文件的前10几秒，不是任何工具，或者源码，仅仅是证明可行性，如无必要请不必下载。**

![](https://static.52pojie.cn/static/image/filetype/rar.gif)

[video.rar](https://www.52pojie.cn/forum.php?mod=attachment&aid=MTkxMjkzOXxlMjQ1NDgyNXwxNzg5OTk2NzQyfDIzMjM3Mjd8MTE2Mjk0Mg%3D%3D)
*(678.75 KB, 下载次数: 298)*
