import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useEmpresaAtual } from "./empresa-atual";

/** Empresa escolhida após o login; sem ela, volta para a tela de escolha. */
export function useEmpresaObrigatoria() {
  const empresa = useEmpresaAtual();
  const navigate = useNavigate();
  useEffect(() => { if (!empresa) navigate({ to: "/", replace: true }); }, [empresa, navigate]);
  return empresa;
}
