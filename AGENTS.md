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
- Todo o painel fica sob `_authenticated` (login obrigatório, `/auth` é a única rota pública). Cadastro em `/admin`, escrita pelo cliente do navegador protegida por RLS `has_role(auth.uid(),'admin')`; primeiro usuário vira admin via trigger e admins promovem/removem outros pelas funções `listar_usuarios_admin`/`definir_admin` (checam admin no banco).
- As logos estáticas das empresas são associadas pelo `slug` na tela de Estoque, para permanecerem independentes dos dados do banco.
- A tela inicial usa uma estrutura própria de painel com barra superior e menu lateral; os atalhos novos permanecem sem ação até terem seus fluxos definidos.
- O sistema Full mantém várias cargas por empresa; itens podem misturar marcas da mesma empresa e a confirmação desconta o estoque atomicamente pelo banco.
- O sistema Pedidos mantém várias compras por empresa e fornecedor; itens podem misturar marcas da mesma empresa e o recebimento soma ao estoque atomicamente pelo banco.
- Full e Pedidos têm telas de detalhe (`full_.$id`, `pedidos_.$id`) compartilhando `DetalhesDocumento`; importar PDF é leitura de texto no navegador (`src/lib/pdf-import.ts`, casa pelo COD) e baixar PDF é gerado no cliente (`src/lib/pdf-export.ts`) — sem custo de IA.
- Após o login o usuário escolhe uma empresa (guardada no navegador via `src/lib/empresa-atual.ts`); todas as telas filtram por ela e mandam de volta à escolha se não houver — mantém cada empresa isolada sem mudar as permissões do banco.
- Importar PDF nas listas de Full/Pedidos cria o registro (`src/lib/importar-documento.ts`), casa por COD e depois SKU exatos (`casar-produtos.ts`) e guarda itens não resolvidos no navegador até serem revisados nos Detalhes; o estoque só muda na confirmação.
- PDFs de envio Full do Mercado Livre são detectados e lidos por posição de coluna (`src/lib/pdf-ml.ts`); casam só por SKU exato, o número do frete fica no Full (único por empresa) para evitar duplicatas e conferir totais.
