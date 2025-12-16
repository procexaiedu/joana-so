'use client'

import { Agendamento, Profissional } from "@/lib/types/database"
import { cn } from "@/lib/utils"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Clock, User, Calendar } from "lucide-react"
import { useState } from "react"

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

    const [hoveredDay, setHoveredDay] = useState<Date | null>(null)

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const days = eachDayOfInterval({ start: startDate, end: endDate })
    const weeks: Date[][] = []
    for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7))
    }

    const filteredAppointments = selectedProfissionalId === 'all'
        ? agendamentos
        : agendamentos.filter(a => a.profissional_id === selectedProfissionalId)

    const getDayAppointments = (day: Date) =>
        filteredAppointments.filter(a => isSameDay(parseISO(a.data_hora), day))

    const today = new Date()

    return (
        <div className="h-[calc(100vh-240px)] flex flex-col border border-border/50 rounded-2xl bg-gradient-to-b from-card to-card/95 shadow-xl overflow-hidden">
            {/* Header Days */}
            <div className="grid grid-cols-7 h-12 border-b border-border/30 bg-gradient-to-r from-muted/40 via-muted/30 to-muted/40">
                {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((day, idx) => (
                    <div
                        key={day}
                        className={cn(
                            "flex items-center justify-center text-sm font-medium",
                            (idx === 0 || idx === 6) ? "text-muted-foreground/70" : "text-muted-foreground"
                        )}
                    >
                        <span className="hidden lg:inline">{day}</span>
                        <span className="lg:hidden">{day.slice(0, 3)}</span>
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="flex-1 grid" style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}>
                {weeks.map((week, wIdx) => (
                    <div key={wIdx} className="grid grid-cols-7 border-b border-border/10 last:border-b-0">
                        {week.map((day, dIdx) => {
                            const dayAppointments = getDayAppointments(day)
                            const isCurrentMonth = isSameMonth(day, currentDate)
                            const isToday = isSameDay(day, today)
                            const isWeekend = dIdx === 0 || dIdx === 6
                            const isHovered = hoveredDay && isSameDay(hoveredDay, day)

                            return (
                                <div
                                    key={day.toISOString()}
                                    className={cn(
                                        "relative flex flex-col transition-all duration-200 cursor-pointer group",
                                        "border-r border-border/10 last:border-r-0",
                                        !isCurrentMonth && "bg-muted/5",
                                        isWeekend && isCurrentMonth && "bg-muted/[0.03]",
                                        isHovered && "bg-primary/5 scale-[1.02] z-10 shadow-xl rounded-lg"
                                    )}
                                    onClick={() => onSlotClick(day, '09:00')}
                                    onMouseEnter={() => setHoveredDay(day)}
                                    onMouseLeave={() => setHoveredDay(null)}
                                >
                                    {/* Day Number */}
                                    <div className="flex items-start justify-between p-2">
                                        <div className={cn(
                                            "w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold transition-all",
                                            isToday
                                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                                                : isCurrentMonth
                                                    ? "text-foreground group-hover:bg-muted/50"
                                                    : "text-muted-foreground/50"
                                        )}>
                                            {format(day, 'd')}
                                        </div>

                                        {/* Appointment Count Badge */}
                                        {dayAppointments.length > 0 && (
                                            <div className={cn(
                                                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                                                "bg-primary/10 text-primary"
                                            )}>
                                                <Calendar className="h-3 w-3" />
                                                {dayAppointments.length}
                                            </div>
                                        )}
                                    </div>

                                    {/* Appointments Preview */}
                                    <div className="flex-1 px-1 pb-1 flex flex-col gap-0.5 overflow-hidden">
                                        {dayAppointments.slice(0, 3).map(appt => {
                                            const isOtherClinic = appt.clinica_id !== selectedClinicaId
                                            const statusStyle = getStatusStyle(appt.status)

                                            return (
                                                <div
                                                    key={appt.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onAppointmentClick(appt)
                                                    }}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] truncate transition-all",
                                                        "hover:scale-[1.02] cursor-pointer",
                                                        isOtherClinic
                                                            ? "bg-muted/50 text-muted-foreground"
                                                            : statusStyle.bg
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                                        isOtherClinic ? "bg-muted-foreground/50" : statusStyle.dot
                                                    )} />
                                                    <span className="font-medium">
                                                        {format(parseISO(appt.data_hora), "HH:mm")}
                                                    </span>
                                                    <span className="truncate opacity-80">
                                                        {isOtherClinic ? "Outra" : appt.paciente?.nome?.split(' ')[0]}
                                                    </span>
                                                </div>
                                            )
                                        })}

                                        {dayAppointments.length > 3 && (
                                            <div className="text-[10px] text-primary font-medium pl-2 mt-0.5">
                                                +{dayAppointments.length - 3} mais
                                            </div>
                                        )}
                                    </div>

                                    {/* Hover Overlay - Extended Info */}
                                    {isHovered && dayAppointments.length > 3 && (
                                        <div className="absolute inset-x-0 bottom-full mb-2 p-3 bg-popover border border-border rounded-xl shadow-2xl z-50 min-w-[200px]">
                                            <div className="text-xs font-semibold mb-2 text-muted-foreground">
                                                {format(day, "d 'de' MMMM", { locale: ptBR })}
                                            </div>
                                            <div className="space-y-1 max-h-[150px] overflow-y-auto">
                                                {dayAppointments.map(appt => (
                                                    <div
                                                        key={appt.id}
                                                        className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            onAppointmentClick(appt)
                                                        }}
                                                    >
                                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                                        <span className="font-medium">{format(parseISO(appt.data_hora), "HH:mm")}</span>
                                                        <span className="truncate">{appt.paciente?.nome}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>
        </div>
    )
}

function getStatusStyle(status: string) {
    const styles: Record<string, { bg: string; dot: string }> = {
        confirmado: { bg: "bg-emerald-500/15 text-emerald-200", dot: "bg-emerald-400" },
        agendado: { bg: "bg-blue-500/15 text-blue-200", dot: "bg-blue-400" },
        em_andamento: { bg: "bg-amber-500/15 text-amber-200", dot: "bg-amber-400" },
        cancelado: { bg: "bg-red-500/10 text-red-200 opacity-50", dot: "bg-red-400" },
        concluido: { bg: "bg-slate-500/15 text-slate-200", dot: "bg-slate-400" }
    }
    return styles[status] || styles.agendado
}
