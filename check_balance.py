import subprocess

def check_code(code, name):
    tokens = []
    i = 0
    n = len(code)
    in_s_quote = False
    in_d_quote = False
    in_backtick = False
    in_line_comment = False
    in_block_comment = False
    escaped = False

    while i < n:
        c = code[i]
        if escaped:
            escaped = False
            i += 1
            continue
        if c == '\\' and (in_s_quote or in_d_quote or in_backtick):
            escaped = True
            i += 1
            continue
        if in_line_comment:
            if c == '\n':
                in_line_comment = False
            i += 1
            continue
        if in_block_comment:
            if c == '*' and i + 1 < n and code[i+1] == '/':
                in_block_comment = False
                i += 2
            else:
                i += 1
            continue
        if not in_s_quote and not in_d_quote and not in_backtick:
            if c == '/' and i + 1 < n and code[i+1] == '/':
                in_line_comment = True
                i += 2
                continue
            if c == '/' and i + 1 < n and code[i+1] == '*':
                in_block_comment = True
                i += 2
                continue
        if c == "'" and not in_d_quote and not in_backtick:
            in_s_quote = not in_s_quote
            i += 1
            continue
        if c == '"' and not in_s_quote and not in_backtick:
            in_d_quote = not in_d_quote
            i += 1
            continue
        if c == '`' and not in_s_quote and not in_d_quote:
            in_backtick = not in_backtick
            i += 1
            continue
        if in_s_quote or in_d_quote or in_backtick:
            i += 1
            continue
            
        line_num = code.count('\n', 0, i) + 1
        if c == '{':
            tokens.append(('{', line_num))
        elif c == '}':
            tokens.append(('}', line_num))
        elif code[i:i+4] == '<div':
            tokens.append(('div_open', line_num))
            i += 3
        elif code[i:i+6] == '</div>':
            tokens.append(('div_close', line_num))
            i += 5
        i += 1

    stack = []
    for tok, line in tokens:
        if tok == '{' or tok == 'div_open':
            stack.append((tok, line))
        elif tok == '}':
            if stack and stack[-1][0] == '{':
                stack.pop()
            else:
                print(f'[{name}] Mismatched closing brace at line {line}')
        elif tok == 'div_close':
            found = False
            for k in range(len(stack)-1, -1, -1):
                if stack[k][0] == 'div_open':
                    stack.pop(k)
                    found = True
                    break
            if not found:
                print(f'[{name}] Mismatched closing div at line {line}')

    print(f'[{name}] Stack size: {len(stack)}')
    if len(stack) > 0:
        print(f'[{name}] Unclosed items:')
        for item in stack:
            print(item)

# Check local
with open('src/pages/admin/AdminDetalleTrabajo.tsx', 'r', encoding='utf-8') as f:
    local_code = f.read()
check_code(local_code, 'LOCAL')

# Check git main
out = subprocess.check_output(['git', 'show', 'origin/main:src/pages/admin/AdminDetalleTrabajo.tsx'])
git_code = out.decode('utf-8', errors='ignore')
check_code(git_code, 'GIT')
