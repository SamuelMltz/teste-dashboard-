# Estoque mínimo e alertas de produtos

## Objetivo
Permitir definir uma quantidade mínima por produto, destacar visualmente o nível do estoque e transformar o indicador “Produtos com estoque baixo” em um acesso para uma tela completa de alertas.

## O que será feito
- Adicionar ao banco o campo `estoque_minimo` em cada produto, começando em zero para os produtos existentes.
- Incluir “Estoque mínimo” no cadastro de novos produtos e na edição dos produtos já cadastrados.
- Atualizar todas as leituras de empresas, marcas e produtos para trazer esse novo valor.
- Redesenhar a tela de produtos da marca no mesmo padrão escuro das telas de Estoque e Gerenciar.
- Aplicar estados visuais na quantidade atual:
  - branco quando estiver acima de 120% do mínimo;
  - amarelo quando estiver até 20% acima do mínimo;
  - vermelho quando chegar ao mínimo ou ficar abaixo dele.
- Considerar como alerta no painel todos os produtos amarelos ou vermelhos, desde que tenham mínimo maior que zero.
- Tornar o cartão “Produtos com estoque baixo” clicável e mostrar nele a quantidade real de alertas.
- Criar uma tela de alertas no mesmo estilo do sistema, com produto, código, empresa, marca, estoque atual, mínimo e gravidade.
- Manter os alertas ordenados pelos mais críticos primeiro.

## Detalhes técnicos
- A alteração do banco será aditiva e não apagará dados existentes.
- A tela de alertas ficará dentro da área protegida por login.
- As regras de cor e classificação serão centralizadas para manter o mesmo comportamento em todas as telas.
- A nova tela terá título e metadados próprios.
- Ao final, serão validados cadastro, edição, contagem do painel, navegação e visual em desktop e celular.
