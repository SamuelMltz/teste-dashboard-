# Sistema Full de entregas

## Resultado
Adicionar ao Dashboard uma área **Full**, com ícone de caminhão e identidade amarela, para planejar e confirmar cargas de entrega.

## Experiência
- Incluir o cartão **Full** na tela inicial, ao lado das áreas atuais.
- Criar uma tela no mesmo estilo escuro do sistema, com lista de cargas planejadas e histórico das confirmadas.
- Permitir criar vários rascunhos, cada um com código automático crescente (`#0001`, `#0002`...) e nome obrigatório.
- Vincular cada carga a uma única empresa e permitir misturar produtos das diferentes marcas dessa empresa.
- Exibir busca/seleção de produtos, estoque disponível, quantidade escolhida e total de itens.
- Permitir editar ou excluir somente cargas ainda planejadas.
- Pedir confirmação antes do envio e mostrar claramente quando faltar estoque.

## Dados e segurança
- Criar tabelas para cargas e itens, com status `planejada` ou `confirmada`, responsáveis e datas para auditoria.
- Liberar o uso para todos os usuários autenticados, mantendo a área inacessível sem login.
- Criar uma operação única e segura de confirmação que bloqueia confirmações repetidas, valida todos os saldos e desconta o estoque inteiro de uma vez.
- Se qualquer produto não tiver quantidade suficiente, nenhuma baixa será realizada.
- Manter cargas confirmadas como histórico permanente, sem permitir edição ou exclusão.

## Validação
- Testar criação de múltiplos rascunhos, seleção entre marcas da mesma empresa, edição e exclusão.
- Testar confirmação bem-sucedida, baixa exata do estoque e atualização dos alertas.
- Testar falta de estoque, confirmação duplicada e comportamento em celular e computador.

## Detalhes técnicos
- Aplicar uma migração com permissões e regras de acesso para usuários autenticados.
- Usar uma função transacional no banco para gerar o código sequencial e outra para confirmar a carga atomicamente.
- Integrar a nova tela aos dados atuais de empresas, marcas, produtos e estoque mínimo.