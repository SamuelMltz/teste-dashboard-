import { createContext, useContext, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";

export type Section = "estoque" | "garantia" | "gerenciar" | "full" | "pedidos" | "contas" | "alertas" | "graficos";
const SectionContext = createContext<Section | undefined>(undefined);
export const useSection = () => useContext(SectionContext);

/** Presentation only: portals retain the section of the screen that opened them. */
export function SectionTheme({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const section: Section | undefined = pathname.startsWith("/pedidos") ? "pedidos"
    : pathname.startsWith("/full") ? "full"
    : pathname.startsWith("/garantia") ? "garantia"
    : pathname.startsWith("/graficos") ? "graficos"
    : pathname.startsWith("/admin") ? "gerenciar"
    : pathname.startsWith("/contas") ? "contas"
    : pathname.startsWith("/alertas-estoque") ? "alertas"
    : pathname.startsWith("/estoque") || pathname.startsWith("/empresa/") ? "estoque" : undefined;
  return <SectionContext.Provider value={section}><div data-section={section}>{children}</div></SectionContext.Provider>;
}