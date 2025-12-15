'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from "@/lib/supabase/client"
import { Clinica } from "@/lib/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MaskedInput, MASKS } from "@/components/ui/masked-input"
import { AddressAutocomplete } from "@/components/ui/address-autocomplete"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
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
    Building2,
    MapPin,
    Phone,
    MessageCircle,
    Plus,
    Pencil,
    ExternalLink,
    Loader2,
    Instagram,
    Facebook
} from "lucide-react"
import { toast } from "sonner"

interface ClinicasTabProps {
    className?: string
}

const initialFormData = {
    nome: '',
    endereco: '',
    telefone: '',
    whatsapp: '',
    cnpj: '',
    responsavel_tecnico: '',
    google_maps_url: '',
    aceita_consultas: true,
    aceita_aplicacoes: true,
    ativo: true,
    redes_sociais: {} as Record<string, string>
}

export function ClinicasTab({ className }: ClinicasTabProps) {
    const [clinicas, setClinicas] = useState<Clinica[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingClinica, setEditingClinica] = useState<Clinica | null>(null)
    const [formData, setFormData] = useState(initialFormData)
    const [saving, setSaving] = useState(false)
    const supabase = createClient()

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

        const channel = supabase
            .channel('clinicas-tab-changes')
            .on('postgres_changes', { event: '*', schema: 'drluisfarjallat', table: 'clinicas' }, () => {
                fetchClinicas()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, fetchClinicas])

    const resetForm = () => {
        setFormData(initialFormData)
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
                cnpj: clinica.cnpj || '',
                responsavel_tecnico: clinica.responsavel_tecnico || '',
                google_maps_url: clinica.google_maps_url || '',
                aceita_consultas: clinica.aceita_consultas,
                aceita_aplicacoes: clinica.aceita_aplicacoes,
                ativo: clinica.ativo,
                redes_sociais: clinica.redes_sociais || {}
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

        setSaving(true)
        try {
            const payload = {
                nome: formData.nome,
                endereco: formData.endereco,
                telefone: formData.telefone || null,
                whatsapp: formData.whatsapp || null,
                cnpj: formData.cnpj || null,
                responsavel_tecnico: formData.responsavel_tecnico || null,
                google_maps_url: formData.google_maps_url || null,
                aceita_consultas: formData.aceita_consultas,
                aceita_aplicacoes: formData.aceita_aplicacoes,
                ativo: formData.ativo,
                redes_sociais: Object.keys(formData.redes_sociais).length > 0 ? formData.redes_sociais : null,
                updated_at: new Date().toISOString()
            }

            if (editingClinica) {
                const { error } = await supabase
                    .from('clinicas')
                    .update(payload)
                    .eq('id', editingClinica.id)

                if (error) throw error
                toast.success('Clínica atualizada!')
            } else {
                const { error } = await supabase
                    .from('clinicas')
                    .insert(payload)

                if (error) throw error
                toast.success('Clínica criada!')
            }

            setDialogOpen(false)
            resetForm()
        } catch (error) {
            console.error(error)
            toast.error('Erro ao salvar clínica')
        } finally {
            setSaving(false)
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

    const updateRedeSocial = (rede: string, valor: string) => {
        setFormData(prev => ({
            ...prev,
            redes_sociais: {
                ...prev.redes_sociais,
                [rede]: valor
            }
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
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-semibold">Clínicas</h2>
                    <p className="text-sm text-muted-foreground">
                        Gerencie as clínicas onde o doutor atende
                    </p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Clínica
                </Button>
            </div>

            {/* Grid de Cards */}
            {clinicas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Nenhuma clínica cadastrada</p>
                    <Button variant="outline" className="mt-4" onClick={() => handleOpenDialog()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar primeira clínica
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {clinicas.map(clinica => (
                        <Card
                            key={clinica.id}
                            className={`relative transition-all ${!clinica.ativo ? 'opacity-60' : ''}`}
                        >
                            <CardContent className="p-5">
                                {/* Header do card */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Building2 className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{clinica.nome}</h3>
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <MapPin className="h-3 w-3" />
                                                <span className="truncate max-w-[200px]">{clinica.endereco}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Badge
                                        variant={clinica.ativo ? "default" : "secondary"}
                                        className="cursor-pointer"
                                        onClick={() => handleToggleAtivo(clinica)}
                                    >
                                        {clinica.ativo ? 'Ativa' : 'Inativa'}
                                    </Badge>
                                </div>

                                {/* Contatos */}
                                <div className="flex flex-wrap gap-3 mb-3 text-sm">
                                    {clinica.telefone && (
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                            <Phone className="h-3.5 w-3.5" />
                                            <span>{clinica.telefone}</span>
                                        </div>
                                    )}
                                    {clinica.whatsapp && (
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                            <MessageCircle className="h-3.5 w-3.5" />
                                            <span>{clinica.whatsapp}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Serviços */}
                                <div className="flex gap-2 mb-4">
                                    <Badge variant={clinica.aceita_consultas ? "default" : "outline"} className="text-xs">
                                        {clinica.aceita_consultas ? '✓' : '✗'} Consultas
                                    </Badge>
                                    <Badge variant={clinica.aceita_aplicacoes ? "default" : "outline"} className="text-xs">
                                        {clinica.aceita_aplicacoes ? '✓' : '✗'} Aplicações
                                    </Badge>
                                </div>

                                {/* Ações */}
                                <div className="flex gap-2">
                                    {clinica.google_maps_url && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(clinica.google_maps_url!, '_blank')}
                                        >
                                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                            Maps
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleOpenDialog(clinica)}
                                    >
                                        <Pencil className="h-3.5 w-3.5 mr-1" />
                                        Editar
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Dialog de Edição */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingClinica ? 'Editar Clínica' : 'Nova Clínica'}</DialogTitle>
                        <DialogDescription>
                            {editingClinica ? 'Atualize os dados da clínica' : 'Adicione uma nova clínica ao sistema'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        {/* Dados Básicos */}
                        <div>
                            <h4 className="text-sm font-medium mb-3">Dados Básicos</h4>
                            <div className="grid gap-4">
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
                                    <AddressAutocomplete
                                        id="endereco"
                                        value={formData.endereco}
                                        onChange={(endereco, googleMapsUrl) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                endereco,
                                                google_maps_url: googleMapsUrl || prev.google_maps_url
                                            }))
                                        }}
                                        placeholder="Digite o endereço..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="cnpj">CNPJ</Label>
                                        <MaskedInput
                                            id="cnpj"
                                            mask={MASKS.cnpj}
                                            value={formData.cnpj}
                                            onChange={(value) => setFormData({ ...formData, cnpj: value })}
                                            placeholder="00.000.000/0000-00"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="responsavel">Responsável Técnico</Label>
                                        <Input
                                            id="responsavel"
                                            value={formData.responsavel_tecnico}
                                            onChange={(e) => setFormData({ ...formData, responsavel_tecnico: e.target.value })}
                                            placeholder="Nome do responsável"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Contato */}
                        <div>
                            <h4 className="text-sm font-medium mb-3">Contato</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="telefone">Telefone</Label>
                                    <MaskedInput
                                        id="telefone"
                                        mask={MASKS.telefone}
                                        value={formData.telefone}
                                        onChange={(value) => setFormData({ ...formData, telefone: value })}
                                        placeholder="(00) 0000-0000"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="whatsapp">WhatsApp</Label>
                                    <MaskedInput
                                        id="whatsapp"
                                        mask={MASKS.celular}
                                        value={formData.whatsapp}
                                        onChange={(value) => setFormData({ ...formData, whatsapp: value })}
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2 mt-4">
                                <Label htmlFor="maps">Link do Google Maps</Label>
                                <Input
                                    id="maps"
                                    value={formData.google_maps_url}
                                    onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
                                    placeholder="https://maps.google.com/..."
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Serviços */}
                        <div>
                            <h4 className="text-sm font-medium mb-3">Serviços</h4>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Aceita Consultas</Label>
                                        <p className="text-xs text-muted-foreground">Habilita agendamento de consultas</p>
                                    </div>
                                    <Switch
                                        checked={formData.aceita_consultas}
                                        onCheckedChange={(checked) => setFormData({ ...formData, aceita_consultas: checked })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Aceita Aplicações</Label>
                                        <p className="text-xs text-muted-foreground">Habilita agendamento de aplicações</p>
                                    </div>
                                    <Switch
                                        checked={formData.aceita_aplicacoes}
                                        onCheckedChange={(checked) => setFormData({ ...formData, aceita_aplicacoes: checked })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Clínica Ativa</Label>
                                        <p className="text-xs text-muted-foreground">Clínicas inativas não aparecem para agendamento</p>
                                    </div>
                                    <Switch
                                        checked={formData.ativo}
                                        onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Redes Sociais */}
                        <div>
                            <h4 className="text-sm font-medium mb-3">Redes Sociais</h4>
                            <div className="grid gap-4">
                                <div className="flex items-center gap-3">
                                    <Instagram className="h-5 w-5 text-muted-foreground shrink-0" />
                                    <Input
                                        value={formData.redes_sociais.instagram || ''}
                                        onChange={(e) => updateRedeSocial('instagram', e.target.value)}
                                        placeholder="@usuario"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <Facebook className="h-5 w-5 text-muted-foreground shrink-0" />
                                    <Input
                                        value={formData.redes_sociais.facebook || ''}
                                        onChange={(e) => updateRedeSocial('facebook', e.target.value)}
                                        placeholder="facebook.com/pagina"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingClinica ? 'Salvar' : 'Criar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
