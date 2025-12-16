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
    CalendarRange,
    Sparkles
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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
                    <Button
                        variant="ghost"
                        size="icon"
                        title="Gerenciar Agendas"
                        className="hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                        <Settings2 className="h-5 w-5" />
                    </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px] bg-gradient-to-b from-background to-background/95 border-l border-border/50">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                                <CalendarRange className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <span className="block">Gerenciar Agendas</span>
                                <span className="text-xs font-normal text-muted-foreground">Configure os tipos de serviço</span>
                            </div>
                        </SheetTitle>
                    </SheetHeader>

                    <div className="mt-8 space-y-6">
                        <Button
                            onClick={() => openDialog()}
                            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Nova Agenda
                        </Button>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                            </div>
                        ) : agendas.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                                    <Sparkles className="h-8 w-8 text-muted-foreground/50" />
                                </div>
                                <p className="text-muted-foreground">Nenhuma agenda criada</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">Crie sua primeira agenda acima</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {agendas.map(a => {
                                    const linked = getClinicasForAgenda(a.id)
                                    return (
                                        <div
                                            key={a.id}
                                            className={cn(
                                                "group relative p-4 rounded-xl border transition-all duration-200",
                                                "hover:shadow-lg hover:border-primary/30 hover:bg-primary/5",
                                                a.ativo
                                                    ? "bg-card/50 border-border/50"
                                                    : "bg-muted/20 border-muted/30 opacity-60"
                                            )}
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Color Indicator */}
                                                <div
                                                    className="w-4 h-4 rounded-full mt-1 flex-shrink-0 shadow-md"
                                                    style={{
                                                        backgroundColor: a.cor || '#888',
                                                        boxShadow: `0 0 0 2px var(--background), 0 0 0 4px ${a.cor || '#888'}`
                                                    }}
                                                />

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold">{a.nome}</span>
                                                        {!a.ativo && (
                                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Inativa</Badge>
                                                        )}
                                                    </div>
                                                    {a.descricao && (
                                                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                                            {a.descricao}
                                                        </p>
                                                    )}
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {linked.length === 0 ? (
                                                            <span className="text-xs text-muted-foreground/70 italic">
                                                                Nenhuma clínica vinculada
                                                            </span>
                                                        ) : linked.map(c => (
                                                            <Badge
                                                                key={c.id}
                                                                variant="secondary"
                                                                className="text-[10px] px-2 py-0.5 bg-muted/50"
                                                            >
                                                                <Building2 className="h-2.5 w-2.5 mr-1" />
                                                                {c.nome}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                                        onClick={() => openDialog(a)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={() => handleDelete(a)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
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
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {editingAgenda ? (
                                <Pencil className="h-5 w-5 text-primary" />
                            ) : (
                                <Plus className="h-5 w-5 text-primary" />
                            )}
                            {editingAgenda ? 'Editar Agenda' : 'Nova Agenda'}
                        </DialogTitle>
                        <DialogDescription>Configure os detalhes e clínicas vinculadas</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-5 py-4">
                        <div className="grid gap-2">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nome *</Label>
                            <Input
                                value={form.nome}
                                onChange={e => setForm({ ...form, nome: e.target.value })}
                                placeholder="Ex: Aplicações, Exames..."
                                className="border-border/50 focus:border-primary"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Descrição</Label>
                            <Textarea
                                value={form.descricao}
                                onChange={e => setForm({ ...form, descricao: e.target.value })}
                                rows={2}
                                placeholder="Descrição opcional..."
                                className="border-border/50 focus:border-primary resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Cor</Label>
                                <div className="flex gap-2">
                                    <div
                                        className="w-12 h-10 rounded-lg border border-border/50 overflow-hidden cursor-pointer relative group"
                                        style={{ backgroundColor: form.cor }}
                                    >
                                        <Input
                                            type="color"
                                            value={form.cor}
                                            onChange={e => setForm({ ...form, cor: e.target.value })}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                    </div>
                                    <Input
                                        value={form.cor}
                                        onChange={e => setForm({ ...form, cor: e.target.value })}
                                        className="flex-1 font-mono text-sm border-border/50"
                                    />
                                </div>
                            </div>
                            <div className="flex items-end justify-between pb-2">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Status</Label>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "text-xs",
                                        form.ativo ? "text-emerald-500" : "text-muted-foreground"
                                    )}>
                                        {form.ativo ? "Ativa" : "Inativa"}
                                    </span>
                                    <Switch
                                        checked={form.ativo}
                                        onCheckedChange={v => setForm({ ...form, ativo: v })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                                Clínicas que oferecem esta agenda
                            </Label>
                            <div className="border border-border/50 rounded-xl p-3 space-y-2 max-h-[140px] overflow-y-auto bg-muted/20">
                                {clinicas.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-2">Nenhuma clínica ativa</p>
                                ) : clinicas.map(c => (
                                    <label
                                        key={c.id}
                                        className={cn(
                                            "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                                            form.clinica_ids.includes(c.id)
                                                ? "bg-primary/10"
                                                : "hover:bg-muted/50"
                                        )}
                                    >
                                        <Checkbox
                                            id={`c-${c.id}`}
                                            checked={form.clinica_ids.includes(c.id)}
                                            onCheckedChange={() => toggleClinica(c.id)}
                                        />
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm">{c.nome}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-gradient-to-r from-primary to-primary/80"
                        >
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingAgenda ? 'Salvar Alterações' : 'Criar Agenda'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
