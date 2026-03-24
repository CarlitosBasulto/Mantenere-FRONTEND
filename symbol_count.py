f = open("c:/Users/jdzul/Mantenere-FRONTEND/src/pages/admin/AdminDetalleTrabajo.tsx", "r", encoding="utf-8")
content = f.read()
f.close()

counts = { '(': 0, ')': 0, '{': 0, '}': 0, '[': 0, ']': 0 }
for c in content:
    if c in counts:
        counts[c] += 1

print(counts)
