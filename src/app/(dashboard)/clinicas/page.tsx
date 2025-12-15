'use client'

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState, useCallback } from "react"
import { Clinica } from "@/lib/types/database"
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
import { Plus, Pencil, Trash2, Building2, MapPin, Phone } from "lucide-react"
import { toast } from "sonner"

export default function ClinicasPage() {
    const [clinicas, setClinicas] = useState<Clinica[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingClinica, setEditingClinica] = useState<Clinica | null>(null)
    const supabase = createClient()

    // Form state
    const [formData, setFormData] = useState({
        nome: '',
        endereco: '',
        telefone: '',
        whatsapp: '',
        aceita_consultas: false,
        aceita_aplicacoes: true,
    })

    const fetchClinicas = useCallback(async () => {
        const { data, error } = await supabase
            .from('clinicas')
            .select('*')
            .order('nome')

        if (error) {
            toast.error('Erro ao carregar clínicas')
            console.error(error)
        } else {
            setClinicas(data || [])
        }
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        fetchClinicas()

        // Subscribe to realtime updates
        const channel = supabase
            .channel('clinicas-changes')
            .on('postgres_changes', { event: '*', schema: 'drluisfarjallat', table: 'clinicas' }, () => {
                fetchClinicas()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, fetchClinicas])

    const resetForm = () => {
        setFormData({
            nome: '',
            endereco: '',
            telefone: '',
            whatsapp: '',
            aceita_consultas: false,
            aceita_aplicacoes: true,
        })
        setEditingClinica(null)
    }

    const handleOpenDialog = (clinica?: Clinica) => {
        if (clinica) {
            setEditingClinica(clinica)
            setFormData({
                nome: clinica.nome,
                endereco: clinica.endereco,
                telefone: clinica.telefone || '',
                whatsapp: clinica.whatsapp || '',
                aceita_consultas: clinica.aceita_consultas,
                aceita_aplicacoes: clinica.aceita_aplicacoes,
            })
        } else {
            resetForm()
        }
        setDialogOpen(true)
    }

    const handleSave = async () => {
        if (!formData.nome || !formData.endereco) {
            toast.error('Nome e endereço são obrigatórios')
            return
        }

        if (editingClinica) {
            const { error } = await supabase
                .from('clinicas')
                .update({
                    ...formData,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', editingClinica.id)

            if (error) {
                toast.error('Erro ao atualizar clínica')
                console.error(error)
            } else {
                toast.success('Clínica atualizada!')
                setDialogOpen(false)
                resetForm()
            }
        } else {
            const { error } = await supabase.from('clinicas').insert(formData)

            if (error) {
                toast.error('Erro ao criar clínica')
                console.error(error)
            } else {
                toast.success('Clínica criada!')
                setDialogOpen(false)
                resetForm()
            }
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta clínica?')) return

        const { error } = await supabase.from('clinicas').delete().eq('id', id)

        if (error) {
            toast.error('Erro ao excluir clínica')
            console.error(error)
        } else {
            toast.success('Clínica excluída!')
        }
    }

    const handleToggleAtivo = async (clinica: Clinica) => {
        const { error } = await supabase
            .from('clinicas')
            .update({ ativo: !clinica.ativo, updated_at: new Date().toISOString() })
            .eq('id', clinica.id)

        if (error) {
            toast.error('Erro ao atualizar status')
        } else {
            toast.success(clinica.ativo ? 'Clínica desativada' : 'Clínica ativada')
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Building2 className="h-8 w-8" />
                        Clínicas
                    </h1>
                    <p className="text-muted-foreground">Gerencie as clínicas onde o doutor atende</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nova Clínica
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingClinica ? 'Editar Clínica' : 'Nova Clínica'}</DialogTitle>
                            <DialogDescription>
                                {editingClinica ? 'Atualize os dados da clínica' : 'Adicione uma nova clínica ao sistema'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="nome">Nome *</Label>
                                <Input
                                    id="nome"
                                    value={formData.nome}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                    placeholder="Nome da clínica"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="endereco">Endereço *</Label>
                                <Input
                                    id="endereco"
                                    value={formData.endereco}
                                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                                    placeholder="Endereço completo"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="telefone">Telefone</Label>
                                    <Input
                                        id="telefone"
                                        value={formData.telefone}
                                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                                        placeholder="(00) 0000-0000"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="whatsapp">WhatsApp</Label>
                                    <Input
                                        id="whatsapp"
                                        value={formData.whatsapp}
                                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.aceita_consultas}
                                        onChange={(e) => setFormData({ ...formData, aceita_consultas: e.target.checked })}
                                        className="rounded"
                                    />
                                    <span className="text-sm">Aceita Consultas</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.aceita_aplicacoes}
                                        onChange={(e) => setFormData({ ...formData, aceita_aplicacoes: e.target.checked })}
                                        className="rounded"
                                    />
                                    <span className="text-sm">Aceita Aplicações</span>
                                </label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSave}>
                                {editingClinica ? 'Salvar' : 'Criar'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Table */}
            <div className="rounded-xl border bg-card">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Carregando...</div>
                ) : clinicas.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        Nenhuma clínica cadastrada
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Endereço</TableHead>
                                <TableHead>Contato</TableHead>
                                <TableHead>Serviços</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clinicas.map((clinica) => (
                                <TableRow key={clinica.id}>
                                    <TableCell className="font-medium">{clinica.nome}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                            <MapPin className="h-3 w-3" />
                                            <span className="truncate max-w-[200px]">{clinica.endereco}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {clinica.telefone && (
                                            <div className="flex items-center gap-1 text-sm">
                                                <Phone className="h-3 w-3" />
                                                {clinica.telefone}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            {clinica.aceita_consultas && <Badge variant="secondary">Consultas</Badge>}
                                            {clinica.aceita_aplicacoes && <Badge variant="secondary">Aplicações</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={clinica.ativo ? "default" : "outline"}
                                            className="cursor-pointer"
                                            onClick={() => handleToggleAtivo(clinica)}
                                        >
                                            {clinica.ativo ? 'Ativo' : 'Inativo'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleOpenDialog(clinica)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(clinica.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
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
