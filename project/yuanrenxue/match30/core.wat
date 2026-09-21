(module
  (type $t0 (func (result i32)))
  (type $t1 (func (param i32 i32) (result i32)))
  (type $t2 (func (param i32) (result i32)))
  (type $t3 (func (param i32 i32 i32) (result i32)))
  (type $t4 (func (param i32 i32)))
  (import "env" "random_byte" (func $random_byte (type $t0)))
  (memory $memory 1)
  (export "memory" (memory $memory))
  (export "encrypt" (func $encrypt))

  (func $rol8 (param $val i32) (param $shift i32) (result i32)
    (local i32)
    local.get 1
    i32.const 7
    i32.and
    local.set 2
    local.get 0
    local.get 2
    i32.shl
    local.get 0
    i32.const 8
    local.get 2
    i32.sub
    i32.shr_u
    i32.or
    i32.const 255
    i32.and
    end
  )

  (func $table (param $x i32) (result i32)
    (local i32)
    local.get 0
    i32.const 8
    i32.rem_u
    local.set 1
    local.get 1
    i32.const 0
    i32.eq
    if (result i32)
      i32.const 55
    else
      local.get 1
      i32.const 1
      i32.eq
      if (result i32)
        i32.const 169
      else
        local.get 1
        i32.const 2
        i32.eq
        if (result i32)
          i32.const 92
        else
          local.get 1
          i32.const 3
          i32.eq
          if (result i32)
            i32.const 225
          else
            local.get 1
            i32.const 4
            i32.eq
            if (result i32)
              i32.const 130
            else
              local.get 1
              i32.const 5
              i32.eq
              if (result i32)
                i32.const 77
              else
                local.get 1
                i32.const 6
                i32.eq
                if (result i32)
                  i32.const 22
                else
                  i32.const 183
                end
              end
            end
          end
        end
      end
    end
    end
  )

  (func $transform_byte (param $val i32) (param $i i32) (param $r i32) (result i32)
    (local i32)
    local.get 0
    local.get 1
    local.get 2
    i32.add
    call $table
    i32.xor
    local.set 3
    local.get 3
    i32.const 61
    i32.add
    local.get 1
    i32.const 23
    i32.mul
    i32.add
    local.get 2
    i32.const 41
    i32.mul
    i32.add
    i32.const 255
    i32.and
    local.set 3
    local.get 3
    local.get 1
    local.get 2
    i32.add
    i32.const 3
    i32.add
    call $rol8
    local.set 3
    local.get 3
    local.get 1
    i32.const 49
    i32.mul
    local.get 2
    i32.const 71
    i32.mul
    i32.add
    i32.const 255
    i32.and
    i32.xor
    local.set 3
    local.get 3
    local.get 1
    local.get 2
    i32.xor
    i32.const 19
    i32.mul
    i32.add
    i32.const 255
    i32.and
    end
  )

  (func $encrypt (param $offset i32) (param $length i32)
    (local i32)
    (local i32)
    (local i32)
    (local i32)
    (local i32)
    call $random_byte
    i32.const 255
    i32.and
    local.set 6
    local.get 1
    i32.eqz
    if
      local.get 0
      local.get 6
      i32.store8 offset=0 align=0
      return
    end
    local.get 1
    i32.const 1
    i32.sub
    local.set 2
    block
      loop
        local.get 0
        local.get 2
        i32.add
        i32.load8_u offset=0 align=0
        local.set 5
        local.get 0
        local.get 2
        i32.const 1
        i32.add
        i32.add
        local.get 5
        i32.store8 offset=0 align=0
        local.get 2
        i32.eqz
        br_if 1
        local.get 2
        i32.const 1
        i32.sub
        local.set 2
        br 0
      end
    end
    local.get 0
    local.get 6
    i32.store8 offset=0 align=0
    i32.const 0
    local.set 2
    block
      loop
        local.get 2
        local.get 1
        i32.ge_u
        br_if 1
        local.get 0
        i32.const 1
        i32.add
        local.get 2
        i32.add
        local.get 0
        i32.const 1
        i32.add
        local.get 2
        i32.add
        i32.load8_u offset=0 align=0
        local.get 2
        i32.const 91
        i32.mul
        i32.const 167
        i32.add
        i32.const 255
        i32.and
        i32.xor
        i32.store8 offset=0 align=0
        local.get 2
        i32.const 1
        i32.add
        local.set 2
        br 0
      end
    end
    i32.const 0
    local.set 4
    block
      loop
        local.get 4
        i32.const 4
        i32.ge_u
        br_if 1
        i32.const 0
        local.set 2
        block
          loop
            local.get 2
            local.get 1
            i32.ge_u
            br_if 1
            local.get 0
            i32.const 1
            i32.add
            local.get 2
            i32.add
            local.get 0
            i32.const 1
            i32.add
            local.get 2
            i32.add
            i32.load8_u offset=0 align=0
            local.get 2
            local.get 4
            call $transform_byte
            i32.store8 offset=0 align=0
            local.get 2
            i32.const 1
            i32.add
            local.set 2
            br 0
          end
        end
        i32.const 0
        local.set 2
        local.get 1
        i32.const 1
        i32.sub
        local.set 3
        block
          loop
            local.get 2
            local.get 3
            i32.ge_u
            br_if 1
            local.get 2
            local.get 3
            i32.add
            local.get 4
            i32.add
            i32.const 1
            i32.and
            i32.eqz
            if
              local.get 0
              i32.const 1
              i32.add
              local.get 2
              i32.add
              i32.load8_u offset=0 align=0
              local.set 5
              local.get 0
              i32.const 1
              i32.add
              local.get 2
              i32.add
              local.get 0
              i32.const 1
              i32.add
              local.get 3
              i32.add
              i32.load8_u offset=0 align=0
              i32.store8 offset=0 align=0
              local.get 0
              i32.const 1
              i32.add
              local.get 3
              i32.add
              local.get 5
              i32.store8 offset=0 align=0
            end
            local.get 2
            i32.const 1
            i32.add
            local.set 2
            local.get 3
            i32.const 1
            i32.sub
            local.set 3
            br 0
          end
        end
        local.get 4
        i32.const 1
        i32.add
        local.set 4
        br 0
      end
    end
    i32.const 0
    local.set 2
    block
      loop
        local.get 2
        local.get 1
        i32.ge_u
        br_if 1
        local.get 0
        i32.const 1
        i32.add
        local.get 2
        i32.add
        local.get 0
        i32.const 1
        i32.add
        local.get 2
        i32.add
        i32.load8_u offset=0 align=0
        local.get 6
        i32.xor
        i32.store8 offset=0 align=0
        local.get 2
        i32.const 1
        i32.add
        local.set 2
        br 0
      end
    end
    end
  )

)
