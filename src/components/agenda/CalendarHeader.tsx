'use client'

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    ChevronLeft,
    ChevronRight,
    Calendar,
    CalendarDays,
    CalendarRange,
    User,
    Building2,
    Dot
} from "lucide-react"
import { Clinica, Profissional } from "@/lib/types/database"
import { AgendasSheet } from "./AgendasSheet"

interface CalendarHeaderProps {
    currentDate: Date
    viewMode: 'day' | 'week' | 'month'
    onViewChange: (mode: 'day' | 'week' | 'month') => void
    onDateChange: (date: Date) => void
    clinicas: Clinica[]
    selectedClinicaId: string
    onClinicaChange: (id: string) => void
    profissionais: Profissional[]
    selectedProfissionalId: string | 'all'
    onProfissionalChange: (id: string | 'all') => void
}

const viewModes = [
    { id: 'day' as const, label: 'Dia', icon: Calendar },
    { id: 'week' as const, label: 'Semana', icon: CalendarDays },
    { id: 'month' as const, label: 'Mês', icon: CalendarRange },
]

export function CalendarHeader({
    currentDate,
    viewMode,
    onViewChange,
    onDateChange,
    clinicas,
    selectedClinicaId,
    onClinicaChange,
    profissionais,
    selectedProfissionalId,
    onProfissionalChange
}: CalendarHeaderProps) {

    const navigate = (amount: number) => {
        const newDate = new Date(currentDate)
        if (viewMode === 'day') newDate.setDate(newDate.getDate() + amount)
        else if (viewMode === 'week') newDate.setDate(newDate.getDate() + (amount * 7))
        else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + amount)
        onDateChange(newDate)
    }

    const isToday = () => {
        const today = new Date()
        return currentDate.toDateString() === today.toDateString()
    }

    const formatDateDisplay = () => {
        const day = currentDate.getDate()
        const month = currentDate.toLocaleDateString('pt-BR', { month: 'long' })
        const year = currentDate.getFullYear()
        const weekday = currentDate.toLocaleDateString('pt-BR', { weekday: 'long' })

        if (viewMode === 'day') {
            return { primary: `${day}`, secondary: `${month} ${year}`, tertiary: weekday }
        } else if (viewMode === 'week') {
            const weekStart = new Date(currentDate)
            weekStart.setDate(currentDate.getDate() - currentDate.getDay())
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekStart.getDate() + 6)
            return {
                primary: `${weekStart.getDate()} - ${weekEnd.getDate()}`,
                secondary: `${month} ${year}`,
                tertiary: 'Semana'
            }
        } else {
            return { primary: month, secondary: `${year}`, tertiary: '' }
        }
    }

    const dateDisplay = formatDateDisplay()

    return (
        <div className="relative overflow-hidden">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-transparent to-blue-500/5 pointer-events-none" />

            <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5">
                {/* Left Section: Filters */}
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    {/* Clinic Selector */}
                    <Select value={selectedClinicaId} onValueChange={onClinicaChange}>
                        <SelectTrigger className="w-[200px] bg-background/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-colors">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-violet-500/10">
                                    <Building2 className="h-3.5 w-3.5 text-violet-500" />
                                </div>
                                <SelectValue placeholder="Selecione a Clínica" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            {clinicas.map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                    <span className="flex items-center gap-2">
                                        <Dot className="h-4 w-4 text-violet-500" />
                                        {c.nome}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Professional Filter */}
                    <Select value={selectedProfissionalId} onValueChange={onProfissionalChange}>
                        <SelectTrigger className="w-[220px] bg-background/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-colors">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10">
                                    <User className="h-3.5 w-3.5 text-emerald-500" />
                                </div>
                                <SelectValue placeholder="Todos os Profissionais" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                <span className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-[10px] text-white font-bold">
                                        ∞
                                    </span>
                                    Todos os Profissionais
                                </span>
                            </SelectItem>
                            {profissionais.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                    <span className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-[10px] text-white font-bold">
                                            {p.nome.charAt(0)}
                                        </span>
                                        {p.nome}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Divider */}
                    <div className="hidden lg:block h-8 w-px bg-gradient-to-b from-transparent via-border to-transparent" />

                    {/* View Mode Tabs */}
                    <div className="flex p-1 bg-muted/40 backdrop-blur-sm rounded-xl border border-border/30">
                        {viewModes.map(mode => {
                            const Icon = mode.icon
                            const isActive = viewMode === mode.id
                            return (
                                <button
                                    key={mode.id}
                                    onClick={() => onViewChange(mode.id)}
                                    className={`
                                        relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
                                        transition-all duration-200 ease-out
                                        ${isActive
                                            ? 'bg-background text-foreground shadow-lg shadow-black/5'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                        }
                                    `}
                                >
                                    <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-primary' : ''}`} />
                                    <span className="hidden sm:inline">{mode.label}</span>
                                    {isActive && (
                                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-primary rounded-full" />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Right Section: Navigation & Date */}
                <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
                    {/* Date Navigation */}
                    <div className="flex items-center gap-1 bg-muted/30 rounded-xl p-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(-1)}
                            className="h-9 w-9 rounded-lg hover:bg-background"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        {/* Date Display */}
                        <button
                            onClick={() => onDateChange(new Date())}
                            className="flex flex-col items-center px-4 py-1 min-w-[140px] hover:bg-background/50 rounded-lg transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                                    {dateDisplay.primary}
                                </span>
                                {isToday() && (
                                    <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-primary text-primary-foreground rounded-full">
                                        Hoje
                                    </span>
                                )}
                            </div>
                            <span className="text-xs text-muted-foreground capitalize">
                                {dateDisplay.secondary}
                                {dateDisplay.tertiary && ` • ${dateDisplay.tertiary}`}
                            </span>
                        </button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(1)}
                            className="h-9 w-9 rounded-lg hover:bg-background"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Today Button (when not today) */}
                    {!isToday() && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDateChange(new Date())}
                            className="hidden sm:flex gap-2 bg-background/50 border-border/50 hover:border-primary/50 hover:bg-primary/5"
                        >
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            Ir para Hoje
                        </Button>
                    )}

                    {/* Settings */}
                    <AgendasSheet />
                </div>
            </div>
        </div>
    )
}
