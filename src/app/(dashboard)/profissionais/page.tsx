'use client'

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState, useCallback } from "react"
import { Profissional, TipoProfissional } from "@/lib/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Pencil, UserCircle, Phone, Mail, DollarSign } from "lucide-react"
import { toast } from "sonner"

export default function ProfissionaisPage() {
    const [profissionais, setProfissionais] = useState<Profissional[]>([])
    const [tipos, setTipos] = useState<TipoProfissional[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingProf, setEditingProf] = useState<Profissional | null>(null)
    const supabase = createClient()

    const [formData, setFormData] = useState({
        nome: '', tipo_id: '', telefone: '', email: '', registro_profissional: '', valor_hora: '',
    })

    const fetchData = useCallback(async () => {
        const [profsRes, tiposRes] = await Promise.all([
            supabase.from('profissionais').select('*, tipo:tipos_profissional(*)').order('nome'),
            supabase.from('tipos_profissional').select('*').eq('ativo', true)
        ])
        if (!profsRes.error) setProfissionais(profsRes.data || [])
        if (!tiposRes.error) setTipos(tiposRes.data || [])
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        fetchData()
        const channel = supabase.channel('profs-changes')
            .on('postgres_changes', { event: '*', schema: 'drluisfarjallat', table: 'profissionais' }, () => fetchData())
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [supabase, fetchData])

    const resetForm = () => {
        setFormData({ nome: '', tipo_id: '', telefone: '', email: '', registro_profissional: '', valor_hora: '' })
        setEditingProf(null)
    }

    const handleOpenDialog = (prof?: Profissional) => {
        if (prof) {
            setEditingProf(prof)
            setFormData({
                nome: prof.nome, tipo_id: prof.tipo_id || '', telefone: prof.telefone || '',
                email: prof.email || '', registro_profissional: prof.registro_profissional || '',
                valor_hora: prof.valor_hora?.toString() || '',
            })
        } else { resetForm() }
        setDialogOpen(true)
    }

    const handleSave = async () => {
        if (!formData.nome) { toast.error('Nome é obrigatório'); return }

        const dataToSave = {
            nome: formData.nome, tipo_id: formData.tipo_id || null, telefone: formData.telefone || null,
            email: formData.email || null, registro_profissional: formData.registro_profissional || null,
            valor_hora: formData.valor_hora ? parseFloat(formData.valor_hora) : null,
        }

        if (editingProf) {
            const { error } = await supabase.from('profissionais').update({ ...dataToSave, updated_at: new Date().toISOString() }).eq('id', editingProf.id)
            if (error) toast.error('Erro ao atualizar')
            else { toast.success('Profissional atualizado!'); setDialogOpen(false); resetForm() }
        } else {
            const { error } = await supabase.from('profissionais').insert(dataToSave)
            if (error) toast.error('Erro ao criar')
            else { toast.success('Profissional criado!'); setDialogOpen(false); resetForm() }
        }
    }

    const getInitials = (nome: string) => nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2"><UserCircle className="h-8 w-8" />Profissionais</h1>
                    <p className="text-muted-foreground">Médicos, enfermeiros, nutricionistas e preparadores</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()}><Plus className="h-4 w-4 mr-2" />Novo Profissional</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingProf ? 'Editar Profissional' : 'Novo Profissional'}</DialogTitle>
                            <DialogDescription>Cadastre profissionais da equipe</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="nome">Nome *</Label>
                                <Input id="nome" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="tipo">Tipo</Label>
                                    <select id="tipo" value={formData.tipo_id} onChange={(e) => setFormData({ ...formData, tipo_id: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                        <option value="">Selecione</option>
                                        {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="registro">Registro (CRM/COREN)</Label>
                                    <Input id="registro" value={formData.registro_profissional} onChange={(e) => setFormData({ ...formData, registro_profissional: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="telefone">Telefone</Label>
                                    <Input id="telefone" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="valor">Valor/Hora (R$)</Label>
                                <Input id="valor" type="number" step="0.01" value={formData.valor_hora} onChange={(e) => setFormData({ ...formData, valor_hora: e.target.value })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSave}>{editingProf ? 'Salvar' : 'Criar'}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-xl border bg-card">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Carregando...</div>
                ) : profissionais.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">Nenhum profissional cadastrado</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Profissional</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Contato</TableHead>
                                <TableHead>Valor/Hora</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {profissionais.map((prof) => (
                                <TableRow key={prof.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar><AvatarFallback>{getInitials(prof.nome)}</AvatarFallback></Avatar>
                                            <div>
                                                <p className="font-medium">{prof.nome}</p>
                                                {prof.registro_profissional && <p className="text-xs text-muted-foreground">{prof.registro_profissional}</p>}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell><Badge variant="secondary">{prof.tipo?.nome || '-'}</Badge></TableCell>
                                    <TableCell>
                                        {prof.telefone && <div className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3" />{prof.telefone}</div>}
                                        {prof.email && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{prof.email}</div>}
                                    </TableCell>
                                    <TableCell>{prof.valor_hora ? <div className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{formatCurrency(prof.valor_hora)}/h</div> : '-'}</TableCell>
                                    <TableCell><Badge variant={prof.ativo ? "default" : "outline"}>{prof.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(prof)}><Pencil className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    )
}
