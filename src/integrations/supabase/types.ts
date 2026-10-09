export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      empresas: {
        Row: {
          accent: string
          cnpj: string
          created_at: string
          endereco: string
          id: string
          nome: string
          ordem: number
          reposicao_alvo_pct: number
          reposicao_atencao_pct: number
          slug: string
        }
        Insert: {
          accent?: string
          cnpj?: string
          created_at?: string
          endereco?: string
          id?: string
          nome: string
          ordem?: number
          reposicao_alvo_pct?: number
          reposicao_atencao_pct?: number
          slug: string
        }
        Update: {
          accent?: string
          cnpj?: string
          created_at?: string
          endereco?: string
          id?: string
          nome?: string
          ordem?: number
          reposicao_alvo_pct?: number
          reposicao_atencao_pct?: number
          slug?: string
        }
        Relationships: []
      }
      full_cargas: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string
          data_prevista: string | null
          empresa_id: string
          frete_ml: string | null
          id: string
          ml_total_produtos: number | null
          ml_total_unidades: number | null
          nome: string
          numero: number
          status: Database["public"]["Enums"]["full_status"]
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string
          data_prevista?: string | null
          empresa_id: string
          frete_ml?: string | null
          id?: string
          ml_total_produtos?: number | null
          ml_total_unidades?: number | null
          nome: string
          numero?: never
          status?: Database["public"]["Enums"]["full_status"]
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string
          data_prevista?: string | null
          empresa_id?: string
          frete_ml?: string | null
          id?: string
          ml_total_produtos?: number | null
          ml_total_unidades?: number | null
          nome?: string
          numero?: never
          status?: Database["public"]["Enums"]["full_status"]
        }
        Relationships: [
          {
            foreignKeyName: "full_cargas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      full_itens: {
        Row: {
          carga_id: string
          created_at: string
          id: string
          preparado: boolean
          produto_id: string
          quantidade: number
        }
        Insert: {
          carga_id: string
          created_at?: string
          id?: string
          preparado?: boolean
          produto_id: string
          quantidade: number
        }
        Update: {
          carga_id?: string
          created_at?: string
          id?: string
          preparado?: boolean
          produto_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "full_itens_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "full_cargas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "full_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      geracoes_lista_compras: {
        Row: {
          chave: string
          created_at: string
          created_by: string
          empresa_id: string
          lista_ref: string
          resultado: Json
        }
        Insert: {
          chave: string
          created_at?: string
          created_by?: string
          empresa_id: string
          lista_ref: string
          resultado: Json
        }
        Update: {
          chave?: string
          created_at?: string
          created_by?: string
          empresa_id?: string
          lista_ref?: string
          resultado?: Json
        }
        Relationships: [
          {
            foreignKeyName: "geracoes_lista_compras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      marcas: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          nome: string
          ordem: number
          slug: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
          ordem?: number
          slug: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
          ordem?: number
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "marcas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_itens: {
        Row: {
          created_at: string
          id: string
          pedido_id: string
          produto_id: string
          quantidade: number
          quantidade_recebida: number
        }
        Insert: {
          created_at?: string
          id?: string
          pedido_id: string
          produto_id: string
          quantidade: number
          quantidade_recebida?: number
        }
        Update: {
          created_at?: string
          id?: string
          pedido_id?: string
          produto_id?: string
          quantidade?: number
          quantidade_recebida?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          created_at: string
          created_by: string
          data_pedido: string
          empresa_id: string
          endereco_entrega: string
          fornecedor: string
          id: string
          lista_ref: string | null
          nome: string
          numero: number
          origem: string
          rascunho: boolean
          received_at: string | null
          received_by: string | null
          status: Database["public"]["Enums"]["pedido_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string
          data_pedido?: string
          empresa_id: string
          endereco_entrega?: string
          fornecedor: string
          id?: string
          lista_ref?: string | null
          nome: string
          numero?: never
          origem?: string
          rascunho?: boolean
          received_at?: string | null
          received_by?: string | null
          status?: Database["public"]["Enums"]["pedido_status"]
        }
        Update: {
          created_at?: string
          created_by?: string
          data_pedido?: string
          empresa_id?: string
          endereco_entrega?: string
          fornecedor?: string
          id?: string
          lista_ref?: string | null
          nome?: string
          numero?: never
          origem?: string
          rascunho?: boolean
          received_at?: string | null
          received_by?: string | null
          status?: Database["public"]["Enums"]["pedido_status"]
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          cod: string
          codigo: string
          created_at: string
          estoque: number
          estoque_minimo: number
          id: string
          marca_id: string
          nome: string
          ordem: number
        }
        Insert: {
          cod?: string
          codigo?: string
          created_at?: string
          estoque?: number
          estoque_minimo?: number
          id?: string
          marca_id: string
          nome: string
          ordem?: number
        }
        Update: {
          cod?: string
          codigo?: string
          created_at?: string
          estoque?: number
          estoque_minimo?: number
          id?: string
          marca_id?: string
          nome?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "produtos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancelar_pedido: { Args: { _pedido_id: string }; Returns: undefined }
      confirmar_carga_full: { Args: { _carga_id: string }; Returns: Json }
      confirmar_recebimento_pedido: {
        Args: { _pedido_id: string }
        Returns: Json
      }
      definir_admin: {
        Args: { _admin: boolean; _user_id: string }
        Returns: undefined
      }
      gerar_pedidos_reposicao: {
        Args: {
          _chave: string
          _empresa_id: string
          _itens: Json
          _lista_ref: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      listar_usuarios_admin: {
        Args: never
        Returns: {
          criado_em: string
          email: string
          id: string
          is_admin: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      full_status: "planejada" | "confirmada"
      pedido_status: "planejado" | "recebido" | "cancelado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      full_status: ["planejada", "confirmada"],
      pedido_status: ["planejado", "recebido", "cancelado"],
    },
  },
} as const
