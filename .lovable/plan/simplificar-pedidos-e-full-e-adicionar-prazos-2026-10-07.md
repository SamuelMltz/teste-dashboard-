# Simplificar Pedidos e Full e adicionar prazos

## O que muda
- Nas listas de **Pedidos** e **Full**, cada registro vira um resumo clicável com número, nome, status, quantidade de produtos e total de unidades. Não haverá expansão, produtos ou controles de inclusão nesses cartões.
- A inclusão e remoção de produtos ficará somente nos **Detalhes**, pelo botão **Adicionar produto**, pesquisando toda a empresa atual por nome, COD ou SKU.
- A criação manual usará automaticamente a empresa escolhida no Dashboard e não pedirá marca. O novo registro abrirá diretamente nos Detalhes para receber nome e produtos.
- **Importar PDF** continuará disponível nas listas, criando o registro e abrindo os Detalhes para revisão.
- O Full ganhará uma **data prevista**, editável nos Detalhes e exibida ao lado do número do frete.
- O Dashboard ganhará um **sino de prazos** com a quantidade de Fulls agendados. Ao abrir, mostrará cada Full e quantos dias faltam; itens dentro das últimas 72 horas ou atrasados aparecerão em vermelho.

## Regras preservadas
- Pedidos e Fulls continuam vinculados a uma única empresa e podem misturar marcas dessa empresa.
- A importação apenas prepara o registro; o estoque muda somente na confirmação, uma única vez.
- Registros existentes continuam válidos, mesmo sem data prevista.

## Detalhes técnicos
- Adicionar `data_prevista timestamptz NULL` em `full_cargas`, mantendo os dados existentes.
- Atualizar consultas, tipos e a tela compartilhada de Detalhes para leitura e gravação da data.
- Concentrar a listagem de prazos do sino nos Fulls planejados da empresa atual e calcular a faixa crítica de 72 horas no cliente.
- Adicionar testes pequenos para a regra de prazo de 72 horas e para os rótulos de dias restantes.