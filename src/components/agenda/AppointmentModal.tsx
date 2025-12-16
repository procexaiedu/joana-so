'use client'

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Agendamento, Clinica, Profissional, Paciente, TipoAgendamento } from "@/lib/types/database"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import {
    Loader2,
    Search,
    AlertTriangle,
    User,
    Building2,
    Stethoscope,
    Calendar,
    Clock,
    FileText
} from "lucide-react"
import { useAgendaAvailability } from "@/hooks/useAgendaAvailability"
import { cn } from "@/lib/utils"

interface AppointmentModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialData?: Partial<Agendamento>
    clinicas: Clinica[]
    profissionais: Profissional[]
    tipos: TipoAgendamento[]
    onSuccess: () => void
}

export function AppointmentModal({
    open,
    onOpenChange,
    initialData,
    clinicas,
    profissionais,
    tipos,
    onSuccess
}: AppointmentModalProps) {
    const supabase = createClient()
    const { checkAvailability, loading: checkingAvailability } = useAgendaAvailability()

    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState<'form' | 'conflict_warning'>('form')

    const [formData, setFormData] = useState({
        paciente_id: '',
        profissional_id: '',
        clinica_id: '',
        tipo_id: '',
        data: '',
        hora: '',
        duracao_minutos: 30,
        observacoes: ''
    })

    const [patientSearch, setPatientSearch] = useState('')
    const [patients, setPatients] = useState<Paciente[]>([])
    const [searchingPatients, setSearchingPatients] = useState(false)
    const [selectedPatient, setSelectedPatient] = useState<Paciente | null>(null)

    useEffect(() => {
        if (open) {
            if (initialData) {
                const dateObj = initialData.data_hora ? new Date(initialData.data_hora) : new Date()
                setFormData({
                    paciente_id: initialData.paciente_id || '',
                    profissional_id: initialData.profissional_id || '',
                    clinica_id: initialData.clinica_id || '',
                    tipo_id: initialData.tipo_id || '',
                    data: initialData.data_hora ? dateObj.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    hora: initialData.data_hora ? dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '08:00',
                    duracao_minutos: initialData.duracao_minutos || 30,
                    observacoes: initialData.observacoes || ''
                })
                if (initialData.paciente) setSelectedPatient(initialData.paciente)
            } else {
                setFormData({
                    paciente_id: '',
                    profissional_id: '',
                    clinica_id: '',
                    tipo_id: '',
                    data: new Date().toISOString().split('T')[0],
                    hora: '08:00',
                    duracao_minutos: 30,
                    observacoes: ''
                })
                setSelectedPatient(null)
            }
            setStep('form')
        }
    }, [open, initialData])

    useEffect(() => {
        const searchTimeout = setTimeout(async () => {
            if (patientSearch.length > 2) {
                setSearchingPatients(true)
                const { data } = await supabase
                    .from('pacientes')
                    .select('*')
                    .ilike('nome', `%${patientSearch}%`)
                    .limit(5)
                setPatients(data || [])
                setSearchingPatients(false)
            }
        }, 500)
        return () => clearTimeout(searchTimeout)
    }, [patientSearch, supabase])

    const handleSave = async (force: boolean = false) => {
        if (!formData.paciente_id || !formData.profissional_id || !formData.clinica_id || !formData.data || !formData.hora) {
            toast.error("Preencha todos os campos obrigatórios")
            return
        }

        setLoading(true)
        try {
            const dataHoraIso = `${formData.data}T${formData.hora}:00`

            if (!force) {
                const availableSlots = await checkAvailability(
                    formData.clinica_id,
                    formData.profissional_id,
                    new Date(formData.data),
                    formData.duracao_minutos
                )

                const isAvailable = availableSlots.some(s => s.startsWith(formData.hora))

                if (!isAvailable) {
                    setStep('conflict_warning')
                    setLoading(false)
                    return
                }
            }

            const payload = {
                paciente_id: formData.paciente_id,
                profissional_id: formData.profissional_id,
                clinica_id: formData.clinica_id,
                tipo_id: formData.tipo_id || null,
                data_hora: dataHoraIso,
                duracao_minutos: formData.duracao_minutos,
                status: 'agendado',
                observacoes: formData.observacoes,
                updated_at: new Date().toISOString()
            }

            if (initialData?.id) {
                const { error } = await supabase.from('agendamentos').update(payload).eq('id', initialData.id)
                if (error) throw error
                toast.success("Agendamento atualizado")
            } else {
                const { error } = await supabase.from('agendamentos').insert(payload)
                if (error) throw error
                toast.success("Agendamento criado")
            }

            onSuccess()
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast.error("Erro ao salvar agendamento")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
                {/* Header with gradient */}
                <div className="relative px-6 pt-6 pb-4 border-b border-border/50">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-violet-500/5" />
                    <DialogHeader className="relative">
                        <DialogTitle className="flex items-center gap-3 text-xl">
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg",
                                step === 'form'
                                    ? "bg-gradient-to-br from-primary to-primary/80 shadow-primary/30"
                                    : "bg-gradient-to-br from-amber-500 to-amber-600 shadow-amber-500/30"
                            )}>
                                {step === 'form'
                                    ? <Calendar className="h-5 w-5 text-white" />
                                    : <AlertTriangle className="h-5 w-5 text-white" />
                                }
                            </div>
                            <div>
                                <span className="block">
                                    {step === 'form'
                                        ? (initialData?.id ? 'Editar Agendamento' : 'Novo Agendamento')
                                        : 'Conflito Detectado'
                                    }
                                </span>
                                <span className="text-xs font-normal text-muted-foreground">
                                    {step === 'form'
                                        ? 'Preencha os dados abaixo'
                                        : 'Horário potencialmente indisponível'
                                    }
                                </span>
                            </div>
                        </DialogTitle>
                    </DialogHeader>
                </div>

                {step === 'form' ? (
                    <div className="p-6 space-y-5">
                        {/* Patient Search */}
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <User className="h-3.5 w-3.5" />
                                Paciente *
                            </Label>
                            {!selectedPatient ? (
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Digite o nome do paciente..."
                                        className="pl-10 bg-muted/30 border-border/50 focus:border-primary"
                                        value={patientSearch}
                                        onChange={(e) => setPatientSearch(e.target.value)}
                                    />
                                    {searchingPatients && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                                    )}

                                    {patients.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 z-50 bg-popover border border-border/50 rounded-xl shadow-xl mt-2 overflow-hidden">
                                            {patients.map(p => (
                                                <div
                                                    key={p.id}
                                                    className="flex items-center gap-3 p-3 hover:bg-primary/5 cursor-pointer transition-colors border-b border-border/30 last:border-b-0"
                                                    onClick={() => {
                                                        setSelectedPatient(p)
                                                        setFormData({ ...formData, paciente_id: p.id })
                                                        setPatients([])
                                                        setPatientSearch('')
                                                    }}
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                                        <User className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <span className="font-medium text-sm">{p.nome}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-bold text-sm">
                                            {selectedPatient.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                        </div>
                                        <span className="font-semibold">{selectedPatient.nome}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedPatient(null)}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        Trocar
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Clinic & Professional */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Building2 className="h-3.5 w-3.5" />
                                    Clínica *
                                </Label>
                                <Select
                                    value={formData.clinica_id}
                                    onValueChange={(v) => setFormData({ ...formData, clinica_id: v })}
                                >
                                    <SelectTrigger className="bg-muted/30 border-border/50">
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clinicas.map(c => (
                                            <SelectItem key={c.id} value={c.id}>
                                                <span className="flex items-center gap-2">
                                                    <Building2 className="h-3.5 w-3.5 text-violet-500" />
                                                    {c.nome}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Stethoscope className="h-3.5 w-3.5" />
                                    Profissional *
                                </Label>
                                <Select
                                    value={formData.profissional_id}
                                    onValueChange={(v) => setFormData({ ...formData, profissional_id: v })}
                                >
                                    <SelectTrigger className="bg-muted/30 border-border/50">
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {profissionais.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                <span className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-600 font-bold">
                                                        {p.nome.charAt(0)}
                                                    </div>
                                                    {p.nome}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Type & Duration */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                                    Tipo de Atendimento
                                </Label>
                                <Select
                                    value={formData.tipo_id}
                                    onValueChange={(v) => {
                                        const type = tipos.find(t => t.id === v)
                                        setFormData({
                                            ...formData,
                                            tipo_id: v,
                                            duracao_minutos: type?.duracao_padrao_minutos || formData.duracao_minutos
                                        })
                                    }}
                                >
                                    <SelectTrigger className="bg-muted/30 border-border/50">
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tipos.map(t => (
                                            <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5" />
                                    Duração
                                </Label>
                                <Select
                                    value={formData.duracao_minutos.toString()}
                                    onValueChange={(v) => setFormData({ ...formData, duracao_minutos: parseInt(v) })}
                                >
                                    <SelectTrigger className="bg-muted/30 border-border/50">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[15, 30, 45, 60, 90, 120].map(m => (
                                            <SelectItem key={m} value={m.toString()}>{m} minutos</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Date & Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Data *
                                </Label>
                                <Input
                                    type="date"
                                    value={formData.data}
                                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                                    className="bg-muted/30 border-border/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5" />
                                    Horário *
                                </Label>
                                <Input
                                    type="time"
                                    value={formData.hora}
                                    onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                                    className="bg-muted/30 border-border/50"
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5" />
                                Observações
                            </Label>
                            <Textarea
                                value={formData.observacoes}
                                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                                placeholder="Anotações adicionais..."
                                rows={2}
                                className="bg-muted/30 border-border/50 resize-none"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center space-y-6">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center mx-auto">
                            <AlertTriangle className="h-10 w-10 text-amber-500" />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl">Horário Indisponível</h3>
                            <p className="text-muted-foreground mt-3 leading-relaxed">
                                O horário selecionado pode estar ocupado ou fora do expediente.
                                Deseja forçar o agendamento mesmo assim?
                            </p>
                        </div>
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-200">
                            ⚠️ Forçar o agendamento pode causar conflitos na agenda
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/50 bg-muted/20">
                    {step === 'form' ? (
                        <>
                            <Button
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                                className="text-muted-foreground"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => handleSave(false)}
                                disabled={loading}
                                className="bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20"
                            >
                                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {initialData?.id ? 'Salvar Alterações' : 'Criar Agendamento'}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="ghost"
                                onClick={() => setStep('form')}
                                className="text-muted-foreground"
                            >
                                Voltar
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => handleSave(true)}
                                disabled={loading}
                                className="shadow-lg shadow-destructive/20"
                            >
                                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Forçar Agendamento
                            </Button>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
