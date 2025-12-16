"use client"

import { useState, useMemo } from "react"
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns"
import { useAgenda } from "@/hooks/useAgenda"
import { CalendarHeader } from "./CalendarHeader"
import { DayView } from "./DayView"
import { WeekView } from "./WeekView"
import { MonthView } from "./MonthView"
import { AppointmentModal } from "./AppointmentModal"
import { Agendamento } from "@/lib/types/database"
import { Loader2 } from "lucide-react"

export function CalendarContainer() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day')

    // We need to manage selectedClinic because query depends on it?
    // Actually useAgenda fetches data for date range. We filter locally for specific logic if needed.
    // But useAgenda also fetches operating hours, which NEED a clinic ID.
    // So we must have a selected clinic.
    const [selectedClinicaId, setSelectedClinicaId] = useState<string>('')
    const [selectedProfissionalId, setSelectedProfissionalId] = useState<string | 'all'>('all')

    // Calculate Date Range for Fetching
    const dateRange = useMemo(() => {
        if (viewMode === 'day') {
            return { start: startOfDay(currentDate), end: endOfDay(currentDate) }
        } else if (viewMode === 'week') {
            return { start: startOfWeek(currentDate), end: endOfWeek(currentDate) }
        } else {
            return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) }
        }
    }, [currentDate, viewMode])

    const { agendamentos, profissionais, clinicas, horarios, tipos, loading, refetch } = useAgenda(
        dateRange.start,
        dateRange.end,
        selectedClinicaId
    )

    // Auto-select first clinic if present and none selected
    if (clinicas.length > 0 && !selectedClinicaId) {
        setSelectedClinicaId(clinicas[0].id)
    }

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalInitialData, setModalInitialData] = useState<Partial<Agendamento> | undefined>(undefined)

    const handleSlotClick = (time: string, profissionalId: string, dateOverride?: Date | string) => {
        // Open modal pre-filled
        const dateStr = dateOverride instanceof Date
            ? dateOverride.toISOString().split('T')[0]
            : (typeof dateOverride === 'string' ? dateOverride : currentDate.toISOString().split('T')[0])

        setModalInitialData({
            data_hora: `${dateStr}T${time}`,
            profissional_id: profissionalId,
            clinica_id: selectedClinicaId
        })
        setIsModalOpen(true)
    }

    const handleAppointmentClick = (appt: Agendamento) => {
        setModalInitialData(appt)
        setIsModalOpen(true)
    }

    const handleNewAppointment = () => {
        setModalInitialData(undefined)
        setIsModalOpen(true)
    }

    return (
        <div className="space-y-4 h-full flex flex-col">
            <CalendarHeader
                currentDate={currentDate}
                viewMode={viewMode}
                onViewChange={setViewMode}
                onDateChange={setCurrentDate}
                clinicas={clinicas}
                selectedClinicaId={selectedClinicaId}
                onClinicaChange={setSelectedClinicaId}
                profissionais={profissionais}
                selectedProfissionalId={selectedProfissionalId}
                onProfissionalChange={setSelectedProfissionalId}
            />

            <div className="flex-1 min-h-0 relative">
                {loading && (
                    <div className="absolute inset-0 z-50 bg-background/50 flex items-center justify-center backdrop-blur-sm">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}

                {viewMode === 'day' ? (
                    <DayView
                        currentDate={currentDate}
                        agendamentos={agendamentos}
                        profissionais={profissionais}
                        horarios={horarios}
                        selectedClinicaId={selectedClinicaId}
                        selectedProfissionalId={selectedProfissionalId}
                        onSlotClick={handleSlotClick}
                        onAppointmentClick={handleAppointmentClick}
                    />
                ) : viewMode === 'week' ? (
                    <WeekView
                        currentDate={currentDate}
                        agendamentos={agendamentos}
                        profissionais={profissionais}
                        selectedClinicaId={selectedClinicaId}
                        selectedProfissionalId={selectedProfissionalId}
                        onSlotClick={(date: Date, time: string) => {
                            handleSlotClick(time, selectedProfissionalId === 'all' ? '' : selectedProfissionalId, date)
                        }}
                        onAppointmentClick={handleAppointmentClick}
                    />
                ) : (
                    <MonthView
                        currentDate={currentDate}
                        agendamentos={agendamentos}
                        profissionais={profissionais}
                        selectedClinicaId={selectedClinicaId}
                        selectedProfissionalId={selectedProfissionalId}
                        onSlotClick={(date: Date, time: string) => {
                            handleSlotClick(time, selectedProfissionalId === 'all' ? '' : selectedProfissionalId, date)
                        }}
                        onAppointmentClick={handleAppointmentClick}
                    />
                )}
            </div>

            <AppointmentModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                initialData={modalInitialData}
                clinicas={clinicas}
                profissionais={profissionais}
                tipos={tipos}
                onSuccess={refetch}
            />
        </div>
    )
}
