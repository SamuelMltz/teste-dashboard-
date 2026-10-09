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
- Company accents remain stored in the database; section decoration uses the centralized CSS section tokens instead, so changing a company does not change a section's visual identity.
- SectionTheme maps authenticated paths to section identities; SectionScope overrides mixed-section areas, and portaled controls inherit that identity through React context without changing business logic.
- Estrutura: empresa → marcas ordenáveis → produtos ordenáveis (código, estoque atual e mínimo); alertas incluem níveis até 20% acima do mínimo.
- Tema escuro global via `class="dark"` no `<html>` em `__root.tsx`.
- Todo o painel fica sob `_authenticated` (login obrigatório, `/auth` é a única rota pública). Cadastro em `/admin`, escrita pelo cliente do navegador protegida por RLS `has_role(auth.uid(),'admin')`; primeiro usuário vira admin via trigger e admins promovem/removem outros pelas funções `listar_usuarios_admin`/`definir_admin` (checam admin no banco).
- As logos estáticas das empresas são associadas pelo `slug` na tela de Estoque, para permanecerem independentes dos dados do banco.
- The home keeps operational cards separate from grouped sidebar navigation; mobile navigation stays available through a header trigger, while desktop collapse preserves accessible icons.
- O sistema Full mantém várias cargas por empresa sem exigir marca na criação; itens de marcas diferentes são incluídos só nos Detalhes, a confirmação desconta o estoque atomicamente e `data_prevista` alimenta alertas críticos nas últimas 72h.
- O sistema Pedidos mantém várias compras por empresa sem exigir marca na criação; itens de marcas diferentes são incluídos só nos Detalhes e o recebimento soma ao estoque atomicamente pelo banco.
- Full e Pedidos têm telas de detalhe (`full_.$id`, `pedidos_.$id`) compartilhando `DetalhesDocumento`; importar PDF é leitura de texto no navegador (`src/lib/pdf-import.ts`, casa pelo COD) e baixar PDF é gerado no cliente (`src/lib/pdf-export.ts`) — sem custo de IA.
- Após o login o usuário escolhe uma empresa (guardada no navegador via `src/lib/empresa-atual.ts`); todas as telas filtram por ela e mandam de volta à escolha se não houver — mantém cada empresa isolada sem mudar as permissões do banco.
- Importar PDF nas listas de Full/Pedidos cria o registro (`src/lib/importar-documento.ts`), casa por COD e depois SKU exatos (`casar-produtos.ts`) e guarda itens não resolvidos no navegador até serem revisados nos Detalhes; o estoque só muda na confirmação.
- PDFs de envio Full do Mercado Livre são detectados e lidos por posição de coluna (`src/lib/pdf-ml.ts`); casam só por SKU exato, o número do frete fica no Full (único por empresa) para evitar duplicatas e conferir totais.
- Pedidos de compra podem conter produtos de outras empresas (casa primeiro na empresa do pedido, depois nas demais); o pedido fica na empresa de origem e o recebimento soma no estoque do próprio produto. Full continua restrito à empresa selecionada.
- A lista de compras (`src/lib/lista-compras.ts`, `ReposicaoFisica`) calcula pelo estoque físico, mínimo e saldo pendente de pedidos `planejado` (rascunhos inclusos, cancelados/recebidos não); a função `gerar_pedidos_reposicao` recalcula no banco com trava por empresa e chave idempotente para impedir duplicatas.
- PDFs emitidos pelo sistema levam referência rastreável (`LC-…` na lista, `PED-<id>` no pedido); o importador reconhece essas referências antes da leitura comum e abre o registro existente em vez de duplicar.
