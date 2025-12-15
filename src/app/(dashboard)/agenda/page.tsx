'use client'

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState, useCallback } from "react"
import { Agendamento, Paciente, Profissional, Clinica } from "@/lib/types/database"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, User, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"

const STATUS_OPTIONS = [
    { value: 'agendado', label: 'Agendado', color: 'bg-blue-500' },
    { value: 'confirmado', label: 'Confirmado', color: 'bg-green-500' },
    { value: 'em_andamento', label: 'Em Andamento', color: 'bg-yellow-500' },
    { value: 'concluido', label: 'Concluído', color: 'bg-gray-500' },
    { value: 'cancelado', label: 'Cancelado', color: 'bg-red-500' },
    { value: 'faltou', label: 'Faltou', color: 'bg-red-300' },
]

export default function AgendaPage() {
    const [agendamentos, setAgendamentos] = useState<(Agendamento & { paciente: Paciente; profissional?: Profissional; clinica?: Clinica })[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const supabase = createClient()

    const fetchAgendamentos = useCallback(async () => {
        const startOfDay = `${selectedDate}T00:00:00`
        const endOfDay = `${selectedDate}T23:59:59`

        const { data, error } = await supabase
            .from('agendamentos')
            .select('*, paciente:pacientes(*), profissional:profissionais(*), clinica:clinicas(*)')
            .gte('data_hora', startOfDay)
            .lte('data_hora', endOfDay)
            .order('data_hora')

        if (error) {
            toast.error('Erro ao carregar agenda')
            console.error(error)
        } else {
            setAgendamentos(data || [])
        }
        setLoading(false)
    }, [supabase, selectedDate])

    useEffect(() => {
        fetchAgendamentos()
        const channel = supabase
            .channel('agenda-changes')
            .on('postgres_changes', { event: '*', schema: 'drluisfarjallat', table: 'agendamentos' }, () => fetchAgendamentos())
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [supabase, fetchAgendamentos])

    const handleStatusChange = async (id: string, newStatus: string) => {
        const { error } = await supabase
            .from('agendamentos')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', id)

        if (error) toast.error('Erro ao atualizar status')
        else toast.success('Status atualizado!')
    }

    const changeDate = (days: number) => {
        const date = new Date(selectedDate)
        date.setDate(date.getDate() + days)
        setSelectedDate(date.toISOString().split('T')[0])
        setLoading(true)
    }

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }

    const formatDateDisplay = (dateString: string) => {
        const date = new Date(dateString + 'T12:00:00')
        return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    }

    const getStatusBadge = (status: string) => {
        const statusInfo = STATUS_OPTIONS.find(s => s.value === status)
        return statusInfo || { label: status, color: 'bg-gray-500' }
    }

    const todayCount = agendamentos.filter(a => ['agendado', 'confirmado', 'em_andamento'].includes(a.status)).length

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Calendar className="h-8 w-8" />
                        Agenda
                    </h1>
                    <p className="text-muted-foreground">Agendamentos e consultas</p>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                    {todayCount} agendamentos pendentes
                </Badge>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center justify-center gap-4 p-4 rounded-xl border bg-card">
                <Button variant="ghost" size="icon" onClick={() => changeDate(-1)}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="text-center min-w-[250px]">
                    <p className="text-lg font-semibold capitalize">{formatDateDisplay(selectedDate)}</p>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => { setSelectedDate(e.target.value); setLoading(true) }}
                        className="text-xs text-muted-foreground bg-transparent border-none text-center cursor-pointer"
                    />
                </div>
                <Button variant="ghost" size="icon" onClick={() => changeDate(1)}>
                    <ChevronRight className="h-5 w-5" />
                </Button>
                <Button variant="outline" onClick={() => { setSelectedDate(new Date().toISOString().split('T')[0]); setLoading(true) }}>
                    Hoje
                </Button>
            </div>

            {/* Agenda List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Carregando...</div>
                ) : agendamentos.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground rounded-xl border bg-card">
                        Nenhum agendamento para este dia
                    </div>
                ) : (
                    agendamentos.map((agendamento) => {
                        const statusInfo = getStatusBadge(agendamento.status)
                        return (
                            <div key={agendamento.id} className="p-4 rounded-xl border bg-card flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {/* Time */}
                                    <div className="text-center min-w-[60px]">
                                        <p className="text-xl font-bold">{formatTime(agendamento.data_hora)}</p>
                                        <p className="text-xs text-muted-foreground">{agendamento.duracao_minutos}min</p>
                                    </div>

                                    <div className="w-px h-12 bg-border" />

                                    {/* Patient Info */}
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">{agendamento.paciente?.nome}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            {agendamento.profissional && (
                                                <span>Dr(a). {agendamento.profissional.nome}</span>
                                            )}
                                            {agendamento.clinica && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {agendamento.clinica.nome}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Status & Actions */}
                                <div className="flex items-center gap-2">
                                    <select
                                        value={agendamento.status}
                                        onChange={(e) => handleStatusChange(agendamento.id, e.target.value)}
                                        className={`rounded-full px-3 py-1 text-sm text-white border-none cursor-pointer ${statusInfo.color}`}
                                    >
                                        {STATUS_OPTIONS.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
