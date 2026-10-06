import { createFileRoute } from "@tanstack/react-router";
import { DetalhesDocumento } from "@/components/documento/DetalhesDocumento";

export const Route = createFileRoute("/_authenticated/pedidos_/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do pedido" },
      { name: "description", content: "Confira os itens, importe a nota em PDF, baixe o pedido e confirme o recebimento." },
      { property: "og:title", content: "Detalhes do pedido" },
      { property: "og:description", content: "Confira os itens, importe a nota em PDF, baixe o pedido e confirme o recebimento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <DetalhesDocumento tipo="pedido" id={Route.useParams().id} />,
});
