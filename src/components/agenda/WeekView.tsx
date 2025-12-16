import { Agendamento, Profissional, HorarioFuncionamento } from "@/lib/types/database"
import { cn } from "@/lib/utils"
import { format, addDays, startOfWeek, isSameDay, parseISO, getHours, getMinutes } from "date-fns"
import { ptBR } from "date-fns/locale"

interface WeekViewProps {
    currentDate: Date
    agendamentos: Agendamento[]
    profissionais: Profissional[]
    selectedClinicaId: string
    selectedProfissionalId: string | 'all'
    onSlotClick: (date: Date, time: string) => void
    onAppointmentClick: (agendamento: Agendamento) => void
}

const START_HOUR = 7
const END_HOUR = 21
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60

export function WeekView({
    currentDate,
    agendamentos,
    profissionais,
    selectedClinicaId,
    selectedProfissionalId,
    onSlotClick,
    onAppointmentClick
}: WeekViewProps) {

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }) // Sunday start
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

    // Filter appointments by professional if selected
    const filteredAppointments = selectedProfissionalId === 'all'
        ? agendamentos
        : agendamentos.filter(a => a.profissional_id === selectedProfissionalId)

    const getPosition = (dateStr: string) => {
        const date = parseISO(dateStr)
        const minutes = getHours(date) * 60 + getMinutes(date)
        const startMinutes = START_HOUR * 60
        return ((minutes - startMinutes) / TOTAL_MINUTES) * 100
    }

    const getHeight = (duration: number) => {
        return (duration / TOTAL_MINUTES) * 100
    }

    const timeLabels = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR)

    return (
        <div className="flex h-[calc(100vh-240px)] border rounded-xl overflow-hidden bg-card text-card-foreground">
            {/* Time Axis */}
            <div className="w-16 flex-shrink-0 border-r bg-muted/20 overflow-y-auto hide-scrollbar">
                <div className="h-10 border-b bg-muted/40 sticky top-0 z-10" />
                <div className="relative h-[1200px]">
                    {timeLabels.map(hour => (
                        <div
                            key={hour}
                            className="absolute w-full text-center text-xs text-muted-foreground border-b border-dashed border-muted/50"
                            style={{ top: `${((hour - START_HOUR) * 60 / TOTAL_MINUTES) * 100}%` }}
                        >
                            <span className="-translate-y-1/2 block bg-card px-1 relative z-10">{hour}:00</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-x-auto overflow-y-auto relative">
                <div className="flex min-w-full h-[1200px]">
                    {days.map(day => (
                        <div key={day.toISOString()} className="flex-1 min-w-[150px] border-r relative group">
                            {/* Header */}
                            <div className={cn(
                                "h-10 border-b bg-muted/40 sticky top-0 z-10 flex flex-col items-center justify-center text-sm backdrop-blur-sm",
                                isSameDay(day, new Date()) && "bg-blue-50/50 text-blue-700"
                            )}>
                                <span className="font-medium capitalize">{format(day, 'EEE', { locale: ptBR })}</span>
                                <span className="text-xs text-muted-foreground">{format(day, 'd')}</span>
                            </div>

                            {/* Grid Lines */}
                            {timeLabels.map(hour => (
                                <div
                                    key={hour}
                                    className="absolute w-full border-b border-dashed border-muted/30 pointer-events-none"
                                    style={{ top: `${((hour - START_HOUR) * 60 / TOTAL_MINUTES) * 100}%` }}
                                />
                            ))}

                            {/* Clickable Overlay */}
                            <div
                                className="absolute inset-0 z-0"
                                onClick={(e) => {
                                    const percent = e.nativeEvent.offsetY / e.currentTarget.clientHeight
                                    const totalClickedMinutes = percent * TOTAL_MINUTES
                                    const hour = Math.floor(totalClickedMinutes / 60) + START_HOUR
                                    const minute = Math.floor(totalClickedMinutes % 60)
                                    const roundedMinute = Math.round(minute / 30) * 30
                                    const timeStr = `${hour.toString().padStart(2, '0')}:${roundedMinute === 60 ? '00' : roundedMinute.toString().padStart(2, '0')}`

                                    onSlotClick(day, timeStr)
                                }}
                            />

                            {/* Appointments */}
                            {filteredAppointments
                                .filter(a => isSameDay(parseISO(a.data_hora), day))
                                .map(appt => {
                                    const isOtherClinic = appt.clinica_id !== selectedClinicaId
                                    // If "All Pros" view, maybe show initials?
                                    const proName = appt.profissional?.nome.split(' ')[0]

                                    return (
                                        <div
                                            key={appt.id}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onAppointmentClick(appt)
                                            }}
                                            className={cn(
                                                "absolute left-1 right-1 rounded px-2 py-1 text-xs overflow-hidden cursor-pointer transition-all hover:brightness-95 border z-10",
                                                isOtherClinic
                                                    ? "bg-muted text-muted-foreground border-muted-foreground/20 opacity-70"
                                                    : getStatusColor(appt.status) // need to duplicate or export function
                                            )}
                                            style={{
                                                top: `${getPosition(appt.data_hora)}%`,
                                                height: `${getHeight(appt.duracao_minutos)}%`
                                            }}
                                            title={`${format(parseISO(appt.data_hora), "HH:mm")} - ${appt.paciente?.nome}`}
                                        >
                                            <div className="font-semibold truncate">
                                                {isOtherClinic ? "Outra Und." : appt.paciente?.nome}
                                            </div>
                                            <div className="truncate opacity-80 text-[10px]">
                                                {format(parseISO(appt.data_hora), "HH:mm")}
                                                {selectedProfissionalId === 'all' && !isOtherClinic && ` • ${proName}`}
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

function getStatusColor(status: string) {
    switch (status) {
        case 'confirmado': return "bg-emerald-100 text-emerald-800 border-emerald-200"
        case 'agendado': return "bg-blue-100 text-blue-800 border-blue-200"
        case 'em_andamento': return "bg-amber-100 text-amber-800 border-amber-200"
        case 'cancelado': return "bg-red-100 text-red-800 border-red-200"
        case 'concluido': return "bg-slate-100 text-slate-800 border-slate-200"
        default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
}
