<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# AGENTS.md

- Dados das empresas vivem em `src/lib/empresas.ts` (mock em memória). Migrar para banco (Lovable Cloud) quando o usuário pedir dados reais.
- Cada empresa tem uma cor de destaque (`accent`) usada em cartões e detalhes; trocar a cor lá, não nos componentes.
- Estrutura: empresa → marcas → produtos (nome + estoque), tudo em `empresas.ts`; rotas `/empresa/$slug` e `/empresa/$slug/marca/$marca`.
- Tema escuro global via `class="dark"` no `<html>` em `__root.tsx`.
