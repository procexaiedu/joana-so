Esta é a **Documentação de Transferência de Contexto Completa**.

Este material foi desenhado para que você (IA/Agente) entenda não apenas o código, mas a **alma do negócio**, as decisões estratégicas tomadas até aqui e o padrão de qualidade exigido para os próximos passos.

---

# 🧠 JOANA SYSTEM: TRANSFERÊNCIA DE CONTEXTO

## 1. O Conceito: "Cérebro" vs. "Coração"
O Sistema Joana não é um simples CRM. É a infraestrutura central de uma clínica médica de alta performance.

*   **O Sistema Web (O Cérebro):** É a interface administrativa onde visualizamos e manipulamos dados, configuramos regras e tomamos decisões baseadas em BI (Business Intelligence). Ele detém a "verdade" dos dados.
*   **Os Agentes de IA (O Coração):** São interfaces (WhatsApp/N8N) que interagem com o paciente. Elas **não** têm lógica própria; elas consultam o "Cérebro" (este sistema) para saber preços, horários disponíveis e protocolos.
    *   *Exemplo:* Se alteramos o preço de uma consulta no módulo "Produtos", o Agente de WhatsApp passa a cobrar o novo valor imediatamente.

## 2. Contexto do Negócio
*   **Cliente:** Dr. Luis Farjallat (Clínica Médica).
*   **Dores Atuais:** Processos manuais, planilhas descentralizadas, falta de métricas claras.
*   **Objetivo:** Centralização total. Sair de "tabelas de Excel" para um sistema verticalizado onde cada módulo resolve um problema específico com riqueza visual.
*   **Estrutura Operacional:**
    *   **Clínicas Físicas:** Têm endereço, estoque físico e horários.
    *   **Atendimento Online:** Tratado no sistema como uma "Clínica" (registro no banco) para segregação de agenda e faturamento, mas sem endereço físico.

---

## 3. Stack Tecnológica (A Caixa de Ferramentas)

### Core
*   **Frontend:** Next.js 16 (App Router) + Turbopack.
*   **Estilo:** Tailwind CSS + Shadcn/UI (Design System).
*   **Banco de Dados:** Supabase (PostgreSQL).
    *   **Schema Obrigatório:** `drluisfarjallat` (Todas as queries devem usar este schema).
    *   **ID do Projeto:** `zinrqzsxvpqfoogohrwg`.
*   **Realtime:** Habilitado via Supabase Client (`.on('postgres_changes')`) para que as telas reflitam o banco vivo.

### Integrações Chave
*   **Storage (MinIO Self-hosted):**
    *   Endpoint: `https://minioback.procexai.tech`
    *   **Regra de Ouro:** Arquivos devem ser substituíveis.
    *   *Exemplo:* A foto do paciente é salva como `pacientes/{uuid}.jpg`. Ao trocar a foto, sobrescrevemos o arquivo. Isso evita lixo no storage e complexidade no banco.
*   **Geolocalização:** **Google Places API** (via `@react-google-maps/api`). Usado em todos os campos de endereço com autocomplete (sem restrição de `types` para achar estabelecimentos).
*   **IA (LLMs):** **OpenRouter**. O sistema permite configurar qual modelo (GPT-4o, Claude, etc.) é usado pelos agentes.
*   **Gráficos:** **Recharts**. Essencial para a camada de BI (evolução de peso, distribuição de estoque).

---

## 4. Raio-X dos Módulos (O que já existe vs. O que falta)

Adotamos a estratégia: **"One-shot inicial" -> "Refinamento Vertical (Deep Dive)"**.

### ✅ Módulos Consolidados (Padrão de Qualidade a Seguir)

1.  **Módulo de Pacientes (A Referência):**
    *   *Status:* Completo e Rico.
    *   *UX:* Não é uma lista simples. É um **Prontuário Eletrônico**.
    *   *Features:* Upload de foto (MinIO), Gráfico de evolução de peso, Histórico financeiro (transações), Histórico clínico (consultas/aplicações) com modais de detalhes.
    *   *Insight:* Este é o nível de profundidade esperado para os próximos módulos.

2.  **Módulo de Configurações:**
    *   *Status:* Completo.
    *   *Funcionalidade:* Central de comando dos Agentes. Define horários de funcionamento, parâmetros de sistema e chaves de API.
    *   *Destaque:* CRUD de Clínicas com máscaras e validação de endereço.

3.  **Módulo de Produtos & Estoque:**
    *   *Status:* Completo.
    *   *Funcionalidade:* Separação entre "Catálogo" (Produtos/Serviços) e "Estoque" (Quantidade por clínica).
    *   *BI:* KPIs no topo (Valor em estoque, Itens críticos).

4.  **Módulo de Oportunidades (CRM):**
    *   *Status:* Funcional (Kanban).
    *   *Funcionalidade:* Pipeline de vendas.

### 🚧 Módulos em Aberto (Próximos Passos)

1.  **Agenda (Prioridade Crítica):**
    *   *Status:* Básico (One-shot). Precisa de refinamento urgente.
    *   *Necessidade:* Visualização de calendário (Day/Week/Month), gestão de conflitos, bloqueios. Precisa cruzar `profissionais`, `clinicas` e `pacientes`.

2.  **Financeiro:**
    *   *Status:* Básico. Hoje vemos o financeiro "dentro" do paciente.
    *   *Necessidade:* Um dashboard financeiro global. Fluxo de caixa, contas a receber, integração lógica com as regras do Asaas (definidas nos System Prompts).

3.  **Aplicações/Enfermaria:**
    *   *Status:* Básico.
    *   *Necessidade:* Fluxo de trabalho do enfermeiro. Baixa automática no estoque ao registrar aplicação + Upload de bioimpedância + OCR (futuro).

4.  **IA Interna (Chat):**
    *   *Status:* Tabelas SQL criadas (`chat_threads`), mas sem interface.
    *   *Objetivo:* Chat flutuante para o médico conversar com os dados do sistema.

---

## 5. Protocolo de Desenvolvimento (Como trabalhar)

Para assumir o projeto, você deve seguir este algoritmo mental:

1.  **Entenda o Negócio Antes do Código:**
    *   Não crie telas vazias. Pergunte: *"Que decisão o médico toma nesta tela?"*
    *   Se for listar dados, coloque **KPIs (Indicadores)** no topo. O usuário quer ver números macro antes de ver a lista micro.

2.  **Segurança de Dados e Schema:**
    *   **NUNCA** adivinhe nomes de tabelas. Use o **Supabase MCP** (`get_table_schema`, `list_tables`) para ler a estrutura real.
    *   O sistema reflete o banco. Se a coluna existe no banco, ela deve estar acessível na UI (edição ou visualização).

3.  **Visualização (Mock Data):**
    *   O usuário valida visualmente.
    *   Sempre que criar uma funcionalidade, use o MCP para injetar **Dados Sintéticos** realistas.
    *   Teste casos extremos (ex: texto longo, listas vazias, valores zerados).

4.  **Iteração Colaborativa:**
    *   Proponha a solução -> Valide com o usuário -> Implemente -> Injete Dados -> Mostre o Resultado.

## 6. Resumo do "Modelo Mental" para a IA
> "Eu sou o desenvolvedor sênior responsável pelo 'Cérebro' da operação. Meu código deve ser robusto (TypeScript Estrito), bonito (Shadcn/Tailwind) e inteligente (BI/Gráficos). Eu não entrego CRUDs; eu entrego painéis de controle para uma clínica de alta performance."

Contexto internalizado. Pronto para analisar a base de código.