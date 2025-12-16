'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
    CalendarRange,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Building2
} from "lucide-react"
import { toast } from "sonner"

interface Agenda {
    id: string
    nome: string
    descricao: string | null
    cor: string | null
    ativo: boolean
    created_at: string
}

interface Clinica {
    id: string
    nome: string
    ativo: boolean
}

interface AgendasTabProps {
    className?: string
}

const initialAgendaForm = {
    nome: '',
    descricao: '',
    cor: '#3b82f6',
    ativo: true,
    clinica_ids: [] as string[]
}

export function AgendasTab({ className }: AgendasTabProps) {
    const [agendas, setAgendas] = useState<Agenda[]>([])
    const [clinicas, setClinkas] = useState<Clinica[]>([])
    const [clinicaAgendas, setClinicaAgendas] = useState<{ clinica_id: string; agenda_id: string }[]>([])
    const [loading, setLoading] = useState(true)

    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingAgenda, setEditingAgenda] = useState<Agenda | null>(null)
    const [form, setForm] = useState(initialAgendaForm)
    const [saving, setSaving] = useState(false)

    const supabase = createClient()

    const fetchData = useCallback(async () => {
        const [agendasRes, clinicasRes, relRes] = await Promise.all([
            supabase.from('agendas').select('*').order('nome'),
            supabase.from('clinicas').select('id, nome, ativo').eq('ativo', true).order('nome'),
            supabase.from('clinicas_agendas').select('*')
        ])

        if (agendasRes.error) {
            toast.error('Erro ao carregar agendas')
            console.error(agendasRes.error)
        } else {
            setAgendas(agendasRes.data || [])
        }

        if (clinicasRes.error) {
            console.error(clinicasRes.error)
        } else {
            setClinkas(clinicasRes.data || [])
        }

        if (relRes.error) {
            console.error(relRes.error)
        } else {
            setClinicaAgendas(relRes.data || [])
        }

        setLoading(false)
    }, [supabase])

    useEffect(() => {
        fetchData()

        const channel = supabase
            .channel('agendas-changes')
            .on('postgres_changes', { event: '*', schema: 'drluisfarjallat', table: 'agendas' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'drluisfarjallat', table: 'clinicas_agendas' }, fetchData)
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, fetchData])

    const getClinicasForAgenda = (agendaId: string) => {
        const clinicaIds = clinicaAgendas.filter(ca => ca.agenda_id === agendaId).map(ca => ca.clinica_id)
        return clinicas.filter(c => clinicaIds.includes(c.id))
    }

    const openDialog = (agenda?: Agenda) => {
        if (agenda) {
            setEditingAgenda(agenda)
            const linkedClinicaIds = clinicaAgendas
                .filter(ca => ca.agenda_id === agenda.id)
                .map(ca => ca.clinica_id)
            setForm({
                nome: agenda.nome,
                descricao: agenda.descricao || '',
                cor: agenda.cor || '#3b82f6',
                ativo: agenda.ativo,
                clinica_ids: linkedClinicaIds
            })
        } else {
            setEditingAgenda(null)
            setForm(initialAgendaForm)
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
                const { error } = await supabase
                    .from('agendas')
                    .update(payload)
                    .eq('id', editingAgenda.id)
                if (error) throw error
            } else {
                const { data, error } = await supabase
                    .from('agendas')
                    .insert(payload)
                    .select('id')
                    .single()
                if (error) throw error
                agendaId = data.id
            }

            // Sync clinicas_agendas
            if (agendaId) {
                // Delete existing relations
                await supabase
                    .from('clinicas_agendas')
                    .delete()
                    .eq('agenda_id', agendaId)

                // Insert new relations
                if (form.clinica_ids.length > 0) {
                    const relations = form.clinica_ids.map(clinica_id => ({
                        clinica_id,
                        agenda_id: agendaId
                    }))
                    const { error: relError } = await supabase
                        .from('clinicas_agendas')
                        .insert(relations)
                    if (relError) throw relError
                }
            }

            toast.success(editingAgenda ? 'Agenda atualizada!' : 'Agenda criada!')
            setDialogOpen(false)
            setForm(initialAgendaForm)
            setEditingAgenda(null)
        } catch (error) {
            console.error(error)
            toast.error('Erro ao salvar agenda')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (agenda: Agenda) => {
        if (!confirm(`Tem certeza que deseja excluir "${agenda.nome}"? Produtos vinculados perderão a referência.`)) return

        const { error } = await supabase
            .from('agendas')
            .delete()
            .eq('id', agenda.id)

        if (error) {
            toast.error('Erro ao excluir agenda')
            console.error(error)
        } else {
            toast.success('Agenda excluída!')
        }
    }

    const toggleClinica = (clinicaId: string) => {
        setForm(prev => ({
            ...prev,
            clinica_ids: prev.clinica_ids.includes(clinicaId)
                ? prev.clinica_ids.filter(id => id !== clinicaId)
                : [...prev.clinica_ids, clinicaId]
        }))
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className={className}>
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <CalendarRange className="h-5 w-5" />
                                Agendas
                            </CardTitle>
                            <CardDescription>
                                Gerencie os tipos de agenda (ex: Aplicações, Atendimento) e quais clínicas os oferecem.
                            </CardDescription>
                        </div>
                        <Button onClick={() => openDialog()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nova Agenda
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {agendas.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <CalendarRange className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p>Nenhuma agenda cadastrada</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Agenda</TableHead>
                                    <TableHead>Clínicas Vinculadas</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {agendas.map(agenda => {
                                    const linkedClinics = getClinicasForAgenda(agenda.id)
                                    return (
                                        <TableRow key={agenda.id} className={!agenda.ativo ? 'opacity-50' : ''}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: agenda.cor || '#888' }}
                                                    />
                                                    <div>
                                                        <div className="font-medium">{agenda.nome}</div>
                                                        {agenda.descricao && (
                                                            <div className="text-xs text-muted-foreground truncate max-w-[250px]">
                                                                {agenda.descricao}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {linkedClinics.length === 0 ? (
                                                        <span className="text-muted-foreground text-sm">Nenhuma</span>
                                                    ) : (
                                                        linkedClinics.map(c => (
                                                            <Badge key={c.id} variant="secondary" className="text-xs">
                                                                <Building2 className="h-3 w-3 mr-1" />
                                                                {c.nome}
                                                            </Badge>
                                                        ))
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={agenda.ativo ? "default" : "secondary"}>
                                                    {agenda.ativo ? 'Ativa' : 'Inativa'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => openDialog(agenda)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => handleDelete(agenda)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingAgenda ? 'Editar Agenda' : 'Nova Agenda'}</DialogTitle>
                        <DialogDescription>
                            {editingAgenda ? 'Atualize os dados da agenda' : 'Crie um novo tipo de agenda para o sistema'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="nome">Nome *</Label>
                            <Input
                                id="nome"
                                value={form.nome}
                                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                                placeholder="Ex: Aplicações, Exames..."
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="descricao">Descrição</Label>
                            <Textarea
                                id="descricao"
                                value={form.descricao}
                                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                                placeholder="Descrição opcional"
                                rows={2}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="cor">Cor</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="cor"
                                        type="color"
                                        value={form.cor}
                                        onChange={(e) => setForm({ ...form, cor: e.target.value })}
                                        className="w-12 h-10 p-1 cursor-pointer"
                                    />
                                    <Input
                                        value={form.cor}
                                        onChange={(e) => setForm({ ...form, cor: e.target.value })}
                                        placeholder="#3b82f6"
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-6">
                                <Label>Ativa</Label>
                                <Switch
                                    checked={form.ativo}
                                    onCheckedChange={(v) => setForm({ ...form, ativo: v })}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Clínicas que oferecem esta agenda</Label>
                            <div className="border rounded-md p-3 space-y-2 max-h-[150px] overflow-y-auto">
                                {clinicas.map(clinica => (
                                    <div key={clinica.id} className="flex items-center gap-2">
                                        <Checkbox
                                            id={`clinica-${clinica.id}`}
                                            checked={form.clinica_ids.includes(clinica.id)}
                                            onCheckedChange={() => toggleClinica(clinica.id)}
                                        />
                                        <Label htmlFor={`clinica-${clinica.id}`} className="text-sm font-normal cursor-pointer">
                                            {clinica.nome}
                                        </Label>
                                    </div>
                                ))}
                                {clinicas.length === 0 && (
                                    <p className="text-sm text-muted-foreground">Nenhuma clínica ativa</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingAgenda ? 'Salvar' : 'Criar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
