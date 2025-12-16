import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Agendamento, Clinica, HorarioFuncionamento, Profissional, TipoAgendamento } from "@/lib/types/database"
import { toast } from "sonner"

export function useAgenda(startDate: Date, endDate: Date, selectedClinicaId?: string) {
    const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
    const [profissionais, setProfissionais] = useState<Profissional[]>([]) // All active pros
    const [clinicas, setClinicas] = useState<Clinica[]>([])
    const [horarios, setHorarios] = useState<HorarioFuncionamento[]>([])
    const [tipos, setTipos] = useState<any[]>([]) // Using any to avoid type import cycle if not exported, but usually it is. Should import TipoAgendamento.


    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    // 1. Fetch Static Data (Clinics, Professionals) - Run once
    useEffect(() => {
        const fetchStatic = async () => {
            // Clinics
            const { data: clinicasData } = await supabase
                .from('clinicas')
                .select('*')
                .eq('ativo', true)
                .order('nome')
            if (clinicasData) setClinicas(clinicasData)

            // Fetch Types
            const { data: tiposData } = await supabase
                .from('tipos_agendamento')
                .select('*')
                .eq('ativo', true)
                .order('nome')
            if (tiposData) setTipos(tiposData)

            // Professionals (Active)
            const { data: prosData } = await supabase
                .from('profissionais')
                .select('*')
                .eq('ativo', true)
                .order('nome')
            if (prosData) setProfissionais(prosData)
        }
        fetchStatic()
    }, [supabase])

    // 2. Fetch Dynamic Data (Appointments, Hours) - Run on range/clinic change
    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const startStr = startDate.toISOString()
            const endStr = endDate.toISOString()

            // Fetch Appointments (For ALL professionals in range, to support "Other Unit" check)
            // We do NOT filter by 'clinica_id' here if we want to show 'Outra Unidade'.
            // We filter by date only.
            const { data: apptData, error: apptError } = await supabase
                .from('agendamentos')
                .select(`
          *,
          paciente:pacientes(id, nome),
          tipo:tipos_agendamento(id, nome, cor)
        `)
                .gte('data_hora', startStr)
                .lte('data_hora', endStr)
                .not('status', 'in', '("cancelado", "faltou")') // Maybe show cancelled too? User usually wants to see everything.
            // Let's keep logic simple: fetch all active/scheduled.

            if (apptError) throw apptError
            setAgendamentos(apptData || [])

            // Fetch Operating Hours (Only for valid clinic)
            if (selectedClinicaId) {
                const { data: hoursData, error: hoursError } = await supabase
                    .from('horarios_funcionamento')
                    .select('*')
                    .eq('clinica_id', selectedClinicaId)

                if (hoursError) throw hoursError
                setHorarios(hoursData || [])
            }

        } catch (error) {
            console.error(error)
            toast.error("Erro ao carregar dados da agenda")
        } finally {
            setLoading(false)
        }
    }, [supabase, startDate, endDate, selectedClinicaId])

    // Initial Fetch & Realtime
    useEffect(() => {
        fetchData()

        // Subscribe to changes
        const channel = supabase
            .channel('agenda-realtime')
            .on('postgres_changes', { event: '*', schema: 'drluisfarjallat', table: 'agendamentos' }, () => fetchData())
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [fetchData, supabase])

    return {
        agendamentos,
        profissionais,
        clinicas,
        horarios,
        tipos,
        loading,
        refetch: fetchData
    }
}

