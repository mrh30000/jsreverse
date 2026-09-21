# 某Q音乐sign纯算-vmp插桩日志分析

> **作者**: gfy1129 | **发布时间**: 当前离线 | **版块**: 『脱壳破解区』 | **查看/回复**: 4515 / 32
> **原文**: [https://www.52pojie.cn/thread-2104849-1-1.html](https://www.52pojie.cn/thread-2104849-1-1.html)

---

**本文仅供学习交流，因使用本文内容而产生的任何风险及后果，作者不承担任何责任**

一个很好的VMP插桩 纯算入门案例

在ai的时代，一些ai工具能够很容易解决这类的vmp，但是对于想要提升自己能力的各位大佬可以看看。

**以下内容主要作为学习分析流程，如果要复现，请重新分析当前的vmp，因为算法隔一段时间会有微小的变化。（因为在写这篇blog的时候，算法微调了一下，在末尾会介绍）**

**网址：aHR0cHM6Ly95LnFxLmNvbS8=

请求包：aHR0cHM6Ly91Ni55LnFxLmNvbS9jZ2ktYmluL211c2ljcy5mY2c=**

**一、分析日志前的准备**

直接全局搜索sign，定位到加密位置

![image](https://attach.52pojie.cn/forum/202604/28/175657vka8bhcpxb43ggrh.png)

ie()即为sign的加密函数，跟进去 是c 这个函数

能够识别这个是vmp加载的加密函数，然后 var ie = ne._getSecuritySign，然后直接把这一大坨vmp以及开始的 ne,re 的定义扣到本地进行插桩。

![image](https://attach.52pojie.cn/forum/202604/28/175700j4df754csch66as5.png)

类似这种，可以选择手动插桩、ast自动插桩、ai-skill自动插桩这几种方式，目的就是 把字节码真正执行的逻辑通过日志还原出来

![image](https://attach.52pojie.cn/forum/202604/28/175702v6fy7une2k4k4e7d.png)

先在控制台执行这个保存日志到本地的脚本

[JavaScript] *纯文本查看*

```
(() => {

    'use strict';



    const SUPPORTED_EXPORT_FORMATS = new Set(['jsonl', 'json', 'txt']);

    const CONSOLE_METHODS = ['log', 'warn', 'error', 'info', 'debug'];



    const DEFAULT_CONFIG = {

        maxConsoleLines: 4000,

        exportBatchSize: 2000,

        autoExportInterval: 60000,

        enableAutoExport: false,

        exportFormat: 'txt',

        logPrefix: 'VMP_REVERSE',

        keepInConsole: 80,

        maxHistoryEntries: Number.MAX_SAFE_INTEGER,

        maxDepth: 5,

        maxArrayLength: 50,

        maxObjectKeys: 50,

        maxStringLength: 4000,

        previewStringLength: 320,

        includeStack: true

    };



    class VmpLogExporter {

        constructor(config = {}) {

            this.config = this.normalizeConfig(config);

            this.consoleMethods = CONSOLE_METHODS.slice();

            this.pendingLogs = [];

            this.historyLogs = [];

            this.recentConsoleEntries = [];

            this.originalMethods = {};

            this.previousConsoleHelpers = {

                save: console.save,

                saveAll: console.saveAll,

                saveJson: console.saveJson,

                saveJsonl: console.saveJsonl,

                saveTxt: console.saveTxt,

                status: console.status

            };

            this.fileCounter = 1;

            this.consoleLineCount = 0;

            this.totalCapturedLogs = 0;

            this.droppedHistoryLogs = 0;

            this.entryCounter = 1;

            this.isExporting = false;

            this.autoExportTimer = null;

            this.startedAt = new Date().toISOString();

            this.lastExportInfo = null;



            this.init();

        }



        normalizeConfig(config) {

            return {

                maxConsoleLines: this.toNonNegativeInt(config.maxConsoleLines, DEFAULT_CONFIG.maxConsoleLines),

                exportBatchSize: this.toPositiveInt(config.exportBatchSize, DEFAULT_CONFIG.exportBatchSize),

                autoExportInterval: this.toPositiveInt(config.autoExportInterval, DEFAULT_CONFIG.autoExportInterval),

                enableAutoExport: config.enableAutoExport ?? DEFAULT_CONFIG.enableAutoExport,

                exportFormat: this.normalizeFormat(config.exportFormat ?? DEFAULT_CONFIG.exportFormat),

                logPrefix: String(config.logPrefix ?? DEFAULT_CONFIG.logPrefix),

                keepInConsole: this.toNonNegativeInt(config.keepInConsole, DEFAULT_CONFIG.keepInConsole),

                maxHistoryEntries: this.toNonNegativeInt(config.maxHistoryEntries, DEFAULT_CONFIG.maxHistoryEntries),

                maxDepth: this.toPositiveInt(config.maxDepth, DEFAULT_CONFIG.maxDepth),

                maxArrayLength: this.toPositiveInt(config.maxArrayLength, DEFAULT_CONFIG.maxArrayLength),

                maxObjectKeys: this.toPositiveInt(config.maxObjectKeys, DEFAULT_CONFIG.maxObjectKeys),

                maxStringLength: this.toPositiveInt(config.maxStringLength, DEFAULT_CONFIG.maxStringLength),

                previewStringLength: this.toPositiveInt(config.previewStringLength, DEFAULT_CONFIG.previewStringLength),

                includeStack: config.includeStack ?? DEFAULT_CONFIG.includeStack

            };

        }



        toPositiveInt(value, fallback) {

            const number = Number(value);

            return Number.isInteger(number) && number > 0 ? number : fallback;

        }



        toNonNegativeInt(value, fallback) {

            const number = Number(value);

            return Number.isInteger(number) && number >= 0 ? number : fallback;

        }



        normalizeFormat(format) {

            const value = String(format || '').toLowerCase();

            return SUPPORTED_EXPORT_FORMATS.has(value) ? value : DEFAULT_CONFIG.exportFormat;

        }



        init() {

            this.hijackConsole();

            this.installConsoleHelpers();



            if (this.config.enableAutoExport) {

                this.startAutoExport();

            }



            this.internalPrint(

                'info',

                '[VMP] logger ready. manual export mode enabled, run console.saveAll() when finished.'

            );

        }



        hijackConsole() {

            this.consoleMethods.forEach(method => {

                const originalMethod = typeof console[method] === 'function'

                    ? console[method].bind(console)

                    : console.log.bind(console);



                this.originalMethods[method] = originalMethod;



                console[method] = (...args) => {

                    this.captureLog(method, args);

                    return originalMethod(...args);

                };

            });

        }



        installConsoleHelpers() {

            console.save = formatOrOptions => this.manualExport(formatOrOptions);

            console.saveAll = formatOrOptions => this.exportAllLogs(formatOrOptions);

            console.saveJson = () => this.manualExport({ format: 'json' });

            console.saveJsonl = () => this.manualExport({ format: 'jsonl' });

            console.saveTxt = () => this.exportAllLogs({ format: 'txt' });

            console.status = () => console.table(this.getStatus());

        }



        captureLog(level, args) {

            const entry = this.createEntry(level, args);



            this.pendingLogs.push(entry);

            this.appendHistory(entry);

            this.rememberForConsole(entry.timestamp, level, args);



            this.totalCapturedLogs += 1;

            this.consoleLineCount += 1;



            if (this.config.maxConsoleLines > 0 && this.consoleLineCount >= this.config.maxConsoleLines) {

                void this.manageConsole();

                return;

            }



        }



        createEntry(level, args) {

            const timestamp = new Date().toISOString();

            const serializedArgs = args.map(arg => this.serializeValue(arg, 0, new WeakSet()));

            const message = this.buildMessage(serializedArgs);



            return {

                id: this.entryCounter++,

                timestamp,

                level,

                message,

                args: serializedArgs

            };

        }



        appendHistory(entry) {

            if (this.config.maxHistoryEntries === 0) {

                return;

            }



            this.historyLogs.push(entry);



            const overflow = this.historyLogs.length - this.config.maxHistoryEntries;

            if (overflow > 0) {

                this.historyLogs.splice(0, overflow);

                this.droppedHistoryLogs += overflow;

            }

        }



        rememberForConsole(timestamp, level, rawArgs) {

            if (this.config.keepInConsole === 0) {

                return;

            }



            this.recentConsoleEntries.push({ timestamp, level, rawArgs });



            const overflow = this.recentConsoleEntries.length - this.config.keepInConsole;

            if (overflow > 0) {

                this.recentConsoleEntries.splice(0, overflow);

            }

        }



        serializeValue(value, depth, seen) {

            if (value === null) {

                return null;

            }



            const valueType = typeof value;



            if (valueType === 'string') {

                return this.truncateString(value);

            }



            if (valueType === 'number') {

                return Number.isFinite(value) ? value : String(value);

            }



            if (valueType === 'boolean') {

                return value;

            }



            if (valueType === 'undefined') {

                return '[Undefined]';

            }



            if (valueType === 'bigint') {

                return `${value.toString()}n`;

            }



            if (valueType === 'symbol') {

                return value.toString();

            }



            if (valueType === 'function') {

                return `[Function ${value.name || 'anonymous'}]`;

            }



            if (value instanceof Date) {

                return {

                    __type: 'Date',

                    value: value.toISOString()

                };

            }



            if (value instanceof Error) {

                const errorData = {

                    __type: value.name || 'Error',

                    message: this.truncateString(value.message || '')

                };



                if (this.config.includeStack && value.stack) {

                    errorData.stack = this.truncateString(value.stack);

                }



                return errorData;

            }



            if (typeof Element !== 'undefined' && value instanceof Element) {

                return {

                    __type: 'Element',

                    tagName: value.tagName,

                    id: value.id || undefined,

                    className: typeof value.className === 'string' ? value.className || undefined : undefined

                };

            }



            if (typeof Document !== 'undefined' && value instanceof Document) {

                return '[Document]';

            }



            if (typeof Window !== 'undefined' && value === window) {

                return '[Window]';

            }



            if (depth >= this.config.maxDepth) {

                return '[MaxDepth]';

            }



            if (seen.has(value)) {

                return '[Circular]';

            }



            seen.add(value);



            try {

                if (Array.isArray(value)) {

                    return this.serializeArray(value, depth, seen);

                }



                if (value instanceof Map) {

                    return this.serializeMap(value, depth, seen);

                }



                if (value instanceof Set) {

                    return this.serializeSet(value, depth, seen);

                }



                if (value instanceof URL) {

                    return value.toString();

                }



                if (value instanceof RegExp) {

                    return value.toString();

                }



                if (value instanceof ArrayBuffer) {

                    return {

                        __type: 'ArrayBuffer',

                        byteLength: value.byteLength

                    };

                }



                if (ArrayBuffer.isView(value)) {

                    return this.serializeTypedArray(value);

                }



                return this.serializeObject(value, depth, seen);

            } finally {

                seen.delete(value);

            }

        }



        serializeArray(array, depth, seen) {

            const items = array

                .slice(0, this.config.maxArrayLength)

                .map(item => this.serializeValue(item, depth + 1, seen));



            if (array.length > this.config.maxArrayLength) {

                items.push(`[+${array.length - this.config.maxArrayLength} more items]`);

            }



            return items;

        }



        serializeMap(map, depth, seen) {

            const entries = [];

            let index = 0;



            for (const [key, value] of map.entries()) {

                if (index >= this.config.maxArrayLength) {

                    entries.push(`[+${map.size - this.config.maxArrayLength} more entries]`);

                    break;

                }



                entries.push([

                    this.serializeValue(key, depth + 1, seen),

                    this.serializeValue(value, depth + 1, seen)

                ]);



                index += 1;

            }



            return {

                __type: 'Map',

                entries

            };

        }



        serializeSet(set, depth, seen) {

            const values = [];

            let index = 0;



            for (const value of set.values()) {

                if (index >= this.config.maxArrayLength) {

                    values.push(`[+${set.size - this.config.maxArrayLength} more items]`);

                    break;

                }



                values.push(this.serializeValue(value, depth + 1, seen));

                index += 1;

            }



            return {

                __type: 'Set',

                values

            };

        }



        serializeTypedArray(view) {

            if (typeof view.length !== 'number') {

                return {

                    __type: view.constructor ? view.constructor.name : 'TypedArray'

                };

            }



            const values = Array.from(view.slice(0, this.config.maxArrayLength))

                .map(item => this.serializeValue(item, 0, new WeakSet()));



            if (view.length > this.config.maxArrayLength) {

                values.push(`[+${view.length - this.config.maxArrayLength} more items]`);

            }



            return {

                __type: view.constructor ? view.constructor.name : 'TypedArray',

                values

            };

        }



        serializeObject(object, depth, seen) {

            const output = {};

            const constructorName = object && object.constructor && object.constructor.name;



            if (constructorName && constructorName !== 'Object') {

                output.__type = constructorName;

            }



            let keys = [];



            try {

                keys = Object.keys(object);

            } catch (error) {

                return {

                    __type: constructorName || 'Object',

                    __error: `[ObjectKeysError] ${error && error.message ? error.message : 'failed to inspect object'}`

                };

            }



            const limitedKeys = keys.slice(0, this.config.maxObjectKeys);



            limitedKeys.forEach(key => {

                try {

                    output[key] = this.serializeValue(object[key], depth + 1, seen);

                } catch (error) {

                    output[key] = `[PropertyReadError] ${error && error.message ? error.message : 'failed to read property'}`;

                }

            });



            if (keys.length > this.config.maxObjectKeys) {

                output.__truncatedKeys = keys.length - this.config.maxObjectKeys;

            }



            return output;

        }



        truncateString(value, limit = this.config.maxStringLength) {

            const text = String(value);

            if (text.length <= limit) {

                return text;

            }



            return `${text.slice(0, limit)}...[+${text.length - limit} chars]`;

        }



        buildMessage(serializedArgs) {

            const text = serializedArgs

                .map(item => {

                    if (typeof item === 'string') {

                        return item;

                    }



                    try {

                        return JSON.stringify(item);

                    } catch (error) {

                        return '[UnserializablePreview]';

                    }

                })

                .join(' ');



            return text.replace(/\r?\n+/g, ' ').trim();

        }



        manageConsole() {

            if (this.isExporting) {

                return;

            }



            this.internalPrint(

                'info',

                `[VMP] console limit reached (${this.consoleLineCount}). refreshing console without downloading logs.`

            );

            this.refreshConsole();

        }



        refreshConsole() {

            if (typeof console.clear === 'function') {

                console.clear();

            }



            this.recentConsoleEntries.forEach(entry => {

                const method = this.originalMethods[entry.level] || this.originalMethods.log;

                method(`[${entry.timestamp}]`, ...entry.rawArgs);

            });



            this.consoleLineCount = this.recentConsoleEntries.length;

            this.internalPrint('info', `[VMP] console refreshed. kept=${this.recentConsoleEntries.length}`);

        }



        manualExport(formatOrOptions) {

            const options = this.normalizeExportOptions(formatOrOptions);

            return this.exportLogs({

                ...options,

                reason: options.reason || 'manual'

            });

        }



        async exportLogs(options = {}) {

            if (this.isExporting || this.pendingLogs.length === 0) {

                return null;

            }



            this.isExporting = true;



            try {

                const format = this.normalizeFormat(options.format ?? this.config.exportFormat);

                const logsToExport = this.pendingLogs.slice();

                const filename = this.buildFilename(format, `part${this.fileCounter}`);

                const content = this.buildContent(logsToExport, {

                    format,

                    exportKind: 'pending',

                    reason: options.reason || 'manual'

                });



                this.downloadText(content, filename, this.getMimeType(format));



                this.pendingLogs = [];

                this.lastExportInfo = {

                    at: new Date().toISOString(),

                    filename,

                    count: logsToExport.length,

                    format,

                    kind: 'pending'

                };

                this.fileCounter += 1;



                this.internalPrint('info', `[VMP] exported ${logsToExport.length} pending logs to ${filename}`);



                return this.lastExportInfo;

            } catch (error) {

                this.internalPrint('error', '[VMP] export failed', error);

                return null;

            } finally {

                this.isExporting = false;

            }

        }



        exportAllLogs(formatOrOptions) {

            const options = this.normalizeExportOptions(formatOrOptions);

            const format = this.normalizeFormat(options.format ?? this.config.exportFormat);

            const logsToExport = this.historyLogs.slice();



            if (logsToExport.length === 0) {

                this.internalPrint('info', '[VMP] no history logs to export');

                return null;

            }



            try {

                const filename = this.buildFilename(format, 'history');

                const content = this.buildContent(logsToExport, {

                    format,

                    exportKind: 'history',

                    reason: options.reason || 'manual-history'

                });



                this.downloadText(content, filename, this.getMimeType(format));



                this.lastExportInfo = {

                    at: new Date().toISOString(),

                    filename,

                    count: logsToExport.length,

                    format,

                    kind: 'history'

                };



                this.internalPrint('info', `[VMP] exported ${logsToExport.length} history logs to ${filename}`);



                return this.lastExportInfo;

            } catch (error) {

                this.internalPrint('error', '[VMP] history export failed', error);

                return null;

            }

        }



        normalizeExportOptions(formatOrOptions) {

            if (typeof formatOrOptions === 'string') {

                return { format: formatOrOptions };

            }



            return formatOrOptions && typeof formatOrOptions === 'object'

                ? formatOrOptions

                : {};

        }



        buildFilename(format, suffix) {

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

            return `${this.config.logPrefix}_${suffix}_${timestamp}.${format}`;

        }



        buildContent(logs, context) {

            const normalizedLogs = logs.map(log => this.toExportRecord(log));



            if (context.format === 'json') {

                return JSON.stringify(

                    {

                        exportInfo: this.buildExportInfo(context, normalizedLogs.length),

                        logs: normalizedLogs

                    },

                    null,

                    2

                );

            }



            if (context.format === 'txt') {

                return this.buildTextContent(normalizedLogs, context);

            }



            return this.buildJsonlContent(normalizedLogs);

        }



        buildExportInfo(context, totalLogs) {

            return {

                exportedAt: new Date().toISOString(),

                startedAt: this.startedAt,

                exportKind: context.exportKind,

                reason: context.reason,

                format: context.format,

                totalLogs,

                totalCapturedLogs: this.totalCapturedLogs,

                historyLogsInMemory: this.historyLogs.length,

                droppedHistoryLogs: this.droppedHistoryLogs,

                pendingLogsAfterExport: context.exportKind === 'pending'

                    ? Math.max(this.pendingLogs.length - totalLogs, 0)

                    : this.pendingLogs.length,

                fileCounter: this.fileCounter,

                source: 'VmpLogExporter'

            };

        }



        buildJsonlContent(logs) {

            if (logs.length === 0) {

                return '';

            }



            return `${logs.map(log => JSON.stringify(log)).join('\n')}\n`;

        }



        buildTextContent(logs, context) {

            const body = logs.map(log => log.message);



            return `${body.join('\n')}\n`;

        }



        toExportRecord(log) {

            return {

                message: log.message,

                args: log.args

            };

        }



        getMimeType(format) {

            if (format === 'json') {

                return 'application/json;charset=utf-8';

            }



            if (format === 'txt') {

                return 'text/plain;charset=utf-8';

            }



            return 'application/x-ndjson;charset=utf-8';

        }



        downloadText(content, filename, mimeType) {

            const blob = new Blob([content], { type: mimeType });

            const url = URL.createObjectURL(blob);

            const anchor = document.createElement('a');



            anchor.href = url;

            anchor.download = filename;

            anchor.style.display = 'none';



            const container = document.body || document.documentElement;



            if (container) {

                container.appendChild(anchor);

            }



            anchor.click();



            if (container && anchor.parentNode === container) {

                container.removeChild(anchor);

            }



            setTimeout(() => URL.revokeObjectURL(url), 0);

        }



        startAutoExport() {

            this.stopAutoExport();



            this.autoExportTimer = window.setInterval(() => {

                if (this.pendingLogs.length > 0) {

                    void this.exportLogs({ reason: 'interval' });

                }

            }, this.config.autoExportInterval);

        }



        stopAutoExport() {

            if (this.autoExportTimer !== null) {

                clearInterval(this.autoExportTimer);

                this.autoExportTimer = null;

            }

        }



        getStatus() {

            return {

                manualMode: true,

                exportFormat: this.config.exportFormat,

                pendingLogs: this.pendingLogs.length,

                historyLogs: this.historyLogs.length,

                recentConsoleEntries: this.recentConsoleEntries.length,

                totalCapturedLogs: this.totalCapturedLogs,

                droppedHistoryLogs: this.droppedHistoryLogs,

                consoleLines: this.consoleLineCount,

                fileCounter: this.fileCounter,

                isExporting: this.isExporting,

                autoExportEnabled: this.autoExportTimer !== null,

                lastExportFile: this.lastExportInfo ? this.lastExportInfo.filename : null,

                lastExportCount: this.lastExportInfo ? this.lastExportInfo.count : 0

            };

        }



        printUsage() {

            this.internalPrint(

                'info',

                [

                    '[VMP] commands:',

                    '  console.save()          -> export pending logs as plain text',

                    '  console.save("json")    -> export pending logs as JSON without id/timestamp',

                    '  console.save("jsonl")   -> export pending logs as JSONL without id/timestamp',

                    '  console.saveAll()       -> export all captured logs as plain text at the end',

                    '  console.saveTxt()       -> export history as plain text, one line per log',

                    '  console.status()        -> print current logger status',

                    '  auto download is disabled in manual mode'

                ].join('\n')

            );

        }



        internalPrint(level, ...args) {

            const method = this.originalMethods[level] || this.originalMethods.log || console.log.bind(console);

            method(...args);

        }



        restore() {

            this.stopAutoExport();



            this.consoleMethods.forEach(method => {

                if (this.originalMethods[method]) {

                    console[method] = this.originalMethods[method];

                }

            });



            Object.keys(this.previousConsoleHelpers).forEach(key => {

                const previous = this.previousConsoleHelpers[key];

                if (typeof previous === 'undefined') {

                    delete console[key];

                } else {

                    console[key] = previous;

                }

            });

        }

    }



    if (window.vmpLogger && typeof window.vmpLogger.restore === 'function') {

        window.vmpLogger.restore();

    }



    const vmpLogger = new VmpLogExporter({

        maxConsoleLines: 4000,

        exportBatchSize: 2000,

        autoExportInterval: 60000,

        enableAutoExport: false,

        exportFormat: 'txt',

        logPrefix: 'VMP_REVERSE',

        keepInConsole: 80,

        maxHistoryEntries: Number.MAX_SAFE_INTEGER,

        maxDepth: 5,

        maxArrayLength: 50,

        maxObjectKeys: 50,

        maxStringLength: 4000,

        previewStringLength: 320,

        includeStack: true

    });



    window.vmpLogger = vmpLogger;

    vmpLogger.printUsage();

})();


```

然后执行插桩之后的vmp

![image](https://attach.52pojie.cn/forum/202604/28/175704jfz8j5d8cp8ddfad.png)

控制台输入 console.saveAll() 将日志保存到本地

**二、分析vmp日志**

我这里的加密函数入参是 “111”  ==> zzc9d76f5b92rufgxweci6nb1lgovkgamx9ef1fbbdfa

![image](https://attach.52pojie.cn/forum/202604/28/175706nzjmdqw3fwzmjdck.png)

很清晰的能看到这个加密长串是由4部分拼接成的：

① "zzc" （固定的拼接前缀，可以通过不同的入参来确定这个zzc是固定的）

② 前缀： 9D76F5B

③ 中段：92RuFGXwEcI6NB1lGoVkGAMX9E

④后缀：F1FBBDFA

最后统一 toLowerCase()

综上：("zzc" + 前缀 + 中段 + 后缀).toLowerCase()

（1）分析前缀和后缀的计算（两者类似，所以统一分析）

①前缀 9D76F5B

![image](https://attach.52pojie.cn/forum/202604/28/175709bdz73o9t69g87lzg.png)

"9D76F5B" 是由一个数组 [23,14,6,36,16,40,7,19]  （固定数组） ，数组逐位+1 ，然后向 长串 "6216F8A75FD5BB3D5F22B6F9958CDEDE3FC086C2" 取对应索引 ，然后拼接字符得到。

②后缀 F1FBBDFA

![image](https://attach.52pojie.cn/forum/202604/28/175711bryy8n2tt6qi7tr6.png)

"F1FBBDFA" 是由一个数组 [16,1,32,12,19,27,8,5] （固定数组） ，数组逐位+1 ，然后向 长串 "6216F8A75FD5BB3D5F22B6F9958CDEDE3FC086C2" 取对应索引 ，然后拼接字符得到。

③ 长串 "6216F8A75FD5BB3D5F22B6F9958CDEDE3FC086C2" 是怎么来的？

![image](https://attach.52pojie.cn/forum/202604/28/175713ykdm6mjql6enqqva.png)

[CALL 138]结果 ==>6216f8a75fd5bb3d5f22b6f9958cdede3fc086c2

[CALL_59] 结果 ==>6216f8a75fd5bb3d5f22b6f9958cdede3fc086c26216f8a75fd5bb3d5f22b6f9958cdede3fc086c2

跟上去看这两个函数调用

![image](https://attach.52pojie.cn/forum/202604/28/175715iei8p8ifddedzd8m.png)

![image](https://attach.52pojie.cn/forum/202604/28/175717kt6e4577mu67mmlb.png)

发现5个寄存器以及finalize这个方法

又发现 这个长串的是40位16进制字符

![image](https://attach.52pojie.cn/forum/202604/28/175719k231f333cf3h3zj1.png)

继续分析日志找到，sha1的经典常量

![image](https://attach.52pojie.cn/forum/202604/28/175721mtrfvtisu1f0tf00.png)

至此，可以确定 长串是由 入参"111"经过sha1摘要之后的结果，进行验证

![image](https://attach.52pojie.cn/forum/202604/28/175724pht9udh7hj89s6za.png)

④ 简单归总 前缀/后缀 是通过两个固定的数组，对sha1()对入参处理之后的长串，取对应索引拼接的过程。

（2）分析中段 92RuFGXwEcI6NB1lGoVkGAMX9E

① base64

去除 / + 这两个base64的特征字符

![image](https://attach.52pojie.cn/forum/202604/28/175726uoeemteuo8gjdcgt.png)

这个中段长串是由 一个 20字节的数组 每三个字节为一组（3*8=24 bit 24/6 = 6，这个为标准base64编码的简单描述）3字节 ==> 四个字符

![](https://i.postimg.cc/13fsYDXW/3eda987e4dee894ed523569156e44cb6.png)

长串是经 20字节数组经过base64进行取每三个字节编码然后拼接的一个过程，日志中的base64位运算特征及其明显

![](https://i.postimg.cc/057v2QxC/07dec85ea9c845a39e51b4b2b3f1b1a3.png)

②20字节数组是怎么来的？

搜索到20字节数组第一次出现的地方，发现push的过程，是由 194^19=209 然后把209 push进一个数组

![image](https://attach.52pojie.cn/forum/202604/28/175728ls26t24gkewg28sw.png)

194和19又是哪里来的呢？向上找日志

1. 刚19进行异或生成的是最后一位，这里的数组 19也是处于最后一位，而且又发现 217也在进行异或。经日志对比 确定这是一个固定的数组 取值进行异或 然后得到20字节数组

![image](https://attach.52pojie.cn/forum/202604/28/175730nv4czxpx992868f4.png)

多处日志都能证明这一点

![image](https://attach.52pojie.cn/forum/202604/28/175732n5625tzjpmp729ox.png)

1. 194：

194 是由 “分析前缀和后缀的计算”中的长串“6216F8A75FD5BB3D5F22B6F9958CDEDE3FC086C2”计算得来的

具体过程是

40hex 每两位为一组 由16进制转换为10进制 即 图中的16进制和10进制的对应表

194 是由最后的一组 “c2” c->12, 即 194 = 12*16的一次方 + 2* 16的零次方

![image](https://attach.52pojie.cn/forum/202604/28/175734e55p2553f46aa4ak.png)

同样的98也是这样来的

98 = 6*16的一次方 + 2* 16的零次方

![image](https://attach.52pojie.cn/forum/202604/28/175737taepl01g50w9nnnk.png)

至此，中段长串分析结束

**三、简单总结**

![image](https://attach.52pojie.cn/forum/202604/28/175739mspkpq62uvitxs1c.png)

（1）当前分析的加密纯算

[Python] *纯文本查看*

```
import base64

import hashlib

import sys





XOR_KEY = [

    149, 114, 150, 179, 58, 37, 170, 255, 101, 22,

    171, 156, 143, 9, 186, 34, 95, 204, 217, 19,

]



PREFIX_INDICES = [24, 15, 7, 37, 17, 41, 8, 20]

SUFFIX_INDICES = [17, 2, 33, 13, 20, 28, 9, 6]





def sha1_upper(value: str) -> str:

    return hashlib.sha1(str(value).encode("utf-8")).hexdigest().upper()





def pick_chars(source: str, indices: list[int]) -> str:

    return "".join(source[index] for index in indices if 0 <= index < len(source))





def xor_digest_bytes(sha_hex: str) -> bytes:

    digest = bytes.fromhex(sha_hex)

    return bytes(left ^ right for left, right in zip(digest, XOR_KEY))





def encode_middle(data: bytes) -> str:

    return (

        base64.b64encode(data)

        .decode("ascii")

        .rstrip("=")

        .replace("/", "")

        .replace("+", "")

    )





def get_security_sign(value: str) -> str:

    sha_hex = sha1_upper(value)

    prefix = pick_chars(sha_hex, PREFIX_INDICES)

    middle = encode_middle(xor_digest_bytes(sha_hex))

    suffix = pick_chars(sha_hex, SUFFIX_INDICES)

    return f"zzc{prefix}{middle}{suffix}".lower()





if __name__ == "__main__":

    # arg = sys.argv[1] if len(sys.argv) > 1 else "111"

    arg = "111"

    print(get_security_sign(arg))


```

（2）这篇blog在写的过程中，加密算法发生了变化，具体变化为上述固定数组的变化，纯算如下，自行对比

[Python] *纯文本查看*

```
import base64

import hashlib

import sys





XOR_KEY = [89,39,179,150,218,82,58,252,177,52,186,123,120,64,242,133,143,161,121,179]



PREFIX_INDICES = [23, 14, 6, 36, 16, 40, 7, 19]

SUFFIX_INDICES = [16, 1, 32, 12, 19, 27, 8, 5]





def sha1_upper(value: str) -> str:

    return hashlib.sha1(str(value).encode("utf-8")).hexdigest().upper()





def pick_chars(source: str, indices: list[int]) -> str:

    return "".join(source[index] for index in indices if 0 <= index < len(source))





def xor_digest_bytes(sha_hex: str) -> bytes:

    digest = bytes.fromhex(sha_hex)

    return bytes(left ^ right for left, right in zip(digest, XOR_KEY))





def encode_middle(data: bytes) -> str:

    return (

        base64.b64encode(data)

        .decode("ascii")

        .rstrip("=")

        .replace("/", "")

        .replace("+", "")

    )





def get_security_sign(value: str) -> str:

    sha_hex = sha1_upper(value)

    prefix = pick_chars(sha_hex, PREFIX_INDICES)

    middle = encode_middle(xor_digest_bytes(sha_hex))

    suffix = pick_chars(sha_hex, SUFFIX_INDICES)

    return f"zzc{prefix}{middle}{suffix}".lower()





if __name__ == "__main__":

    # arg = sys.argv[1] if len(sys.argv) > 1 else "111"

    arg = "111"

    print(get_security_sign(arg))




```

![](https://static.52pojie.cn/static/image/filetype/text.gif)

[qqmusic-vmp.txt](forum.php?mod=attachment&aid=Mjg0NzUzOXxlMjc3ODM3OXwxNzg4NzEyNzMwfDIzMjM3Mjd8MjEwNDg0OQ%3D%3D)

*(501.45 KB, 下载次数: 49)*
