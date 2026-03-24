f = open("c:/Users/jdzul/Mantenere-FRONTEND/src/pages/admin/AdminDetalleTrabajo.tsx", "r", encoding="utf-8")
lines = f.readlines()
f.close()

# Range 1448 to 1674 (1-indexed)
content = "".join(lines[1447:1674])

counts = { '(': 0, ')': 0, '{': 0, '}': 0, '[': 0, ']': 0 }
for c in content:
    if c in counts:
        counts[c] += 1

print(counts)
