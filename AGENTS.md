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

- Dados vêm do banco (tabelas empresas → marcas → produtos, leitura pública); lidos via server functions em `src/lib/empresas.functions.ts`.
- Cada empresa tem uma cor de destaque (`accent`) usada em cartões e detalhes; trocar a cor lá, não nos componentes.
- Estrutura: empresa → marcas ordenáveis → produtos ordenáveis (código, estoque atual e mínimo); alertas incluem níveis até 20% acima do mínimo.
- Tema escuro global via `class="dark"` no `<html>` em `__root.tsx`.
- Todo o painel fica sob `_authenticated` (login obrigatório, `/auth` é a única rota pública). Cadastro em `/admin`, escrita pelo cliente do navegador protegida por RLS `has_role(auth.uid(),'admin')`; primeiro usuário vira admin via trigger.
- As logos estáticas das empresas são associadas pelo `slug` na tela de Estoque, para permanecerem independentes dos dados do banco.
- A tela inicial usa uma estrutura própria de painel com barra superior e menu lateral; os atalhos novos permanecem sem ação até terem seus fluxos definidos.
