'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from "@/lib/supabase/client"
import { Paciente } from "@/lib/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { MaskedInput } from "@/components/ui/masked-input"
import { AddressAutocomplete } from "@/components/ui/address-autocomplete"
import { Loader2, Camera, Upload, X } from "lucide-react"
import { toast } from "sonner"

interface PacienteDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    paciente: Paciente | null
    onSuccess: () => void
}

const initialForm = {
    nome: '',
    telefone: '',
    email: '',
    cpf: '',
    rg: '',
    data_nascimento: '',
    sexo: '',
    profissao: '',
    estado_civil: '',
    endereco: '',
    convenio_medico: '',
    altura_cm: '',
    peso_inicial_kg: '',
    peso_atual_kg: '',
    objetivo_peso_kg: '',
    observacoes_medicas: '',
    foto_url: ''
}

export function PacienteDialog({ open, onOpenChange, paciente, onSuccess }: PacienteDialogProps) {
    const [form, setForm] = useState(initialForm)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    useEffect(() => {
        if (paciente) {
            setForm({
                nome: paciente.nome || '',
                telefone: paciente.telefone || '',
                email: paciente.email || '',
                cpf: paciente.cpf || '',
                rg: paciente.rg || '',
                data_nascimento: paciente.data_nascimento || '',
                sexo: paciente.sexo || '',
                profissao: paciente.profissao || '',
                estado_civil: paciente.estado_civil || '',
                endereco: paciente.endereco || '',
                convenio_medico: paciente.convenio_medico || '',
                altura_cm: paciente.altura_cm?.toString() || '',
                peso_inicial_kg: paciente.peso_inicial_kg?.toString() || '',
                peso_atual_kg: paciente.peso_atual_kg?.toString() || '',
                objetivo_peso_kg: paciente.objetivo_peso_kg?.toString() || '',
                observacoes_medicas: paciente.observacoes_medicas || '',
                foto_url: paciente.foto_url || ''
            })
            setPreviewUrl(paciente.foto_url || null)
        } else {
            setForm(initialForm)
            setPreviewUrl(null)
        }
    }, [paciente, open])

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validar tipo
        if (!file.type.startsWith('image/')) {
            toast.error('Apenas imagens são permitidas')
            return
        }

        // Validar tamanho (5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Imagem muito grande (máximo 5MB)')
            return
        }

        // Preview local
        const localUrl = URL.createObjectURL(file)
        setPreviewUrl(localUrl)

        // Upload para MinIO
        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('folder', 'pacientes')

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Erro no upload')
            }

            setForm(prev => ({ ...prev, foto_url: result.url }))
            toast.success('Foto enviada!')
        } catch (error) {
            console.error('Erro no upload:', error)
            toast.error('Erro ao enviar foto')
            setPreviewUrl(paciente?.foto_url || null)
        } finally {
            setUploading(false)
        }
    }

    const removePhoto = () => {
        setPreviewUrl(null)
        setForm(prev => ({ ...prev, foto_url: '' }))
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleSave = async () => {
        if (!form.nome || !form.telefone) {
            toast.error('Nome e telefone são obrigatórios')
            return
        }

        setSaving(true)
        try {
            const payload = {
                nome: form.nome,
                telefone: form.telefone.replace(/\D/g, ''),
                email: form.email || null,
                cpf: form.cpf?.replace(/\D/g, '') || null,
                rg: form.rg?.replace(/\D/g, '') || null,
                data_nascimento: form.data_nascimento || null,
                sexo: form.sexo || null,
                profissao: form.profissao || null,
                estado_civil: form.estado_civil || null,
                endereco: form.endereco || null,
                convenio_medico: form.convenio_medico || null,
                altura_cm: form.altura_cm ? parseInt(form.altura_cm) : null,
                peso_inicial_kg: form.peso_inicial_kg ? parseFloat(form.peso_inicial_kg) : null,
                peso_atual_kg: form.peso_atual_kg ? parseFloat(form.peso_atual_kg) : null,
                objetivo_peso_kg: form.objetivo_peso_kg ? parseFloat(form.objetivo_peso_kg) : null,
                observacoes_medicas: form.observacoes_medicas || null,
                foto_url: form.foto_url || null,
                updated_at: new Date().toISOString()
            }

            if (paciente) {
                const { error } = await supabase
                    .from('pacientes')
                    .update(payload)
                    .eq('id', paciente.id)
                if (error) throw error
                toast.success('Paciente atualizado!')
            } else {
                const { error } = await supabase
                    .from('pacientes')
                    .insert({
                        ...payload,
                        peso_atual_kg: payload.peso_inicial_kg,
                        ativo: true
                    })
                if (error) throw error
                toast.success('Paciente cadastrado!')
            }

            onSuccess()
        } catch (error) {
            console.error(error)
            toast.error('Erro ao salvar paciente')
        } finally {
            setSaving(false)
        }
    }

    const getInitials = (nome: string) => {
        if (!nome) return '?'
        return nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{paciente ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
                    <DialogDescription>
                        {paciente ? 'Atualize os dados do paciente' : 'Cadastre um novo paciente'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Foto do Paciente */}
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Avatar className="h-20 w-20">
                                <AvatarImage src={previewUrl || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                                    {getInitials(form.nome)}
                                </AvatarFallback>
                            </Avatar>
                            {uploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                            >
                                <Camera className="h-4 w-4 mr-2" />
                                {previewUrl ? 'Trocar Foto' : 'Adicionar Foto'}
                            </Button>
                            {previewUrl && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={removePhoto}
                                    className="text-destructive hover:text-destructive"
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Remover
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Dados Básicos */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 grid gap-2">
                            <Label htmlFor="nome">Nome Completo *</Label>
                            <Input
                                id="nome"
                                value={form.nome}
                                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                                placeholder="Nome do paciente"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="telefone">Telefone *</Label>
                            <MaskedInput
                                id="telefone"
                                mask="telefone"
                                value={form.telefone}
                                onValueChange={(v) => setForm({ ...form, telefone: v })}
                                placeholder="(00) 00000-0000"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="email@exemplo.com"
                            />
                        </div>
                    </div>

                    {/* Documentos - CPF e RG com máscaras corretas */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="cpf">CPF</Label>
                            <MaskedInput
                                id="cpf"
                                mask="cpf"
                                value={form.cpf}
                                onValueChange={(v) => setForm({ ...form, cpf: v })}
                                placeholder="000.000.000-00"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="rg">RG</Label>
                            <MaskedInput
                                id="rg"
                                mask="rg"
                                value={form.rg}
                                onValueChange={(v) => setForm({ ...form, rg: v })}
                                placeholder="00.000.000-0"
                            />
                        </div>
                    </div>

                    {/* Dados Pessoais */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                            <Input
                                id="data_nascimento"
                                type="date"
                                value={form.data_nascimento}
                                onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="sexo">Sexo</Label>
                            <Select value={form.sexo} onValueChange={(v) => setForm({ ...form, sexo: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="M">Masculino</SelectItem>
                                    <SelectItem value="F">Feminino</SelectItem>
                                    <SelectItem value="O">Outro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="estado_civil">Estado Civil</Label>
                            <Select value={form.estado_civil} onValueChange={(v) => setForm({ ...form, estado_civil: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                                    <SelectItem value="casado">Casado(a)</SelectItem>
                                    <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                                    <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="profissao">Profissão</Label>
                            <Input
                                id="profissao"
                                value={form.profissao}
                                onChange={(e) => setForm({ ...form, profissao: e.target.value })}
                                placeholder="Profissão"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="convenio_medico">Convênio Médico</Label>
                            <Input
                                id="convenio_medico"
                                value={form.convenio_medico}
                                onChange={(e) => setForm({ ...form, convenio_medico: e.target.value })}
                                placeholder="Nome do convênio"
                            />
                        </div>
                    </div>

                    {/* Endereço com Autocomplete */}
                    <div className="grid gap-2">
                        <Label htmlFor="endereco">Endereço</Label>
                        <AddressAutocomplete
                            value={form.endereco}
                            onChange={(address) => setForm({ ...form, endereco: address })}
                            placeholder="Digite o endereço..."
                        />
                    </div>

                    {/* Medidas */}
                    <div className="border-t pt-4">
                        <h4 className="text-sm font-medium mb-3">Medidas Iniciais</h4>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="altura_cm">Altura (cm)</Label>
                                <Input
                                    id="altura_cm"
                                    type="number"
                                    value={form.altura_cm}
                                    onChange={(e) => setForm({ ...form, altura_cm: e.target.value })}
                                    placeholder="170"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="peso_inicial_kg">Peso Inicial (kg)</Label>
                                <Input
                                    id="peso_inicial_kg"
                                    type="number"
                                    step="0.1"
                                    value={form.peso_inicial_kg}
                                    onChange={(e) => setForm({ ...form, peso_inicial_kg: e.target.value })}
                                    placeholder="80.0"
                                />
                            </div>
                            {paciente && (
                                <div className="grid gap-2">
                                    <Label htmlFor="peso_atual_kg">Peso Atual (kg)</Label>
                                    <Input
                                        id="peso_atual_kg"
                                        type="number"
                                        step="0.1"
                                        value={form.peso_atual_kg}
                                        onChange={(e) => setForm({ ...form, peso_atual_kg: e.target.value })}
                                        placeholder="78.0"
                                    />
                                </div>
                            )}
                            <div className="grid gap-2">
                                <Label htmlFor="objetivo_peso_kg">Objetivo (kg)</Label>
                                <Input
                                    id="objetivo_peso_kg"
                                    type="number"
                                    step="0.1"
                                    value={form.objetivo_peso_kg}
                                    onChange={(e) => setForm({ ...form, objetivo_peso_kg: e.target.value })}
                                    placeholder="70.0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Observações */}
                    <div className="grid gap-2">
                        <Label htmlFor="observacoes">Observações Médicas</Label>
                        <Textarea
                            id="observacoes"
                            value={form.observacoes_medicas}
                            onChange={(e) => setForm({ ...form, observacoes_medicas: e.target.value })}
                            placeholder="Informações relevantes sobre o paciente..."
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={saving || uploading}>
                        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {paciente ? 'Salvar' : 'Cadastrar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
