import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

import { getEmpresa } from "@/lib/empresas";

export const Route = createFileRoute("/empresa/$slug")({
  loader: ({ params }) => {
    const empresa = getEmpresa(params.slug);
    if (!empresa) throw notFound();
    return { empresa };
  },
  component: () => <Outlet />,
});
