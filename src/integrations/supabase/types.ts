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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          moeda: string
          nome: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          moeda: string
          nome: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          moeda?: string
          nome?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ativos: {
        Row: {
          ativo: boolean | null
          classe: Database["public"]["Enums"]["classe_ativo"]
          created_at: string | null
          data_ultima_atualizacao_proventos: string | null
          data_ultimo_provento: string | null
          id: string
          moeda_base: Database["public"]["Enums"]["moeda"]
          nome: string | null
          ticker: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          classe: Database["public"]["Enums"]["classe_ativo"]
          created_at?: string | null
          data_ultima_atualizacao_proventos?: string | null
          data_ultimo_provento?: string | null
          id?: string
          moeda_base: Database["public"]["Enums"]["moeda"]
          nome?: string | null
          ticker: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          classe?: Database["public"]["Enums"]["classe_ativo"]
          created_at?: string | null
          data_ultima_atualizacao_proventos?: string | null
          data_ultimo_provento?: string | null
          id?: string
          moeda_base?: Database["public"]["Enums"]["moeda"]
          nome?: string | null
          ticker?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cash_transactions: {
        Row: {
          ativo_id: string | null
          conta_destino_id: string | null
          conta_origem_id: string | null
          created_at: string | null
          data: string
          descricao: string | null
          id: string
          moeda: string
          movimentacao_id: string | null
          tipo: Database["public"]["Enums"]["tipo_transacao_caixa"]
          updated_at: string | null
          user_id: string
          valor: number
        }
        Insert: {
          ativo_id?: string | null
          conta_destino_id?: string | null
          conta_origem_id?: string | null
          created_at?: string | null
          data: string
          descricao?: string | null
          id?: string
          moeda: string
          movimentacao_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_transacao_caixa"]
          updated_at?: string | null
          user_id: string
          valor: number
        }
        Update: {
          ativo_id?: string | null
          conta_destino_id?: string | null
          conta_origem_id?: string | null
          created_at?: string | null
          data?: string
          descricao?: string | null
          id?: string
          moeda?: string
          movimentacao_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_transacao_caixa"]
          updated_at?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_ativo_id_fkey"
            columns: ["ativo_id"]
            isOneToOne: false
            referencedRelation: "ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_conta_destino_id_fkey"
            columns: ["conta_destino_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_conta_destino_id_fkey"
            columns: ["conta_destino_id"]
            isOneToOne: false
            referencedRelation: "vw_saldo_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_conta_origem_id_fkey"
            columns: ["conta_origem_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_conta_origem_id_fkey"
            columns: ["conta_origem_id"]
            isOneToOne: false
            referencedRelation: "vw_saldo_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_movimentacao_id_fkey"
            columns: ["movimentacao_id"]
            isOneToOne: false
            referencedRelation: "movimentacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_financeiras: {
        Row: {
          ativa: boolean
          created_at: string | null
          id: string
          limite_mensal: number
          nome: string
          tipo: Database["public"]["Enums"]["tipo_categoria_financeira"]
          tipo_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string | null
          id?: string
          limite_mensal?: number
          nome: string
          tipo: Database["public"]["Enums"]["tipo_categoria_financeira"]
          tipo_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ativa?: boolean
          created_at?: string | null
          id?: string
          limite_mensal?: number
          nome?: string
          tipo?: Database["public"]["Enums"]["tipo_categoria_financeira"]
          tipo_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_financeiras_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "tipos_gasto"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_gastos: {
        Row: {
          categoria_id: string | null
          created_at: string | null
          descricao: string
          financeiro_mensal_id: string
          id: string
          updated_at: string | null
          user_id: string
          valor: number
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string | null
          descricao: string
          financeiro_mensal_id: string
          id?: string
          updated_at?: string | null
          user_id: string
          valor?: number
        }
        Update: {
          categoria_id?: string | null
          created_at?: string | null
          descricao?: string
          financeiro_mensal_id?: string
          id?: string
          updated_at?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_gastos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_gastos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "vw_gastos_por_categoria"
            referencedColumns: ["categoria_id"]
          },
          {
            foreignKeyName: "financeiro_gastos_financeiro_mensal_id_fkey"
            columns: ["financeiro_mensal_id"]
            isOneToOne: false
            referencedRelation: "financeiro_mensal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_gastos_financeiro_mensal_id_fkey"
            columns: ["financeiro_mensal_id"]
            isOneToOne: false
            referencedRelation: "vw_financeiro_mensal_acumulado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_gastos_financeiro_mensal_id_fkey"
            columns: ["financeiro_mensal_id"]
            isOneToOne: false
            referencedRelation: "vw_financeiro_mensal_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_gastos_financeiro_mensal_id_fkey"
            columns: ["financeiro_mensal_id"]
            isOneToOne: false
            referencedRelation: "vw_gastos_por_categoria"
            referencedColumns: ["financeiro_mensal_id"]
          },
          {
            foreignKeyName: "financeiro_gastos_financeiro_mensal_id_fkey"
            columns: ["financeiro_mensal_id"]
            isOneToOne: false
            referencedRelation: "vw_gastos_por_tipo"
            referencedColumns: ["financeiro_mensal_id"]
          },
        ]
      }
      financeiro_mensal: {
        Row: {
          ano: number
          created_at: string | null
          id: string
          mes: number
          observacao: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ano: number
          created_at?: string | null
          id?: string
          mes: number
          observacao?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ano?: number
          created_at?: string | null
          id?: string
          mes?: number
          observacao?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      financeiro_receitas: {
        Row: {
          created_at: string | null
          descricao: string
          financeiro_mensal_id: string
          id: string
          updated_at: string | null
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string | null
          descricao: string
          financeiro_mensal_id: string
          id?: string
          updated_at?: string | null
          user_id: string
          valor?: number
        }
        Update: {
          created_at?: string | null
          descricao?: string
          financeiro_mensal_id?: string
          id?: string
          updated_at?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_receitas_financeiro_mensal_id_fkey"
            columns: ["financeiro_mensal_id"]
            isOneToOne: false
            referencedRelation: "financeiro_mensal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_financeiro_mensal_id_fkey"
            columns: ["financeiro_mensal_id"]
            isOneToOne: false
            referencedRelation: "vw_financeiro_mensal_acumulado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_financeiro_mensal_id_fkey"
            columns: ["financeiro_mensal_id"]
            isOneToOne: false
            referencedRelation: "vw_financeiro_mensal_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_financeiro_mensal_id_fkey"
            columns: ["financeiro_mensal_id"]
            isOneToOne: false
            referencedRelation: "vw_gastos_por_categoria"
            referencedColumns: ["financeiro_mensal_id"]
          },
          {
            foreignKeyName: "financeiro_receitas_financeiro_mensal_id_fkey"
            columns: ["financeiro_mensal_id"]
            isOneToOne: false
            referencedRelation: "vw_gastos_por_tipo"
            referencedColumns: ["financeiro_mensal_id"]
          },
        ]
      }
      metas_alocacao: {
        Row: {
          ativo: boolean | null
          classe: Database["public"]["Enums"]["classe_ativo"]
          created_at: string | null
          id: string
          percentual_alvo: number
          user_id: string
          vigente_desde: string
        }
        Insert: {
          ativo?: boolean | null
          classe: Database["public"]["Enums"]["classe_ativo"]
          created_at?: string | null
          id?: string
          percentual_alvo: number
          user_id: string
          vigente_desde: string
        }
        Update: {
          ativo?: boolean | null
          classe?: Database["public"]["Enums"]["classe_ativo"]
          created_at?: string | null
          id?: string
          percentual_alvo?: number
          user_id?: string
          vigente_desde?: string
        }
        Relationships: []
      }
      movimentacoes: {
        Row: {
          ativo_id: string
          created_at: string | null
          data: string
          id: string
          moeda: Database["public"]["Enums"]["moeda"]
          observacao: string | null
          plataforma_id: string | null
          preco_unitario: number
          quantidade: number
          taxas: number | null
          tipo: Database["public"]["Enums"]["tipo_movimentacao"]
          user_id: string
          valor_total_informado: number | null
        }
        Insert: {
          ativo_id: string
          created_at?: string | null
          data: string
          id?: string
          moeda: Database["public"]["Enums"]["moeda"]
          observacao?: string | null
          plataforma_id?: string | null
          preco_unitario?: number
          quantidade?: number
          taxas?: number | null
          tipo: Database["public"]["Enums"]["tipo_movimentacao"]
          user_id: string
          valor_total_informado?: number | null
        }
        Update: {
          ativo_id?: string
          created_at?: string | null
          data?: string
          id?: string
          moeda?: Database["public"]["Enums"]["moeda"]
          observacao?: string | null
          plataforma_id?: string | null
          preco_unitario?: number
          quantidade?: number
          taxas?: number | null
          tipo?: Database["public"]["Enums"]["tipo_movimentacao"]
          user_id?: string
          valor_total_informado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_ativo_id_fkey"
            columns: ["ativo_id"]
            isOneToOne: false
            referencedRelation: "ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_plataforma_id_fkey"
            columns: ["plataforma_id"]
            isOneToOne: false
            referencedRelation: "plataformas"
            referencedColumns: ["id"]
          },
        ]
      }
      plataformas: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      precos_ativos: {
        Row: {
          ativo_id: string
          atualizado_em: string
          fonte: string | null
          id: string
          moeda: Database["public"]["Enums"]["moeda"]
          preco_atual: number
          user_id: string
        }
        Insert: {
          ativo_id: string
          atualizado_em?: string
          fonte?: string | null
          id?: string
          moeda: Database["public"]["Enums"]["moeda"]
          preco_atual: number
          user_id: string
        }
        Update: {
          ativo_id?: string
          atualizado_em?: string
          fonte?: string | null
          id?: string
          moeda?: Database["public"]["Enums"]["moeda"]
          preco_atual?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "precos_ativos_ativo_id_fkey"
            columns: ["ativo_id"]
            isOneToOne: false
            referencedRelation: "ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      proventos: {
        Row: {
          ativo_id: string
          cash_transaction_id: string | null
          conta_destino_id: string | null
          created_at: string | null
          data: string
          id: string
          moeda: Database["public"]["Enums"]["moeda"]
          observacao: string | null
          plataforma_id: string | null
          tipo: Database["public"]["Enums"]["tipo_provento"]
          user_id: string
          valor: number
        }
        Insert: {
          ativo_id: string
          cash_transaction_id?: string | null
          conta_destino_id?: string | null
          created_at?: string | null
          data: string
          id?: string
          moeda: Database["public"]["Enums"]["moeda"]
          observacao?: string | null
          plataforma_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_provento"]
          user_id: string
          valor: number
        }
        Update: {
          ativo_id?: string
          cash_transaction_id?: string | null
          conta_destino_id?: string | null
          created_at?: string | null
          data?: string
          id?: string
          moeda?: Database["public"]["Enums"]["moeda"]
          observacao?: string | null
          plataforma_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_provento"]
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "proventos_ativo_id_fkey"
            columns: ["ativo_id"]
            isOneToOne: false
            referencedRelation: "ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proventos_cash_transaction_id_fkey"
            columns: ["cash_transaction_id"]
            isOneToOne: false
            referencedRelation: "cash_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proventos_conta_destino_id_fkey"
            columns: ["conta_destino_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proventos_conta_destino_id_fkey"
            columns: ["conta_destino_id"]
            isOneToOne: false
            referencedRelation: "vw_saldo_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proventos_plataforma_id_fkey"
            columns: ["plataforma_id"]
            isOneToOne: false
            referencedRelation: "plataformas"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_gasto: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string
          ordem: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          ordem?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      vw_carteira_atual: {
        Row: {
          ativo_id: string | null
          atualizado_em: string | null
          classe: Database["public"]["Enums"]["classe_ativo"] | null
          custo_total: number | null
          lucro_prejuizo: number | null
          lucro_prejuizo_pct: number | null
          moeda_base: Database["public"]["Enums"]["moeda"] | null
          nome: string | null
          preco_atual: number | null
          preco_medio: number | null
          quantidade_total: number | null
          ticker: string | null
          user_id: string | null
          valor_atual: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_ativo_id_fkey"
            columns: ["ativo_id"]
            isOneToOne: false
            referencedRelation: "ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_financeiro_mensal_acumulado: {
        Row: {
          ano: number | null
          id: string | null
          mes: number | null
          observacao: string | null
          saldo_acumulado: number | null
          saldo_mes: number | null
          total_gastos: number | null
          total_receitas: number | null
          user_id: string | null
        }
        Insert: {
          ano?: number | null
          id?: string | null
          mes?: number | null
          observacao?: string | null
          saldo_acumulado?: never
          saldo_mes?: never
          total_gastos?: never
          total_receitas?: never
          user_id?: string | null
        }
        Update: {
          ano?: number | null
          id?: string | null
          mes?: number | null
          observacao?: string | null
          saldo_acumulado?: never
          saldo_mes?: never
          total_gastos?: never
          total_receitas?: never
          user_id?: string | null
        }
        Relationships: []
      }
      vw_financeiro_mensal_resumo: {
        Row: {
          ano: number | null
          id: string | null
          mes: number | null
          observacao: string | null
          saldo_mes: number | null
          total_gastos: number | null
          total_receitas: number | null
          user_id: string | null
        }
        Insert: {
          ano?: number | null
          id?: string | null
          mes?: number | null
          observacao?: string | null
          saldo_mes?: never
          total_gastos?: never
          total_receitas?: never
          user_id?: string | null
        }
        Update: {
          ano?: number | null
          id?: string | null
          mes?: number | null
          observacao?: string | null
          saldo_mes?: never
          total_gastos?: never
          total_receitas?: never
          user_id?: string | null
        }
        Relationships: []
      }
      vw_gastos_por_categoria: {
        Row: {
          ano: number | null
          categoria_id: string | null
          categoria_nome: string | null
          categoria_tipo:
            | Database["public"]["Enums"]["tipo_categoria_financeira"]
            | null
          financeiro_mensal_id: string | null
          limite_mensal: number | null
          mes: number | null
          saldo_categoria: number | null
          tipo_id: string | null
          tipo_nome: string | null
          total_gasto: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categorias_financeiras_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "tipos_gasto"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_gastos_por_tipo: {
        Row: {
          ano: number | null
          categoria_tipo:
            | Database["public"]["Enums"]["tipo_categoria_financeira"]
            | null
          financeiro_mensal_id: string | null
          mes: number | null
          tipo_id: string | null
          tipo_nome: string | null
          total_gasto: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categorias_financeiras_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "tipos_gasto"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_posicao_por_ativo: {
        Row: {
          ativo_id: string | null
          classe: Database["public"]["Enums"]["classe_ativo"] | null
          custo_total: number | null
          moeda_base: Database["public"]["Enums"]["moeda"] | null
          nome: string | null
          preco_medio: number | null
          quantidade_total: number | null
          ticker: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_ativo_id_fkey"
            columns: ["ativo_id"]
            isOneToOne: false
            referencedRelation: "ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_rebalanceamento: {
        Row: {
          classe: Database["public"]["Enums"]["classe_ativo"] | null
          diferenca: number | null
          percentual_alvo: number | null
          total_carteira: number | null
          user_id: string | null
          valor_atual: number | null
          valor_ideal: number | null
        }
        Relationships: []
      }
      vw_resumo_por_classe: {
        Row: {
          classe: Database["public"]["Enums"]["classe_ativo"] | null
          custo_total: number | null
          lucro_prejuizo: number | null
          user_id: string | null
          valor_atual: number | null
        }
        Relationships: []
      }
      vw_saldo_contas: {
        Row: {
          ativo: boolean | null
          id: string | null
          moeda: string | null
          nome: string | null
          saldo: number | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          id?: string | null
          moeda?: string | null
          nome?: string | null
          saldo?: never
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          id?: string | null
          moeda?: string | null
          nome?: string | null
          saldo?: never
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      classe_ativo: "renda_fixa" | "fii" | "acoes_br" | "acoes_eua" | "cripto"
      moeda: "BRL" | "USD"
      tipo_categoria_financeira: "essencial" | "nao_essencial" | "lazer"
      tipo_movimentacao: "compra" | "venda" | "aporte" | "saque"
      tipo_provento: "dividendo" | "jcp" | "rendimento" | "outros"
      tipo_transacao_caixa:
        | "DEPOSITO"
        | "PROVENTO"
        | "TRANSFERENCIA"
        | "APLICACAO"
        | "RESGATE"
        | "SAQUE"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      classe_ativo: ["renda_fixa", "fii", "acoes_br", "acoes_eua", "cripto"],
      moeda: ["BRL", "USD"],
      tipo_categoria_financeira: ["essencial", "nao_essencial", "lazer"],
      tipo_movimentacao: ["compra", "venda", "aporte", "saque"],
      tipo_provento: ["dividendo", "jcp", "rendimento", "outros"],
      tipo_transacao_caixa: [
        "DEPOSITO",
        "PROVENTO",
        "TRANSFERENCIA",
        "APLICACAO",
        "RESGATE",
        "SAQUE",
      ],
    },
  },
} as const
