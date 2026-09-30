@AGENTS.md

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- Tienda + panel juntos: `graphify-out/cross-repo-graph.json` (lo arma `.claude/graphify/cross-repo.py` al iniciar la sesión si `../sokoshop-admin` está presente). Usalo para cambios que cruzan repos (esquema, motor de promos, revalidación, avisos): `graphify affected "<id>" --graph graphify-out/cross-repo-graph.json` antes de tocar algo compartido. Los ids llevan prefijo de repo, ej. `SOKOSHOP-web::lib_pricing_quote`, `sokoshop-admin::lib_sales_createpossale`.
- graphify-out/ no se versiona: se regenera en cada sesión (hook de inicio).
