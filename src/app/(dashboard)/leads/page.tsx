'use client'

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState, useCallback } from "react"
import { Lead, OrigemLead } from "@/lib/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
    DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Pencil, UserCircle, Phone, ArrowRight } from "lucide-react"
import { toast } from "sonner"

const FASE_OPTIONS = [
    { value: 'novo', label: 'Novo', color: 'bg-blue-500' },
    { value: 'contato_feito', label: 'Contato Feito', color: 'bg-yellow-500' },
    { value: 'interessado', label: 'Interessado', color: 'bg-orange-500' },
    { value: 'agendado', label: 'Agendado', color: 'bg-purple-500' },
    { value: 'convertido', label: 'Convertido', color: 'bg-green-500' },
    { value: 'perdido', label: 'Perdido', color: 'bg-red-500' },
]

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [origens, setOrigens] = useState<OrigemLead[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingLead, setEditingLead] = useState<Lead | null>(null)
    const supabase = createClient()

    const [formData, setFormData] = useState({
        nome: '',
        telefone: '',
        email: '',
        origem_id: '',
        fase_funil: 'novo',
        qualificado: false,
        notas: '',
    })

    const fetchData = useCallback(async () => {
        const [leadsRes, origensRes] = await Promise.all([
            supabase.from('leads').select('*, origem:origens_lead(*)').order('created_at', { ascending: false }),
            supabase.from('origens_lead').select('*').eq('ativo', true)
        ])

        if (leadsRes.error) {
            toast.error('Erro ao carregar leads')
        } else {
            setLeads(leadsRes.data || [])
        }

        if (!origensRes.error) {
            setOrigens(origensRes.data || [])
        }
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        fetchData()

        const channel = supabase
            .channel('leads-changes')
            .on('postgres_changes', { event: '*', schema: 'drluisfarjallat', table: 'leads' }, () => {
                fetchData()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, fetchData])

    const resetForm = () => {
        setFormData({
            nome: '', telefone: '', email: '', origem_id: '',
            fase_funil: 'novo', qualificado: false, notas: '',
        })
        setEditingLead(null)
    }

    const handleOpenDialog = (lead?: Lead) => {
        if (lead) {
            setEditingLead(lead)
            setFormData({
                nome: lead.nome,
                telefone: lead.telefone,
                email: lead.email || '',
                origem_id: lead.origem_id || '',
                fase_funil: lead.fase_funil,
                qualificado: lead.qualificado,
                notas: lead.notas || '',
            })
        } else {
            resetForm()
        }
        setDialogOpen(true)
    }

    const handleSave = async () => {
        if (!formData.nome || !formData.telefone) {
            toast.error('Nome e telefone são obrigatórios')
            return
        }

        const dataToSave = {
            nome: formData.nome,
            telefone: formData.telefone,
            email: formData.email || null,
            origem_id: formData.origem_id || null,
            fase_funil: formData.fase_funil,
            qualificado: formData.qualificado,
            notas: formData.notas || null,
        }

        if (editingLead) {
            const { error } = await supabase
                .from('leads')
                .update({ ...dataToSave, updated_at: new Date().toISOString() })
                .eq('id', editingLead.id)

            if (error) {
                toast.error('Erro ao atualizar lead')
            } else {
                toast.success('Lead atualizado!')
                setDialogOpen(false)
                resetForm()
            }
        } else {
            const { error } = await supabase.from('leads').insert(dataToSave)

            if (error) {
                if (error.code === '23505') {
                    toast.error('Já existe um lead com este telefone')
                } else {
                    toast.error('Erro ao criar lead')
                }
            } else {
                toast.success('Lead criado!')
                setDialogOpen(false)
                resetForm()
            }
        }
    }

    const handleConvertToPaciente = async (lead: Lead) => {
        if (!confirm('Converter este lead em paciente?')) return

        // Criar paciente
        const { data: paciente, error: pacError } = await supabase
            .from('pacientes')
            .insert({
                lead_id: lead.id,
                nome: lead.nome,
                telefone: lead.telefone,
                email: lead.email,
            })
            .select()
            .single()

        if (pacError) {
            toast.error('Erro ao criar paciente')
            return
        }

        // Atualizar lead como convertido
        await supabase
            .from('leads')
            .update({ fase_funil: 'convertido', updated_at: new Date().toISOString() })
            .eq('id', lead.id)

        toast.success('Lead convertido em paciente!')
    }

    const getFaseBadge = (fase: string) => {
        const faseInfo = FASE_OPTIONS.find(f => f.value === fase)
        return faseInfo || { label: fase, color: 'bg-gray-500' }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <UserCircle className="h-8 w-8" />
                        Leads
                    </h1>
                    <p className="text-muted-foreground">Gerencie leads e oportunidades</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Novo Lead
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingLead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
                            <DialogDescription>
                                {editingLead ? 'Atualize os dados do lead' : 'Cadastre um novo lead'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="nome">Nome *</Label>
                                <Input id="nome" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="telefone">Telefone *</Label>
                                    <Input id="telefone" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="origem">Origem</Label>
                                    <select id="origem" value={formData.origem_id} onChange={(e) => setFormData({ ...formData, origem_id: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                        <option value="">Selecione</option>
                                        {origens.map(o => (
                                            <option key={o.id} value={o.id}>{o.nome}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="fase">Fase do Funil</Label>
                                    <select id="fase" value={formData.fase_funil} onChange={(e) => setFormData({ ...formData, fase_funil: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                        {FASE_OPTIONS.map(f => (
                                            <option key={f.value} value={f.value}>{f.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="qualificado" checked={formData.qualificado} onChange={(e) => setFormData({ ...formData, qualificado: e.target.checked })} />
                                <Label htmlFor="qualificado">Lead qualificado (tem receita ou veio do doutor)</Label>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="notas">Notas</Label>
                                <textarea id="notas" value={formData.notas} onChange={(e) => setFormData({ ...formData, notas: e.target.value })} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSave}>{editingLead ? 'Salvar' : 'Criar'}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {FASE_OPTIONS.map(fase => {
                    const count = leads.filter(l => l.fase_funil === fase.value).length
                    return (
                        <div key={fase.value} className="rounded-lg border bg-card p-3 text-center">
                            <div className={`w-2 h-2 rounded-full ${fase.color} mx-auto mb-1`} />
                            <p className="text-xs text-muted-foreground">{fase.label}</p>
                            <p className="text-xl font-bold">{count}</p>
                        </div>
                    )
                })}
            </div>

            <div className="rounded-xl border bg-card">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Carregando...</div>
                ) : leads.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">Nenhum lead cadastrado</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Lead</TableHead>
                                <TableHead>Origem</TableHead>
                                <TableHead>Fase</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {leads.map((lead) => {
                                const faseInfo = getFaseBadge(lead.fase_funil)
                                return (
                                    <TableRow key={lead.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{lead.nome}</p>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Phone className="h-3 w-3" />
                                                    {lead.telefone}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {lead.origem?.nome || <span className="text-muted-foreground">-</span>}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`${faseInfo.color} text-white`}>
                                                {faseInfo.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {lead.qualificado && <Badge variant="outline">Qualificado</Badge>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(lead)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                {lead.fase_funil !== 'convertido' && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleConvertToPaciente(lead)} title="Converter em Paciente">
                                                        <ArrowRight className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    )
}
