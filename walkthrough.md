# Documentação Técnica: IA de Agendamento

Este documento descreve a arquitetura completa do sistema de agendamento para integração com a IA via n8n.

---

## 1. Estrutura do Banco de Dados (Schema: `drluisfarjallat`)

### Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `agendas` | Tipos de serviço (Aplicações, Atendimento) |
| `clinicas` | Unidades de atendimento |
| `clinicas_agendas` | Relação N:N entre clínicas e agendas |
| `produtos` | Serviços/produtos oferecidos (Vitamina D, Consulta, etc.) |
| `profissionais` | Médicos e equipe |
| `agendamentos` | Compromissos marcados |
| `horarios_funcionamento` | Regras de horário por clínica/dia |

### Colunas Importantes

```sql
-- agendas
id UUID, nome TEXT, ativo BOOLEAN

-- clinicas
id UUID, nome TEXT, ativo BOOLEAN

-- clinicas_agendas (Junction Table)
clinica_id UUID, agenda_id UUID

-- produtos
id UUID, nome TEXT, agenda_id UUID, duracao_minutos INT, ativo BOOLEAN

-- agendamentos
id UUID, paciente_id UUID, profissional_id UUID, clinica_id UUID,
data_hora TIMESTAMPTZ, duracao_minutos INT, status TEXT
-- status: 'agendado', 'confirmado', 'em_atendimento', 'concluido', 'cancelado', 'faltou'
```

---

## 2. Fluxo Lógico para Verificar Disponibilidade

### Passo 1: Identificar o Produto/Serviço
Quando o cliente pede algo (ex: "aplicação de vitamina D"), a IA deve:
1. Buscar o produto pelo nome ou contexto
2. Obter o `agenda_id` do produto

```sql
SELECT id, nome, agenda_id, duracao_minutos 
FROM drluisfarjallat.produtos 
WHERE nome ILIKE '%vitamina%' AND ativo = true;
```

**Resultado Esperado:**
| id | nome | agenda_id | duracao_minutos |
|----|------|-----------|-----------------|
| uuid1 | Vitamina D3 50.000UI | uuid_aplicacoes | 15 |

---

### Passo 2: Filtrar Clínicas que Oferecem essa Agenda
Com o `agenda_id`, buscar quais clínicas suportam esse tipo de serviço:

```sql
SELECT c.id, c.nome 
FROM drluisfarjallat.clinicas c
INNER JOIN drluisfarjallat.clinicas_agendas ca ON c.id = ca.clinica_id
WHERE ca.agenda_id = 'uuid_aplicacoes' AND c.ativo = true;
```

**Resultado Esperado:**
| id | nome |
|----|------|
| uuid_jardins | Clínica Jardins |
| uuid_bor | Clínica do Bor |

---

### Passo 3: Verificar Disponibilidade de Horários
Para cada clínica válida, chamar a função RPC:

```sql
SELECT slot_inicio 
FROM drluisfarjallat.get_available_slots(
    'uuid_clinica',      -- clinica_id
    'uuid_profissional', -- profissional_id (ex: Dr. Luis)
    '2024-12-16',        -- data desejada
    15                   -- duração em minutos (do produto)
);
```

**Resultado Esperado:**
| slot_inicio |
|-------------|
| 14:00:00 |
| 14:30:00 |
| 15:00:00 |
| 17:00:00 |
| 17:30:00 |

---

## 3. O que a Função `get_available_slots` Faz Internamente

1. **Identifica o dia da semana** da data solicitada
2. **Busca horários de funcionamento** da clínica:
   - Primeiro: Regras de data específica (feriados, exceções)
   - Fallback: Regras padrão do dia da semana
3. **Gera slots** a cada 30 minutos dentro do horário de funcionamento
4. **Verifica conflitos globais**: Para cada slot, checa se o profissional tem QUALQUER agendamento ativo em QUALQUER clínica nesse horário
5. **Retorna apenas slots livres**

### A "Trava Global"
Se o profissional está na Clínica A das 08:00-12:00, esses horários **não aparecem** quando você busca disponibilidade na Clínica B. O profissional é tratado como recurso único.

---

## 4. Dados que a IA Deve Ter no System Prompt

Para evitar chamadas desnecessárias ao banco, passar estaticamente:

### Agendas Disponíveis
```json
{
  "agendas": [
    {"id": "uuid1", "nome": "Aplicações"},
    {"id": "uuid2", "nome": "Atendimento"}
  ]
}
```

### Clínicas e Suas Agendas
```json
{
  "clinicas": [
    {
      "id": "uuid_jardins",
      "nome": "Clínica Jardins",
      "agendas": ["Aplicações", "Atendimento"]
    },
    {
      "id": "uuid_centro",
      "nome": "Clínica Centro",
      "agendas": ["Atendimento"]
    }
  ]
}
```

### Produtos com Suas Agendas
```json
{
  "produtos": [
    {"nome": "Vitamina D3 50.000UI", "agenda": "Aplicações", "duracao": 15},
    {"nome": "Consulta Nutrologia", "agenda": "Atendimento", "duracao": 60},
    {"nome": "Tirzepatida 5mg", "agenda": "Aplicações", "duracao": 15}
  ]
}
```

---

## 5. Fluxo Completo da IA

```
USUÁRIO: "Quero aplicar vitamina D amanhã de tarde"

IA (interno):
1. Produto = "Vitamina D" → agenda = "Aplicações", duração = 15min
2. Filtrar: Clínicas que fazem "Aplicações" = [Jardins, Bor]
3. Data: Amanhã
4. Período: 12:00 - 18:00 (tarde)
5. Para cada clínica válida:
   - Chamar get_available_slots(clinica, profissional, data, 15)
   - Filtrar slots >= 12:00 AND <= 18:00

IA (resposta):
"Tenho horários disponíveis para vitamina D amanhã:
- Clínica Jardins: 14:00, 14:30, 15:00
- Clínica do Bor: 17:00, 17:30
Qual prefere?"
```

---

## 6. Query para Montar o System Prompt (Dados Dinâmicos)

Executar no n8n para gerar o contexto estático:

```sql
-- Agendas
SELECT id, nome FROM drluisfarjallat.agendas WHERE ativo = true;

-- Clínicas com suas agendas
SELECT 
  c.id, 
  c.nome, 
  array_agg(a.nome) as agendas
FROM drluisfarjallat.clinicas c
LEFT JOIN drluisfarjallat.clinicas_agendas ca ON c.id = ca.clinica_id
LEFT JOIN drluisfarjallat.agendas a ON ca.agenda_id = a.id
WHERE c.ativo = true
GROUP BY c.id, c.nome;

-- Produtos com agenda
SELECT 
  p.nome, 
  a.nome as agenda, 
  p.duracao_minutos
FROM drluisfarjallat.produtos p
LEFT JOIN drluisfarjallat.agendas a ON p.agenda_id = a.id
WHERE p.ativo = true AND p.agenda_id IS NOT NULL;

-- Profissionais
SELECT id, nome FROM drluisfarjallat.profissionais WHERE ativo = true;
```

---

## 7. Chamada RPC via n8n (Postgres Node)

Para verificar disponibilidade dinamicamente:

```sql
SELECT slot_inicio::TEXT 
FROM drluisfarjallat.get_available_slots(
    $1::UUID,  -- clinica_id
    $2::UUID,  -- profissional_id
    $3::DATE,  -- data
    $4::INT    -- duracao_minutos
)
WHERE slot_inicio >= $5::TIME  -- hora_inicio (ex: '14:00')
  AND slot_inicio <= $6::TIME; -- hora_fim (ex: '18:00')
```

Parâmetros:
- `$1`: UUID da clínica (filtrada por agenda)
- `$2`: UUID do profissional
- `$3`: Data no formato 'YYYY-MM-DD'
- `$4`: Duração do serviço em minutos
- `$5`: Hora início do filtro (opcional)
- `$6`: Hora fim do filtro (opcional)

---

## 8. Regras de Negócio Importantes

1. **Profissional é recurso global**: Não pode estar em duas clínicas ao mesmo tempo
2. **Clínica define horário de funcionamento**: Se fechada, não retorna slots
3. **Agenda define elegibilidade**: Cliente só pode agendar em clínicas que oferecem a agenda do produto
4. **Status válidos para conflito**: Ignorar `cancelado` e `faltou`
5. **Exceções de data**: Feriados e bloqueios específicos sobrepõem regras padrão

---

## 9. Resumo Visual

```
┌─────────────────┐
│ Usuário pede    │
│ "Vitamina D"    │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Produto         │
│ ↓ agenda_id     │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Filtrar Clínicas│
│ por agenda      │
└────────┬────────┘
         ▼
┌─────────────────┐
│ get_available   │
│ _slots() RPC    │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Slots Livres    │
│ (considerando   │
│ conflitos       │
│ globais)        │
└─────────────────┘
```
