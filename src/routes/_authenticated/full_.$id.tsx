import { createFileRoute } from "@tanstack/react-router";
import { DetalhesDocumento } from "@/components/documento/DetalhesDocumento";

export const Route = createFileRoute("/_authenticated/full_/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do envio Full" },
      { name: "description", content: "Confira os produtos, importe ou baixe o PDF e confirme o envio Full." },
      { property: "og:title", content: "Detalhes do envio Full" },
      { property: "og:description", content: "Confira os produtos, importe ou baixe o PDF e confirme o envio Full." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <DetalhesDocumento tipo="full" id={Route.useParams().id} />,
});
