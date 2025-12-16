import { createClient } from "@/lib/supabase/client"
import { useCallback, useState } from "react"
import { toast } from "sonner"

interface AvailableSlot {
    slot_inicio: string // TIME format HH:MM:SS
}

export function useAgendaAvailability() {
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    // Function to fetch available slots
    const checkAvailability = useCallback(async (
        clinicaId: string,
        profissionalId: string,
        date: Date,
        duracaoMinutos: number = 30
    ): Promise<string[]> => {
        setLoading(true)
        try {
            // Format date as YYYY-MM-DD for the RPC
            const formattedDate = date.toISOString().split('T')[0]

            const { data, error } = await supabase.rpc('get_available_slots', {
                p_clinica_id: clinicaId,
                p_profissional_id: profissionalId,
                p_data: formattedDate,
                p_duracao_minutos: duracaoMinutos
            })

            if (error) {
                console.error('Error fetching availability:', error)
                toast.error('Erro ao verificar disponibilidade')
                return []
            }

            // Return array of start times (e.g. ["08:00:00", "08:30:00"])
            // We might want to format them to HH:mm
            return (data as AvailableSlot[]).map(slot => slot.slot_inicio.slice(0, 5))
        } catch (err) {
            console.error(err)
            return []
        } finally {
            setLoading(false)
        }
    }, [supabase])

    return {
        checkAvailability,
        loading
    }
}
