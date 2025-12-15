// Database types for the Joana system
// Based on schema: drluisfarjallat

export type UUID = string

// ============================================
// Módulo 1: Configurações e Clínicas
// ============================================

export interface Configuracao {
    id: UUID
    chave: string
    valor: string
    tipo: 'text' | 'number' | 'boolean' | 'json'
    descricao?: string
    updated_at: string
}

export interface Clinica {
    id: UUID
    nome: string
    endereco: string
    telefone?: string
    whatsapp?: string
    cnpj?: string
    responsavel_tecnico?: string
    redes_sociais?: Record<string, string>
    google_maps_url?: string
    aceita_consultas: boolean
    aceita_aplicacoes: boolean
    ativo: boolean
    created_at: string
    updated_at: string
}

export interface HorarioFuncionamento {
    id: UUID
    clinica_id: UUID
    dia_semana?: number // 0-6, null = data específica
    data_especifica?: string
    hora_inicio: string
    hora_fim: string
    bloqueado: boolean
    motivo?: string
    created_at: string
}

// ============================================
// Módulo 2: Produtos e Estoque
// ============================================

export interface Categoria {
    id: UUID
    nome: string
    descricao?: string
    ativo: boolean
    ordem: number
    created_at: string
}

export interface Produto {
    id: UUID
    nome: string
    descricao?: string
    categoria_id?: UUID
    preco: number
    duracao_minutos?: number
    requer_agendamento: boolean
    requer_receita: boolean
    dosagem_mg?: number
    ativo: boolean
    created_at: string
    updated_at: string
    // Relations
    categoria?: Categoria
}

export interface Estoque {
    id: UUID
    produto_id: UUID
    clinica_id: UUID
    quantidade: number
    unidade: string
    data_validade?: string
    custo_unitario?: number
    updated_at: string
    // Relations
    produto?: Produto
    clinica?: Clinica
}

export interface MovimentacaoEstoque {
    id: UUID
    estoque_id: UUID
    tipo: 'entrada' | 'saida'
    quantidade: number
    motivo?: string
    referencia_id?: UUID
    referencia_tipo?: string
    observacoes?: string
    created_at: string
}

export interface PlanoAcompanhamento {
    id: UUID
    produto_id: UUID
    duracao_media_semanas?: number
    quantidade_medicamento_mg?: number
    inclui_nutricionista: boolean
    inclui_preparador_fisico: boolean
    inclui_consultas_medico: number
    frequencia_aplicacoes: string
    observacoes?: string
    created_at: string
    updated_at: string
    // Relations
    produto?: Produto
}

// ============================================
// Módulo 3: CRM
// ============================================

export interface OrigemLead {
    id: UUID
    nome: string
    ativo: boolean
}

export interface Lead {
    id: UUID
    nome: string
    telefone: string
    email?: string
    origem_id?: UUID
    fase_funil: 'novo' | 'contato_feito' | 'interessado' | 'agendado' | 'convertido' | 'perdido'
    qualificado: boolean
    notas?: string
    created_at: string
    updated_at: string
    // Relations
    origem?: OrigemLead
}

export interface Paciente {
    id: UUID
    lead_id?: UUID
    nome: string
    telefone: string
    email?: string
    cpf?: string
    rg?: string
    data_nascimento?: string
    sexo?: string
    profissao?: string
    estado_civil?: string
    convenio_medico?: string
    endereco?: string
    foto_url?: string
    altura_cm?: number
    peso_inicial_kg?: number
    peso_atual_kg?: number
    objetivo_peso_kg?: number
    comorbidades?: string[]
    medicamentos_uso?: string
    alergias?: string
    historico_cirurgias?: string
    observacoes_medicas?: string
    circunferencia_abdominal_cm?: number
    dados_extras?: Record<string, unknown>
    asaas_customer_id?: string
    ativo: boolean
    created_at: string
    updated_at: string
}

export interface TipoProfissional {
    id: UUID
    nome: string
    ativo: boolean
}

export interface Profissional {
    id: UUID
    nome: string
    tipo_id?: UUID
    telefone?: string
    email?: string
    registro_profissional?: string
    valor_hora?: number
    ativo: boolean
    created_at: string
    updated_at: string
    // Relations
    tipo?: TipoProfissional
}

export interface Oportunidade {
    id: UUID
    lead_id?: UUID
    paciente_id?: UUID
    produto_id?: UUID
    status: 'aberta' | 'em_negociacao' | 'ganha' | 'perdida'
    valor_estimado?: number
    notas?: string
    created_at: string
    updated_at: string
    // Relations
    lead?: Lead
    paciente?: Paciente
    produto?: Produto
}

export interface Interacao {
    id: UUID
    lead_id?: UUID
    paciente_id?: UUID
    tipo: string
    canal?: string
    conteudo?: string
    agente?: string
    metadata?: Record<string, unknown>
    created_at: string
}

// ============================================
// Módulo 4: Agendamentos
// ============================================

export interface TipoAgendamento {
    id: UUID
    nome: string
    duracao_padrao_minutos: number
    cor?: string
    ativo: boolean
}

export interface Agendamento {
    id: UUID
    paciente_id: UUID
    profissional_id?: UUID
    clinica_id?: UUID
    tipo_id?: UUID
    inscricao_plano_id?: UUID
    data_hora: string
    duracao_minutos: number
    status: 'agendado' | 'confirmado' | 'em_andamento' | 'concluido' | 'cancelado' | 'faltou'
    link_reuniao?: string
    observacoes?: string
    created_at: string
    updated_at: string
    // Relations
    paciente?: Paciente
    profissional?: Profissional
    clinica?: Clinica
    tipo?: TipoAgendamento
}

export interface EscalaProfissional {
    id: UUID
    profissional_id: UUID
    clinica_id: UUID
    data: string
    hora_inicio_prevista: string
    hora_fim_prevista: string
    hora_entrada_real?: string
    hora_saida_real?: string
    observacoes?: string
    created_at: string
    // Relations
    profissional?: Profissional
    clinica?: Clinica
}

// ============================================
// Módulo 5: Financeiro
// ============================================

export interface Cobranca {
    id: UUID
    paciente_id: UUID
    produto_id?: UUID
    inscricao_plano_id?: UUID
    asaas_payment_id?: string
    asaas_invoice_url?: string
    valor: number
    parcelas: number
    parcelas_sem_juros: number
    status: 'pendente' | 'aguardando_pagamento' | 'confirmado' | 'recebido' | 'vencido' | 'cancelado'
    data_vencimento?: string
    data_pagamento?: string
    forma_pagamento?: string
    notas?: string
    created_at: string
    updated_at: string
    // Relations
    paciente?: Paciente
    produto?: Produto
}

// ============================================
// Módulo 6: Acompanhamento
// ============================================

export interface InscricaoPlano {
    id: UUID
    paciente_id: UUID
    plano_id?: UUID
    cobranca_id?: UUID
    nutricionista_id?: UUID
    preparador_fisico_id?: UUID
    medicamento_total_mg?: number
    medicamento_aplicado_mg: number
    data_inicio: string
    data_fim_prevista?: string
    status: 'ativo' | 'pausado' | 'concluido' | 'cancelado'
    consultas_disponiveis: number
    observacoes?: string
    created_at: string
    updated_at: string
}

export interface Aplicacao {
    id: UUID
    inscricao_plano_id?: UUID
    paciente_id?: UUID
    agendamento_id?: UUID
    enfermeiro_id?: UUID
    produto_id?: UUID
    data_aplicacao: string
    dose_mg: number
    lote?: string
    // Bioimpedância
    bioimpedancia_imagem_url?: string
    peso_kg?: number
    massa_gorda_kg?: number
    massa_muscular_kg?: number
    imc?: number
    taxa_gordura_percentual?: number
    gordura_visceral?: number
    taxa_metabolica_basal?: number
    idade_corporal?: number
    pontuacao_corporal?: number
    bioimpedancia_extras?: Record<string, unknown>
    observacoes?: string
    created_at: string
}

export interface PlanoAlimentar {
    id: UUID
    paciente_id: UUID
    inscricao_plano_id?: UUID
    nutricionista_id?: UUID
    data_criacao: string
    arquivo_url?: string
    conteudo?: string
    objetivo?: string
    calorias_diarias?: number
    observacoes?: string
    ativo: boolean
    created_at: string
}

export interface Treino {
    id: UUID
    paciente_id: UUID
    inscricao_plano_id?: UUID
    preparador_fisico_id?: UUID
    data_criacao: string
    arquivo_url?: string
    conteudo?: string
    objetivo?: string
    frequencia_semanal?: number
    observacoes?: string
    ativo: boolean
    created_at: string
}

export interface RegistroTreino {
    id: UUID
    paciente_id: UUID
    treino_id?: UUID
    data: string
    concluido: boolean
    observacoes?: string
    created_at: string
}

// ============================================
// Módulo 7: Operacional
// ============================================

export interface DuvidaClinica {
    id: UUID
    paciente_id?: UUID
    lead_id?: UUID
    telefone_origem: string
    mensagem_id?: string
    categoria?: string
    pergunta: string
    resposta?: string
    status: 'pendente' | 'enviada_doutor' | 'respondida' | 'entregue'
    data_pergunta: string
    data_resposta?: string
    created_at: string
}

export interface TipoTarefa {
    id: UUID
    nome: string
    ativo: boolean
}

export interface TarefaPendente {
    id: UUID
    paciente_id?: UUID
    tipo_id?: UUID
    descricao: string
    prioridade: 'baixa' | 'normal' | 'alta' | 'urgente'
    status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'
    criado_por?: string
    data_solicitacao: string
    data_conclusao?: string
    observacoes?: string
    created_at: string
}

// ============================================
// Módulo 8: IA Interna
// ============================================

export interface ChatThread {
    id: UUID
    user_id: UUID
    paciente_id?: UUID
    profissional_id?: UUID
    title?: string
    model?: string
    created_at: string
    updated_at: string
}

export interface ChatMessage {
    id: UUID
    thread_id: UUID
    role: 'user' | 'assistant' | 'system'
    content: string
    tokens_used?: number
    created_at: string
}
