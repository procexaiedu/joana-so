'use client'

import { Agendamento, Profissional, HorarioFuncionamento } from "@/lib/types/database"
import { cn } from "@/lib/utils"
import { format, isSameDay, parseISO, getHours, getMinutes } from "date-fns"
import { useEffect, useState } from "react"
import { Clock, User, MapPin } from "lucide-react"

interface DayViewProps {
    currentDate: Date
    agendamentos: Agendamento[]
    profissionais: Profissional[]
    horarios: HorarioFuncionamento[]
    selectedClinicaId: string
    selectedProfissionalId: string | 'all'
    onSlotClick: (time: string, profissionalId: string) => void
    onAppointmentClick: (agendamento: Agendamento) => void
}

const START_HOUR = 7
const END_HOUR = 21
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60

export function DayView({
    currentDate,
    agendamentos,
    profissionais,
    horarios,
    selectedClinicaId,
    selectedProfissionalId,
    onSlotClick,
    onAppointmentClick
}: DayViewProps) {

    const [currentTime, setCurrentTime] = useState(new Date())

    // Update current time every minute
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 60000)
        return () => clearInterval(interval)
    }, [])

    const visibleAmbients = selectedProfissionalId === 'all'
        ? profissionais
        : profissionais.filter(p => p.id === selectedProfissionalId)

    const dayAppointments = agendamentos.filter(a =>
        isSameDay(parseISO(a.data_hora), currentDate)
    )

    const isToday = isSameDay(currentDate, new Date())

    const getPosition = (dateStr: string) => {
        const date = parseISO(dateStr)
        const minutes = getHours(date) * 60 + getMinutes(date)
        const startMinutes = START_HOUR * 60
        return ((minutes - startMinutes) / TOTAL_MINUTES) * 100
    }

    const getHeight = (duration: number) => {
        return (duration / TOTAL_MINUTES) * 100
    }

    const getCurrentTimePosition = () => {
        const minutes = getHours(currentTime) * 60 + getMinutes(currentTime)
        const startMinutes = START_HOUR * 60
        return ((minutes - startMinutes) / TOTAL_MINUTES) * 100
    }

    const timeLabels = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR)

    return (
        <div className="flex h-[calc(100vh-240px)] border border-border/50 rounded-2xl overflow-hidden bg-gradient-to-b from-card to-card/95 shadow-xl">
            {/* Time Axis */}
            <div className="w-20 flex-shrink-0 border-r border-border/30 overflow-y-auto hide-scrollbar bg-muted/10">
                <div className="h-16 border-b border-border/30 sticky top-0 z-20 bg-gradient-to-b from-muted/40 to-muted/20 backdrop-blur-sm" />
                <div className="relative h-[1200px]">
                    {timeLabels.map((hour, idx) => (
                        <div
                            key={hour}
                            className="absolute w-full flex items-start justify-end pr-3 -translate-y-2"
                            style={{ top: `${((hour - START_HOUR) * 60 / TOTAL_MINUTES) * 100}%` }}
                        >
                            <span className={cn(
                                "text-xs font-medium tabular-nums",
                                hour === 12 ? "text-amber-500" : "text-muted-foreground"
                            )}>
                                {hour.toString().padStart(2, '0')}:00
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Grid */}
            <div className="flex-1 overflow-x-auto overflow-y-auto relative">
                <div className="flex min-w-full h-[1200px]">
                    {visibleAmbients.map((profissional, colIdx) => (
                        <div
                            key={profissional.id}
                            className={cn(
                                "flex-1 min-w-[220px] relative",
                                colIdx < visibleAmbients.length - 1 && "border-r border-border/20"
                            )}
                        >
                            {/* Column Header */}
                            <div className="h-16 border-b border-border/30 sticky top-0 z-20 flex items-center justify-center gap-3 px-4 bg-gradient-to-b from-muted/40 to-muted/20 backdrop-blur-sm">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-emerald-500/30">
                                    {profissional.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-semibold text-sm">
                                        {profissional.nome.split(' ').slice(0, 2).join(' ')}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {dayAppointments.filter(a => a.profissional_id === profissional.id).length} agendamentos
                                    </span>
                                </div>
                            </div>

                            {/* Zebra Pattern + Grid Lines */}
                            {timeLabels.map((hour, idx) => (
                                <div
                                    key={hour}
                                    className={cn(
                                        "absolute w-full pointer-events-none",
                                        idx % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent"
                                    )}
                                    style={{
                                        top: `${((hour - START_HOUR) * 60 / TOTAL_MINUTES) * 100}%`,
                                        height: `${(60 / TOTAL_MINUTES) * 100}%`
                                    }}
                                >
                                    <div className="absolute top-0 left-0 right-0 border-t border-border/20" />
                                    {/* Half-hour marker */}
                                    <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-border/10" />
                                </div>
                            ))}

                            {/* Current Time Indicator */}
                            {isToday && getCurrentTimePosition() >= 0 && getCurrentTimePosition() <= 100 && (
                                <div
                                    className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                                    style={{ top: `${getCurrentTimePosition()}%` }}
                                >
                                    <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5 shadow-lg shadow-red-500/50 animate-pulse" />
                                    <div className="flex-1 h-0.5 bg-gradient-to-r from-red-500 to-red-500/0" />
                                </div>
                            )}

                            {/* Clickable Slot Area */}
                            <div
                                className="absolute inset-0 z-0 cursor-pointer"
                                style={{ top: '64px' }}
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    const percent = (e.clientY - rect.top) / rect.height
                                    const totalClickedMinutes = percent * TOTAL_MINUTES
                                    const hour = Math.floor(totalClickedMinutes / 60) + START_HOUR
                                    const minute = Math.floor(totalClickedMinutes % 60)
                                    const roundedMinute = Math.round(minute / 30) * 30
                                    const finalHour = roundedMinute === 60 ? hour + 1 : hour
                                    const finalMinute = roundedMinute === 60 ? 0 : roundedMinute
                                    const timeStr = `${finalHour.toString().padStart(2, '0')}:${finalMinute.toString().padStart(2, '0')}`
                                    onSlotClick(timeStr, profissional.id)
                                }}
                            />

                            {/* Appointments */}
                            {dayAppointments
                                .filter(a => a.profissional_id === profissional.id)
                                .map(appt => {
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
                                                "absolute left-2 right-2 rounded-xl px-3 py-2 cursor-pointer transition-all duration-200 z-10",
                                                "hover:scale-[1.02] hover:shadow-xl hover:z-20",
                                                "border backdrop-blur-sm",
                                                isOtherClinic
                                                    ? "bg-muted/80 text-muted-foreground border-muted-foreground/20 opacity-60"
                                                    : statusStyle.card
                                            )}
                                            style={{
                                                top: `${getPosition(appt.data_hora)}%`,
                                                height: `${Math.max(getHeight(appt.duracao_minutos), 2.5)}%`
                                            }}
                                        >
                                            <div className="flex items-start gap-2 h-full">
                                                {!isOtherClinic && (
                                                    <div className={cn(
                                                        "w-1 rounded-full h-full flex-shrink-0",
                                                        statusStyle.indicator
                                                    )} />
                                                )}
                                                <div className="flex-1 min-w-0 overflow-hidden">
                                                    <div className="font-semibold text-sm truncate flex items-center gap-1.5">
                                                        {isOtherClinic ? (
                                                            <>
                                                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                                                <span>Outra Unidade</span>
                                                            </>
                                                        ) : (
                                                            appt.paciente?.nome || 'Paciente'
                                                        )}
                                                    </div>
                                                    {!isOtherClinic && appt.duracao_minutos >= 30 && (
                                                        <div className="flex items-center gap-2 text-xs opacity-75 mt-0.5">
                                                            <Clock className="h-3 w-3" />
                                                            <span>{format(parseISO(appt.data_hora), "HH:mm")}</span>
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10">
                                                                {appt.tipo?.nome || 'Consulta'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function getStatusStyle(status: string) {
    const styles: Record<string, { card: string; indicator: string }> = {
        confirmado: {
            card: "bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 text-emerald-100 border-emerald-500/30",
            indicator: "bg-emerald-400"
        },
        agendado: {
            card: "bg-gradient-to-br from-blue-500/20 to-blue-600/10 text-blue-100 border-blue-500/30",
            indicator: "bg-blue-400"
        },
        em_andamento: {
            card: "bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-100 border-amber-500/30",
            indicator: "bg-amber-400"
        },
        cancelado: {
            card: "bg-gradient-to-br from-red-500/10 to-red-600/5 text-red-200 border-red-500/20 opacity-50",
            indicator: "bg-red-400"
        },
        concluido: {
            card: "bg-gradient-to-br from-slate-500/20 to-slate-600/10 text-slate-200 border-slate-500/30",
            indicator: "bg-slate-400"
        }
    }
    return styles[status] || styles.agendado
}
