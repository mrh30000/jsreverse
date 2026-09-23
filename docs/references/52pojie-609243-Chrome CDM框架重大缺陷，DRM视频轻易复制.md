# Chrome CDM框架重大缺陷，DRM视频轻易复制

> **作者**: codelive | **发布时间**: 2017-05-18 12:03:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 53270 / 138
> **原文**: [https://www.52pojie.cn/thread-609243-1-1.html](https://www.52pojie.cn/thread-609243-1-1.html)

---

*本帖最后由 codelive 于 2017-5-18 21:12 编辑*

       我的工作领域和视频相关，保护视频内容非常重要，主流的浏览器和移动设备都支持DRM。近日我偶然发现Google Chrome浏览器的CDM(Content Decryption Module-内容解密模块)框架存在重大的设计缺陷，通过一些手段就可以轻松绕过DRM保护机制，非常容易的获取解密后的数据，从而把视频重新封装为未压缩的MP4等格式文件，还可以做到在观看的过程中直接进行无加密的视频直播。

发现问题后，我花了一点时间，写了一个测试程序，验证了我的想法。由于DRM的保护机制非常的重要，如果可以轻松被攻破，将对整个视频领域是一个威胁，所以我当时就向Google Chromium提交了bug,说明了CDM的框架的重大缺陷，并描述了实现细节。
这是的issue url(一般人没有权限查看，仅内部可见):
<https://bugs.chromium.org/p/chromium/issues/detail?id=721639>

Google有漏洞奖励规则，这是规则描述地址:
[https://www.google.com/about/app ... -rewards/index.html](https://www.google.com/about/appsecurity/chrome-rewards/index.html)
其实我当时的想法是，如果能获取来自Google的奖励，不论奖金多少，都将是一个至高无上的荣誉。

我提交后，Chromium团队很快的做出了回复，他们确认这是一个重大的安全问题，而且影响所有运行Chrome浏览器的操作系统，包括: Linux, Windows, Chrome, Mac等等. 但另一个员工说这是一个已知的问题，并提供了一个issue号: 658022，但我无限查看漏洞内容是否与我提交的一致。之后我向google 团队的几个成员发了邮件，说既然是已知的问题，那也就是不符合奖励规则，因此我也就可以公布细节，让视频内容公司重视这个问题，以便尽早的商讨更加安全的解决方案。

说了这么多，只想说明一下事件的背景，下面我就说明实现细节，很多东西可能有些专业，主要讲述一个过程。

1.安装Google Chrome 32bit版本(32版本容易使用工具进行调试)
2.Chrome内置的CDM是Widevine(几年前收购来的)，目录在Google\Chrome\Application\58.0.3029.110\WidevineCdm,在子目录\_platform\_specific\win\_x86有下2个dll:
    widevinecdm.dll - widevine核心模块,导出的函数有:InitializeCdmModule\_4,DeinitializeCdmModule,CreateCdmInstance,GetCdmVersion,GetHandleVerifier
    widevinecdmadapter.dll - PPAPI插件标准适配库，导出函数有:PPP\_GetInterface,PPP\_InitializeModule,PPP\_ShutdownModule
3.正常情况下播放DRM视频的流程:
    Chrome -> Widevine CDM Adapter(widevinecdmadapter.dll) -> Widevine CDM Module (widevinecdm.dll)
    widevinecdmadapter.dll调用widevinecdm.dll的导出函数CreateCdmInstance来创建CDM实例.
4.CDM框架是Google Chrome的标准，所以API参数和接口都有C++ include文件,比如API CreateCdmInstance:
    CDM\_API void\* CreateCdmInstance(int cdm\_interface\_version, const char\* key\_system, uint32\_t key\_system\_size, GetCdmHostFunc get\_cdm\_host\_func, void\* user\_data);

    CDM实例要继承于class ContentDecryptionModule\_8,查看class ContentDecryptionModule\_8，发现了一个非常重要的函数:Decrypt,主要是将加密的数据传入，解密后的数据传出，我的天呐，只要截获了这个函数不就搞定了吗!!!

[C++] *纯文本查看*

```
   class CDM_CLASS_API ContentDecryptionModule_8 {      // Decrypts the |encrypted_buffer|.
      //
      // Returns kSuccess if decryption succeeded, in which case the callee
      // should have filled the |decrypted_buffer| and passed the ownership of
      // |data| in |decrypted_buffer| to the caller.
      // Returns kNoKey if the CDM did not have the necessary decryption key
      // to decrypt.
      // Returns kDecryptError if any other error happened.
      // If the return value is not kSuccess, |decrypted_buffer| should be ignored
      // by the caller.
      virtual Status Decrypt(const InputBuffer& encrypted_buffer,
                             DecryptedBlock* decrypted_buffer) = 0;
    };
```

5.了解了API参数和class定义后，就设想如果在widevinecdmadapter.dll 和 widevinecdm.dll之间在互相调用时截获到解密后的数据就可以绕过DRM保护机制.
6.开始写一个DLL, 名为CdmProxy.dll, 我自己的CreateCdmInstance函数,这部分不解释了:

[C++] *纯文本查看*

```
    extern "C" __declspec(dllexport) void * CDMAPI_DEFINE my_CreateCdmInstance(int cdm_interface_version, const char* key_system,
        uint32_t key_system_size, GetCdmHostFunc get_cdm_host_func, void* user_data)
    {
        gHostUserData = user_data;
        wsprintf(wchLog, L"CdmProxy - call CreateCdmInstance(%d, %S, %d, 0x%08X, 0x%08X)",
            cdm_interface_version, key_system, key_system_size, get_cdm_host_func, user_data);
        OutputDebugStringW(wchLog);
        void *p = pCreateCdmInstance(cdm_interface_version, key_system, key_system_size, get_cdm_host_func, user_data);

        cdm::ContentDecryptionModule_8 *pCdmModule = (cdm::ContentDecryptionModule_8 *)(p);
        MyContentDecryptionModuleProxy *pMyCdmModule = new MyContentDecryptionModuleProxy(pCdmModule);

        return pMyCdmModule;
    }
```

    我的代{过}{滤}理class MyContentDecryptionModuleProxy，代码不解释:
    // class MyContentDecryptionModuleProxy

[C++] *纯文本查看*

```
    class MyContentDecryptionModuleProxy : public cdm::ContentDecryptionModule_8
    {
    public:
        MyContentDecryptionModuleProxy(cdm::ContentDecryptionModule_8 *pCdm)
        {
            mCdm = pCdm;
        }
    private:
        cdm::ContentDecryptionModule_8 *mCdm;

    public:
        // 最重要的解密函数，保存原数据和解密后的数据
        virtual cdm::Status Decrypt(const cdm::InputBuffer& encrypted_buffer, cdm::DecryptedBlock* decrypted_buffer)
        {
            cdm::Status status = cdm::kSuccess;
            codelive();
            DebugDecryptBreak(encrypted_buffer.iv, encrypted_buffer.key_id, encrypted_buffer.data);
            status = mCdm->Decrypt(encrypted_buffer, decrypted_buffer);

            string strIV = data2HexString((const char *)encrypted_buffer.iv, encrypted_buffer.iv_size);
            string strEncData = data2HexString((const char *)encrypted_buffer.data, min(encrypted_buffer.data_size, 32));
            string strDecData = data2HexString((const char *)decrypted_buffer->DecryptedBuffer()->Data(),
                min(decrypted_buffer->DecryptedBuffer()->Size(), 32));
            wsprintf(wchLog, L"CdmProxy - call Decrypt(IV:%S, encData(%d):%S, decData(%d):%S)",
                strIV.c_str(), encrypted_buffer.data_size, strEncData.c_str(),
                decrypted_buffer->DecryptedBuffer()->Size(), strDecData.c_str());
            OutputDebugStringW(wchLog);

            if(mEncFile == NULL)
            {
                mEncFile = fopen("d:\\cdm_enc.bin", "wb");
            }
            if(mEncFile != NULL)
            {
                fwrite(encrypted_buffer.data, 1, encrypted_buffer.data_size, mEncFile);
            }
            if(mDecFile == NULL)
            {
                mDecFile = fopen("d:\\cdm_dec.bin", "wb");
            }
            if(mDecFile != NULL)
            {
                fwrite(decrypted_buffer->DecryptedBuffer()->Data(), 1, decrypted_buffer->DecryptedBuffer()->Size(), mDecFile);
            }
            return status;
        }
    };
```

7.核心代码写完了，就要解决DLL加载的问题，尝试了几种简单的方式，分别把widevinecdm.dll和widevinecdmadapter.dll改名为widevinecdm\_org.dll和widevinecdmadapter\_org.dll，然后自己写一个DLL,导出和widevinecdm.dll或者widevinecdmadapter.dll相同的API,然后再调用原来DLL的方式,但这种方式发现不可行，原因在于Chrome的安全沙盒，所有的插件都是加载的沙盒进程空间，敏感的API都无法使用，比如:ReadProcessMemory,CeateFile,OutputDebugString等等. 逃脱沙盒(Sandbox Escape)是Google奖金数额非常高的，最高可达$15,000.
8.既然进程都是Chrome创建的，所以就直接对chrome.exe下手,直接patch chrome.exe,让其加载我的CdmProxy.dll,结果成功了，毕竟chrome启动时还未启用沙盒机制,所以没花费太多技术就解决了DLL加载问题.

9.改变API截获方式，对widevinecdmadapter.dll进行动态的补丁，将调用API CreateCdmInstance的地址改为我自己的API my\_CreateCdmInstance,然后在DLL加载时进行以下处理:

[C++] *纯文本查看*

```
    BOOL APIENTRY DllMain(HMODULE hModule, DWORD ul_reason_for_call, LPVOID lpReserved)
    {
        switch(ul_reason_for_call)
        {
        case DLL_PROCESS_ATTACH:
            {
                hWideVineCdm = LoadLibraryW(L"{PATH}\\widevinecdm.dll");

                pInitializeCdmModule_4 = (InitializeCdmModule_4Func)GetProcAddress(hWideVineCdm, "InitializeCdmModule_4");
                pDeinitializeCdmModule = (DeinitializeCdmModuleFunc)GetProcAddress(hWideVineCdm, "DeinitializeCdmModule");
                pCreateCdmInstance = (CreateCdmInstanceFunc)GetProcAddress(hWideVineCdm, "CreateCdmInstance");
                pGetCdmVersion = (GetCdmVersionFunc)GetProcAddress(hWideVineCdm, "GetCdmVersion");

                hWideVineCdmAdapter = LoadLibraryW(L"{PATH}\\widevinecdmadapter.dll");
                if(hWideVineCdmAdapter != NULL)
                {
                    DWORD dwSrcAddr = (DWORD)hWideVineCdmAdapter + 0x0000446D;
                    const BYTE chVerify[] = { 0xFF, 0x15 };
                    BOOL isOK = patch_DsCallFunction(dwSrcAddr, (DWORD)my_CreateCdmInstance, chVerify, sizeof(chVerify));
                    wsprintf(wchLog, L"CdmProxy - patch CreateCdmInstance, Address:0x%08X-0x%08X, %s.",
                        dwSrcAddr, (uint32_t)my_CreateCdmInstance,
                        isOK ? L"OK" : L"FAILED");
                    OutputDebugStringW(wchLog);
                }
            }
            break ;
        }
    }
```

10.然后进行测试,播放一个有DRM保护的DASH视频:
    [https://shaka-player-demo.appspo ... gleKey/Manifest.mpd](https://shaka-player-demo.appspot.com/demo/#asset=//media.axprod.net/TestVectors/v7-MultiDRM-SingleKey/Manifest.mpd)
    发现文件没保存下来，LOG也没输出，想必是安全沙盒起作用了。
11.又要逃脱沙盒，经过研究，发现根本不需要，只要在chrome启动参数增加 --no-sandbox 即可。我的天呐，为啥要提供这样一个后门啊!!!

12.再次播放加密的视频，文件顺利保存下来，LOG也输出成功，经验证，解密后的数据与之前未加密的数据是一致的。

13.Google Chrome的CDM就这样被[破解](https://www.52pojie.cn)了，非常的简单的就绕过了Widevine DRM的算法，这应该是Chrome CDM的框架设计的严重问题，估计要改变也不是非常容易的。

这是LOG数据:

( "CdmProxy - call CreateCdmInstance(8, com.widevine.alpha, 18, 0x70F86310, 0x00D75A88)" )           0.0001399
( "CdmProxy - call CreateCdmInstance(8, com.widevine.alpha, 18, 0x70F86310, 0x00D757C8)" )           0.0000937
( "CdmProxy - call Decrypt(IV:6CD1F4FBCE5818F00000000000000000, encData(348):FFF158402B9FFC2FF05300F2BF83E9A0, decData(0):)" )           0.0001350
( "CdmProxy - call Decrypt(IV:6CD1F4FBCE5818F00000000000000000, encData(348):FFF158402B9FFC2FF05300F2BF83E9A0, decData(348):FFF158402B9FFC00D03403E95B8639BD)" )         0.0001335
( "CdmProxy - call Decrypt(IV:6CD1F4FBCE5818F00000000000000000, encData(348):FFF158402B9FFC2FF05300F2BF83E9A0, decData(348):FFF158402B9FFC00D03403E95B8639BD)" )         0.0001032
( "CdmProxy - call Decrypt(IV:6CD1F4FBCE5818F10000000000000000, encData(348):FFF158402B9FFC487380B8930FFFAB41, decData(348):FFF158402B9FFC00F43420C24620902C)" )         0.0001392
( "CdmProxy - call Decrypt(IV:6CD1F4FBCE5818F20000000000000000, encData(349):FFF158402BBFFC1175E15FE4B6154B30, decData(349):FFF158402BBFFC00FA342D90762A3188)" )         0.0001032
( "CdmProxy - call Decrypt(IV:6CD1F4FBCE5818F30000000000000000, encData(348):FFF158402B9FFCC45D5715E87235E5CF, decData(348):FFF158402B9FFC00F8342CEC825A2D85)" )         0.0000994
( "CdmProxy - call Decrypt(IV:6CD1F4FBCE5818F40000000000000000, encData(348):FFF158402B9FFC6749FBAF64926471DE, decData(348):FFF158402B9FFC00F83421884529290A)" )         0.0000880
( "CdmProxy - call Decrypt(IV:6CD1F4FBCE5818F50000000000000000, encData(349):FFF158402BBFFCF8132EFC31C186DDE1, decData(349):FFF158402BBFFC00F2342D9049124988)" )         0.0001088
( "CdmProxy - call Decrypt(IV:6CD1F4FBCE5818F60000000000000000, encData(348):FFF158402B9FFC82EDA0BD4AB7158938, decData(348):FFF158402B9FFC00EE342D7475223D85)" )         0.0001035
( "CdmProxy - call Decrypt(IV:6CD1F4FBCE5818F70000000000000000, encData(348):FFF158402B9FFC4B2C585CC10F74036E, decData(348):FFF158402B9FFC00F4342D74662A2088)" )         0.0001555
( "CdmProxy - call Decrypt(IV:6CD1F4FBCE5818F80000000000000000, encData(349):FFF158402BBFFCCF33665AC4E219EC92, decData(349):FFF158402BBFFC00FA342E30547B0604)" )         0.0001494
( "CdmProxy - call Decrypt(IV:6CD1F4FBCE5818F90000000000000000, encData(348):FFF158402B9FFC2C9A7362594261CE23, decData(348):FFF158402B9FFC00F4342E305429150A)" )         0.0004035
( "CdmProxy - call Decrypt(IV:6CD1F4FBCE5818FA0000000000000000, encData(348):FFF158402B9FFC1905A086AE3CEF0AEC, decData(348):FFF158402B9FFC00EE342E3456391906)" )         0.0005913
( "CdmProxy - call Decrypt(IV:6CD1F4FBCE5818FB0000000000000000, encData(349):FFF158402BBFFC8D0EB865013262FB6E, decData(349):FFF158402BBFFC00F6342E34563A2186)" )         0.0001479
( "CdmProxy - call Decrypt(IV:6CD1F4FBCE5818FC0000000000000000, encData(348):FFF158402B9FFC484211C612F22283FB, decData(348):FFF158402B9FFC0102342E74482A2E02)" )         0.0002507
( "CdmProxy - call Decrypt(IV:6CD1F4FBCE5818FD0000000000000000, encData(348):FFF158402B9FFC283122B1DDE740DAC2, decData(348):FFF158402B9FFC0104342EB464190D08)" )         0.0003011
( "CdmProxy - call Decrypt(IV:6CD1F4FBCE5818FE0000000000000000, encData(349):FFF158402BBFFCAC8759D48FF1A258A3, decData(349):FFF158402BBFFC010E342ED04A1A2982)" )         0.0003095

DRM这么多年了，很多保护机制和算法都做的非常严密，但还是被Zhu一样的队友给出卖了。

公开这个研究，是为了让广大的视频公司不要以为DRM非常的安全，有时候真的是不堪一击，某个环节出现漏洞，同样面临极大的安全问题。

如果此篇文章不适合公布，请通知我，谢谢。
