# 某q音乐jsvmp反编译

> **作者**: hostname | **发布时间**: 2025-06-28 03:10:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 12327 / 130
> **原文**: [https://www.52pojie.cn/thread-2042090-1-1.html](https://www.52pojie.cn/thread-2042090-1-1.html)

---

### дёҖгҖҒеҲҶжһҗиҷҡжӢҹжңәжһ¶жһ„

еҸӮиҖғиҝҷдҪҚеёҲеӮ…зҡ„ж–Үз« `https://jixun.uk/posts/2024/qqmusic-zzc-sign/`, е°ҶиҷҡжӢҹжңәжһ¶жһ„д»Јз ҒйҮҚж–°е‘ҪеҗҚдәҶдёҖдёӢ

иҜҘиҷҡжӢҹжңәжҳҜеҹәдәҺеҜ„еӯҳеҷЁзҡ„иҷҡжӢҹжЎҶжһ¶пјҢжүҖжңүдёҙж—¶еҸҳйҮҸгҖҒз»“жһңйғҪдҝқеӯҳеңЁдёҖдёӘеҜ„еӯҳеҷЁеҲ—иЎЁдёӯ

```
function getVariableType(e) {
В  В  return e && "undefined" != typeof Symbol && e.constructor === Symbol ? "symbol" : typeof e
}

// иҝҷдҝ©иҷҡжӢҹжңәжҢҮд»ӨйғҪзӣёеҗҢ
function VM() {
В  В  function decodeVM() {}
В  В  return function (encod_code, isVM1) {
В  В В  В В В var vm_code = decodeVM(encod_code);
В  В В  В В В function createVM1(entrypoint, params, world, initialData, errorReportCallback) {
В  В В  В В  В В  В return function vm_runtime() {
В  В В  В В  В В  В В  В  var tempParams;
В  В В  В В  В В  В В  В  var tempParamsCount;
В  В В  В В  В В  В В  В  var regs = [world, initialData, params, this, arguments, vm_runtime, vm_code, 0];
В  В В  В В  В В  В В  В  var fnCtx = undefined;
В  В В  В В  В В  В В  В  var pc = entrypoint;
В  В В  В В  В В  В В  В  var tryCatchHandlers = [];
В  В В  В В  В В  В В  В  try {
В  В В  В В  В В  В В  В В  В В В for (;;) {
В  В В  В В  В В  В В  В В  В В  В В  В switch (vm_code[++pc]) {
В  В В  В В  В В  В В  В В  В В  В В  В В  В  case 2:
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В В for (tempParams = [], tempParamsCount = vm_code[++pc]; tempParamsCount > 0; tempParamsCount--) {
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В tempParams.push(regs[vm_code[++pc]]);
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В В }
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В В regs[vm_code[++pc]] = createVM2(pc + vm_code[++pc], tempParams, world, initialData, errorReportCallback);
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В В try {
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В Object.defineProperty(regs[vm_code[pc - 1]], "length", {
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В  value: vm_code[++pc],
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В  configurable: true,
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В  writable: false,
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В  enumerable: false
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В });
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В В } catch (v) {}
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В В break;
В  В В  В В  В В  В В  В В  В В  В В  В В  В  case 46:
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В В // 46 paramsCount param_1 param_2 ... param_n vmFunc offset func_length
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В В for (tempParams = [], tempParamsCount = vm_code[++pc]; tempParamsCount > 0; tempParamsCount--) {
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В tempParams.push(regs[vm_code[++pc]]);
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В В }
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В В regs[vm_code[++pc]] = createVM1(pc + vm_code[++pc], tempParams, world, initialData, errorReportCallback);
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В В try {
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В Object.defineProperty(regs[vm_code[pc - 1]], "length", {
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В  value: vm_code[++pc],
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В  configurable: true,
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В  writable: false,
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В  enumerable: false
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В });
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В В } catch (v) {}
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В В break;
В  В В  В В  В В  В В  В В  В В  В В  В В  В  case 65:
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В В regs[vm_code[++pc]] += String.fromCharCode(vm_code[++pc]);
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В В for (tempParams = [], tempParamsCount = vm_code[++pc]; tempParamsCount > 0; tempParamsCount--) {
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В tempParams.push(regs[vm_code[++pc]]);
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В В }
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В В regs[vm_code[++pc]] = createVM1(pc + vm_code[++pc], tempParams, world, initialData, errorReportCallback);
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В В try {
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В Object.defineProperty(regs[vm_code[pc - 1]], "length", {
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В value: vm_code[++pc],
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В configurable: true,
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В writable: false,
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В enumerable: false
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В });
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В В } catch (A) {}
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В В regs[vm_code[++pc]][regs[vm_code[++pc]]] = regs[vm_code[++pc]];
В  В В  В В  В В  В В  В В  В В  В В  В В  В В  В В В break;
В  В В  В В  В В  В В  В В  В В  В В  В }
В  В В  В В  В В  В В  В В  В В В }
В  В В  В В  В В  В В  В  } catch (e) {

В  В В  В В  В В  В В  В  }
В  В В  В В  В В  В }
В  В В  В В В }
В  В В  В В В function createVM2(entrypoint, params, world, initialData, errorReportCallback) {
В  В В  В В  В В  В return function vm_runtime() {
В  В В  В В  В В  В В  В  var tempParams;
В  В В  В В  В В  В В  В  var tempParamsCount;
В  В В  В В  В В  В В  В  var regs = [world, initialData, params, this, arguments, vm_runtime, vm_code, 0];
В  В В  В В  В В  В В  В  var fnCtx = undefined;
В  В В  В В  В В  В В  В  var pc = entrypoint;
В  В В  В В  В В  В В  В  var tryCatchHandlers = [];
В  В В  В В  В В  В В  В  try {
В  В В  В В  В В  В В  В В  В В В for (;;) {
В  В В  В В  В В  В В  В В  В В  В В  В switch (vm_code[++pc]) {

В  В В  В В  В В  В В  В В  В В  В В  В }
В  В В  В В  В В  В В  В В  В В В }
В  В В  В В  В В  В В  В  } catch (e) {

В  В В  В В  В В  В В  В  }
В  В В  В В  В В  В }
В  В В  В В В }
В  В В  В В В return isVM1 ? createVM1 : createVM2;
В  В  }
}
const createVM = VM(encod_code, false);
const vm_func = createVM(entrypoint, params, world, initialData, errorReportCallback);
vm_func();
```

йҰ–е…Ҳи°ғз”ЁcreateVMеҮҪж•°дј е…Ҙе…ҘеҸЈзӮ№гҖҒеҲқе§ӢеҢ–еҸӮж•°гҖҒе…ЁеұҖеҸҳйҮҸгҖҒеҲқе§Ӣж•°жҚ®зӯүзӯүпјҢиҝ”еӣһдёҖдёӘжһ„йҖ еҘҪзҡ„иҷҡжӢҹеҮҪж•°

еңЁиҜҘеҮҪж•°дёӯдјҡд»Һе…ҘеҸЈзӮ№ејҖе§ӢиҜ»еҸ–ж“ҚдҪңз ҒпјҢж №жҚ®дёҚеҗҢзҡ„ж“ҚдҪңз ҒжүҫеҲ°еҜ№еә”зҡ„handlerпјҢжү§иЎҢе®ҢhandlerеҗҺеҸҲиҝ”еӣһеҲҶеҸ‘еҷЁз»§з»ӯиҺ·еҸ–дёӢдёҖдёӘж“ҚдҪңз ҒпјҢеҫӘзҺҜеҫҖеӨҚпјҢзӣҙеҲ°йҒҮеҲ°returnпјҢз»“жқҹиҝҗиЎҢиҜҘиҷҡжӢҹеҮҪж•°пјҢж•ҙдёӘжү§иЎҢжөҒзЁӢеҰӮдёӢжүҖзӨәпјҡ

![](https://attach.52pojie.cn/forum/202506/28/030257fqkemrwbrco62dmw.png)

иҜҘиҷҡжӢҹжңәе…ұжңү82дёӘhandler

дёҫеҮ дёӘдҫӢеӯҗпјҡ

```
case 0:
В  В  regs[vm_code[++pc]] = new regs[vm_code[++pc]](regs[vm_code[++pc]]);
В  В  break;
case 1:
В  В  return regs[vm_code[++pc]];
 case 2:
В  В  for (tempParams = [], tempParamsCount = vm_code[++pc]; tempParamsCount > 0; tempParamsCount--) {
В  В В  В В В tempParams.push(regs[vm_code[++pc]]);
В  В  }
В  В  regs[vm_code[++pc]] = createVM2(pc + vm_code[++pc], tempParams, world, initialData, errorReportCallback);
В  В  try {
В  В В  В В В Object.defineProperty(regs[vm_code[pc - 1]], "length", {
В  В В  В В  В В  В value: vm_code[++pc],
В  В В  В В  В В  В configurable: true,
В  В В  В В  В В  В writable: false,
В  В В  В В  В В  В enumerable: false
В  В В  В В В });
В  В  } catch (v) {}
В  В  break;
case 6:
В  В  regs[vm_code[++pc]] = regs[vm_code[++pc]] >> vm_code[++pc];
В  В  regs[vm_code[++pc]] = regs[vm_code[++pc]][regs[vm_code[++pc]]];
В  В  break;
case 13:
В  В  regs[vm_code[++pc]] = regs[vm_code[++pc]] | regs[vm_code[++pc]];
В  В  regs[vm_code[++pc]][regs[vm_code[++pc]]] = regs[vm_code[++pc]];
В  В  pc += regs[vm_code[++pc]] ? vm_code[++pc] : vm_code[(++pc, ++pc)];
В  В  break;
```

жҜҸдёӘhandlerдёӯеҸҲеҢ…еҗ«дәҶеӨҡдёӘж“ҚдҪң(еҸҜд»Ҙз§°д№ӢдёәдёҖжқЎжҢҮд»Ө)

### дәҢгҖҒиҷҡжӢҹжҢҮд»Ө

еңЁзңӢдёӢйқўжҢҮд»Өд»Ӣз»Қд№ӢеүҚпјҢеҸҜд»Ҙе…ҲдәҶи§ЈдёҖдёӢjsдёӯиҮӘеўһиҝҗз®—зҡ„зү№жҖ§пјҢеҸҜд»ҘеҸӮиҖғиҝҷдҪҚеёҲеӮ…зҡ„ж–Үз« `https://www.resourch.com/archives/129.html`

д»ҘдёӢеҶ…е®№еқҮеј•з”ЁиҜҘеёҲеӮ…зҡ„ж–Үз«

> еҸҜд»ҘеҸ‘зҺ°пјҢз¬¬дёҖж¬Ўиҫ“еҮәзҡ„PCдёә3пјҢз¬¬дәҢж¬ЎеҲҷдёә4
>
> ```
> var PC = 1
> PC += ++PC
> // PC = 3
> ```
>
> ```
> var PC = 1
> var value = ++PC
> PC += value
> // PC = 4
> ```
>
> жҲ‘д»¬е°Ҷиҝҷж®өд»Јз Ғзј–иҜ‘дёәv8еӯ—иҠӮз Ғ
>
> ```
> var PC = 0;
> PC +=1;
> ```
>
> ```
>  0x63e081d5b7a @В  В  0 : 0cВ  В В  В В  В В  В В  В  LdaZero
>  0x63e081d5b7b @В  В  1 : 25 02В  В В  В В  В В  В  StaCurrentContextSlot [2]
>  0x63e081d5b7d @В  В  3 : 17 02В  В В  В В  В В  В  LdaImmutableCurrentContextSlot [2]
>  0x63e081d5b7f @В  В  5 : 45 01 00В  В В  В В  В  AddSmi [1], [0]
>  0x63e081d5b87 @В  В 13 : c4В  В В  В В  В В  В В  В  Star0
>  0x63e081d5b88 @В  В 14 : a9В  В В  В В  В В  В В  В  Return
> ```
>
> * **`LdaZero`**пјҡе°ҶеёёйҮҸ `0` пјҲPCзҡ„еҖјпјүеҠ иҪҪеҲ°зҙҜеҠ еҷЁпјҲAccumulatorпјүдёӯгҖӮ
> * **`StaCurrentContextSlot [2]`**пјҡе°ҶзҙҜеҠ еҷЁдёӯзҡ„еҖјеӯҳеӮЁеҲ°еҪ“еүҚдёҠдёӢж–Үзҡ„ж§ҪдҪҚ `2` дёӯгҖӮ
> * **`LdaImmutableCurrentContextSlot [2]`**пјҡе°ҶеҪ“еүҚдёҠдёӢж–Үж§ҪдҪҚ `2` дёӯзҡ„дёҚеҸҜеҸҳеҖјеҠ иҪҪеҲ°зҙҜеҠ еҷЁдёӯгҖӮ
> * **`AddSmi [1], [0]`**пјҡе°ҶзҙҜеҠ еҷЁдёӯзҡ„еҖјдёҺе°Ҹж•ҙж•°пјҲSmiпјү`1` зӣёеҠ пјҢе№¶е°Ҷз»“жһңеӯҳеӮЁеңЁзҙҜеҠ еҷЁдёӯгҖӮ
> * **`Return`** иҝ”еӣһзҙҜеҠ еҷЁдёӯзҡ„еҖј
>
> зңӢеҮәд»Җд№Ҳз«ҜеҖӘдәҶеҗ—пјҹеңЁз¬¬дёҖжқЎеӯ—иҠӮз ҒдёӯпјҢе°ұе·Із»ҸиҺ·еҸ–дәҶPCзҡ„еҖјпјҢе№¶е°Ҷе…¶еӯҳе…ҘзҙҜеҠ еҷЁпјҢиҝҷж„Ҹе‘ізқҖзҙҜеҠ ж—¶пјҢиөӢеҖјиҜӯеҸҘе·Ұдҫ§зҡ„PCдёҖзӣҙжҳҜжңҖеҲқзҡ„еҖј
>
> `PC += ++PC` е®һйҷ…дёҠзӯүеҗҢдәҺ `PC = (PC)+(++value)`пјҢеҸҳжҲҗдәҶз®ҖеҚ•зҡ„иҰҶзӣ–ж“ҚдҪңпјҢиҖҢдёҚжҳҜеңЁеҸідҫ§иЎЁиҫҫејҸжү§иЎҢе®ҢжҜ•еҗҺеҶҚиҝӣиЎҢзҙҜеҠ

#### (дёҖ) еҹәзЎҖжҢҮд»Ө

##### 1гҖҒMov

е°ҶеҜ„еӯҳеҷЁиөӢеҖјз»ҷеҜ„еӯҳеҷЁ

```
regs[vm_code[++pc]] = regs[vm_code[++pc]];
```

```
Ra = Rb
```

##### 2гҖҒMovCall

е°ҶжәҗеҜ„еӯҳеҷЁдј е…ҘжҹҗдёӘеҮҪж•°дёӯпјҢеҫ—еҲ°жү§иЎҢз»“жһңеҗҺиөӢеҖјз»ҷзӣ®ж ҮеҜ„еӯҳеҷЁ

```
regs[vm_code[++pc]] = Y(regs[vm_code[++pc]])
```

```
Ra = Y(Rb)
```

##### 3гҖҒLoadImm

е°ҶдёҖдёӘз«ӢеҚіж•°иөӢеҖјз»ҷеҜ„еӯҳеҷЁпјҢиҝҷдёӘз«ӢеҚіж•°жҳҜд»Һvm\_codeдёӯиҺ·еҸ–зҡ„

```
regs[vm_code[++pc]] = vm_code[++pc];
```

```
Ra = b
```

##### 4гҖҒLoadConstant

е°ҶдёҖдёӘеёёйҮҸиөӢеҖјз»ҷеҜ„еӯҳеҷЁпјҢиҝҷдёӘеёёйҮҸе№¶дёҚеңЁvm\_codeпјҢиҖҢжҳҜзӣҙжҺҘз»ҷе®ҡзҡ„пјҢдёҚдјҡеҪұе“ҚpcпјҢеҰӮдёӢпјҡ

```
regs[vm_code[++pc]] = "";
regs[vm_code[++pc]] = {};
regs[vm_code[++pc]] = true;
```

```
Ra = "";
Ra = {};
Ra = true;
```

#### (дәҢ) иҝҗз®—жҢҮд»Ө

##### 1гҖҒз®—ж•°иҝҗз®—

###### (1) Add

`зӣ®зҡ„ж“ҚдҪңж•° = жәҗж“ҚдҪңж•°1 + жәҗж“ҚдҪңж•°2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] + vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] + regs[vm_code[++pc]]
```

жәҗж“ҚдҪңж•°еҸҜиғҪдёә`еҜ„еӯҳеҷЁ`д№ҹеҸҜиғҪдёә`з«ӢеҚіж•°`

```
Ra = Rb + c;
Ra = Rb + Rc;
```

###### (2) Sub

`зӣ®зҡ„ж“ҚдҪңж•° = жәҗж“ҚдҪңж•°1 - жәҗж“ҚдҪңж•°2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] - vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] - regs[vm_code[++pc]]
```

жәҗж“ҚдҪңж•°еҸҜиғҪдёә`еҜ„еӯҳеҷЁ`д№ҹеҸҜиғҪдёә`з«ӢеҚіж•°`

```
Ra = Rb - c;
Ra = Rb - Rc;
```

###### (3) Mul

`зӣ®зҡ„ж“ҚдҪңж•° = жәҗж“ҚдҪңж•°1 * жәҗж“ҚдҪңж•°2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] * vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] * regs[vm_code[++pc]]
```

жәҗж“ҚдҪңж•°еҸҜиғҪдёә`еҜ„еӯҳеҷЁ`д№ҹеҸҜиғҪдёә`з«ӢеҚіж•°`

```
Ra = Rb * c;
Ra = Rb * Rc;
```

######

###### (4) Div

`зӣ®зҡ„ж“ҚдҪңж•° = жәҗж“ҚдҪңж•°1 / жәҗж“ҚдҪңж•°2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] / vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] / regs[vm_code[++pc]]
```

жәҗж“ҚдҪңж•°еҸҜиғҪдёә`еҜ„еӯҳеҷЁ`д№ҹеҸҜиғҪдёә`з«ӢеҚіж•°`

```
Ra = Rb / c;
Ra = Rb / Rc;
```

###### (5) Mod

`зӣ®зҡ„ж“ҚдҪңж•° = жәҗж“ҚдҪңж•°1 % жәҗж“ҚдҪңж•°2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] % vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] % regs[vm_code[++pc]]
```

жәҗж“ҚдҪңж•°еҸҜиғҪдёә`еҜ„еӯҳеҷЁ`д№ҹеҸҜиғҪдёә`з«ӢеҚіж•°`

```
Ra = Rb % c;
Ra = Rb % Rc;
```

###### (6) Neg

`зӣ®зҡ„ж“ҚдҪңж•° = -жәҗж“ҚдҪңж•°`

> иҝҷйҮҢзҡ„жәҗж“ҚдҪңж•°дёҖиҲ¬е°ұжҳҜеҜ„еӯҳеҷЁпјҢиҜҘиҷҡжӢҹжңәдёӯжІЎжңүеҮәзҺ°з«ӢеҚіж•°зҡ„жғ…еҶө

```
regs[vm_code[++pc]] = -regs[vm_code[++pc]];
```

```
Ra = -Rb;
```

###### (7) PreIncrementAssign

`зӣ®зҡ„ж“ҚдҪңж•° = ++жәҗж“ҚдҪңж•°`

> иҝҷйҮҢзҡ„жәҗж“ҚдҪңж•°иӮҜе®ҡжҳҜеҜ„еӯҳеҷЁпјҢдёҖдёӘз«ӢеҚіж•°жҖҺд№ҲеҸҜиғҪеҺ»иҮӘеўһе‘ў

```
regs[vm_code[++pc]] = ++regs[vm_code[++pc]];
```

```
Ra = ++Rb;
```

###### (8) PostIncrementAssign

`зӣ®зҡ„ж“ҚдҪңж•° = жәҗж“ҚдҪңж•°++`

> иҝҷйҮҢзҡ„жәҗж“ҚдҪңж•°иӮҜе®ҡжҳҜеҜ„еӯҳеҷЁпјҢдёҖдёӘз«ӢеҚіж•°жҖҺд№ҲеҸҜиғҪеҺ»иҮӘеўһе‘ў

```
regs[vm_code[++pc]] = regs[vm_code[++pc]]++;
```

```
Ra = Rb++;
```

##### 2гҖҒйҖ»иҫ‘иҝҗз®—

###### (1) LogicalAnd

`зӣ®зҡ„ж“ҚдҪңж•° = жәҗж“ҚдҪңж•°1 && жәҗж“ҚдҪңж•°2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] && vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] && regs[vm_code[++pc]]
```

жәҗж“ҚдҪңж•°еҸҜиғҪдёә`еҜ„еӯҳеҷЁ`д№ҹеҸҜиғҪдёә`з«ӢеҚіж•°`

```
Ra = Rb && c;
Ra = Rb && Rc;
```

###### (2) LogicalOr

`зӣ®зҡ„ж“ҚдҪңж•° = жәҗж“ҚдҪңж•°1 || жәҗж“ҚдҪңж•°2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] || vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] || regs[vm_code[++pc]]
```

жәҗж“ҚдҪңж•°еҸҜиғҪдёә`еҜ„еӯҳеҷЁ`д№ҹеҸҜиғҪдёә`з«ӢеҚіж•°`

```
Ra = Rb || c;
Ra = Rb || Rc;
```

###### (3) LogicalNot

`зӣ®зҡ„ж“ҚдҪңж•° = !жәҗж“ҚдҪңж•°`

```
regs[vm_code[++pc]] = !regs[vm_code[++pc]];
```

> жәҗж“ҚдҪңж•°дёҖиҲ¬дёәеҜ„еӯҳеҷЁпјҢеҰӮжһңжҳҜдёҖдёӘз«ӢеҚіж•°пјҢйӮЈеңЁз”ҹжҲҗvm\_codeзҡ„ж—¶еҖҷе°ұзӣҙжҺҘеҸ–йқһд№ҲпјҢдёҚдјҡз•ҷеҲ°иҷҡжӢҹжҢҮд»ӨиҝҗиЎҢж—¶еҺ»еҸ–еҸҚзҡ„

```
Ra = !Rb
```

##### 3гҖҒдҪҚиҝҗз®—

###### (1) BitwiseAnd

`зӣ®зҡ„ж“ҚдҪңж•° = жәҗж“ҚдҪңж•°1 & жәҗж“ҚдҪңж•°2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] & vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] & regs[vm_code[++pc]]
```

жәҗж“ҚдҪңж•°еҸҜиғҪдёә`еҜ„еӯҳеҷЁ`д№ҹеҸҜиғҪдёә`з«ӢеҚіж•°`

```
Ra = Rb & c;
Ra = Rb & Rc;
```

###### (2) BitwiseOr

`зӣ®зҡ„ж“ҚдҪңж•° = жәҗж“ҚдҪңж•°1 | жәҗж“ҚдҪңж•°2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] | vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] | regs[vm_code[++pc]]
```

жәҗж“ҚдҪңж•°еҸҜиғҪдёә`еҜ„еӯҳеҷЁ`д№ҹеҸҜиғҪдёә`з«ӢеҚіж•°`

```
Ra = Rb | c;
Ra = Rb | Rc;
```

###### (3) BitwiseXor

`зӣ®зҡ„ж“ҚдҪңж•° = жәҗж“ҚдҪңж•°1 ^ жәҗж“ҚдҪңж•°2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] ^ vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] ^ regs[vm_code[++pc]]
```

жәҗж“ҚдҪңж•°еҸҜиғҪдёә`еҜ„еӯҳеҷЁ`д№ҹеҸҜиғҪдёә`з«ӢеҚіж•°`

```
Ra = Rb ^ c;
Ra = Rb ^ Rc;
```

###### (4) BitwiseNot

`зӣ®зҡ„ж“ҚдҪңж•° = !жәҗж“ҚдҪңж•°`

```
regs[vm_code[++pc]] = ~regs[vm_code[++pc]];
```

> жәҗж“ҚдҪңж•°дёҖиҲ¬дёәеҜ„еӯҳеҷЁпјҢеҰӮжһңжҳҜдёҖдёӘз«ӢеҚіж•°пјҢйӮЈеңЁз”ҹжҲҗvm\_codeзҡ„ж—¶еҖҷе°ұзӣҙжҺҘеҸ–еҸҚд№ҲпјҢдёҚдјҡз•ҷеҲ°иҷҡжӢҹжҢҮд»ӨиҝҗиЎҢж—¶еҺ»еҸ–еҸҚзҡ„

```
Ra = ~Rb
```

###### (5) BitwiseSal

`зӣ®зҡ„ж“ҚдҪңж•° = жәҗж“ҚдҪңж•°1 << жәҗж“ҚдҪңж•°2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] << vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] << regs[vm_code[++pc]]
```

жәҗж“ҚдҪңж•°еҸҜиғҪдёә`еҜ„еӯҳеҷЁ`д№ҹеҸҜиғҪдёә`з«ӢеҚіж•°`

```
Ra = Rb << c;
Ra = Rb << Rc;
```

###### (6) BitwiseShr

`зӣ®зҡ„ж“ҚдҪңж•° = жәҗж“ҚдҪңж•°1 >>> жәҗж“ҚдҪңж•°2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] >>> vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] >>> regs[vm_code[++pc]]
```

жәҗж“ҚдҪңж•°еҸҜиғҪдёә`еҜ„еӯҳеҷЁ`д№ҹеҸҜиғҪдёә`з«ӢеҚіж•°`

```
Ra = Rb >>> c;
Ra = Rb >>> Rc;
```

###### (7) BitwiseSar

`зӣ®зҡ„ж“ҚдҪңж•° = жәҗж“ҚдҪңж•°1 >> жәҗж“ҚдҪңж•°2`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] >> regs[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] >> regs[vm_code[++pc]]
```

жәҗж“ҚдҪңж•°еҸҜиғҪдёә`еҜ„еӯҳеҷЁ`д№ҹеҸҜиғҪдёә`з«ӢеҚіж•°`

```
Ra = Rb >> c;
Ra = Rb >> Rc;
```

##### 4гҖҒжҜ”иҫғжҢҮд»Ө

###### (1) Cmp

жҜ”иҫғзҡ„жқЎд»¶жңү`<`, `<=`, `>`, `>=`, `===`, `==`, `!===`, `!==`

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] cond vm_code[++pc];
regs[vm_code[++pc]] = regs[vm_code[++pc]] cond regs[vm_code[++pc]];
```

```
Ra = Rb cond c;
Ra = Rb cond Rc;
```

#### (дёү) жҺ§еҲ¶жөҒжҢҮд»Ө

##### 1гҖҒJz

еҲҶж”ҜиҜӯеҸҘ

```
pc += regs[vm_code[++pc]] ? vm_code[++pc] : vm_code[++pc, ++pc];
```

```
Jz<Ra> b: c
```

![](https://attach.52pojie.cn/forum/202506/28/030250if0y10oy15xsntn5.png)

##### 2гҖҒRet

returnиҜӯеҸҘпјҢдјҡйҖҖеҮәиҷҡжӢҹеҮҪж•°

```
return regs[vm_code[++pc]];
```

еҢ…еҗ«иҜҘжҢҮд»Өзҡ„handlerе°ұжҳҜйҖҖеҮәhandler

#####

##### 3гҖҒCall

йЎҫеҗҚжҖқд№үпјҢе°ұжҳҜи°ғз”Ёе…¶д»–еҮҪж•°пјҢиҝҷйҮҢдҪҝз”Ёзҡ„жҳҜjsдёӯFunctionзҡ„callж–№жі•

```
regs[vm_code[++pc]] = regs[vm_code[++pc]].call(fnCtx);
regs[vm_code[++pc]] = regs[vm_code[++pc]].call(fnCtx, regs[vm_code[++pc]], regs[vm_code[++pc]]);
regs[vm_code[++pc]] = regs[vm_code[++pc]].call(regs[vm_code[++pc]]);
regs[vm_code[++pc]] = regs[vm_code[++pc]].call(regs[vm_code[++pc]], regs[vm_code[++pc]]);
```

иҝҷйҮҢзҡ„fnCtxдјҡиў«еҲқе§ӢеҢ–дёәundefined

иҝҷдёӘеңЁеӨ„зҗҶзҡ„ж—¶еҖҷйңҖиҰҒе…іжіЁдёҖдёӢдј е…ҘеҸӮж•°зҡ„дёӘж•°д»ҘеҸҠthisжҢҮй’Ҳ

#### (еӣӣ) еҜ№иұЎж“ҚдҪңжҢҮд»Ө

##### 1гҖҒNewObj

е°ұжҳҜnewдёҖдёӘж–°зҡ„еҜ№иұЎ

```
regs[vm_code[++pc]] = new regs[vm_code[++pc]](regs[vm_code[++pc]]);
```

```
Ra = new Rb(Rc, ...)
```

иҝҷйҮҢд№ҹйңҖиҰҒжіЁж„Ҹдј е…ҘеҸӮж•°зҡ„дёӘж•°

##### 2гҖҒPropSet

з»ҷжҹҗдёӘеҜ№иұЎзҡ„жҹҗдёӘеұһжҖ§иөӢеҖј

```
regs[vm_code[++pc]][regs[vm_code[++pc]]] = regs[vm_code[++pc]];
regs[vm_code[++pc]][vm_code[++pc]] = regs[vm_code[++pc]];
regs[vm_code[++pc]][regs[vm_code[++pc]]] = vm_code[++pc];
regs[vm_code[++pc]][vm_code[++pc]] = vm_code[++pc];
```

```
Ra[Rb] = Rc;
Ra[b] = Rc;
Ra[Rb] = c;
Ra[b] = c;
```

иҝҷйҮҢйҷӨдәҶиў«дҝ®ж”№зҡ„еҜ№иұЎж“ҚдҪңж•°д»ҘеӨ–пјҢе…¶д»–ж“ҚдҪңж•°жңүеҸҜиғҪжҳҜеҜ„еӯҳеҷЁд№ҹжңүеҸҜиғҪжҳҜз«ӢеҚіж•°

##### 3гҖҒPropGet

```
regs[vm_code[++pc]] = regs[vm_code[++pc]][regs[vm_code[++pc]]];
regs[vm_code[++pc]] = regs[vm_code[++pc]][vm_code[++pc]];
```

```
Ra = Rb[Rc];
Ra = Rb[c];
```

#### (дә”) еӯ—з¬ҰдёІж“ҚдҪңжҢҮд»Ө

##### 1гҖҒStrConcat

```
regs[vm_code[++pc]] += String.fromCharCode(vm_code[++pc]);
```

```
Ra += String.fromCharCode(b);
```

#### (е…ӯ) зү№ж®ҠжҢҮд»Ө

##### 1гҖҒArrayCreate

```
regs[vm_code[++pc]] = Array(vm_code[++pc]);
```

```
Ra = Array(b);
```

еҲӣе»әе®№йҮҸдёәbзҡ„ж•°з»„

##### 2гҖҒConvertToNumber

```
regs[vm_code[++pc]] = regs[vm_code[++pc]] - 0;
```

```
Ra = Rb - 0;
```

е°ҶдёҖдёӘеҜ„еӯҳеҷЁеҸҳжҲҗдёҖдёӘж•°еӯ—

##### 3гҖҒCreateVmFunction

иҝҷдёӘжҳҜйҮҚдёӯд№ӢйҮҚпјҢз”ЁжқҘи°ғз”ЁcreateVM1жҲ–иҖ…createVM2жқҘеҲӣе»әдёҖдёӘж–°зҡ„иҷҡжӢҹеҮҪж•°пјҢд»ҘдҫҝеҗҺз»ӯдҪҝз”ЁCallжҢҮд»ӨиҝӣиЎҢи°ғз”Ё

жҚўеҸҘиҜқжқҘиҜҙпјҢе…¶е®һиҝҷдёӘиҷҡжӢҹжңәе°ұжҳҜдёҖдёӘеҸҲдёҖдёӘзҡ„иҷҡжӢҹеҮҪж•°з»„жҲҗпјҢз»ҷе®ҡдёҖдёӘе…ҘеҸЈеҮҪж•°пјҢејҖе§Ӣжү§иЎҢпјҢеҮҪж•°д№Ӣй—ҙдә’зӣёи°ғз”Ёе®ҢжҲҗеҜ№еә”зҡ„еҠҹиғҪпјҢжңҖз»Ҳиҝ”еӣһиҝҗз®—з»“жһң

```
for (tempParams = [], tempParamsCount = vm_code[++pc]; tempParamsCount > 0; tempParamsCount--) {
В  В  tempParams.push(regs[vm_code[++pc]]);
}
regs[vm_code[++pc]] = createVM2(pc + vm_code[++pc], tempParams, world, initialData, errorReportCallback);
try {
В  В  Object.defineProperty(regs[vm_code[pc - 1]], "length", {
В  В В  В В В value: vm_code[++pc],
В  В В  В В В configurable: true,
В  В В  В В В writable: false,
В  В В  В В В enumerable: false
В  В  });
} catch (v) {}
```

![](https://attach.52pojie.cn/forum/202506/28/030242mvn6jvevcje4eepn.png)

* count: иҝҷдёӘжҳҜиҜҘеҮҪж•°дёҙж—¶paramsзҡ„дёӘж•°, еңЁеҮҪж•°еҶ…йғЁдҪҝз”Ё
* param\_i: иҝҷдёӘе…·дҪ“зҡ„params
* target: еҜ„еӯҳеҷЁж“ҚдҪңж•°пјҢз”ЁжқҘдҝқеӯҳеҲӣе»әеҗҺзҡ„иҷҡжӢҹеҮҪж•°
* offset: ж–°зҡ„иҷҡжӢҹеҮҪж•°зҡ„pcеҒҸз§»(pc = off + offset)
* length: иҝҷдёӘжҳҜж–°еҲӣе»әеҮҪж•°зҡ„lengthпјҢжҳҜFunctionзҡ„дёҖдёӘеұһжҖ§пјҢз”ЁжқҘжҢҮзӨәеҪўеҸӮдёӘж•°

#### (дёғ) дёӯй—ҙжҢҮд»ӨйӣҶжҠҪиұЎе®ҡд№ү

з”ұдәҺжҳҜjsvmpпјҢжүҖд»ҘдҪҝз”Ёjsд»Јз ҒжқҘеӨ„зҗҶ

##### 1гҖҒжҢҮд»Өзұ»

е®ҡд№ү`IRInstruction`еҹәзұ»зұ»пјҢз”ЁжқҘеӯҳж”ҫеҹәжң¬зҡ„еұһжҖ§пјҢдҫӢеҰӮ`ir_name`, `address`, `ins_len`

жҺҘзқҖж №жҚ®дёҚеҗҢзҡ„жҢҮд»Өе®ҡд№үеҜ№еә”зҡ„зұ»пјҢеқҮз»§жүҝиҜҘеҹәзұ»пјҢжҲ‘е®ҡд№үдәҶеҰӮдёӢжҢҮд»Өзұ»пјҢе…¶з»§жүҝе…ізі»еҰӮдёӢеӣҫпјҡ

![](https://attach.52pojie.cn/forum/202506/28/030246g78f7a75s87j9x5z.png)

##### 2гҖҒж“ҚдҪңж•°зұ»

дёҠйқўзҡ„еҲҶжһҗеҸҜзҹҘпјҢж“ҚдҪңж•°еҲҶдёәдёӨзұ»пјҢдёҖзұ»жҳҜеҜ„еӯҳеҷЁпјҢеҸҰдёҖзұ»жҳҜз«ӢеҚіж•°

![](https://attach.52pojie.cn/forum/202506/28/030248azenckecfd2frh2t.png)

### дёүгҖҒжһ„е»әжҺ§еҲ¶жөҒеӣҫ

еңЁжһ„е»әжҺ§еҲ¶жөҒеӣҫеүҚпјҢе…Ҳе®ҡд№үдёҖдёӢеҹәжң¬еқ—зұ»

```
class BasicBlock {
В  В  static blockId = 0;
В  В  static exitAddr = -1;

В  В  constructor() {
В  В В  В В В this.id = BasicBlock.blockId++;
В  В В  В В В this.startAddr = BasicBlock.exitAddr;
В  В В  В В В this.endAddr = BasicBlock.exitAddr;
В  В В  В В В this.instructions = [];
В  В В  В В В this.prevBlocks = new Set(); // еүҚй©ұеҹәжң¬еқ—
В  В В  В В В this.nextBlocks = new Map(); // еҗҺз»§еҹәжң¬еқ—: true жҲ–иҖ… falseеҲҶж”Ҝ
В  В В  В В В this.isExitBlock = false;
В  В  }
}
```

#### (дёҖ) еҲӣе»әеҲқе§Ӣеҹәжң¬еқ—

жӯӨжӯҘйӘӨдёәжҜҸдёӘhandlerеҲӣе»әдёҖдёӘеҹәжң¬еқ—еҜ№иұЎпјҢз„¶еҗҺе°Ҷhandlerдёӯзҡ„еӨҡжқЎиҷҡжӢҹжҢҮд»Өж·»еҠ еҲ°еҹәжң¬еқ—дёӯ

* еҰӮжһңhandlerжңҖеҗҺдёҖдёӘжҢҮд»ӨдёҚжҳҜJzпјҢйӮЈе°ұе°ҶиҜҘеҹәжң¬еқ—зҡ„еҗҺй©ұиҠӮзӮ№и®ҫзҪ®дёәдёӢдёҖдёӘhandlerзҡ„ең°еқҖ(еҸҜж №жҚ®иҜҘhandlerзҡ„еӯ—иҠӮз Ғй•ҝеәҰи®Ўз®—еҫ—еҲ°)
* еҰӮжһңhandlerжңҖеҗҺдёҖдёӘжҢҮд»ӨжҳҜJzпјҢйӮЈе°ұйҖ’еҪ’зҡ„еӨ„зҗҶtrueе’ҢfalseеҲҶж”Ҝ
  + иҜҘиҷҡжӢҹжңәдјҡжңүдёҖз§ҚиҠұжҢҮд»ӨпјҢе…¶JzжқЎд»¶жҒ’зңҹжҲ–жҒ’еҒҮпјҢжӯӨж—¶е°ұдёҚйңҖиҰҒйҖ’еҪ’еӨ„зҗҶfalseжҲ–иҖ…trueеҲҶж”Ҝ

еңЁеҲӣе»әеҲқе§Ӣеҹәжң¬еқ—ж—¶пјҢеҸҜиғҪдјҡйҒҮеҲ°иҷҡжӢҹеӯ—иҠӮз ҒиҮӘжӣҙж”№зҡ„жғ…еҶөпјҢиҝҷдёӘж—¶еҖҷйңҖиҰҒжү“дёҠиЎҘдёҒпјҢиҜҰз»ҶеҲҶжһҗеҸҜд»ҘеҸӮиҖғ`https://jixun.uk/posts/2024/qqmusic-zzc-sign/`

#### (дәҢ) еЎ«е……еҹәжң¬еқ—еүҚй©ұиҠӮзӮ№

жӯӨжӯҘйӘӨдјҡе°Ҷеҹәжң¬еқ—зҡ„еүҚй©ұиҠӮзӮ№еӯ—ж®өеЎ«е……

йҒҚеҺҶжүҖжңүеҹәжң¬еқ—пјҢе°Ҷе…¶еҗҺй©ұиҠӮзӮ№зҡ„еүҚй©ұиҠӮзӮ№и®ҫзҪ®дёәеҪ“еүҚеҹәжң¬еқ—

#### (дёү) еҗҲе№¶еҹәжң¬еқ—

еҰӮжһңдёҖдёӘиҠӮзӮ№зҡ„еҗҺй©ұиҠӮзӮ№еҸӘжңүдёҖдёӘ, е№¶дё”иҝҷдёӘе”ҜдёҖзҡ„еҗҺй©ұиҠӮзӮ№зҡ„еүҚй©ұиҠӮзӮ№д№ҹеҸӘжңүдёҖдёӘ, йӮЈд№ҲеҗҺй©ұиҠӮзӮ№е°ұеҸҜд»ҘдёҺиҜҘиҠӮзӮ№еҗҲе№¶

#### (еӣӣ) еҲ йҷӨиҠұжҢҮд»Ө

иҜҘиҷҡжӢҹжңәжһ¶жһ„дё»иҰҒжңүдёӨз§ҚиҠұжҢҮд»Ө

* JzжқЎд»¶жҒ’зңҹжҲ–жҒ’еҒҮпјҢжӯӨж—¶е°ұдёҚйңҖиҰҒйҖ’еҪ’еӨ„зҗҶfalseжҲ–иҖ…trueеҲҶж”Ҝ
* Jzзҡ„жқЎд»¶иҝӣиЎҢдәҢж¬ЎеҲӨж–ӯ

  ![](https://attach.52pojie.cn/forum/202506/28/030252r2ec4127e5zeickc.png)

  еҸҜд»ҘзңӢеҲ°еҪ“RxдёәеҒҮж—¶дјҡи·іиҪ¬еҲ°`Block off2`еҹәжң¬еқ—пјҢйӮЈд№ҲжӯӨж—¶`Block off2`дёӯе…ідәҺRxзҡ„еҲӨж–ӯдёҖе®ҡд№ҹжҳҜеҒҮпјҢйӮЈд№Ҳе°ұдёҚдјҡи·іиҪ¬еҲ°`Block off3`пјҢиҖҢжҳҜи·іиҪ¬еҲ°`Block off4`пјҢжүҖд»Ҙд»Һ`Block off2`еҲ°`Block off3`иҝҷжқЎиҫ№йңҖиҰҒеҲ жҺү

#### (дә”) з”ҹжҲҗжҺ§еҲ¶жөҒеӣҫ

йҒҚеҺҶжүҖжңүеҹәжң¬еқ—пјҢж №жҚ®е…¶еүҚй©ұиҠӮзӮ№е’ҢеҗҺй©ұиҠӮзӮ№пјҢз”ҹжҲҗиҠӮзӮ№е’Ңиҫ№пјҢжңҖз»Ҳеҫ—еҲ°`dot`ж–Үд»¶пјҢдҪҝз”Ё`Graphviz`е·Ҙе…·е°Ҷ`dot`ж–Үд»¶иҪ¬жҚўжҲҗpng

### еӣӣгҖҒqqyysignеҲҶжһҗ

#### (дёҖ) f\_3945

д»ҺиҷҡжӢҹжңәе…ҘеҸЈејҖе§ӢеҲҶжһҗпјҢжңҖејҖе§Ӣзҡ„е…ҘеҸЈеҮҪж•°ең°еқҖеҒҸз§»дёә`3945`

е…¶жҺ§еҲ¶жөҒеӣҫеҰӮдёӢжүҖзӨәпјҡ

![](https://attach.52pojie.cn/forum/202506/28/030301m0ekehgwgwk9zkwk.png)

жүӢеҠЁиҪ¬жҚўжҲҗjsд»Јз ҒеҰӮдёӢпјҡ

```
function f_3945() {
В  В  f_4(f_4157)
В  В  return undefined;
}
```

#### (дәҢ) f\_4

жҺҘзқҖйңҖиҰҒеҲҶжһҗеҒҸз§»дёә4зҡ„еҮҪж•°пјҢе…¶жҺ§еҲ¶жөҒеӣҫеҰӮдёӢпјҡ

![](https://attach.52pojie.cn/forum/202506/28/030259v9vvyfhav9wtv2mx.png)

иҪ¬жҚўжҲҗjsд»Јз ҒеҰӮдёӢпјҡ

```
function f_4(func) {
В  В  if (typeof window["define"] === "function" && window["define"]["amd"]) {
В  В В  В В В window["define"].call(undefined, func);
В  В  } else {
В  В В  В В В func.call(undefined);
В  В  }
В  В  return undefined;
}
```

е°ұжҳҜе°Ҷдј е…Ҙзҡ„еҸӮж•°еҪ“дҪңеҮҪж•°и°ғз”Ё

#### (дёү) f\_4157

![](https://attach.52pojie.cn/forum/202506/28/030303iqjc4qjz1ocwxxd4.png)

```
function f_4157() {a
В  В  // createVM1(6777, length=1, paramsCount=1, param=[R26])
В  В  R24 = [f_6777];
В  В  // createVM1(5770, length=1, paramsCount=1, param=[R24]);
В  В  R43 = [f_5770];
В  В  R33 = [getGlobalContext()];
В  В  R34 = [window];
В  В  R25 = [["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f"]];
В  В  R20 = [[-2147483648, 8388608, 32768, 128]];
В  В  R27 = [[24, 16, 8, 0]];
В  В  R26 = [[]];
В  В  // createVM1(3902, length=1, paramsCount=2, param=[R34,R27]);
В  В  f_6777.prototype.update = f_3902;
В  В  // createVM1(6860, length=0, paramsCount=1, param=[R20]);
В  В  f_6777.prototype.finalize = f_6860;
В  В  // createVM1(4633, length=0, paramsCount=0, param=[]);
В  В  f_6777.prototype.hash = f_4633;
В  В  // createVM1(2555, length=0, paramsCount=1, param=[R25]);
В  В  f_6777.prototype.hex = f_2555;
В  В  f_6777.prototype.toString = f_6777.prototype.hex;
В  В  // createVM1(5329, length=1, paramsCount=2, param=[R43,R33]);
В  В  window._getSecuritySign = f_5329;
В  В  return undefined;
}
```

иҝҷйҮҢе°ұеҸ‘зҺ°дәҶе…ій”®зҡ„еҮҪж•°`_getSecuritySign`пјҢе…¶еҒҸз§»дёә5329пјҢиҝҷдёӘе°ұжҳҜз”ЁжқҘз”ҹжҲҗsignзҡ„еҮҪж•°

з»“еҗҲзҪ‘дёҠе…¬ејҖзҡ„еҲҶжһҗд»ҘеҸҠиҝҷйҮҢзҡ„еҮҪж•°еҗҚ`update`, `finalize`, `hash`, `hex`пјҢеҸҜд»ҘзҹҘйҒ“иҝҷйҮҢе…¶е®һжҳҜдёҖдёӘsha1зҡ„зұ»

<https://github.com/emn178/js-sha1/blob/5c5ec87/src/sha1.js#L145>

#### (еӣӣ) f\_5329

![](https://attach.52pojie.cn/forum/202506/28/030306qfy1p1spv1v91ff6.png)

```
function f_5329(data) {
В  В  let params = [
В  В В  В В В [f_5770],
В  В В  В В В [getGlobalContext()]
В  В  ];
В  В  R88 = data;
В  В  sha1 = f_5770(data).toUpperCase();
В  В  R43 = [sha1];
В  В  R67 = Array(0);
В  В  R128 = [f_5770];
В  В  R160 = [getGlobalContext()];
В  В  R94 = vm_runtime;
В  В  R85 = {"0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "A": 10, "B": 11, "C": 12, "D": 13, "E": 14, "F": 15};
В  В  R116 = "ABCDEDGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
В  В  // R135 = getVariableType(window) === "object";
В  В  // R135 = getVariableType(window.navigator) === "object";
В  В  R135 = getVariableType(window.location) === "object";
В  В  R104 = getVariableType(window.location) === "object";
В  В  R71 = /Headless/i.test(navigator.userAgent);
В  В  R154 = /Headless/i.test(navigator.userAgent);
В  В  R78 = ["qq.com", "joox.com", "tencentmusic.com", "wavecommittee.com", "kugou.com", "kuwo.cn"];
В  В  R98 = R78.some((ele) => {
В  В В  В В В return location.host.indexOf(ele) !== -1;
В  В  }); // R98 = true
В  В  R78 = false;
В  В  R95 = [23, 14, 6, 36, 16, 40, 7, 19];
В  В  // createVM1(3488, length=1, paramsCount=2, param=[R67,R43]);
В  В  R139 = R95.map((ele) => {
В  В В  В В В return R43[0][ele];
В  В  });
В  В  R8 = R139.join("");
В  В  R153 = [16, 1, 32, 12, 19, 27, 8, 5];
В  В  R186 = R153.map((ele) => {
В  В В  В В В return R43[0][ele];
В  В  });
В  В  R162 = R186.join("");

В  В  R87 = [89, 39, 179, 150, 218, 82, 58, 252, 177, 52, 186, 123, 120, 64, 242, 133, 143, 161, 121, 179];
В  В  R48 = [];
В  В  R181 = 0;
В  В  while (R181 < 20) {
В  В В  В В В // R85 = {"0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "A": 10, "B": 11, "C": 12, "D": 13, "E": 14, "F": 15};
В  В В  В В В R48.push(R85[sha1[R181 * 2]] * 16 + R85[sha1[R181 * 2 + 1]] ^ R87[R181]);
В  В В  В В В R181++;
В  В  }

В  В  R85 = false;
В  В  R43[0] = false;
В  В  R87 = false;
В  В  R80 = "";
В  В  R61 = 0;
В  В  while (R61 < 6) {
В  В В  В В В // R116 = "ABCDEDGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
В  В В  В В В R80 += R116[R48[R61 * 3] >> 2] + R116[R48[R61 * 3] & 3 << 4 | R48[R61 * 3 + 1] >> 4] + R116[R48[R61 * 3 + 1] & 15 << 2 | R48[R61 * 3 + 2] >> 6] + R116[R48[R61 * 3 + 2] & 63];
В  В В  В В В R61++;
В  В  }
В  В  R80 += R116[R48[18] >> 2] + R116[R48[18] & 3 << 4 | R48[19] >> 4] + R116[R48[19] & 15 << 2];

В  В  R46 = "zzc" + R8 + R80.replace(/[\/+]/g, "") + R162;
В  В  R134 = R46.toLowerCase();
В  В  return R134;
}
```

еҸҜд»ҘзңӢеҲ°signз”ұдёүйғЁеҲҶжһ„жҲҗ

### еӣӣгҖҒдёӢжӯҘж”№иҝӣж–№еҗ‘

жң¬ж–№жі•еҸӘжҳҜеҺ»йҷӨдәҶжңҖз®ҖеҚ•зҡ„иҠұжҢҮд»ӨпјҢз„¶еҗҺз”ҹжҲҗжҺ§еҲ¶жөҒеӣҫпјҢжңҖеҗҺжүӢеҠЁдјҳеҢ–еҫ—еҲ°jsд»Јз ҒпјҢеұһдәҺеҚҠиҮӘеҠЁеҚҠжүӢеҠЁ

дёӢдёҖжӯҘе°Ҷз»§з»ӯеӯҰд№ дёӯй—ҙд»Јз ҒдјҳеҢ–зӣёе…ізҹҘиҜҶпјҢиҝӣиЎҢеёёйҮҸжҠҳеҸ гҖҒеёёйҮҸдј ж’ӯзӯүдјҳеҢ–пјҢдјҳеҢ–е®ҢжҜ•еҗҺе°ҶжҺ§еҲ¶жөҒеӣҫиҪ¬жҚўжҲҗеҜ№еә”зҡ„jsд»Јз Ғ

### еҸӮиҖғиө„ж–ҷ

[еҜ№жҠ—QQйҹід№җзҪ‘йЎөз«Ҝзҡ„иҜ·жұӮзӯҫеҗҚ(zzc + ag-1)](https://jixun.uk/posts/2024/qqmusic-zzc-sign/)

[jsvmpзј–иҜ‘дёҺеҸҚзј–иҜ‘иҜҰи§Ј (3)вҖ”вҖ”жҹҗи®Ҝж–°зүҲvmpеҸҚзј–иҜ‘](https://www.resourch.com/archives/129.html)
