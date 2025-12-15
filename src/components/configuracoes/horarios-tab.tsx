'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from "@/lib/supabase/client"
import { Clinica, HorarioFuncionamento } from "@/lib/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Calendar, Clock, Plus, Trash2, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface HorariosTabProps {
    className?: string
}

const DIAS_SEMANA = [
    { value: 0, label: 'Domingo', short: 'DOM' },
    { value: 1, label: 'Segunda', short: 'SEG' },
    { value: 2, label: 'Terça', short: 'TER' },
    { value: 3, label: 'Quarta', short: 'QUA' },
    { value: 4, label: 'Quinta', short: 'QUI' },
    { value: 5, label: 'Sexta', short: 'SEX' },
    { value: 6, label: 'Sábado', short: 'SAB' },
]

const HORAS = Array.from({ length: 15 }, (_, i) => {
    const hora = i + 7 // 07:00 a 21:00
    return { value: `${hora.toString().padStart(2, '0')}:00`, label: `${hora}h` }
})

export function HorariosTab({ className }: HorariosTabProps) {
    const [clinicas, setClinicas] = useState<Clinica[]>([])
    const [selectedClinica, setSelectedClinica] = useState<string>('')
    const [horarios, setHorarios] = useState<HorarioFuncionamento[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [bloqueioDialogOpen, setBloqueioDialogOpen] = useState(false)

    // Form para horário padrão
    const [horarioForm, setHorarioForm] = useState({
        dia_semana: 1,
        hora_inicio: '08:00',
        hora_fim: '18:00'
    })

    // Form para bloqueio
    const [bloqueioForm, setBloqueioForm] = useState({
        data_especifica: '',
        hora_inicio: '08:00',
        hora_fim: '18:00',
        motivo: '',
        dia_inteiro: true
    })

    const supabase = createClient()

    // Fetch clínicas
    const fetchClinicas = useCallback(async () => {
        const { data, error } = await supabase
            .from('clinicas')
            .select('*')
            .eq('ativo', true)
            .order('nome')

        if (error) {
            toast.error('Erro ao carregar clínicas')
            console.error(error)
        } else {
            setClinicas(data || [])
            if (data && data.length > 0 && !selectedClinica) {
                setSelectedClinica(data[0].id)
            }
        }
        setLoading(false)
    }, [supabase, selectedClinica])

    // Fetch horários da clínica selecionada
    const fetchHorarios = useCallback(async () => {
        if (!selectedClinica) return

        const { data, error } = await supabase
            .from('horarios_funcionamento')
            .select('*')
            .eq('clinica_id', selectedClinica)
            .order('dia_semana')

        if (error) {
            console.error(error)
        } else {
            setHorarios(data || [])
        }
    }, [supabase, selectedClinica])

    useEffect(() => {
        fetchClinicas()
    }, [fetchClinicas])

    useEffect(() => {
        if (selectedClinica) {
            fetchHorarios()

            const channel = supabase
                .channel('horarios-changes')
                .on('postgres_changes', { event: '*', schema: 'drluisfarjallat', table: 'horarios_funcionamento' }, () => {
                    fetchHorarios()
                })
                .subscribe()

            return () => {
                supabase.removeChannel(channel)
            }
        }
    }, [supabase, selectedClinica, fetchHorarios])

    // Agrupa horários por tipo
    const horariosPadrao = horarios.filter(h => h.dia_semana !== null && !h.bloqueado)
    const bloqueios = horarios.filter(h => h.bloqueado || h.data_especifica)

    // Adicionar horário padrão
    const handleAddHorario = async () => {
        if (!selectedClinica) return

        setSaving(true)
        try {
            const { error } = await supabase
                .from('horarios_funcionamento')
                .insert({
                    clinica_id: selectedClinica,
                    dia_semana: horarioForm.dia_semana,
                    hora_inicio: horarioForm.hora_inicio,
                    hora_fim: horarioForm.hora_fim,
                    bloqueado: false
                })

            if (error) throw error
            toast.success('Horário adicionado!')
            setDialogOpen(false)
        } catch (error) {
            console.error(error)
            toast.error('Erro ao adicionar horário')
        } finally {
            setSaving(false)
        }
    }

    // Adicionar bloqueio
    const handleAddBloqueio = async () => {
        if (!selectedClinica || !bloqueioForm.data_especifica || !bloqueioForm.motivo) {
            toast.error('Data e motivo são obrigatórios')
            return
        }

        setSaving(true)
        try {
            const { error } = await supabase
                .from('horarios_funcionamento')
                .insert({
                    clinica_id: selectedClinica,
                    data_especifica: bloqueioForm.data_especifica,
                    hora_inicio: bloqueioForm.dia_inteiro ? '00:00' : bloqueioForm.hora_inicio,
                    hora_fim: bloqueioForm.dia_inteiro ? '23:59' : bloqueioForm.hora_fim,
                    bloqueado: true,
                    motivo: bloqueioForm.motivo
                })

            if (error) throw error
            toast.success('Bloqueio adicionado!')
            setBloqueioDialogOpen(false)
            setBloqueioForm({ data_especifica: '', hora_inicio: '08:00', hora_fim: '18:00', motivo: '', dia_inteiro: true })
        } catch (error) {
            console.error(error)
            toast.error('Erro ao adicionar bloqueio')
        } finally {
            setSaving(false)
        }
    }

    // Remover horário
    const handleDeleteHorario = async (id: string) => {
        const { error } = await supabase
            .from('horarios_funcionamento')
            .delete()
            .eq('id', id)

        if (error) {
            toast.error('Erro ao remover')
        } else {
            toast.success('Removido!')
        }
    }

    // Grid visual semanal
    const getHorarioForDay = (diaSemana: number) => {
        return horariosPadrao.find(h => h.dia_semana === diaSemana)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (clinicas.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhuma clínica ativa cadastrada</p>
                <p className="text-sm mt-2">Adicione uma clínica primeiro na aba Clínicas</p>
            </div>
        )
    }

    return (
        <div className={className}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-semibold">Horários de Funcionamento</h2>
                    <p className="text-sm text-muted-foreground">
                        Configure os horários de atendimento por clínica
                    </p>
                </div>
                <Select value={selectedClinica} onValueChange={setSelectedClinica}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Selecione a clínica" />
                    </SelectTrigger>
                    <SelectContent>
                        {clinicas.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Grid Semanal */}
            <Card className="mb-6">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Clock className="h-5 w-5 text-primary" />
                            Horários Padrão
                        </CardTitle>
                        <Button size="sm" onClick={() => setDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Adicionar
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-7 gap-2">
                        {DIAS_SEMANA.map(dia => {
                            const horario = getHorarioForDay(dia.value)
                            const isWeekend = dia.value === 0 || dia.value === 6

                            return (
                                <div
                                    key={dia.value}
                                    className={`text-center p-3 rounded-lg border ${horario
                                            ? 'bg-primary/10 border-primary/20'
                                            : isWeekend
                                                ? 'bg-muted/50 border-muted'
                                                : 'bg-muted/30 border-dashed'
                                        }`}
                                >
                                    <div className="font-medium text-sm mb-1">{dia.short}</div>
                                    {horario ? (
                                        <div className="text-xs space-y-1">
                                            <div className="text-primary font-medium">
                                                {horario.hora_inicio.slice(0, 5)}
                                            </div>
                                            <div className="text-muted-foreground">até</div>
                                            <div className="text-primary font-medium">
                                                {horario.hora_fim.slice(0, 5)}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 mt-1"
                                                onClick={() => handleDeleteHorario(horario.id)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-muted-foreground py-4">
                                            Fechado
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Bloqueios */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-destructive" />
                            Bloqueios Específicos
                        </CardTitle>
                        <Button size="sm" variant="outline" onClick={() => setBloqueioDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Adicionar Bloqueio
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {bloqueios.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground text-sm">
                            Nenhum bloqueio cadastrado (feriados, reformas, etc.)
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {bloqueios.map(b => (
                                <div
                                    key={b.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                                >
                                    <div className="flex items-center gap-3">
                                        <Badge variant="destructive" className="text-xs">
                                            {b.data_especifica
                                                ? new Date(b.data_especifica + 'T12:00:00').toLocaleDateString('pt-BR')
                                                : DIAS_SEMANA[b.dia_semana!]?.label
                                            }
                                        </Badge>
                                        <span className="text-sm">{b.motivo}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {b.hora_inicio === '00:00' && b.hora_fim === '23:59'
                                                ? '(dia inteiro)'
                                                : `${b.hora_inicio.slice(0, 5)} - ${b.hora_fim.slice(0, 5)}`
                                            }
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteHorario(b.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialog Horário Padrão */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adicionar Horário Padrão</DialogTitle>
                        <DialogDescription>
                            Defina o horário de funcionamento para um dia da semana
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Dia da Semana</Label>
                            <Select
                                value={horarioForm.dia_semana.toString()}
                                onValueChange={(v) => setHorarioForm({ ...horarioForm, dia_semana: parseInt(v) })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DIAS_SEMANA.map(d => (
                                        <SelectItem key={d.value} value={d.value.toString()}>{d.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Hora Início</Label>
                                <Input
                                    type="time"
                                    value={horarioForm.hora_inicio}
                                    onChange={(e) => setHorarioForm({ ...horarioForm, hora_inicio: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Hora Fim</Label>
                                <Input
                                    type="time"
                                    value={horarioForm.hora_fim}
                                    onChange={(e) => setHorarioForm({ ...horarioForm, hora_fim: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAddHorario} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Adicionar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Bloqueio */}
            <Dialog open={bloqueioDialogOpen} onOpenChange={setBloqueioDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adicionar Bloqueio</DialogTitle>
                        <DialogDescription>
                            Bloqueie uma data específica (feriado, reforma, etc.)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Data *</Label>
                            <Input
                                type="date"
                                value={bloqueioForm.data_especifica}
                                onChange={(e) => setBloqueioForm({ ...bloqueioForm, data_especifica: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Motivo *</Label>
                            <Input
                                value={bloqueioForm.motivo}
                                onChange={(e) => setBloqueioForm({ ...bloqueioForm, motivo: e.target.value })}
                                placeholder="Ex: Feriado - Natal"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="dia_inteiro"
                                checked={bloqueioForm.dia_inteiro}
                                onChange={(e) => setBloqueioForm({ ...bloqueioForm, dia_inteiro: e.target.checked })}
                                className="rounded"
                            />
                            <Label htmlFor="dia_inteiro" className="cursor-pointer">Dia inteiro</Label>
                        </div>
                        {!bloqueioForm.dia_inteiro && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Hora Início</Label>
                                    <Input
                                        type="time"
                                        value={bloqueioForm.hora_inicio}
                                        onChange={(e) => setBloqueioForm({ ...bloqueioForm, hora_inicio: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Hora Fim</Label>
                                    <Input
                                        type="time"
                                        value={bloqueioForm.hora_fim}
                                        onChange={(e) => setBloqueioForm({ ...bloqueioForm, hora_fim: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBloqueioDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAddBloqueio} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Adicionar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
