# 针对wasm反CFF的尝试

> **作者**: scz | **发布时间**: 2026-05-11 17:11:00 | **版块**: 『脱壳破解区』 | **查看/回复**: 3411 / 10
> **原文**: [https://www.52pojie.cn/thread-2107193-1-1.html](https://www.52pojie.cn/thread-2107193-1-1.html)

---

```
创建: 2026-04-27 17:01
更新: 2026-05-11 16:39
```

---

```
目录:

    ☆ 背景介绍
    ☆ 准备工作
        1) wasm -> c
        2) c -> o
        3) 反编译.o
    ☆ h5_worker_cff_pub.py
        1) 整体框架
        2) 找出有效块(真实块)
        3) 找出状态变量state_var
        4) 建立有效块到有效块的映射关系
        5) 汇编级修改控制流
        6) func54_vodplay反CFF结果
    ☆ AI反CFF
    ☆ 后记
```

☆ 背景介绍

参看

《WEB前端逆向TS PES NALU解密》

```
https://www.52pojie.cn/thread-1957747-1-1.html
https://scz.617.cn/web/202408231518.txt
```

文中提及h5.worker.wasm，某些解密算法在wasm中实现。逆向工程发现，该wasm用Emscripten开发所得，且被实施过"控制流平坦化"，比如func54\_vodplay。

想反CFF，再理解func54\_vodplay的逻辑。这是两年前搞wasm逆向工程时冒出来的想法，当时没有这方面经验，未展开，只在Chrome F12中动态调试过该函数。

据说Angr可直接模拟执行wasm，但不如模拟执行ELF成熟，未求证，未实践。

有种变通方案，用wasm2c得到.c，编译出.o，用Angr模拟执行.o，对.o反CFF。

☆ 准备工作

1) wasm -> c

wasm2c -o h5\_worker.c h5.worker.wasm

上述命令可得到h5\_worker.c、h5\_worker.h。比较wasm2c 1.0.34与1.0.36的输出，有差别，但单就所关心的w2c\_h50x2Eworker\_0x5Fvodplay\_0()，完全一样。

2) c -> o

将h5\_worker.c编译成h5\_worker\_pub.o。

3) 反编译.o

用IDA或Ghidra分析h5\_worker\_pub.o。一般来说，从.c到.o，再反汇编、反编译，不会提供增益信息，相反，可能损失信息。当初这么干，主要是为借助IDA的符号改名、交叉引用、Findcrypt或Signsrch插件，正是这样注意到TEA算法。

```
wasm-objdump -j Export -x h5.worker.wasm | less
```

查看wasm导出表，对h5\_worker.c/h5\_worker\_pub.o中若干函数进行简化表述

```
func54_vodplay      w2c_h50x2Eworker_0x5Fvodplay_0
func121_malloc      w2c_h50x2Eworker_f121
func123_memcpy      w2c_h50x2Eworker_0x5Fmemcpy_0
func30              w2c_h50x2Eworker_f30
func120_free        w2c_h50x2Eworker_0x5Ffree_0
func77              w2c_h50x2Eworker_f77
func52              w2c_h50x2Eworker_f52
func125_memset      w2c_h50x2Eworker_0x5Fmemset_0
func60_TEA          w2c_h50x2Eworker_f60
func59              w2c_h50x2Eworker_f59
func58_TEA          w2c_h50x2Eworker_f58
func40              w2c_h50x2Eworker_f40
func114             w2c_h50x2Eworker_f114
```

在IDA中F5查看func54\_vodplay，伪代码约1925行，大量嵌套的while、if以及状态变量，表明其被实施过"控制流平坦化"。

完整测试用例

```
https://scz.617.cn/web/202604271701.txt
https://scz.617.cn/web/202604271701.7z
```

☆ h5\_worker\_cff\_pub.py

```
#!/usr/bin/env python
# -*- coding: cp936 -*-

#
# h5_worker_cff_pub.py
#

import logging
import collections
import ida_funcs, ida_gdl, ida_ua, ida_bytes, ida_lines, ida_idp
import ida_idaapi, ida_kernwin, ida_graph, idautils, idc, ida_nalt
import ida_xref, ida_allins
import keystone
import angr, claripy

def get_block_from_ea ( ea ) :
    f       = ida_funcs.get_func( ea )
    if not f :
        assert False
    blocks  = ida_gdl.FlowChart( f )
    for block in blocks :
        if block.start_ea <= ea < block.end_ea :
            return block
    assert False

def set_block_color ( ea, bg_color=0xffcc33 ) :
    block       = get_block_from_ea( ea )
    f           = ida_funcs.get_func( block.start_ea )
    if not f :
        assert False
    node_info   = ida_graph.node_info_t()
    node_info.bg_color \
                = bg_color
    ida_graph.set_node_info( f.start_ea, block.id, node_info, ida_graph.NIF_BG_COLOR )

def set_insn_color ( ea, color=0x00ffff ):
    ida_nalt.set_item_color( ea, color )

def get_dispatchers ( addr ) :
    dispatchers = set()
    queue       = collections.deque()
    block       = get_block_from_ea( addr )
    queue.append( ( block, [] ) )
    while len( queue ) > 0 :
        block, path = queue.popleft()
        if block.start_ea in path :
            dispatchers.add( block.start_ea )
            continue
        path    = path + [block.start_ea]
        queue.extend( ( succ, path ) for succ in block.succs() )
    dispatchers = list( dispatchers )
    dispatchers.sort()
    return dispatchers

def get_ret_block ( addr ) :
    f       = ida_funcs.get_func( addr )
    if not f :
        assert False
    blocks  = ida_gdl.FlowChart( f )
    for block in blocks :
        last_insn   = ida_bytes.prev_head( block.end_ea, block.start_ea )
        if last_insn == ida_idaapi.BADADDR :
            continue
        insn = ida_ua.insn_t()
        if ida_ua.decode_insn( insn, last_insn ) == 0 :
            continue
        if ida_idp.is_ret_insn( insn ) :
            return block.start_ea
    return None

def is_block_0 ( block ) :
    block_size  = block.end_ea - block.start_ea
    if block_size == 0x52 :
        return False
    if block_size < 0x31 :
        return False
    heads       = list( idautils.Heads( block.start_ea, block.end_ea ) )
    if len( heads ) < 2 :
        return False
    ea_last     = heads[-1]
    ea_prev     = heads[-2]
    insn_last   = ida_ua.insn_t()
    if ida_ua.decode_insn( insn_last, ea_last ) <= 0 :
        return False
    if insn_last.itype != ida_allins.NN_jmp :
        return False
    insn_prev   = ida_ua.insn_t()
    if ida_ua.decode_insn( insn_prev, ea_prev ) <= 0 :
        return False
    if not ida_idp.is_call_insn( insn_prev ) :
        return False
    target_ea   = ida_idaapi.BADADDR
    op          = insn_prev.ops[0]
    if op.type in [ida_ua.o_near, ida_ua.o_far] :
        target_ea = op.addr
    if target_ea == ida_idaapi.BADADDR :
        target_ea   = ida_xref.get_first_fcref_from( ea_prev )
    if target_ea != ida_idaapi.BADADDR :
        name    = ida_name.get_name(target_ea)
        if name :
            clean_name  = name.lstrip( '_.' ).split( '@' )[0]
            if clean_name == "i32_store" :
                return True
    return False

def is_block_1 ( block ) :
    heads       = list( idautils.Heads( block.start_ea, block.end_ea ) )
    if len( heads ) < 3 :
        return False
    ea_last     = heads[-1]
    ea_prev     = heads[-2]
    if ida_bytes.get_bytes( ea_last, 2 ) != b'\x74\x05' :
        return False
    insn_prev   = ida_ua.insn_t()
    if ida_ua.decode_insn( insn_prev, ea_prev ) <= 0 :
        return False
    if insn_prev.itype != ida_allins.NN_cmp :
        return False
    op0         = insn_prev.ops[0]
    op1         = insn_prev.ops[1]
    if op1.type != ida_ua.o_imm or op1.value != 0 :
        return False
    if op0.type not in ( ida_ua.o_displ, ida_ua.o_phrase ) :
        return False
    if op0.addr not in (-0x3c, -60, 0xc4, 0xffffffc4, 0xffffffffffffffc4) :
        return False
    for ea in reversed( heads[:-2] ) :
        insn    = ida_ua.insn_t()
        if ida_ua.decode_insn( insn, ea ) <= 0 :
            continue
        if ida_idp.is_call_insn( insn ) :
            target_ea   = ida_idaapi.BADADDR
            op          = insn.ops[0]
            if op.type in [ida_ua.o_near, ida_ua.o_far] :
                target_ea   = op.addr
            if target_ea == ida_idaapi.BADADDR :
                target_ea   = ida_xref.get_first_fcref_from( ea )
            if target_ea != ida_idaapi.BADADDR :
                name    = ida_name.get_name( target_ea )
                if name :
                    clean_name  = name.lstrip( '_.' ).split( '@' )[0]
                    if clean_name.startswith( ( "i32_load", "i64_load" ) ) :
                        return True
            return False
    return False

def get_real_block ( func_ea ) :
    f       = ida_funcs.get_func( func_ea )
    if not f :
        assert False
    dispatchers \
            = get_dispatchers( func_ea )
    print( f"dispatchers[{len(dispatchers)}]:" )
    for i, dispatcher in enumerate( dispatchers ) :
        print( f"[{i}] {dispatcher:#x}" )
        set_block_color( dispatcher, 0xff00ff )
    real_block_list \
            = [func_ea, 0xbfe7a]
    blocks  = ida_gdl.FlowChart( f )
    for block in blocks :
        if block.start_ea in dispatchers :
            continue
        if is_block_0( block ) :
            real_block_list.append( block.start_ea )
        elif is_block_1( block ) :
            real_block_list.append( block.start_ea )
    real_block_list.sort()
    ret_block_ea \
            = get_ret_block( func_ea )
    assert ret_block_ea is not None
    real_block_list.append( ret_block_ea )
    print( [hex(x) for x in real_block_list] )
    print( f"real_block_list[{len(real_block_list)}]:" )
    for i, ea in enumerate( real_block_list ) :
        set_block_color( ea )
        print( f"[{i}] {ea:#x}" )
    return real_block_list

def get_info_from_jz_angr ( state ) :
    block   = state.project.factory.block( state.addr, num_inst=1 )
    target_false \
            = state.addr + block.size
    target_true \
            = None
    for target in block.vex.constant_jump_targets :
        if target != target_false :
            target_true = target
            break
    if target_true is None :
        assert False
    return ( target_true, target_false )

def find_jz_succ ( proj, base_addr, init_state, target, real_block_list, real_block_ea, flow, debug_ea, debug_path, log ) :
    init_state_copy \
            = init_state.copy()
    if debug_ea is not None :
        debug_path[debug_ea].append( 'find_jz_succ' )
        # ea  = init_state_copy.addr - base_addr
        # debug_path[debug_ea].append( hex(ea) )
        if log :
            print( 'find_jz_succ' )
    init_state_copy.regs.rip \
            = target
    sm      = proj.factory.simulation_manager( init_state_copy )
    sm.step( num_inst=1 )
    state   = sm.active[0]
    i       = -1
    while len( sm.active ) > 0 :
        for state in sm.active :
            i   = i + 1
            ea  = state.addr - base_addr
            if debug_ea is not None :
                debug_path[debug_ea].append( f"{i} {ea:#x}" )
                if log :
                    print( f"{i} {ea:#x}" )
            if ea in real_block_list :
                if debug_ea is not None :
                    debug_path[debug_ea].append( 'find_jz_succ 1' )
                    if log :
                        print( 'find_jz_succ 1' )
                succs   = flow[real_block_ea]
                if ea not in succs :
                    succs.append( ea )
                return ea
        sm.step( num_inst=1 )
    return None

def find_cycle_ex ( sequence, min_occurrences=16 ) :
    n   = len( sequence )
    for i in range( n ) :
        for j in range( i+1, n ) :
            if sequence[j] == sequence[i] :
                cycle_len   = j - i
                if sequence[i:i+cycle_len] == sequence[j:j+cycle_len] :
                    occurrences = 2
                    next_start  = j + cycle_len
                    while (
                        next_start + cycle_len <= n and
                        sequence[next_start:next_start+cycle_len] == sequence[i:i+cycle_len]
                    ) :
                        occurrences    += 1
                        next_start     += cycle_len
                    if occurrences >= min_occurrences :
                        cycle   = sequence[i:i+cycle_len]
                        return cycle
    return None

def remove_cycle_ex ( sequence, min_occurrences=16 ) :
    n   = len( sequence )
    for i in range( n ) :
        for j in range( i+1, n ) :
            if sequence[j] == sequence[i] :
                cycle_len   = j - i
                if sequence[i:i+cycle_len] == sequence[j:j+cycle_len] :
                    occurrences = 2
                    next_start  = j + cycle_len
                    while (
                        next_start + cycle_len <= n and
                        sequence[next_start:next_start+cycle_len] == sequence[i:i+cycle_len]
                    ) :
                        occurrences    += 1
                        next_start     += cycle_len
                    if occurrences >= min_occurrences :
                        clean   = sequence[:i]
                        return clean
    return sequence[:]

def find_next_block ( proj, base_addr, init_state, real_block_ea, real_block_list, flow, debug_ea, debug_path, log ) :
    init_state_copy = init_state.copy()
    if debug_ea is not None :
        debug_path[debug_ea].append( 'find_next_block' )
        # ea  = init_state_copy.addr - base_addr
        # debug_path[debug_ea].append( hex(ea) )
        if log :
            print( 'find_next_block' )
    sm              = proj.factory.simulation_manager( init_state_copy )
    i               = -1
    while len( sm.active ) > 0 :
        for state in sm.active :
            i   = i + 1
            ea  = state.addr - base_addr
            if debug_ea is not None :
                debug_path[debug_ea].append( f"{i} {ea:#x}" )
                if log :
                    print( f"{i} {ea:#x}" )
            if ea == real_block_ea :
                if debug_ea is not None :
                    debug_path[debug_ea].append( 'find_next_block 1' )
                    if log :
                        print( 'find_next_block 1' )
                block   = get_block_from_ea( ea )
                heads   = list( idautils.Heads( block.start_ea, block.end_ea ) )
                if len( heads ) < 2 :
                    assert False
                ea_last = heads[-1]

                init_state_2 \
                        = state.copy()
                sm_2    = proj.factory.simulation_manager( init_state_2 )
                sm_2.step( num_inst=1 )
                internal_path \
                        = []
                j       = -1
                while len( sm_2.active ) > 0 :
                    for state_2 in sm_2.active :
                        j       = j + 1
                        ea_2    = state_2.addr - base_addr
                        if debug_ea is not None :
                            debug_path[debug_ea].append( f"{i} {j} {ea_2:#x}" )
                            if log :
                                print( f"{i} {j} {ea_2:#x}" )
                        internal_path.append( ea_2 )
                        if ea_2 in real_block_list :
                            if debug_ea is not None :
                                debug_path[debug_ea].append( 'find_next_block 2' )
                                if log :
                                    print( 'find_next_block 2' )
                            print( f"[0] ea_2={ea_2:#x}" )
                            succs   = flow[real_block_ea]
                            if len( sm_2.active ) > 1 :
                                next_array  = []
                                for state_3 in sm_2.active :
                                    ea_3    = state_3.addr - base_addr
                                    if ea_3 in real_block_list and ea_3 not in succs :
                                        next_array.append( ea_3 )
                                if len( next_array ) > 1 :
                                    print( "next_array", [hex(t) for t in next_array] )
                                    assert False
                            if ea_2 not in succs :
                                succs.append( ea_2 )
                            print( f"B {real_block_ea:#x} -> {ea_2:#x}" )
                            return
                        if ea_2 != ea_last :
                            continue
                        insn    = state_2.block().capstone.insns[0]
                        if insn.mnemonic == "je" :
                            if debug_ea is not None :
                                debug_path[debug_ea].append( 'find_next_block 3' )
                                if log :
                                    print( 'find_next_block 3' )
                            print( f"[1] ea_2={ea_2:#x}" )
                            target_true, target_false \
                                        = get_info_from_jz_angr( state_2 )
                            state_true  = state_2.copy()
                            state_true_succ \
                                        = find_jz_succ( proj, base_addr, state_true, target_true, real_block_list, real_block_ea, flow, debug_ea, debug_path, log )
                            state_false = state_2.copy()
                            state_false_succ \
                                        = find_jz_succ( proj, base_addr, state_false, target_false, real_block_list, real_block_ea, flow, debug_ea, debug_path, log )
                            if state_true_succ is None or state_false_succ is None :
                                print( f"jz {ea_2:#x} {state_true_succ} {state_true_false}" )
                                assert False
                            print( f"jz {real_block_ea:#x} -> {state_true_succ:#x}, {state_false_succ:#x}" )
                            return
                    cycle   = find_cycle_ex( internal_path, min_occurrences=8 )
                    if cycle :
                        for item in cycle :
                            sm_2.move(
                                from_stash='active',
                                to_stash='deadended',
                                filter_func=lambda s: s.addr - base_addr == item
                            )
                        internal_path   = remove_cycle_ex( internal_path, min_occurrences=8 )
                    sm_2.step( num_inst=1 )
                return
        sm.step( num_inst=1 )

def get_state ( proj, base_addr, init_state, real_block_ea, debug_ea, debug_path, log ) :
    init_state_copy = init_state.copy()
    if debug_ea is not None :
        debug_path[debug_ea].append( 'get_state' )
        # ea  = init_state.addr - base_addr
        # debug_path[debug_ea].append( hex(ea) )
        if log :
            print( 'get_state' )
    sm              = proj.factory.simulation_manager( init_state_copy )
    i               = -1
    while len( sm.active ) > 0 :
        for state in sm.active :
            i   = i + 1
            ea  = state.addr - base_addr
            if debug_ea is not None :
                debug_path[debug_ea].append( f"{i} {ea:#x}" )
                if log :
                    print( f"{i} {ea:#x}" )
            if ea == real_block_ea :
                debug_path[debug_ea].append( 'get_state 1' )
                if log :
                    print( 'get_state 1' )
                return state.copy()
        sm.step( num_inst=1 )
    assert False
    return None

def find_call ( func_ea ) :
    hook_addrs  = set()
    ihelp_calls = collections.defaultdict( list )
    f           = ida_funcs.get_func( func_ea )
    if not f :
        assert False

    for ea in idautils.FuncItems( func_ea ) :
        insn    = ida_ua.insn_t()
        if ida_ua.decode_insn( insn, ea ) > 0 and ida_idp.is_call_insn( insn ) :
            target_ea   = ida_idaapi.BADADDR
            op          = insn.ops[0]
            if op.type in [ida_ua.o_near, ida_ua.o_far]:
                target_ea = op.addr
            if target_ea == ida_idaapi.BADADDR :
                target_ea = ida_xref.get_first_fcref_from( ea )
            is_ihelp    = False
            if target_ea != ida_idaapi.BADADDR :
                name    = ida_name.get_name( target_ea )
                if name :
                    clean_name  = name.lstrip( '_.' )
                    if clean_name.startswith( ( "i32_", "i64_" ) ) :
                        ihelp_calls[clean_name].append( ea )
                        is_ihelp    = True
            if not is_ihelp :
                hook_addrs.add( ea )
    return hook_addrs, dict( ihelp_calls )

def get_flow ( real_block_list, func_ea, file_path ) :

    logging.getLogger( 'angr' ).setLevel( logging.ERROR )
    logging.getLogger( 'angr.project' ).setLevel( logging.ERROR )
    logging.getLogger( 'angr.sim_manager' ).setLevel( logging.ERROR )
    logging.getLogger( 'angr.engines.successors' ).setLevel( logging.ERROR )
    logging.getLogger( 'cle.loader' ).setLevel( logging.ERROR )
    logging.getLogger( 'cle.backends.externs' ).setLevel( logging.ERROR )
    logging.getLogger( 'cle.backends.elf.elf' ).setLevel( logging.ERROR )

    proj        = angr.Project(
        file_path,
        load_options    = {
            'auto_load_libs'    : False,
            'main_opts'         : {
                'base_addr' : 0x400000
            }
        }
    )
    base_addr   = proj.loader.min_addr
    print( f"base_addr={base_addr:#x}" )
    init_state  = proj.factory.blank_state(
        addr            = base_addr + func_ea,
        add_options     = {
            angr.options.SYMBOL_FILL_UNCONSTRAINED_MEMORY,
            angr.options.SYMBOL_FILL_UNCONSTRAINED_REGISTERS,
            angr.options.BYPASS_UNSUPPORTED_SYSCALL,
        },
        remove_options  = {
            angr.options.LAZY_SOLVES,
        }
    )

    FAKE_INSTANCE_ADDR  = 0x60000000
    WASM_G2_BASE        = 0x70000000
    WASM_MEM_BASE       = 0x80000000

    init_state.regs.rdi = FAKE_INSTANCE_ADDR
    init_state.memory.store(
        FAKE_INSTANCE_ADDR+0x18,
        claripy.BVV( WASM_MEM_BASE, 64 ),
        endness='Iend_LE'
    )
    init_state.memory.store(
        FAKE_INSTANCE_ADDR+0x28,
        claripy.BVV( WASM_G2_BASE, 32 ),
        endness='Iend_LE'
    )
    init_state.regs.rsp = 0x7fffffff0000
    init_state.regs.rbp = 0x7fffffff0000

    flow        = {key: [] for key in real_block_list}
    ret_block_ea \
                = real_block_list[len(real_block_list)-1]
    prologue_block \
                = get_block_from_ea( func_ea )
    prologue_block_last_insn_ea \
                = ida_bytes.prev_head( prologue_block.end_ea, prologue_block.start_ea )
    print( f"prologue_block_last_insn : {prologue_block_last_insn_ea:#x}" )
    assert prologue_block_last_insn_ea != ida_idaapi.BADADDR
    prologue_state_dict \
                = {}

    def retn_procedure ( state ) :
        return

    hook_addrs, ihelp_calls \
                = find_call( func_ea )
    print( f"Normal calls to hook [{len(hook_addrs)}]" )
    print( [hex(x) for x in sorted( hook_addrs )] )
    print( f"ihelp_* functions [{len(ihelp_calls)}]" )
    for func_name in sorted( ihelp_calls.keys() ) :
        addrs   = ihelp_calls[func_name]
        count   = len( addrs )
        haddrs  = [hex(a) for a in sorted(addrs)]
        print( f"{func_name} [{count}]: {', '.join( haddrs ) }" )

    for addr in hook_addrs :
        proj.hook( base_addr+addr, retn_procedure, length=5 )

    class i32_load ( angr.SimProcedure ) :
        def run ( self, mem_ptr, addr ) :
            return self.state.memory.load( WASM_MEM_BASE+addr, size=4, endness='Iend_LE' )

    class i32_load8_s ( angr.SimProcedure ) :
        def run ( self, mem_ptr, addr ) :
            val = self.state.memory.load( WASM_MEM_BASE+addr, size=1 )
            return val.sign_extend( 24 )

    class i32_load8_u ( angr.SimProcedure ) :
        def run ( self, mem_ptr, addr ) :
            val = self.state.memory.load( WASM_MEM_BASE+addr, size=1 )
            return val.zero_extend( 24 )

    class i64_load ( angr.SimProcedure ) :
        def run ( self, mem_ptr, addr ) :
            return self.state.memory.load( WASM_MEM_BASE+addr, size=8, endness='Iend_LE' )

    class i32_store ( angr.SimProcedure ) :
        def run ( self, mem_ptr, addr, value ) :
            self.state.memory.store( WASM_MEM_BASE+addr, value, size=4, endness='Iend_LE' )
            return

    class i32_store8 ( angr.SimProcedure ) :
        def run ( self, mem_ptr, addr, value ) :
            self.state.memory.store( WASM_MEM_BASE+addr, value, size=1 )
            return

    class i64_store ( angr.SimProcedure ) :
        def run ( self, mem_ptr, addr, value ) :
            self.state.memory.store( WASM_MEM_BASE+addr, value, size=8, endness='Iend_LE' )
            return

    proc_map    = {
        'i32_load': i32_load,
        'i32_load8_s': i32_load8_s,
        'i32_load8_u': i32_load8_u,
        'i32_store': i32_store,
        'i32_store8': i32_store8,
        'i64_load': i64_load,
        'i64_store': i64_store
    }

    for func_name, call_addrs in ihelp_calls.items() :
        if func_name in proc_map :
            target_ea   = ida_name.get_name_ea( ida_idaapi.BADADDR, func_name )
            if target_ea == ida_idaapi.BADADDR :
                target_ea   = ida_name.get_name_ea( ida_idaapi.BADADDR, "_"+func_name )
            if target_ea != ida_idaapi.BADADDR :
                proj.hook( base_addr+target_ea, proc_map[func_name]() )
            else :
                assert False

    for real_block_ea in real_block_list :
        if ret_block_ea == real_block_ea :
            continue
        init_state_2    = init_state.copy()
        print( f"Finding {real_block_ea:#x} -> ..." )

        debug_path      = {}
        debug_ea        = None
        debug_path[debug_ea] \
                        = []
        log             = False

        if real_block_ea != func_ea :
            if prologue_block_last_insn_ea not in prologue_state_dict :
                prologue_state_dict[prologue_block_last_insn_ea] \
                    = get_state( proj, base_addr, init_state_2, prologue_block_last_insn_ea, debug_ea, debug_path, log )
            init_state_2    = prologue_state_dict[prologue_block_last_insn_ea]
            init_state_2.regs.pc \
                            = base_addr + real_block_ea
        find_next_block( proj, base_addr, init_state_2, real_block_ea, real_block_list, flow, debug_ea, debug_path, log )
        if debug_ea is not None :
            print( hex(debug_ea), debug_path[debug_ea] )

    flow_dict   = {
        hex(key): [hex(value) for value in values]
        for key, values in flow.items()
    }
    print( flow_dict )
    print( f"flow_dict[{len(flow_dict)}]:" )
    for i, ( key, value ) in enumerate( flow_dict.items() ) :
        print( f"[{i}] {key} -> {value}" )
    return flow_dict

def patch_flow ( ks, flow_dict ) :
    for i, ( real_block_ea, succs ) in enumerate( flow_dict.items() ) :
        if len( succs ) == 0 :
            continue
        block       = get_block_from_ea( int( real_block_ea, 0 ) )
        last_insn   = ida_bytes.prev_head( block.end_ea, block.start_ea )
        if len( succs ) == 2 :
            if ida_ua.ua_mnem( last_insn ) != "jz" :
                assert False
            print( f"[{i}] [0] patch_flow {real_block_ea} : {last_insn:#x} {block.end_ea:#x}" )
            buf, count \
                    = ks.asm( f'jz {succs[0]}', last_insn )
            ida_bytes.patch_bytes( last_insn, bytes( buf ) )
            set_insn_color( last_insn )
            print( f"Patch Block {last_insn:#x} -> {succs[0]}" )
            jz_size = len( bytes( buf ) )
            # assert jz_size <= 6
            ida_bytes.del_items( last_insn, ida_bytes.DELIT_SIMPLE, jz_size )
            ida_ua.create_insn( last_insn )
            next_insn \
                    = last_insn + jz_size
            buf2, count2 \
                    = ks.asm( f'jmp {succs[1]}', next_insn )
            ida_bytes.patch_bytes( next_insn, bytes( buf2 ) )
            set_insn_color( next_insn )
            print( f"Patch Block {next_insn:#x} -> {succs[1]}" )
            jmp_size \
                    = len( bytes( buf2 ) )
            ida_bytes.del_items( next_insn, ida_bytes.DELIT_SIMPLE, jmp_size )
            ida_ua.create_insn( next_insn )
        else :
            print( f"[{i}] [2] patch_flow {real_block_ea} : {last_insn:#x}" )
            buf, count  = ks.asm( f'jmp {succs[0]}', last_insn )
            ida_bytes.patch_bytes( last_insn, bytes( buf ) )
            set_insn_color( last_insn )
            print( f"Patch Block {last_insn:#x} -> {succs[0]}" )
            jmp_size    = len( bytes( buf ) )
            ida_bytes.del_items( last_insn, ida_bytes.DELIT_SIMPLE, jmp_size )
            ida_ua.create_insn( last_insn )

def main ( func_ea ) :
    file_path   = ida_nalt.get_input_file_path()
    real_block_list \
                = get_real_block( func_ea )
    flow_dict   = get_flow( real_block_list, func_ea, file_path )
    ks          = keystone.Ks( keystone.KS_ARCH_X86, keystone.KS_MODE_LITTLE_ENDIAN | keystone.KS_MODE_64 )
    patch_flow( ks, flow_dict )

if "__main__" == __name__ :
    main( 0xbdcb7 )
```

1) 整体框架

反CFF的一般流程是

```
a. 找出有效块(真实块)
b. 找出状态变量state_var
c. 建立有效块到有效块的映射关系
d. 修改控制流
```

2) 找出有效块(真实块)

PoC只针对func54\_vodplay，偷懒了，未实现通用算法，只是一种针对性经验算法。处理其他函数的CFF时，需修改get\_real\_block。

is\_block\_0在块尾部找如下模板

```
call i32_store
jmp
```

假设有效块干完活都会设置新的状态常量。对块大小作了些过滤，滤掉某些虚假有效块。

is\_block\_1在块尾部找如下模板

```
call i32_load / i64_load
...
cmp
jz
```

这种有效块对应cmov、csel情形。h5\_worker\_pub.o中没有这种指令，已将它们拆成is\_block\_1所处理的模板形式。将来Angr模拟执行寻找块映射关系时，对此情形要特殊处理。

反CFF时如何定义有效块，有不同看法。我将绝大多数不对应while、if的块算作有效块，其中一些可能只设置了状态变量就跳转，并未真正干活，但仍视之为有效块。这样做的好处，一是降低因漏报有效块而丢失有效代码的概率，二是不必对块进行太多指令分析。假设非要找出真正干活的块，势必对块进行大量分析，容错性不足。

3) 找出状态变量state\_var

本例的.py实现不涉及这点，但找出状态变量，有助于将来清理反CFF结果。F5查看反编译得到的伪代码，有大量代码形如

```
i32_store(instance->w2c_env_memory, state_var_addr_v77, 0xE9102B37)
```

这是在设置状态变量。反CFF后这种代码没有意义，可用grep批量移除，不费事。

4) 建立有效块到有效块的映射关系

get\_flow进行Angr模拟执行，寻找每个有效块的下一跳(有效块)。

func54\_vodplay中有大量call指令，用find*call找出它们，但分了两种情况。一种目标函数是i32**、i64\_*，比如

```
i32_load
i32_load8_s
i32_load8_u
i32_store
i32_store8
i64_load
i64_store
```

这种我称之为ihelp函数。另一种目标函数是非ihelp函数。

ihelp函数在访问wasm平坦内存memory。本例的状态变量不是寄存器，而是memory中的内存变量。

非ihelp函数涉及真正的功能，比如"TS PES NALU解密"。

找出这些call后，对ihelp函数进行angr.SimProcedure重载，自己模拟对memory的读写。这步或许有其他选择，比如初始化instance->w2c\_env\_memory，让Angr引擎直接模拟。我不想分析instance结构定义，故未采用后一方案。

对非ihelp函数则全部hook到空函数retn\_procedure，减少"路径爆炸"的可能。

因为我要精细化hook，所以创建init\_state时，未指定angr.options.CALLLESS。否则ihelp函数也被NOP化，将导致模拟执行时无法跟踪CFF状态变量，无法获取有效块到有效块的映射关系。

get\_flow严重依赖get\_real\_block，若get\_real\_block未获取全部有效块，或混入虚假有效块，都将导致get\_flow结果偏离预期，进而使得patch\_flow结果偏离预期。若反CFF结果不佳，优先检查get\_real\_block。

5) 汇编级修改控制流

h5\_worker\_cff\_pub.py只演示了汇编级Patch，将有效块们串起来。汇编级Patch可能遭遇"没有足够安全空间用于Patch"，事实上py就碰上了。比如0xbe129处的mov被改成jmp，而这个mov在为某地址变量赋值，后续会用到；mov变jmp后，相当于那个地址变量丢失。尽管如此，整体反CFF结果还可以，有助于理解函数逻辑。

对于x64架构，在IDA数据库中只修改指令字节流，不够，需要脚本完成c操作，否则F5结果很可能不符预期。

IDA微码级Patch天然解决"没有足够安全空间用于Patch"的问题，当然，微码级Patch存在其他劣势。没有完美的Patch方案。

6) func54\_vodplay反CFF结果

```
/*
 * grep -v "instance->w2c_env_memory, state_var_addr_v77"
 */
u32 __cdecl func54_vodplay(w2c_h50x2Eworker *instance, u32 var_p0, u32 var_p1, u32 var_p2)
{
    /*
     * 本例中这是wasm的栈指针SP
     */
    w2c_g2 = instance->w2c_g2;
    /*
     * 在栈上分配96字节的局部变量空间
     */
    instance->w2c_g2 = w2c_g2 + 96;
    /*
     * 在栈上具体分配若干局部变量
     */
    v69 = w2c_g2 + 24;
    v74 = w2c_g2 + 68;
    v70 = w2c_g2 + 64;
    v65 = w2c_g2 + 16;
    v75 = w2c_g2 + 60;
    v76 = w2c_g2 + 56;
    v77 = w2c_g2 + 82;
    v67 = w2c_g2 + 52;
    v78 = w2c_g2 + 81;
    v68 = w2c_g2 + 8;
    v79 = w2c_g2 + 80;
    v80 = w2c_g2 + 79;
    v66 = w2c_g2 + 78;
    v81 = w2c_g2 + 77;
    v82 = w2c_g2 + 76;
    v83 = w2c_g2 + 75;
    v84 = w2c_g2 + 74;
    v64 = w2c_g2 + 48;
    i32_store8(instance->w2c_env_memory, w2c_g2 + 72, 1u);
    i32_store8(instance->w2c_env_memory, w2c_g2 + 73, 1u);
    /*
     * 状态变量
     */
    state_var_addr_v77 = w2c_g2 + 44;
    /*
     * 初始化状态变量
     */
    i32_store(instance->w2c_env_memory, w2c_g2 + 44, 0x5CA0809Fu);
    v71 = w2c_g2 + 40;
    v93 = i32_load8_s(instance->w2c_env_memory, w2c_g2 + 72) & 1;
    v47 = i32_load8_s(instance->w2c_env_memory, w2c_g2 + 73);
    if ( !(v47 & 1 | v93) )
        ;
    v61 = instance->w2c_g2;
    instance->w2c_g2 = v61 + 32;
    /*
     * v64保存某个SP副本
     */
    i32_store(instance->w2c_env_memory, v64, v61);
    i32_store8(instance->w2c_env_memory, v84, var_p2 - 1 < 0x3FF);
    if ( (i32_load8_s(instance->w2c_env_memory, v84) & 1) != 0 )
    {
        v57 = func121_malloc(instance, var_p2 + 1);
        i32_store8(instance->w2c_env_memory, v57 + var_p2, 0);
        func123_memcpy(instance, v57, var_p1 + var_p0, var_p2);
        v5 = func30(instance, v57);
        i32_store8(instance->w2c_env_memory, 0x6920uLL, v5 != 0);
        func120_free(instance, v57);
    }
    if ( !(((int)var_p1 < 32) | (i32_load8_s(instance->w2c_env_memory, 0x6920uLL) == 0)) )
    {
        /*
         * 读取媒体流的开头(NALU头部)，判断类型是否为25，然后将宽高或编码
         * 参数提取并存入全局变量0x66E4和0x66E8。
         */
        v4 = i32_load8_s(instance->w2c_env_memory, var_p0);
        i32_store8(instance->w2c_env_memory, v83, (v4 & 0x1F) == 25);
        v49 = i32_load8_s(instance->w2c_env_memory, v83);
        if ( (v49 & 1) != 0 )
        {
            v43 = i32_load8_u(instance->w2c_env_memory, var_p0 + 2LL);
            i32_store(instance->w2c_env_memory, 0x66E4uLL, v43);
            v44 = i32_load8_u(instance->w2c_env_memory, var_p0 + 3LL);
            i32_store(instance->w2c_env_memory, 0x66E8uLL, v44);
            /*
             * 反CFF带来的异常代码，根本原因在于0xbe129处的mov因Patch被改
             * 成jmp，那个mov在为下述地址变量赋值。
             */
            i32_store(instance->w2c_env_memory, 0LL, var_p1);
        }
        else
        {
            if ( !i64_load(instance->w2c_env_memory, 0x66D0uLL) )
            {
                v36 = func77(instance, 0x61C0u);
                i32_store8(instance->w2c_env_memory, v82, v36 == 0);
                v33 = i32_load8_s(instance->w2c_env_memory, v82);
                if ( (v33 & 1) != 0 )
                {
                    v34 = i64_load(instance->w2c_env_memory, 0x2EA0uLL);
                    i64_store(instance->w2c_env_memory, 0x61C0uLL, v34);
                    v98 = i64_load(instance->w2c_env_memory, 0x2EA8uLL);
                    i64_store(instance->w2c_env_memory, 0x61C8uLL, v98);
                    v35 = i32_load(instance->w2c_env_memory, 0x2EB0uLL);
                    i32_store(instance->w2c_env_memory, 0x61D0uLL, v35);
                }
                /*
                 * 从栈上读取某个SP副本
                 */
                v58 = i32_load(instance->w2c_env_memory, v64);
                v72 = i32_load(instance->w2c_env_memory, v64) + 18;
                /*
                 * 逐字节写入混淆字符串，ASCIZ串
                 */
                v10 = i32_load(instance->w2c_env_memory, v64);
                i32_store8(instance->w2c_env_memory, v10 + 17LL, 0);
                i32_store8(instance->w2c_env_memory, v72, 0x11u);
                v11 = i32_load(instance->w2c_env_memory, v64);
                i32_store8(instance->w2c_env_memory, v11 + 16LL, 0x11u);
                v12 = i32_load(instance->w2c_env_memory, v64);
                i32_store8(instance->w2c_env_memory, v12 + 15LL, 0x1Bu);
                v13 = i32_load(instance->w2c_env_memory, v64);
                i32_store8(instance->w2c_env_memory, v13 + 14LL, 0x1Cu);
                v14 = i32_load(instance->w2c_env_memory, v64);
                i32_store8(instance->w2c_env_memory, v14 + 13LL, 0x75u);
                v15 = i32_load(instance->w2c_env_memory, v64);
                i32_store8(instance->w2c_env_memory, v15 + 12LL, 0x34u);
                v16 = i32_load(instance->w2c_env_memory, v64);
                i32_store8(instance->w2c_env_memory, v16 + 11LL, 0x2Bu);
                v17 = i32_load(instance->w2c_env_memory, v64);
                i32_store8(instance->w2c_env_memory, v17 + 10LL, 0x75u);
                v18 = i32_load(instance->w2c_env_memory, v64);
                i32_store8(instance->w2c_env_memory, v18 + 9LL, 0x34u);
                v19 = i32_load(instance->w2c_env_memory, v64);
                i32_store8(instance->w2c_env_memory, v19 + 8LL, 0x2Bu);
                v20 = i32_load(instance->w2c_env_memory, v64);
                i32_store8(instance->w2c_env_memory, v20 + 7LL, 0x62u);
                v21 = i32_load(instance->w2c_env_memory, v64);
                i32_store8(instance->w2c_env_memory, v21 + 6LL, 0x34u);
                v22 = i32_load(instance->w2c_env_memory, v64);
                i32_store8(instance->w2c_env_memory, v22 + 5LL, 0x2Cu);
                v23 = i32_load(instance->w2c_env_memory, v64);
                i32_store8(instance->w2c_env_memory, v23 + 4LL, 0x7Fu);
                v24 = i32_load(instance->w2c_env_memory, v64);
                i32_store8(instance->w2c_env_memory, v24 + 3LL, 0x78u);
                v25 = i32_load(instance->w2c_env_memory, v64);
                i32_store8(instance->w2c_env_memory, v25 + 2LL, 0x63u);
                v26 = i32_load(instance->w2c_env_memory, v64);
                i32_store8(instance->w2c_env_memory, v26 + 1LL, 0x74u);
                i32_store8(instance->w2c_env_memory, v58, 0x67u);
                v27 = i32_load(instance->w2c_env_memory, v64);
                v59 = func40(instance, v27);
                v73 = i32_load(instance->w2c_env_memory, 0x66E4uLL);
                v85 = i32_load(instance->w2c_env_memory, 0x66E8uLL);
                i32_store(instance->w2c_env_memory, v69, 0x61C0u);
                i32_store(instance->w2c_env_memory, v69 + 4LL, v73);
                i32_store(instance->w2c_env_memory, v69 + 8LL, v85);
                func114(instance, v59, v69);
                v94 = i64_load(instance->w2c_env_memory, 0x66D0uLL);
                i64_store(instance->w2c_env_memory, w2c_g2, v94);
            }
            v7 = i64_load(instance->w2c_env_memory, w2c_g2);
            i64_store(instance->w2c_env_memory, v65, v7);
            v96 = i64_load(instance->w2c_env_memory, v65) + 1;
            i64_store(instance->w2c_env_memory, 0x66D0uLL, v96);
            func52(instance);
            i32_store8(instance->w2c_env_memory, v81, (int)var_p1 < 129);
            v32 = i32_load8_s(instance->w2c_env_memory, v81);
            if ( (v32 & 1) == 0 )
            {
                v60 = i32_load8_s(instance->w2c_env_memory, 0x5C6DuLL) != 0;
                i32_store8(instance->w2c_env_memory, v66, (var_p1 & 1) == 0);
                v40 = i32_load8_s(instance->w2c_env_memory, v66);
                i32_store8(instance->w2c_env_memory, v80, v40 & 1 & v60);
                v50 = i32_load8_s(instance->w2c_env_memory, v80);
                if ( (v50 & 1) == 0 )
                {
                    value = i32_load8_s(instance->w2c_env_memory, v66) & 1;
                    v31 = i32_load8_s(instance->w2c_env_memory, 0x5C6CuLL);
                    i32_store8(instance->w2c_env_memory, v79, (v31 != 0) & value);
                    v97 = i64_load(instance->w2c_env_memory, 0x66D0uLL);
                    i64_store(instance->w2c_env_memory, v68, v97);
                    if ( (i32_load8_s(instance->w2c_env_memory, v79) & 1) == 0 )
                        goto LABEL_12;
                    v95 = i64_load(instance->w2c_env_memory, v68);
                    v6 = i32_load(instance->w2c_env_memory, 0x66DCuLL);
                    i32_store8(instance->w2c_env_memory, v78, v95 < (int)(5120 * v6));
                    v45 = i32_load8_s(instance->w2c_env_memory, v78);
                    if ( (v45 & 1) != 0 )
                    {
LABEL_12:
                        v28 = func121_malloc(instance, var_p1 + 4000);
                        i32_store(instance->w2c_env_memory, v67, v28);
                        v29 = i32_load(instance->w2c_env_memory, v67);
                        func125_memset(instance, v29, 0, var_p1 + 4000);
                        valuea = i32_load(instance->w2c_env_memory, 0x66E4uLL) == 1;
                        v30 = i32_load(instance->w2c_env_memory, 0x66E8uLL);
                        i32_store8(instance->w2c_env_memory, v77, v30 == 6 && valuea);
                        v51 = i32_load8_s(instance->w2c_env_memory, v77);
                        if ( (v51 & 1) != 0 )
                        {
                            v92 = i32_load(instance->w2c_env_memory, v67);
                            v38 = i64_load(instance->w2c_env_memory, v68);
                            v39 = func60_TEA(instance, var_p1, var_p0, v92, v38);
                            i32_store(instance->w2c_env_memory, v76, v39);
                            valued = i32_load(instance->w2c_env_memory, v76);
                        }
                        else
                        {
                            v91 = i32_load(instance->w2c_env_memory, v67);
                            v8 = i64_load(instance->w2c_env_memory, v68);
                            v9 = func59(instance, var_p1, var_p0, v91, v8);
                            i32_store(instance->w2c_env_memory, v75, v9);
                            valued = i32_load(instance->w2c_env_memory, v75);
                        }
                        i32_store(instance->w2c_env_memory, v71, valued);
                        v48 = i32_load(instance->w2c_env_memory, v71);
                        i32_store(instance->w2c_env_memory, v70, v48);
                        if ( i32_load(instance->w2c_env_memory, v70) )
                        {
                            func58_TEA(instance, var_p0, var_p1, var_p1);
                            valuee = i32_load(instance->w2c_env_memory, v67);
                            v41 = i32_load(instance->w2c_env_memory, v70);
                            func123_memcpy(instance, var_p0, valuee, v41);
                            v42 = i32_load(instance->w2c_env_memory, v67);
                            func120_free(instance, v42);
                            valuef = i32_load(instance->w2c_env_memory, v70);
                            /*
                             * 0xbe129处mov变jmp带来的异常
                             */
                            i32_store(instance->w2c_env_memory, 0LL, valuef);
                        }
                        else
                        {
                            v37 = i32_load(instance->w2c_env_memory, v67);
                            func120_free(instance, v37);
                            /*
                             * 0xbe129处mov变jmp带来的异常
                             */
                            i32_store(instance->w2c_env_memory, 0LL, var_p1);
                        }
                    }
                }
            }
        }
    }
    /*
     * 0xbe129处mov变jmp带来的异常
     */
    v46 = i32_load(instance->w2c_env_memory, 0LL);
    i32_store(instance->w2c_env_memory, v74, v46);
    result = i32_load(instance->w2c_env_memory, v74);
    instance->w2c_g2 = w2c_g2;
    return result;
}
```

上述代码已脱去CFF，熟悉wasm的已能看出整体逻辑，可结合Chrome F12动态调试进一步厘清。所有的i*\_store在设置栈上的局部变量，i*\_load在读取栈上的局部变量，可用AI对之简化。

```
$ wasm-objdump -j Global -x h5.worker.wasm

Global[2]:
 - global[2] i32 mutable=1 - init i32=28176
 - global[3] i32 mutable=1 - init i32=5271056
```

---

```
$ wasm2wat -o h5_worker.wat h5.worker.wasm

(import "env" "__table_base" (global (;0;) i32))
(import "env" "DYNAMICTOP_PTR" (global (;1;) i32))
(import "env" "memory" (memory (;0;) 256))
(import "env" "table" (table (;0;) 160 funcref))
```

从wat中汇编代码可知，global[2]相当于栈指针SP，但此栈向高址方向增长，不同于x86的栈向低址方向增长。每个函数的局部变量在栈上分配。

本文不对func54\_vodplay的功能进一步逆向分析，只演示反CFF部分。事实上这是两年前的wasm，现已发生变化。

☆ AI反CFF

现在AI这么发达，许多反混淆或可用AI完成。

让某AI对func54\_vodplay静态反混淆，它说该函数被实施过CFF+BCF，并提供反混淆结果。

```
u32 func54_vodplay(w2c_h50x2Eworker* instance, u32 var_p0, u32 var_p1, u32 var_p2) {

    // 1. 内部调用计数器更新
    // 每次进入函数，会将内存 26320 处的 64 位计数器 +1
    u64 counter = i64_load(instance->w2c_env_memory, 26320);
    i64_store(instance->w2c_env_memory, 26320, counter + 1);

    func52(instance);

    // ==========================================
    // 2. 早期退出检查 (参数校验与流控防刷)
    // ==========================================
    if (var_p1 < 129) {
        return var_p1;
    }

    bool is_p1_even = !(var_p1 & 1);

    // 校验内存开关 23661
    u8 flag_23661 = i32_load8_s(instance->w2c_env_memory, 23661);
    if (is_p1_even && (flag_23661 != 0)) {
        return var_p1;
    }

    // 校验内存开关 23660 与调用频率限制
    u8 flag_23660 = i32_load8_s(instance->w2c_env_memory, 23660);
    if (is_p1_even && (flag_23660 != 0)) {
        u32 limit_val = i32_load(instance->w2c_env_memory, 26332);
        // 如果调用次数超出阈值，直接退出
        if (counter >= (s64)(limit_val * 5120)) {
            return var_p1;
        }
    }

    // ==========================================
    // 3. 上下文完整性校验与状态恢复
    // ==========================================
    // 检查核心配置结构 (偏移 25024 处的数据)
    if (func77(instance, 25024)) {
        // [校验失败分支]：构造一段混淆后的异常日志/报错字符串并上报
        // 原始代码在此处逐字节写入了混淆字符串 "tcx\x7f,4b+4u+4u\x1c\x1b\x11"
        u32 str_buf = instance->w2c_g2 + 48; // 栈上申请字符串对象
        func40(instance, str_buf);
        func114(instance, str_buf, 25024);
        // (注：异常抛出后原代码进入重置循环)
    } else {
        // [校验成功分支]：从 11936 处的备份区，恢复上下文环境到 25024 处
        i64_store(instance->w2c_env_memory, 25024, i64_load(instance->w2c_env_memory, 11936));
        i64_store(instance->w2c_env_memory, 25032, i64_load(instance->w2c_env_memory, 11944));
        i32_store(instance->w2c_env_memory, 25040, i32_load(instance->w2c_env_memory, 11952));
    }

    // ==========================================
    // 4. 内存分配与核心数据处理
    // ==========================================
    // 分配解码/解密缓冲区 (大小 = p1 + 4000) 并清零
    u32 alloc_size = var_p1 + 4000;
    u32 buf_ptr = func121_malloc(instance, alloc_size);
    func125_memset(instance, buf_ptr, 0, alloc_size);

    // 调用核心处理逻辑 (在不同路径中可能是 f60 或 f59，但参数完全一致)
    u32 process_ret = func60_TEA(instance, var_p1, var_p0, buf_ptr, counter);

    // ==========================================
    // 5. 结果回写与清理
    // ==========================================
    if (process_ret != 0) {
        // 处理成功：回写数据到输出指针 (var_p0)
        func58_TEA(instance, var_p0, var_p1, var_p1);
        func123_memcpy(instance, var_p0, buf_ptr, process_ret);

        func120_free(instance, buf_ptr);
        return process_ret; // 返回实际处理的长度
    } else {
        // 处理失败
        func120_free(instance, buf_ptr);
        return var_p1;
    }
}
```

AI附了一段说明。

防刷/限流：开头通过记录counter(调用次数)，并结合常量(如5120)计算限流，拦截高频的非法扫描或异常调用。

防篡改与完整性校验：通过f77校验内存区块25024的特征。若不匹配，会生成异常信息"tcx\x7f,4b+4u+4u\x1c\x1b\x11"(这是加密字符串，解密后很可能类似exception...或某个日志标识)。若正常则从安全的备份区(11936)还原状态。

核心解密：使用f121申请了比输入长度大4000字节的buf\_ptr。调用的f60/f59就是真正执行解密运算的函数。

结果回写：解密成功后，用f58和memcpy将解密后的明文数据写回var\_p0对应的内存中，最后返回解密数据的实际长度。

未细究AI的反混淆结果，只是尝试一种可能。

☆ 后记

本文简单探索针对wasm反CFF的技术方案，提供测试用例及PoC。以前觉得wasm2c没啥大用，现在看来，用于反CFF倒是不错。

另一方面，如今AI大行其道，这些古法逆向工程技能已日暮西山、明日黄花，被淘汰的大势已来，以后会变成特别小众的手搓技能，失去实战价值。
