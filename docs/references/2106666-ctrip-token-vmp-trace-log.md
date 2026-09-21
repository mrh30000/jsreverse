# 某程token纯算-vmp插桩日志分析

> **作者**: gfy1129 | **发布时间**: 2026-05-08 13:08:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 4252 / 18
> **原文**: [https://www.52pojie.cn/thread-2106666-1-1.html](https://www.52pojie.cn/thread-2106666-1-1.html)

---

*本帖最后由 gfy1129 于 2026-5-8 13:12 编辑*

**本文仅供学习交流，因使用本文内容而产生的任何风险及后果，作者不承担任何责任**

---

这篇blog主要分为两种解法：第一种：“古法逆向”分析日志还原算法。第二种：使用ai解决jsvmp还原算法
·对于想要交流学习的大佬，可以看一看第一部分，欢迎斧正
·对于想要使用ai梭哈的大佬，可以只直接跳到第二部分（**第二部分暂定下一篇帖子单独发**）
·这个phantom-token参数相对于 [某Q音乐sign纯算-vmp插桩日志分析](https://www.52pojie.cn/thread-2104849-1-1.html) 中的sign，有个魔改的md5，分析起来难度可能高一丢丢

**网址：aHR0cHM6Ly9ob3RlbHMuY3RyaXAuY29tL2hvdGVscy9saXN0P2ZsZXhUeXBlPTEmZml4ZWREYXRlPTAmY2l0eUlkPTImcHJvdmluY2VJZD0yJmNvdW50cnlJZD0xJmNpdHlOYW1lPSVFNCVCOCU4QSVFNiVCNSVCNyZkZXN0TmFtZT0lRTQlQjglOEElRTYlQjUlQjcmc2VhcmNoVHlwZT1DVCZjaGVja2luPTIwMjYtMDUtMDYmY2hlY2tvdXQ9MjAyNi0wNS0wNyZjcm49MSZsaXN0RmlsdGVycz0yOX4xKjI5KjF+MSoyJTJDODB+Mio4MCoyJTJDMTd+MSoxNyoxJmN1cnI9Q05ZJmxvY2FsZT16aC1DTiZvbGQ9MSZ2Ml9tb2Q9MzImdjJfdmVyc2lvbj1F**

---

一、分析日志前的准备（定位加密位置，确定jsvmp，插桩，保存日志）

①请求头中的token目标参数
![](https://i.postimg.cc/KcsDQWrG/2271de74b83e21e3e88f76f50d97a9f2.png)

②全局搜索“phantom-token” 确定加密位置
![](https://i.postimg.cc/0jpm8V34/14cb909d028800b13213b353b8cabf90.png)

③经过控制台调试，初步确定window.signature()为加密函数，跟进这个函数
![](https://i.postimg.cc/pXsrDNDK/0e0e7dfc0bc8c972e8c84aefefa08ca1.png)

④把这个vmp扣到本地，先本地补环境/直接在浏览器代码段运行这个vmp，然后输出这个加密函数，判断加密函数是否存在这个jsvmp中 （我这里采用的是本地补环境，可以直接在目标网站的代码段运行这个脚本）
![](https://i.postimg.cc/1t82YqTr/10c16fbb21ca0d0b8f4ddc0bdd8f79a5.png)

⑤对jsvmp进行插桩，可以采用手动插桩/ast自动插桩/ai-skill/ai-prompt 自动插桩，插桩之后的脚本我放在附件。
**tips1: 插桩插的越好，日志越详细，冗余的日志越少，分析起来可能会简单点**
![](https://i.postimg.cc/bJXq5M4y/721efa41282059431377bffd880c2b94.png)

⑥ 运行vmp插桩之后的脚本，日志输出完毕之后运行控制台保存日志的脚本我放在附件，这个脚本在 [某Q音乐sign纯算-vmp插桩日志分析](https://www.52pojie.cn/thread-2104849-1-1.html) 提及过，可以参考上个帖子。
![](https://i.postimg.cc/C1wQdsq8/7d307a2568729573b449302a69fc6075.png)

此时日志已经保存在本地，可以接下来的分析

---

二、分析日志
**tip:可以用klogg这个轻量化的工具分析日志。**

**① 加密值由三部分构成， 1006（固定） +  common(固定) + 加密长串（动态） 。**
![](https://i.postimg.cc/N0nxv8xw/7417e9032fcc7a471badfc6b7dea53ac.png)

② 全局搜索这个 “PfNwnAIL0e9gy50jPBvhTJTnyfTW6qRqaW4Uyd3wobwgzjGcx90y...” 长串，是经过 BIN\_69109 二元运算的返回结果，找到这个二元运算
![](https://i.postimg.cc/Jnct5M0p/89acb7a44d52456c1ec253e5ff97d646.png)

往上找日志，长串的拼接，也是按照这种形式。
![](https://i.postimg.cc/FRkSQ2Pv/13b5308983b320485310b7a33d3930c2.png)

③日志1，经过这个匿名函数1得到两个字符
匿名函数1的入参有两个参数，**数字52（取自大数组，这个大数组由****fingerprint  指纹长串生成，后续会讲到****）**以及长串SO781baBZHkzNgLF5mAtUG6qMXPQo0pc349fnTlhDds，此处先解析**匿名函数1的实现逻辑**
举例1：

[Python] *纯文本查看*

```
[CALL_69082] 调用函数 ==> [anonymous]
[CALL_69082] 参数 ==> [52, SO781baBZHkzNgLF5mAtUG6qMXPQo0pc349fnTlhDds]
[CALL_69082] this ==> [Window]
[CALL_69082] 结果 ==> OH
[BIN_69083] 操作符 ==> +
[BIN_69083] 左值 ==> PfNwnAIL0e9gy50jPBvhTJTnyfTW6qRqaW4Uyd3wobwgzjGcx90yaXv3mwb7WTlY0ork7ynURAFYHcr4bjmTwaBWlhESXjdcvfMvH8EoHEoOj4bezEbYXnK3qElpRAbRNOybNyq4y4qvctyhAYTFiUHjLcR9bv0DyLUWQ3YHswagvaYHAyAcjfOw1NKXPjGpjULEg1ysEpfi06YQEagYtPyhE5GY4syf1KnmiTDjFDjatWB8yZlIH7wz3jOkwq4eX3EAGIS6wkhin1RoEDzY5zy5PKTGiBOjsnjafW3cybEToY7GytMWUQeGPyPNjaEmqi7HypgvSnW4mjg8eQlwXHIZ1EBzjTEMmiZ5JPHRGEDNYThwqXv8NeH3epAjg3yh9JShETZj85jlESsihTJ5GWLEsaY4BwaNwkneH3j0HITPx1HymEtZi9XJdaYQEhGYkBwlaE71wmQiaOxfqe8OYslwLNj7AxqayZEftimlJcAYNEnbYgdwlqwa6ihgvzfYTQjcHwHcImNxoZyFE1qiqkJ9aRPENFY8SwoTwsgeFpjkFIgkW0hEthRTFj6EqOiOlJNESnYh7JFDwU7EmE15Y6qJTGi6sjLEZBY1OJa8jp6YcEG1YhLJMgwA4w9E38YHLJXZi8LJbEOhYgMJhTiH4ylEzkYHkwdaycMjoPymSjqmW5PEh0R3njOE37iLQJsEabYnFJhdw36EpEMQYmZJ47iNfj6EdAYMZJDljXhYNEg9YXtJNTwA1wBEQPYMLJfOiDaJFEtaYH3JoAigcy6E6nYU6wO0yNQj75EoOwbtwM5Koqw54IBXEszjpEaLi86JlnEmUwcEhGYnZwmQwdhKl5jNBwQHrLdeHTYfE0SikFJtoYqkW0DYlzwbFehlW3AJnMecXWo6J9EFbYODwg6wHDKnNj7UwdSrBpiMcvS0jGE9niU4JBUYFpW3XYNLwhOe59WdfJhzeD3eUcwbsy4YoSvBMKkXWbpRqby6hyBayskjzfw8MwsNWfPyZMEbfw03YXUwZBIptY6SJfaJ3MjSmep1JMpWmpypgjOcYSfyfMRXQvb8w0MR0YOgYpbEf3KlAvZ0E9QWD0JakE0kJOmvFXvLlemqwdhR86jnmjMteN1E8NJhLYdDjtse47vkSwlOY9owLUeOfvh8vQaEs6EGXya3JdbE3OwN6vmgEnQWkAJ6j1bKknvkYGqeoOEcDw64eHHx6XK14I5lJl1iSmxkvlDi1SvUYgLJnGi75YcDiZQYQAwUQYQDWQYLEgARzZKBQvHTeLzYkXifgY3LyM5K7SR7YtZI1EGOi3ae6LE3HjpFWMMxUfIhky7YggKzQWcoxLQrBlKnFeMDEOTWcTx9DKo4IoYfwH6EB6x9BRPDvmFYGUWg3eM1RNdWh5jMNW1MYQkjckicY6zJq1yb7RfqR3TvAXYnLWH4efoRd4WXHi71Y09xh1JMsrMYUnj98wsBr3qEBmJdFvSdy5FEadwcYbhiXEFjMpYt4igBwF4RTmE0dWDXJUDIPfxPYlpYcARDMjZMJO5yT7W8v3Y1dRZ5wZZxUTjcLwBOvQ3jqDJBSKkfydYDfipXINByQ4Yo7RLni7E0YoAjAtefEGAjBgwMAvOnjFavp3wHFK6YX5RnHWHDx3LJHLWszWHgwX6e4GeBYPcrgv7hKFqKtOwhzW8Y9wXOwDcih6RLsWOPw0AJPkWt3RApy07RkARahvc9YHbv45ehPWhYUze41RaFroDEOfim8WgXes0vNGEkmJ3vHax6Lr0YhUE1SrsQwAZRmgvlhYkZWZ4eShRGBWlniTBYfAW
[BIN_69083] 右值 ==> OH
[BIN_69083] 结果 ==> PfNwnAIL0e9gy50jPBvhTJTnyfTW6qRqaW4Uyd3wobwgzjGcx90yaXv3mwb7WTlY0ork7ynURAFYHcr4bjmTwaBWlhESXjdcvfMvH8EoHEoOj4bezEbYXnK3qElpRAbRNOybNyq4y4qvctyhAYTFiUHjLcR9bv0DyLUWQ3YHswagvaYHAyAcjfOw1NKXPjGpjULEg1ysEpfi06YQEagYtPyhE5GY4syf1KnmiTDjFDjatWB8yZlIH7wz3jOkwq4eX3EAGIS6wkhin1RoEDzY5zy5PKTGiBOjsnjafW3cybEToY7GytMWUQeGPyPNjaEmqi7HypgvSnW4mjg8eQlwXHIZ1EBzjTEMmiZ5JPHRGEDNYThwqXv8NeH3epAjg3yh9JShETZj85jlESsihTJ5GWLEsaY4BwaNwkneH3j0HITPx1HymEtZi9XJdaYQEhGYkBwlaE71wmQiaOxfqe8OYslwLNj7AxqayZEftimlJcAYNEnbYgdwlqwa6ihgvzfYTQjcHwHcImNxoZyFE1qiqkJ9aRPENFY8SwoTwsgeFpjkFIgkW0hEthRTFj6EqOiOlJNESnYh7JFDwU7EmE15Y6qJTGi6sjLEZBY1OJa8jp6YcEG1YhLJMgwA4w9E38YHLJXZi8LJbEOhYgMJhTiH4ylEzkYHkwdaycMjoPymSjqmW5PEh0R3njOE37iLQJsEabYnFJhdw36EpEMQYmZJ47iNfj6EdAYMZJDljXhYNEg9YXtJNTwA1wBEQPYMLJfOiDaJFEtaYH3JoAigcy6E6nYU6wO0yNQj75EoOwbtwM5Koqw54IBXEszjpEaLi86JlnEmUwcEhGYnZwmQwdhKl5jNBwQHrLdeHTYfE0SikFJtoYqkW0DYlzwbFehlW3AJnMecXWo6J9EFbYODwg6wHDKnNj7UwdSrBpiMcvS0jGE9niU4JBUYFpW3XYNLwhOe59WdfJhzeD3eUcwbsy4YoSvBMKkXWbpRqby6hyBayskjzfw8MwsNWfPyZMEbfw03YXUwZBIptY6SJfaJ3MjSmep1JMpWmpypgjOcYSfyfMRXQvb8w0MR0YOgYpbEf3KlAvZ0E9QWD0JakE0kJOmvFXvLlemqwdhR86jnmjMteN1E8NJhLYdDjtse47vkSwlOY9owLUeOfvh8vQaEs6EGXya3JdbE3OwN6vmgEnQWkAJ6j1bKknvkYGqeoOEcDw64eHHx6XK14I5lJl1iSmxkvlDi1SvUYgLJnGi75YcDiZQYQAwUQYQDWQYLEgARzZKBQvHTeLzYkXifgY3LyM5K7SR7YtZI1EGOi3ae6LE3HjpFWMMxUfIhky7YggKzQWcoxLQrBlKnFeMDEOTWcTx9DKo4IoYfwH6EB6x9BRPDvmFYGUWg3eM1RNdWh5jMNW1MYQkjckicY6zJq1yb7RfqR3TvAXYnLWH4efoRd4WXHi71Y09xh1JMsrMYUnj98wsBr3qEBmJdFvSdy5FEadwcYbhiXEFjMpYt4igBwF4RTmE0dWDXJUDIPfxPYlpYcARDMjZMJO5yT7W8v3Y1dRZ5wZZxUTjcLwBOvQ3jqDJBSKkfydYDfipXINByQ4Yo7RLni7E0YoAjAtefEGAjBgwMAvOnjFavp3wHFK6YX5RnHWHDx3LJHLWszWHgwX6e4GeBYPcrgv7hKFqKtOwhzW8Y9wXOwDcih6RLsWOPw0AJPkWt3RApy07RkARahvc9YHbv45ehPWhYUze41RaFroDEOfim8WgXes0vNGEkmJ3vHax6Lr0YhUE1SrsQwAZRmgvlhYkZWZ4eShRGBWlniTBYfAWOH
```

拆解52 ，大致是一个43进制的转换，43是入参长串“SO781baBZHkzNgLF5mAtUG6qMXPQo0pc349fnTlhDds”的长度 。
52 = **1**\*43  + **9，** 得出的1 和 9 正是对长串的索引取值然后拼接 即为 OH
匿名函数1的伪代码：两个字符 = 长串[num/len(长串)] + 长串[num%len(长串)]

**举例2：**

[Python] *纯文本查看*

```
[CALL_69107] 调用函数 ==> [anonymous]
[CALL_69107] 参数 ==> [SO781baBZHkzNgLF5mAtUG6qMXPQo0pc349fnTlhDds, Pctrip.comSO781baBZHkzNgLF5mAtUG6qMXPQo0pc3]
[CALL_69107] this ==> [Window]
[CALL_69107] 结果 ==> 60amDPpbfLOAMh5qGXSzcZQkdBHNno3TsUl718Ftg49
[CALL_69108] 调用函数 ==> [anonymous]
[CALL_69108] 参数 ==> [103, 60amDPpbfLOAMh5qGXSzcZQkdBHNno3TsUl718Ftg49]
[CALL_69108] this ==> [Window]
[CALL_69108] 结果 ==> aX
[BIN_69109] 操作符 ==> +
[BIN_69109] 左值 ==> PfNwnAIL0e9gy50jPBvhTJTnyfTW6qRqaW4Uyd3wobwgzjGcx90yaXv3mwb7WTlY0ork7ynURAFYHcr4bjmTwaBWlhESXjdcvfMvH8EoHEoOj4bezEbYXnK3qElpRAbRNOybNyq4y4qvctyhAYTFiUHjLcR9bv0DyLUWQ3YHswagvaYHAyAcjfOw1NKXPjGpjULEg1ysEpfi06YQEagYtPyhE5GY4syf1KnmiTDjFDjatWB8yZlIH7wz3jOkwq4eX3EAGIS6wkhin1RoEDzY5zy5PKTGiBOjsnjafW3cybEToY7GytMWUQeGPyPNjaEmqi7HypgvSnW4mjg8eQlwXHIZ1EBzjTEMmiZ5JPHRGEDNYThwqXv8NeH3epAjg3yh9JShETZj85jlESsihTJ5GWLEsaY4BwaNwkneH3j0HITPx1HymEtZi9XJdaYQEhGYkBwlaE71wmQiaOxfqe8OYslwLNj7AxqayZEftimlJcAYNEnbYgdwlqwa6ihgvzfYTQjcHwHcImNxoZyFE1qiqkJ9aRPENFY8SwoTwsgeFpjkFIgkW0hEthRTFj6EqOiOlJNESnYh7JFDwU7EmE15Y6qJTGi6sjLEZBY1OJa8jp6YcEG1YhLJMgwA4w9E38YHLJXZi8LJbEOhYgMJhTiH4ylEzkYHkwdaycMjoPymSjqmW5PEh0R3njOE37iLQJsEabYnFJhdw36EpEMQYmZJ47iNfj6EdAYMZJDljXhYNEg9YXtJNTwA1wBEQPYMLJfOiDaJFEtaYH3JoAigcy6E6nYU6wO0yNQj75EoOwbtwM5Koqw54IBXEszjpEaLi86JlnEmUwcEhGYnZwmQwdhKl5jNBwQHrLdeHTYfE0SikFJtoYqkW0DYlzwbFehlW3AJnMecXWo6J9EFbYODwg6wHDKnNj7UwdSrBpiMcvS0jGE9niU4JBUYFpW3XYNLwhOe59WdfJhzeD3eUcwbsy4YoSvBMKkXWbpRqby6hyBayskjzfw8MwsNWfPyZMEbfw03YXUwZBIptY6SJfaJ3MjSmep1JMpWmpypgjOcYSfyfMRXQvb8w0MR0YOgYpbEf3KlAvZ0E9QWD0JakE0kJOmvFXvLlemqwdhR86jnmjMteN1E8NJhLYdDjtse47vkSwlOY9owLUeOfvh8vQaEs6EGXya3JdbE3OwN6vmgEnQWkAJ6j1bKknvkYGqeoOEcDw64eHHx6XK14I5lJl1iSmxkvlDi1SvUYgLJnGi75YcDiZQYQAwUQYQDWQYLEgARzZKBQvHTeLzYkXifgY3LyM5K7SR7YtZI1EGOi3ae6LE3HjpFWMMxUfIhky7YggKzQWcoxLQrBlKnFeMDEOTWcTx9DKo4IoYfwH6EB6x9BRPDvmFYGUWg3eM1RNdWh5jMNW1MYQkjckicY6zJq1yb7RfqR3TvAXYnLWH4efoRd4WXHi71Y09xh1JMsrMYUnj98wsBr3qEBmJdFvSdy5FEadwcYbhiXEFjMpYt4igBwF4RTmE0dWDXJUDIPfxPYlpYcARDMjZMJO5yT7W8v3Y1dRZ5wZZxUTjcLwBOvQ3jqDJBSKkfydYDfipXINByQ4Yo7RLni7E0YoAjAtefEGAjBgwMAvOnjFavp3wHFK6YX5RnHWHDx3LJHLWszWHgwX6e4GeBYPcrgv7hKFqKtOwhzW8Y9wXOwDcih6RLsWOPw0AJPkWt3RApy07RkARahvc9YHbv45ehPWhYUze41RaFroDEOfim8WgXes0vNGEkmJ3vHax6Lr0YhUE1SrsQwAZRmgvlhYkZWZ4eShRGBWlniTBYfAWOHE
[BIN_69109] 右值 ==> aX
[BIN_69109] 结果 ==> PfNwnAIL0e9gy50jPBvhTJTnyfTW6qRqaW4Uyd3wobwgzjGcx90yaXv3mwb7WTlY0ork7ynURAFYHcr4bjmTwaBWlhESXjdcvfMvH8EoHEoOj4bezEbYXnK3qElpRAbRNOybNyq4y4qvctyhAYTFiUHjLcR9bv0DyLUWQ3YHswagvaYHAyAcjfOw1NKXPjGpjULEg1ysEpfi06YQEagYtPyhE5GY4syf1KnmiTDjFDjatWB8yZlIH7wz3jOkwq4eX3EAGIS6wkhin1RoEDzY5zy5PKTGiBOjsnjafW3cybEToY7GytMWUQeGPyPNjaEmqi7HypgvSnW4mjg8eQlwXHIZ1EBzjTEMmiZ5JPHRGEDNYThwqXv8NeH3epAjg3yh9JShETZj85jlESsihTJ5GWLEsaY4BwaNwkneH3j0HITPx1HymEtZi9XJdaYQEhGYkBwlaE71wmQiaOxfqe8OYslwLNj7AxqayZEftimlJcAYNEnbYgdwlqwa6ihgvzfYTQjcHwHcImNxoZyFE1qiqkJ9aRPENFY8SwoTwsgeFpjkFIgkW0hEthRTFj6EqOiOlJNESnYh7JFDwU7EmE15Y6qJTGi6sjLEZBY1OJa8jp6YcEG1YhLJMgwA4w9E38YHLJXZi8LJbEOhYgMJhTiH4ylEzkYHkwdaycMjoPymSjqmW5PEh0R3njOE37iLQJsEabYnFJhdw36EpEMQYmZJ47iNfj6EdAYMZJDljXhYNEg9YXtJNTwA1wBEQPYMLJfOiDaJFEtaYH3JoAigcy6E6nYU6wO0yNQj75EoOwbtwM5Koqw54IBXEszjpEaLi86JlnEmUwcEhGYnZwmQwdhKl5jNBwQHrLdeHTYfE0SikFJtoYqkW0DYlzwbFehlW3AJnMecXWo6J9EFbYODwg6wHDKnNj7UwdSrBpiMcvS0jGE9niU4JBUYFpW3XYNLwhOe59WdfJhzeD3eUcwbsy4YoSvBMKkXWbpRqby6hyBayskjzfw8MwsNWfPyZMEbfw03YXUwZBIptY6SJfaJ3MjSmep1JMpWmpypgjOcYSfyfMRXQvb8w0MR0YOgYpbEf3KlAvZ0E9QWD0JakE0kJOmvFXvLlemqwdhR86jnmjMteN1E8NJhLYdDjtse47vkSwlOY9owLUeOfvh8vQaEs6EGXya3JdbE3OwN6vmgEnQWkAJ6j1bKknvkYGqeoOEcDw64eHHx6XK14I5lJl1iSmxkvlDi1SvUYgLJnGi75YcDiZQYQAwUQYQDWQYLEgARzZKBQvHTeLzYkXifgY3LyM5K7SR7YtZI1EGOi3ae6LE3HjpFWMMxUfIhky7YggKzQWcoxLQrBlKnFeMDEOTWcTx9DKo4IoYfwH6EB6x9BRPDvmFYGUWg3eM1RNdWh5jMNW1MYQkjckicY6zJq1yb7RfqR3TvAXYnLWH4efoRd4WXHi71Y09xh1JMsrMYUnj98wsBr3qEBmJdFvSdy5FEadwcYbhiXEFjMpYt4igBwF4RTmE0dWDXJUDIPfxPYlpYcARDMjZMJO5yT7W8v3Y1dRZ5wZZxUTjcLwBOvQ3jqDJBSKkfydYDfipXINByQ4Yo7RLni7E0YoAjAtefEGAjBgwMAvOnjFavp3wHFK6YX5RnHWHDx3LJHLWszWHgwX6e4GeBYPcrgv7hKFqKtOwhzW8Y9wXOwDcih6RLsWOPw0AJPkWt3RApy07RkARahvc9YHbv45ehPWhYUze41RaFroDEOfim8WgXes0vNGEkmJ3vHax6Lr0YhUE1SrsQwAZRmgvlhYkZWZ4eShRGBWlniTBYfAWOHEaX
```

拆解入参的数字103 ，103 = **2**\*43 + **17**，对应长串的索引 a X

④长串 SO781baBZHkzNgLF5mAtUG6qMXPQo0pc349fnTlhDds是由入参两个长串（这两个长串后续分析）经匿名函数2生成，此处分析长，**分析****匿名函数2的实现逻辑**

[Python] *纯文本查看*

```
[CALL_69081] 调用函数 ==> [anonymous]
[CALL_69081] 参数 ==> [0FfTnpmA73BOcD5lkozh4ZaXQNb18gGSPdsUqH9M6Lt, Pctrip.com0FfTnpmA73BOcD5lkozh4ZaXQNb18gGSP]
[CALL_69081] this ==> [Window]
[CALL_69081] 结果 ==> SO781baBZHkzNgLF5mAtUG6qMXPQo0pc349fnTlhDds
```

这个匿名函数的具体实现：

[Python] *纯文本查看*

```
def shuffle_alphabet(alphabet: str, salt: str) -> str:
    """
    匿名函数 shuffle — 从 VMP 运行时闭包提取
    输入: 43字符字母表 + salt (lottery + "ctrip.com" + alphabet[:33])
    输出: 洗牌后的43字符字母表
    """
    if not salt:
        return alphabet
    chars = list(alphabet)
    v = 0
    acc = 0
    for i in range(len(chars) - 1, 0, -1):
        v %= len(salt)
        integer = ord(salt[v])
        acc += integer
        j = (integer + v + acc) % i
        chars[j], chars[i] = chars[i], chars[j]
        v += 1
    return "".join(chars)

if __name__ == "__main__":
    # 验证 CALL_69081 的输入输出
    alphabet = "0FfTnpmA73BOcD5lkozh4ZaXQNb18gGSPdsUqH9M6Lt"
    salt = "Pctrip.com0FfTnpmA73BOcD5lkozh4ZaXQNb18gGSP"

    result = shuffle_alphabet(alphabet, salt)
    print(f"result:   {result}")
```

⑤ 继续往上分析，这个 0FfTnpmA73BOcD5lkozh4ZaXQNb18gGSPdsUqH9M6Lt 和 salt：Pctrip.com0FfTnpmA73BOcD5lkozh4ZaXQNb18gGSP是怎么来的

[Python] *纯文本查看*

```
[CALL_69080] 调用函数 ==> bound call
[CALL_69080] 参数 ==> [Pctrip.com0FfTnpmA73BOcD5lkozh4ZaXQNb18gGSPdsUqH9M6Lt, 0, 43]
[CALL_69080] this ==> [Window]
[CALL_69080] 结果 ==> Pctrip.com0FfTnpmA73BOcD5lkozh4ZaXQNb18gGSP
```

salt是由 **P** + **ctrip.com** + **0FfTnpmA73BOcD5lkozh4ZaXQNb18gGSPdsUqH9M6Lt** ，然后截取前43位长度得到的。
即 **salt= lottery + "ctrip.com" + alphabet[:33]** (共43字符)

1.lottery 的由来，其中涉及到 **fingerprint**指纹长串，这个稍后会分析其生成。

[Python] *纯文本查看*

```
    # initial_alphabet 即 INITIAL_ALPHABET为 固定字符 S9mHXtfaMsZ6DNkgTnL5F0dzpb1lPAocQ8BGh47UqO3
    # Step 1: 计算种子
    seed = 0
    for i, ch in enumerate(fingerprint):
        seed += ord(ch) % (i + 100)

    # Step 2: 选取lottery
    lottery = initial_alphabet[seed % BASE]
```

2."ctrip.com"固定字符
3. alphabet 是由第一个固定长串S9mHXtfaMsZ6DNkgTnL5F0dzpb1lPAocQ8BGh47UqO3 链式生成后续的所有alphabet
![](https://i.postimg.cc/fWvtJJ5X/9ab46b373e91124b331e45f0fb914ed5.png)
⑥ 解决④和⑤中涉及的**整数大数组**和**fingerprint**指纹长串
1. 提前说结论 **fingerprint --**生成**-->****整数大数组**
2.先从日志中找大数组的痕迹
数组的最后两位，即 52 103，即上述的两个举例
![](https://i.postimg.cc/9f6BLrqT/05fa76279aa739161ffa2d5ec91393b7.png)

3. 找到把 52 103 两个整数push进数组的日志位置
![](https://i.postimg.cc/htbgDdKt/650811c76f2c5f0a1b2138c37be29fed.png)

![](https://i.postimg.cc/50GW75Sk/1e5fed89d312f339f3f729f9f79bf3a6.png)

调用的参数长串 ~=-7bab70a07ccecbf602e712c860aeff44ev%#J4^1777972381970}TW#F8Thttps%3A%2... 即指纹长串

4.大数组的push过程
![](https://i.postimg.cc/g2SpLPL7/b906944f143f64ad632b7520b7facfa6.png)
是遍历长串每个字符，把每个字符对应的ascii码push进整形数组中

⑦指纹长串是怎么来的
先全局搜索这个指纹长串，对比发现，这个是由一段一段环境指纹拼接而来的。比如屏幕分辨率、时间戳、操作系统、字体...等 具体的参数后续分析
![](https://i.postimg.cc/GhbT02Hj/b20e6ac67a67318512d9107ff4c12847.png)

从头分析具体的参数都有什么，此处着重分析 噪声字符、魔改md5。其他参数跟着分析日志可以看出来，不过多赘述。
1. 噪声字符
![](https://i.postimg.cc/9fwY4MPd/63007bed787c5edd01082c80f804d9ba.png)
·这份日志可以看出来，指纹长串是由一段一段的指纹环境拼接而成的。
·7bab70a07ccecbf602e712c860aeff44 这个加密值前后又拼接了三个“奇怪的”字符

分析这三个奇怪字符的生成日志
![](https://i.postimg.cc/d0SQfsgm/49cbf0cbf5fed324bdab1ddb79ae750d.png)
![](https://i.postimg.cc/L4P4yMD3/3c77af3ced9e21f2c12fe59e21aff373.png)
![](https://i.postimg.cc/CLVhX668/a90099c30f6b627eff2721ffe0271b9a.png)

这三个字符都是由random以及一一系列操作得出的，同理，后续的每个环境前后包裹的奇怪字符都是由random生成的噪声字符。
噪声字符存在的意义：
·防重放。 噪声由 Math.random() 驱动，每次调用都会产生不同的随机序列。即使同一个浏览器、同一个页面、完全相同的请求体，两次调用
  signature() 也会因为噪声不同而导致指纹字符串不同 → 种子不同 → lottery 字符不同 → 整条字母表演化链完全发散 → 最终 token
  不同。服务端无法用"token 是否重复出现"来检测重放攻击
·防字段提取。 22 个字段的噪声和数据直接拼接，没有任何分隔符。以 MD5 字段为例：Xp@cb74974f828eab54011bb68d4ee0d5a8/Pr——Xp@
  是噪声，cb74974...d5a8 是 32 位 MD5 hex，/Pr 又是噪声。噪声字符的 charCode 范围与真实数据完全重叠（字母、数字、符号都在 37-130
  内），攻击者拿到指纹字符串后，无法通过字符特征判断哪里是数据边界、哪里是噪声填充。只有完整还原 VMP
  字节码中每个字段的噪声长度配置，才能精确提取出数据。
·不可见字符陷阱。 噪声公式的产出范围包含了 charCode 128-130——这些是不可见的 Unicode
  控制字符。在日志文本中它们不显示，在复制粘贴时会静默丢失。

[Python] *纯文本查看*

```
def generate_noise(length: int = 3) -> str:    """
    生成噪声字符
    公式: charCode = ceil(random() * 94) + 36  (范围 37-130)
    日志证据: ceil(0.2392*94)=23, 23+36=59, fromCharCode(59)=';'
    """
    import random
    noise = ""
    for _ in range(length):
        char_code = math.ceil(random.random() * 94) + 36
        noise += chr(char_code)
    return noise
```

2.魔改md5,第一段 7bab70a07ccecbf602e712c860aeff44 就是经过魔改md5生成的。具体请看以下日志
![](https://i.postimg.cc/QtQ8dQHy/26bc612b5f69a3928bfd25742a8b4241.png)

跟到CALL\_233 看调用，入参是由 时间戳、ua、random-uuid 传入匿名的加密函数
![](https://i.postimg.cc/y6GQ8Mzd/fb2ff34d2d6dab7f014ed83e0df0916b.png)

看匿名函数内部的日志，调用和出结果中间的日志即为匿名函数内部的日志：
**[CALL\_233] 调用函数 ==> [anonymous]           ← 进入函数**
**[CALL\_233] 参数 ==> ["1777972381970Mozi..."] ← 入参**
**[CALL\_233] this ==> [Window]**
**│**
**├── [BIN\_234] ...  ─┐**
**├── [CALL\_235] ...   │**
**├── [UNARY\_236] ...  ├── 这些都在 CALL\_233 内部**
**├── ...              │   (成千上万行)**
**├── [BIN\_99999] ... ─┘**
**│**
**[RET\_xxxxx] 返回值 ==> "7bab70a07ccecbf602..." ← 函数返回**
**[CALL\_233] 结果 ==> "7bab70a07ccecbf602..."     ← 调用者收到结果**

![](https://i.postimg.cc/ryZL1VvS/000732875a8574c281560b058b1cd0b1.png)
输出的加密值也为 32 hex

**A 寄存器被修改：+8**
**标准 MD5 A = 0x67452301 = 1732584193**
**日志中  A = 0x67452309 = 1732584201      差: +8**
**B 寄存器被修改：-2**
**标准 MD5 B = 0xEFCDAB89 = 4023233417**
**日志中  B = 0xEFCDAB87 = 4023233415      差: -2**
**C/D 寄存器未修改**
**标准 MD5 C = 0x98BADCFE = 2562383102     日志: 2562383102**
**标准 MD5 D = 0x10325476 = 271733878      日志: 271733878**
**多了一个 H4 寄存器（非标准）**
**926365489  ← 标准 MD5 只有 A/B/C/D 四个寄存器，不存在第5个**

**本地算法验证：**

[Python] *纯文本查看*

```

import struct

# 魔改MD5初始向量 (仅IV被修改, 其余与标准MD5完全一致)
MD5_IV = {
    "A": 0x67452309,  # 标准: 0x67452301 (+8)
    "B": 0xEFCDAB87,  # 标准: 0xEFCDAB89 (-2)
    "C": 0x98BADCFE,  # 标准: 未修改
    "D": 0x10325476,  # 标准: 未修改
}

# MD5 T常量 & S移位表 (标准MD5, 未修改)
MD5_T = [
    0xD76AA478, 0xE8C7B756, 0x242070DB, 0xC1BDCEEE,
    0xF57C0FAF, 0x4787C62A, 0xA8304613, 0xFD469501,
    0x698098D8, 0x8B44F7AF, 0xFFFF5BB1, 0x895CD7BE,
    0x6B901122, 0xFD987193, 0xA679438E, 0x49B40821,
    0xF61E2562, 0xC040B340, 0x265E5A51, 0xE9B6C7AA,
    0xD62F105D, 0x02441453, 0xD8A1E681, 0xE7D3FBC8,
    0x21E1CDE6, 0xC33707D6, 0xF4D50D87, 0x455A14ED,
    0xA9E3E905, 0xFCEFA3F8, 0x676F02D9, 0x8D2A4C8A,
    0xFFFA3942, 0x8771F681, 0x6D9D6122, 0xFDE5380C,
    0xA4BEEA44, 0x4BDECFA9, 0xF6BB4B60, 0xBEBFBC70,
    0x289B7EC6, 0xEAA127FA, 0xD4EF3085, 0x04881D05,
    0xD9D4D039, 0xE6DB99E5, 0x1FA27CF8, 0xC4AC5665,
    0xF4292244, 0x432AFF97, 0xAB9423A7, 0xFC93A039,
    0x655B59C3, 0x8F0CCC92, 0xFFEFF47D, 0x85845DD1,
    0x6FA87E4F, 0xFE2CE6E0, 0xA3014314, 0x4E0811A1,
    0xF7537E82, 0xBD3AF235, 0x2AD7D2BB, 0xEB86D391,
]
MD5_S = [
    7,12,17,22, 7,12,17,22, 7,12,17,22, 7,12,17,22,
    5, 9,14,20, 5, 9,14,20, 5, 9,14,20, 5, 9,14,20,
    4,11,16,23, 4,11,16,23, 4,11,16,23, 4,11,16,23,
    6,10,15,21, 6,10,15,21, 6,10,15,21, 6,10,15,21,
]

def rotl(x: int, n: int) -> int:
    """32位循环左移"""
    return ((x << n) | (x >> (32 - n))) & 0xFFFFFFFF

def md5_modified(text: str) -> bytes:
    """魔改MD5 - 仅修改了初始向量, 其余与标准MD5完全一致"""
    data = text.encode("utf-8")
    msg_len = len(data) * 8

    data += b"\x80"
    while (len(data) * 8) % 512 != 448:
        data += b"\x00"
    data += struct.pack("<Q", msg_len)

    a, b, c, d = MD5_IV["A"], MD5_IV["B"], MD5_IV["C"], MD5_IV["D"]

    for offset in range(0, len(data), 64):
        chunk = data[offset:offset + 64]
        M = list(struct.unpack("<16I", chunk))
        A, B, C, D = a, b, c, d

        for i in range(64):
            if i < 16:
                F = (B & C) | (~B & D)
                g = i
            elif i < 32:
                F = (D & B) | (~D & C)
                g = (5 * i + 1) % 16
            elif i < 48:
                F = B ^ C ^ D
                g = (3 * i + 5) % 16
            else:
                F = C ^ (B | ~D)
                g = (7 * i) % 16

            F = (F + A + MD5_T[i] + M[g]) & 0xFFFFFFFF
            A, D, C, B = D, C, B, (B + rotl(F, MD5_S[i])) & 0xFFFFFFFF

        a = (a + A) & 0xFFFFFFFF
        b = (b + B) & 0xFFFFFFFF
        c = (c + C) & 0xFFFFFFFF
        d = (d + D) & 0xFFFFFFFF

    return struct.pack("<4I", a, b, c, d)

def md5_modified_hex(text: str) -> str:
    return md5_modified(text).hex()

s = '1777972381970Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.361777866074626.2b58iqNdtAdmf405a59f-61e8-452e-9c26-ff447ba6f405'
print(md5_modified_hex(s))
```

![](https://i.postimg.cc/3xtKcXqG/b75496ed2bc0c83dcae0c54933a533cc.png)
![](https://i.postimg.cc/3w63KKYj/755125fda303f5228c12760d1daa3c46.png)

一致，验证成功

3.其他字符以及对应的环境参数

![](https://i.postimg.cc/T120C541/907b51a09b8f52609c70650feae0f2ee.png)

以上这些对应日志分析，能够逐一找到以及一些硬编码，然后用噪声字符包裹即可，不过多赘述。

---

三、“古法分析”总结

最终的大致流程
![](https://i.postimg.cc/d0ZvWLTX/95dd4c9366f6f971ee85d18a6c4a3e46.png)

**至此，以上的所有主要参数已经分析完毕，纯算代码和依赖的环境数据、日志我统一放置附件压缩包中。**

---

![](https://static.52pojie.cn/static/image/filetype/zip.gif)

[all.zip](https://www.52pojie.cn/forum.php?mod=attachment&aid=Mjg1MDA0MHxkY2UzNjc5ZnwxNzg5MDU0MTMxfDIzMjM3Mjd8MjEwNjY2Ng%3D%3D)
*(1.11 MB, 下载次数: 92)*
