-- Create the function in the drluisfarjallat schema
CREATE OR REPLACE FUNCTION drluisfarjallat.get_available_slots(
    p_clinica_id UUID,
    p_profissional_id UUID,
    p_data DATE,
    p_duracao_minutos INT DEFAULT 30
)
RETURNS TABLE (
    slot_inicio TIME
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r_horario RECORD;
    v_dia_semana INT;
    v_intervalo_minutos INT := 30; -- Grid padrão de 30min? Poderia ser parametrizavel
    v_hora_atual TIME;
    v_hora_fim TIME;
    v_slot_fim TIME;
    v_ocupado BOOLEAN;
BEGIN
    -- 1. Identificar dia da semana (0=Dom, 6=Sab)
    v_dia_semana := EXTRACT(DOW FROM p_data);

    -- 2. Buscar regras de funcionamento para este dia e clínica
    -- Prioridade: Data Específica > Dia da Semana Padrão
    -- Se houver bloqueio (bloqueado=true), ignoramos intervalos
    
    FOR r_horario IN 
        SELECT hora_inicio, hora_fim, bloqueado 
        FROM drluisfarjallat.horarios_funcionamento 
        WHERE clinica_id = p_clinica_id 
        AND (
            (data_especifica = p_data) 
            OR 
            (data_especifica IS NULL AND dia_semana = v_dia_semana)
        )
        -- Se houver conflito (ex: regra dia da semana E regra data específica), a data específica ganha?
        -- Na query acima, pegamos TUDO que bate.
        -- Precisamos ordenar para que data_especifica tenha prioridade de "override" se existir.
        ORDER BY data_especifica NULLS LAST
    LOOP
        -- Se for um bloqueio explícito para esta data, paramos e não retornamos nada (ou continuamos se houver múltiplos ranges?)
        -- Assumindo: Se tem UM bloqueio específico "Dia Inteiro", a clínica tá fechada.
        IF r_horario.bloqueado THEN
             -- Se é bloqueio, não gera slots neste range. 
             -- Mas se tivermos outros ranges abertos? 
             -- Lógica simplificada: Se achou um bloqueio que cobre o dia ou horário, ignora.
             CONTINUE;
        END IF;

        -- Loop para gerar slots dentro deste range de funcionamento
        v_hora_atual := r_horario.hora_inicio;
        v_hora_fim := r_horario.hora_fim;

        WHILE v_hora_atual + (p_duracao_minutos || ' minutes')::INTERVAL <= v_hora_fim LOOP
            v_slot_fim := v_hora_atual + (p_duracao_minutos || ' minutes')::INTERVAL;

            -- 3. CHECK GLOBAL: O profissional está ocupado em QUALQUER lugar?
            SELECT EXISTS (
                SELECT 1 
                FROM drluisfarjallat.agendamentos a
                WHERE a.profissional_id = p_profissional_id
                  AND a.status NOT IN ('cancelado', 'faltou') -- Ignora cancelados
                  AND a.data_hora::DATE = p_data
                  AND (
                      -- Lógica de Overlay de Intervalo
                      (a.data_hora::TIME, a.data_hora::TIME + (a.duracao_minutos || ' minutes')::INTERVAL) 
                      OVERLAPS 
                      (v_hora_atual, v_slot_fim)
                  )
            ) INTO v_ocupado;

            -- Se não estiver ocupado, adiciona à lista
            IF NOT v_ocupado THEN
                slot_inicio := v_hora_atual;
                RETURN NEXT;
            END IF;

            -- Avança para o próximo slot
            v_hora_atual := v_hora_atual + (v_intervalo_minutos || ' minutes')::INTERVAL;
        END LOOP;
        
    END LOOP;
    
    RETURN;
END;
$$;
