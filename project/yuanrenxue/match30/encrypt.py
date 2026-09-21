# -*- coding: utf-8 -*-
"""
猿人学第 30 题 - 纯算法实现 (Pure Python)
无需任何外部依赖，无需 Wasm 运行时
"""

def rol8(val: int, shift: int) -> int:
    s = shift & 7
    return ((val << s) | (val >> (8 - s))) & 0xFF

SBOX_TABLE = [55, 169, 92, 225, 130, 77, 22, 183]

def get_table_byte(x: int) -> int:
    return SBOX_TABLE[x % 8]

def transform_byte(val: int, i: int, r: int) -> int:
    v = val ^ get_table_byte(i + r)
    v = (v + 61 + i * 23 + r * 41) & 0xFF
    v = rol8(v, i + r + 3)
    v = (v ^ ((i * 49 + r * 71) & 0xFF))
    v = (v + (i ^ r) * 19) & 0xFF
    return v

def encrypt(input_str: str, random_byte: int = 1) -> str:
    """
    100% 还原自 Wasm 内部的 encrypt 函数
    :param input_str: 拼接明文字符串，格式: f"/api/question/30{now}30(!){page}"
    :param random_byte: 默认为 1 (来自 window["рɡхDеЬսɡ"].vvv & 255)
    :return: 72 位 16 进制 token 签名
    """
    data = list(input_str.encode("utf-8"))
    length = len(data)
    out = [random_byte & 0xFF] + data

    # 预处理：按位置乘常数并异或
    for i in range(length):
        out[1 + i] ^= (i * 91 + 167) & 0xFF

    # 4 轮迭代变换与条件倒序交换
    for r in range(4):
        for i in range(length):
            out[1 + i] = transform_byte(out[1 + i], i, r)
        left = 0
        right = length - 1
        while left < right:
            if ((left + right + r) & 1) == 0:
                out[1 + left], out[1 + right] = out[1 + right], out[1 + left]
            left += 1
            right -= 1

    # 后处理：异或 random_byte
    for i in range(length):
        out[1 + i] ^= random_byte & 0xFF

    return bytes(out).hex()

def generate_token(page: int, now: str or int) -> str:
    payload = f"/api/question/30{now}30(!){page}"
    return encrypt(payload, 1)

if __name__ == "__main__":
    test_now = "1789098542320"
    test_page = 1
    expected_token = "019e0dc022fd31a49d4bd034c6e2263156acc390f4b56c6b127e6761ece375982536e09f"
    actual_token = generate_token(test_page, test_now)
    print("Input:         ", f"/api/question/30{test_now}30(!){test_page}")
    print("Expected Token:", expected_token)
    print("Actual Token:  ", actual_token)
    print("Verification:  ", "PASS" if actual_token == expected_token else "FAIL")
