'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Settings2,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Building2,
    CalendarRange
} from "lucide-react"
import { toast } from "sonner"

interface Agenda {
    id: string
    nome: string
    descricao: string | null
    cor: string | null
    ativo: boolean
}

interface Clinica {
    id: string
    nome: string
}

const initialForm = {
    nome: '',
    descricao: '',
    cor: '#3b82f6',
    ativo: true,
    clinica_ids: [] as string[]
}

export function AgendasSheet() {
    const [open, setOpen] = useState(false)
    const [agendas, setAgendas] = useState<Agenda[]>([])
    const [clinicas, setClinkas] = useState<Clinica[]>([])
    const [clinicaAgendas, setClinicaAgendas] = useState<{ clinica_id: string; agenda_id: string }[]>([])
    const [loading, setLoading] = useState(true)

    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingAgenda, setEditingAgenda] = useState<Agenda | null>(null)
    const [form, setForm] = useState(initialForm)
    const [saving, setSaving] = useState(false)

    const supabase = createClient()

    const fetchData = useCallback(async () => {
        const [agendasRes, clinicasRes, relRes] = await Promise.all([
            supabase.from('agendas').select('*').order('nome'),
            supabase.from('clinicas').select('id, nome').eq('ativo', true).order('nome'),
            supabase.from('clinicas_agendas').select('*')
        ])

        if (!agendasRes.error) setAgendas(agendasRes.data || [])
        if (!clinicasRes.error) setClinkas(clinicasRes.data || [])
        if (!relRes.error) setClinicaAgendas(relRes.data || [])
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        if (open) fetchData()
    }, [open, fetchData])

    const getClinicasForAgenda = (agendaId: string) => {
        const ids = clinicaAgendas.filter(ca => ca.agenda_id === agendaId).map(ca => ca.clinica_id)
        return clinicas.filter(c => ids.includes(c.id))
    }

    const openDialog = (agenda?: Agenda) => {
        if (agenda) {
            setEditingAgenda(agenda)
            const linkedIds = clinicaAgendas.filter(ca => ca.agenda_id === agenda.id).map(ca => ca.clinica_id)
            setForm({
                nome: agenda.nome,
                descricao: agenda.descricao || '',
                cor: agenda.cor || '#3b82f6',
                ativo: agenda.ativo,
                clinica_ids: linkedIds
            })
        } else {
            setEditingAgenda(null)
            setForm(initialForm)
        }
        setDialogOpen(true)
    }

    const handleSave = async () => {
        if (!form.nome) {
            toast.error('Nome é obrigatório')
            return
        }

        setSaving(true)
        try {
            const payload = {
                nome: form.nome,
                descricao: form.descricao || null,
                cor: form.cor || null,
                ativo: form.ativo,
                updated_at: new Date().toISOString()
            }

            let agendaId = editingAgenda?.id

            if (editingAgenda) {
                const { error } = await supabase.from('agendas').update(payload).eq('id', editingAgenda.id)
                if (error) throw error
            } else {
                const { data, error } = await supabase.from('agendas').insert(payload).select('id').single()
                if (error) throw error
                agendaId = data.id
            }

            if (agendaId) {
                await supabase.from('clinicas_agendas').delete().eq('agenda_id', agendaId)
                if (form.clinica_ids.length > 0) {
                    const relations = form.clinica_ids.map(clinica_id => ({ clinica_id, agenda_id: agendaId }))
                    await supabase.from('clinicas_agendas').insert(relations)
                }
            }

            toast.success(editingAgenda ? 'Agenda atualizada!' : 'Agenda criada!')
            setDialogOpen(false)
            fetchData()
        } catch (error) {
            console.error(error)
            toast.error('Erro ao salvar')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (agenda: Agenda) => {
        if (!confirm(`Excluir "${agenda.nome}"?`)) return
        const { error } = await supabase.from('agendas').delete().eq('id', agenda.id)
        if (error) toast.error('Erro ao excluir')
        else {
            toast.success('Excluída!')
            fetchData()
        }
    }

    const toggleClinica = (id: string) => {
        setForm(prev => ({
            ...prev,
            clinica_ids: prev.clinica_ids.includes(id)
                ? prev.clinica_ids.filter(x => x !== id)
                : [...prev.clinica_ids, id]
        }))
    }

    return (
        <>
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" title="Gerenciar Agendas">
                        <Settings2 className="h-5 w-5" />
                    </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px]">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <CalendarRange className="h-5 w-5" />
                            Gerenciar Agendas
                        </SheetTitle>
                        <SheetDescription>
                            Configure os tipos de agenda disponíveis no sistema
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-6 space-y-4">
                        <Button onClick={() => openDialog()} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Nova Agenda
                        </Button>

                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : agendas.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">Nenhuma agenda</p>
                        ) : (
                            <div className="space-y-2">
                                {agendas.map(a => {
                                    const linked = getClinicasForAgenda(a.id)
                                    return (
                                        <div
                                            key={a.id}
                                            className={`flex items-center justify-between p-3 border rounded-lg ${!a.ativo ? 'opacity-50' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: a.cor || '#888' }} />
                                                <div>
                                                    <div className="font-medium">{a.nome}</div>
                                                    <div className="flex gap-1 flex-wrap mt-1">
                                                        {linked.length === 0 ? (
                                                            <span className="text-xs text-muted-foreground">Nenhuma clínica</span>
                                                        ) : linked.map(c => (
                                                            <Badge key={c.id} variant="secondary" className="text-xs">
                                                                {c.nome}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button size="icon" variant="ghost" onClick={() => openDialog(a)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={() => handleDelete(a)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingAgenda ? 'Editar Agenda' : 'Nova Agenda'}</DialogTitle>
                        <DialogDescription>Configure os detalhes da agenda</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Nome *</Label>
                            <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Aplicações" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Descrição</Label>
                            <Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={2} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Cor</Label>
                                <div className="flex gap-2">
                                    <Input type="color" value={form.cor} onChange={e => setForm({ ...form, cor: e.target.value })} className="w-12 h-10 p-1" />
                                    <Input value={form.cor} onChange={e => setForm({ ...form, cor: e.target.value })} className="flex-1" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-6">
                                <Label>Ativa</Label>
                                <Switch checked={form.ativo} onCheckedChange={v => setForm({ ...form, ativo: v })} />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Clínicas</Label>
                            <div className="border rounded-md p-3 space-y-2 max-h-[120px] overflow-y-auto">
                                {clinicas.map(c => (
                                    <div key={c.id} className="flex items-center gap-2">
                                        <Checkbox
                                            id={`c-${c.id}`}
                                            checked={form.clinica_ids.includes(c.id)}
                                            onCheckedChange={() => toggleClinica(c.id)}
                                        />
                                        <Label htmlFor={`c-${c.id}`} className="text-sm font-normal">{c.nome}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingAgenda ? 'Salvar' : 'Criar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
