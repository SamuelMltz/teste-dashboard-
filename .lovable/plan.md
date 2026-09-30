# Código e ordenação de marcas e produtos

## O que será feito
- Adicionar um campo de código personalizado em cada produto, exibido à esquerda do nome.
- Permitir informar o código ao cadastrar um produto e alterá-lo depois.
- Adicionar alças para arrastar e reordenar marcas dentro de cada empresa.
- Adicionar alças para arrastar e reordenar produtos dentro de cada marca.
- Salvar automaticamente a nova ordem no banco para que ela permaneça igual em todos os acessos.

## Banco de dados
- Acrescentar `codigo` e `ordem` aos produtos.
- Acrescentar `ordem` às marcas.
- Manter as regras atuais de acesso: leitura para usuários autenticados e alterações apenas para administradores.

## Detalhes técnicos
- Usar arrastar e soltar nativo, sem incluir uma biblioteca nova.
- Ordenar todas as consultas pelos novos campos de ordem.
- Preservar os dados existentes, atribuindo uma ordem inicial estável.
- Atualizar os tipos usados pelo site e validar o fluxo na tela de cadastro.
