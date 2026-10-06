# Importar e baixar PDF no Full e nos Pedidos

## O que muda para o usuário
- **Gerenciar**: cada empresa ganha campos **Endereço** e **CNPJ** (editáveis por admins).
- **Full** e **Pedidos**: cada carga/pedido passa a abrir uma tela própria de **Detalhes** (como nas imagens enviadas): nome, endereço, CNPJ e data da empresa à esquerda; número (#0001) à direita; botões **Importar PDF** e **Baixar PDF**; tabela COD / SKU / Produto / Quantidade; "Adicionar produto" e botão **Confirmar envio** (amarelo, Full) ou **Confirmar recebimento** (verde, Pedidos).
- **Importar PDF**: o sistema lê o texto do PDF, encontra cada linha que começa com um código e pega a quantidade. Compara com o **COD** dos produtos da empresa:
  - COD encontrado: adiciona ao pedido/carga (soma se já existir).
  - COD não encontrado: abre a janela **Cadastrar novo produto** (nome e COD já preenchidos do PDF, SKU, empresa e marca), com opção **Vincular a um cadastro existente** (grava o COD no produto escolhido). Uma janela por item não reconhecido, em sequência.
- Pedidos passam a aceitar produtos de **qualquer marca** da empresa (antes só da marca escolhida).
- **Baixar PDF**: gera o "Pedido de Compra" / "Envio Full" no estilo da imagem: logo do grupo no topo, dados da empresa, número, marca(s), tabela COD / Produto / Quantidade, "Página X de Y".
- Leitura feita no navegador, sem IA e sem custo. PDFs escaneados (foto) não serão lidos.

## Pendência
- Preciso da **imagem da logo do grupo (4t)**. Até chegar, o PDF sai com o título sem a logo.

## Detalhes técnicos
- Migração: `empresas` + `endereco text default ''`, `cnpj text default ''`; política UPDATE de empresas para admin.
- Novas rotas `_authenticated/full.$id.tsx` e `_authenticated/pedidos.$id.tsx`; listas atuais linkam para elas.
- Leitura: `pdfjs-dist` no cliente (import dinâmico), agrupa itens de texto por linha (coordenada Y), regex código no início + primeiro número no formato BR com vírgula como quantidade.
- Geração: `jspdf` + `jspdf-autotable` no cliente.
- Cadastro de produto pela tela usa as regras atuais (só admin grava produtos).
