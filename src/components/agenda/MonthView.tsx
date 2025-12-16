import { Agendamento, Profissional } from "@/lib/types/database"
import { cn } from "@/lib/utils"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

interface MonthViewProps {
    currentDate: Date
    agendamentos: Agendamento[]
    profissionais: Profissional[]
    selectedClinicaId: string
    selectedProfissionalId: string | 'all'
    onSlotClick: (date: Date, time: string) => void
    onAppointmentClick: (agendamento: Agendamento) => void
}

export function MonthView({
    currentDate,
    agendamentos,
    profissionais,
    selectedClinicaId,
    selectedProfissionalId,
    onSlotClick,
    onAppointmentClick
}: MonthViewProps) {

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const days = eachDayOfInterval({ start: startDate, end: endDate })
    const weeks = []
    for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7))
    }

    // Filter appointments
    const filteredAppointments = selectedProfissionalId === 'all'
        ? agendamentos
        : agendamentos.filter(a => a.profissional_id === selectedProfissionalId)

    return (
        <div className="h-[calc(100vh-240px)] flex flex-col border rounded-xl bg-card text-card-foreground">
            {/* Header Days */}
            <div className="grid grid-cols-7 h-10 border-b bg-muted/40 divide-x font-medium text-sm">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div key={day} className="flex items-center justify-center">{day}</div>
                ))}
            </div>

            {/* Grid */}
            <div className="flex-1 grid grid-rows-5 divide-y">
                {weeks.map((week, wIdx) => (
                    <div key={wIdx} className="grid grid-cols-7 divide-x h-full">
                        {week.map((day, dIdx) => {
                            const dayAppointments = filteredAppointments.filter(a => isSameDay(parseISO(a.data_hora), day))
                            const isCurrentMonth = isSameMonth(day, currentDate)

                            return (
                                <div
                                    key={day.toISOString()}
                                    className={cn(
                                        "relative p-1 flex flex-col gap-1 transition-colors hover:bg-muted/30 cursor-pointer min-h-[100px]",
                                        !isCurrentMonth && "bg-muted/10 text-muted-foreground"
                                    )}
                                    onClick={() => onSlotClick(day, '08:00')} // Default to morning
                                >
                                    <div className={cn(
                                        "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full self-end mb-1",
                                        isSameDay(day, new Date()) ? "bg-primary text-primary-foreground" : ""
                                    )}>
                                        {format(day, 'd')}
                                    </div>

                                    <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                                        {dayAppointments.slice(0, 4).map(appt => {
                                            const isOtherClinic = appt.clinica_id !== selectedClinicaId
                                            return (
                                                <div
                                                    key={appt.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onAppointmentClick(appt)
                                                    }}
                                                    className={cn(
                                                        "text-[10px] truncate px-1 py-0.5 rounded border border-transparent hover:border-border",
                                                        isOtherClinic
                                                            ? "bg-muted text-muted-foreground"
                                                            : "bg-blue-100 text-blue-800"
                                                    )}
                                                >
                                                    {format(parseISO(appt.data_hora), "HH:mm")} {appt.paciente?.nome.split(' ')[0]}
                                                </div>
                                            )
                                        })}
                                        {dayAppointments.length > 4 && (
                                            <div className="text-[10px] text-muted-foreground pl-1">
                                                + {dayAppointments.length - 4} mais
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>
        </div>
    )
}
