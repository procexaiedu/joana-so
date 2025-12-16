import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Agendamento, Clinica, Profissional, Paciente, TipoAgendamento } from "@/lib/types/database"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Search, Check, AlertTriangle } from "lucide-react"
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

    // Form State
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

    // Patient Search State
    const [patientSearch, setPatientSearch] = useState('')
    const [patients, setPatients] = useState<Paciente[]>([])
    const [searchingPatients, setSearchingPatients] = useState(false)
    const [selectedPatient, setSelectedPatient] = useState<Paciente | null>(null)

    // Initial Data Effect
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
                // Need to fetch patient name if editing? 
                // Creating simplified flow: Assume creating new usually.
                if (initialData.paciente) setSelectedPatient(initialData.paciente)
            } else {
                // Reset defaults
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

    // Patient Search Helper
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

            // 1. Check Availability (Unless Forcing)
            if (!force) {
                const availableSlots = await checkAvailability(
                    formData.clinica_id,
                    formData.profissional_id,
                    new Date(formData.data),
                    formData.duracao_minutos
                )

                // Simple exact match check. 
                // The RPC returns STARTS.
                // Note: The RPC returns valid slots. If our time is NOT in the list, logic implies it's busy/closed.
                // However, the RPC generates slots based on a grid. User might pick 08:15 manually.
                // The stricter check is "Is valid?".
                // For "Soft Conflict", we assume if RPC returns slots, we check if our time is roughly there.
                // BETTER: We trust the RPC logic. If user picks a time not in list -> Alert.

                // Let's refine availability check logic:
                // We just want to know if there is a conflict. 
                // Re-using the logic from RPC inside JS is redundant.
                // The RPC *returns free slots*. If we don't find our time, warn.
                const timeStr = formData.hora + ":00" // HH:mm:ss
                // Match HH:MM
                const isAvailable = availableSlots.some(s => s.startsWith(formData.hora)) // approximate

                if (!isAvailable) {
                    setStep('conflict_warning')
                    setLoading(false)
                    return
                }
            }

            // 2. Save
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
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData?.id ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
                    <DialogDescription>
                        {step === 'form' ? 'Preencha os dados do agendamento' : 'Atenção: Conflito detectado'}
                    </DialogDescription>
                </DialogHeader>

                {step === 'form' ? (
                    <div className="space-y-4 py-4">
                        {/* Patient Search */}
                        <div className="space-y-2">
                            <Label>Paciente</Label>
                            {!selectedPatient ? (
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar paciente..."
                                        className="pl-8"
                                        value={patientSearch}
                                        onChange={(e) => setPatientSearch(e.target.value)}
                                    />
                                    {searchingPatients && <div className="absolute right-2 top-2.5"><Loader2 className="h-4 w-4 animate-spin" /></div>}

                                    {patients.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 z-50 bg-popover border rounded-md shadow-md mt-1 max-h-[200px] overflow-auto">
                                            {patients.map(p => (
                                                <div
                                                    key={p.id}
                                                    className="p-2 hover:bg-muted cursor-pointer text-sm"
                                                    onClick={() => {
                                                        setSelectedPatient(p)
                                                        setFormData({ ...formData, paciente_id: p.id })
                                                        setPatients([])
                                                        setPatientSearch('')
                                                    }}
                                                >
                                                    {p.nome}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-2 border rounded-md bg-muted/20">
                                    <span className="font-medium text-sm">{selectedPatient.nome}</span>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>Trocar</Button>
                                </div>
                            )}
                        </div>

                        {/* Clinic & Professional */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Clínica</Label>
                                <Select
                                    value={formData.clinica_id}
                                    onValueChange={(v) => setFormData({ ...formData, clinica_id: v })}
                                >
                                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                    <SelectContent>
                                        {clinicas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Profissional</Label>
                                <Select
                                    value={formData.profissional_id}
                                    onValueChange={(v) => setFormData({ ...formData, profissional_id: v })}
                                >
                                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                    <SelectContent>
                                        {profissionais.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Type & Duration */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo de Agendamento</Label>
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
                                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                    <SelectContent>
                                        {tipos.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Duração (min)</Label>
                                <Select
                                    value={formData.duracao_minutos.toString()}
                                    onValueChange={(v) => setFormData({ ...formData, duracao_minutos: parseInt(v) })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {[15, 30, 45, 60, 90, 120].map(m => (
                                            <SelectItem key={m} value={m.toString()}>{m} min</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {/* Date & Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Data</Label>
                                <Input
                                    type="date"
                                    value={formData.data}
                                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Hora</Label>
                                <Input
                                    type="time"
                                    value={formData.hora}
                                    onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Observações</Label>
                            <Input
                                value={formData.observacoes}
                                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="py-6 text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                                <AlertTriangle className="h-6 w-6 text-yellow-600" />
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Conflito Detectado</h3>
                            <p className="text-sm text-muted-foreground mt-2">
                                O horário selecionado não está disponível na agenda (ou existe conflito com outra clínica).
                            </p>
                            <p className="text-sm font-medium mt-2">Deseja forçar o agendamento mesmo assim?</p>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {step === 'form' ? (
                        <>
                            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                            <Button onClick={() => handleSave(false)} disabled={loading}>
                                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Salvar
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={() => setStep('form')}>Voltar</Button>
                            <Button variant="destructive" onClick={() => handleSave(true)} disabled={loading}>
                                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Forçar Agendamento
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
