# Logo e nome da empresa no canto superior esquerdo

## O que existe hoje
- Na barra superior do Dashboard, no canto esquerdo, aparece um ícone genérico de pessoa seguido do nome da empresa selecionada e o botão "Trocar empresa". O texto "Administrador" não aparece mais no código atual; o ícone de pessoa é o que será substituído.
- A empresa selecionada vem da escolha feita após o login (guardada no navegador) e já atualiza a tela na hora ao trocar.
- As logos das três empresas já existem no projeto e são associadas pelo identificador da empresa (vitrine, luminartech, vivalle).

## O que muda
- Trocar o ícone de pessoa por uma bolinha com a logo da empresa selecionada, pequena, recortada em círculo, sem distorcer.
- Se a empresa não tiver logo, mostrar um ícone padrão de empresa dentro do círculo.
- Nome da empresa ao lado, centralizado verticalmente com a logo, cortado com "..." se for muito longo.
- Ao trocar de empresa, logo e nome mudam na hora, sem recarregar.
- Botão "Trocar empresa", sino e o restante da barra continuam iguais.

## Detalhes técnicos
- Criar um pequeno mapa compartilhado slug → logo (reaproveitando as imagens já usadas em Estoque/Dashboard) e um componente `AvatarEmpresa`.
- Usar `useEmpresaAtual()` para nome e slug; `object-cover`, `rounded-full`, `truncate` com largura máxima responsiva.
