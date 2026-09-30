"""Grafo combinado tienda + panel (graphify), con los puentes entre los dos repos.

Uso (desde SOKOSHOP-web, con los dos repos lado a lado):
    graphify update . && graphify update ../sokoshop-admin
    "$(cat graphify-out/.graphify_python 2>/dev/null || echo python3)" .claude/graphify/cross-repo.py

Escribe graphify-out/cross-repo-graph.json. Consultas:
    graphify query "¿cómo llega una promo del panel al checkout?" --graph graphify-out/cross-repo-graph.json

Además de unir los grafos (graphify merge-graphs), agrega aristas que graphify no ve solo:
  - archivos idénticos en los dos repos (ej. lib/promo-engine.ts), comparados byte a byte en cada corrida;
  - contratos entre repos verificados en el código (revalidación de la tienda, copia del esquema,
    link al panel en el mail de pedido nuevo).
"""

import filecmp
import json
import subprocess
import sys
from pathlib import Path

STORE = Path(__file__).resolve().parents[2]
ADMIN = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else (STORE.parent / "sokoshop-admin")
OUT = STORE / "graphify-out" / "cross-repo-graph.json"

for repo in (STORE, ADMIN):
    if not (repo / "graphify-out" / "graph.json").exists():
        sys.exit(f"Falta {repo}/graphify-out/graph.json: corré `graphify update {repo}` primero.")

subprocess.run(
    ["graphify", "merge-graphs", str(STORE / "graphify-out" / "graph.json"), str(ADMIN / "graphify-out" / "graph.json"), "--out", str(OUT)],
    check=True,
)
g = json.loads(OUT.read_text(encoding="utf-8"))
edges_key = "links" if "links" in g else "edges"

# merge-graphs prefija cada nodo con el nombre de la carpeta del repo ("SOKOSHOP-web::…", "sokoshop-admin::…").
S, A = STORE.name, ADMIN.name

ids = {n["id"] for n in g["nodes"]}
by_file = {}
for n in g["nodes"]:
    by_file.setdefault((n.get("repo"), n.get("source_file")), []).append(n["id"])

def file_node(repo: str, rel: str):
    """Nodo del archivo (el de menor id entre los de ese archivo: el propio módulo)."""
    c = by_file.get((repo, rel))
    return min(c, key=len) if c else None

def add_node(i, label, repo, rel):
    if i not in ids:
        g["nodes"].append({"id": i, "label": label, "file_type": "document", "source_file": rel, "source_location": None, "repo": repo, "_origin": "cross-repo"})
        ids.add(i)
    return i

def edge(src, dst, relation, confidence, score, note):
    if src in ids and dst in ids:
        g[edges_key].append({"source": src, "target": dst, "relation": relation, "confidence": confidence, "confidence_score": score, "weight": 1.0, "source_file": ".claude/graphify/cross-repo.py", "source_location": None, "context": note, "_origin": "cross-repo"})
        return 1
    return 0

added = 0
# 1) Código idéntico en los dos repos (se verifica en cada corrida: si una copia cambia, la arista desaparece).
for p in sorted((STORE / "lib").glob("*.ts")):
    other = ADMIN / "lib" / p.name
    if other.exists() and filecmp.cmp(p, other, shallow=False):
        rel = f"lib/{p.name}"
        added += edge(file_node(S, rel), file_node(A, rel), "semantically_similar_to", "EXTRACTED", 1.0, f"{rel}: copia idéntica en tienda y panel (si cambia una, cambiar la otra)")

# 2) Contratos entre repos (verificados en el código).
added += edge(file_node(A, "lib/store-revalidate.ts"), file_node(S, "app/api/revalidate/route.ts"), "calls", "EXTRACTED", 1.0,
              "revalidateStore() hace POST a STORE_URL/api/revalidate con REVALIDATE_SECRET")
schema_a = add_node(f"{A}::prisma_schema", "schema.prisma (panel: dueño del esquema y las migraciones)", A, "prisma/schema.prisma")
schema_s = add_node(f"{S}::prisma_schema", "schema.prisma (tienda: copia generada, no editar)", S, "prisma/schema.prisma")
added += edge(schema_s, schema_a, "references", "EXTRACTED", 1.0, "copia de sokoshop-admin/prisma/schema.prisma")
added += edge(file_node(S, "scripts/sync-schema.mjs"), schema_a, "references", "EXTRACTED", 1.0, "npm run schema:sync copia el esquema del panel")
added += edge(file_node(S, "scripts/sync-schema.mjs"), schema_s, "references", "EXTRACTED", 1.0, "escribe prisma/schema.prisma de la tienda")
for repo, schema in ((S, schema_s), (A, schema_a)):
    added += edge(file_node(repo, "lib/prisma.ts"), schema, "references", "EXTRACTED", 1.0, "PrismaClient generado desde este esquema")
admin_order = file_node(A, "app/(panel)/pedidos/[id]/page.tsx")
added += edge(file_node(S, "lib/notify.ts"), admin_order, "references", "EXTRACTED", 1.0, "mail de pedido nuevo con link a ADMIN_URL/pedidos/<id>")
added += edge(file_node(S, "lib/promo-data.ts"), file_node(A, "lib/promo-data.ts"), "semantically_similar_to", "INFERRED", 0.85,
              "misma carga de promos/regalos para el motor: tienda (checkout) y panel (POS)")

OUT.write_text(json.dumps(g, ensure_ascii=False), encoding="utf-8")
print(f"Grafo combinado: {len(g['nodes'])} nodos, {len(g[edges_key])} aristas ({added} puentes entre repos) -> {OUT}")
