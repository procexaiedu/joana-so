'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from "@/lib/supabase/client"
import { Paciente, Agendamento, Aplicacao, InscricaoPlano } from "@/lib/types/database"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AddressAutocomplete } from "@/components/ui/address-autocomplete"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    ArrowLeft,
    Loader2,
    User,
    Heart,
    Calendar,
    DollarSign,
    Phone,
    Mail,
    MapPin,
    Cake,
    Activity,
    TrendingDown,
    Target,
    Scale,
    Ruler,
    Pencil,
    Save,
    Syringe,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Camera,
    Trash2,
    MessageCircle,
    FileText,
    Eye,
    Download
} from "lucide-react"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts'

// Types
type AgendamentoComRelacoes = Agendamento & {
    clinica?: { nome: string }
    tipo?: { nome: string; cor?: string }
    profissional?: { nome: string }
}

type AplicacaoComRelacoes = Aplicacao & {
    produto?: { nome: string }
    inscricao_plano?: { plano_id: string }
}

type InscricaoPlanoComRelacoes = InscricaoPlano & {
    plano?: { nome: string }
}

interface TransacaoResumida {
    total_gasto: number
    total_transacoes: number
    ultima_transacao?: string
}

interface Transacao {
    id: string
    tipo: string
    valor: number
    metodo_pagamento?: string
    descricao?: string
    status: string
    created_at: string
}

export default function PacientePerfilPage() {
    const params = useParams()
    const router = useRouter()
    const pacienteId = params.id as string

    const [paciente, setPaciente] = useState<Paciente | null>(null)
    const [agendamentos, setAgendamentos] = useState<AgendamentoComRelacoes[]>([])
    const [aplicacoes, setAplicacoes] = useState<AplicacaoComRelacoes[]>([])
    const [inscricoes, setInscricoes] = useState<InscricaoPlanoComRelacoes[]>([])
    const [resumoFinanceiro, setResumoFinanceiro] = useState<TransacaoResumida>({ total_gasto: 0, total_transacoes: 0 })
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editForm, setEditForm] = useState<Partial<Paciente>>({})
    const [uploadingPhoto, setUploadingPhoto] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Novos states
    const [transacoes, setTransacoes] = useState<Transacao[]>([])
    const [editingFicha, setEditingFicha] = useState(false)
    const [savingFicha, setSavingFicha] = useState(false)
    const [selectedAgendamento, setSelectedAgendamento] = useState<AgendamentoComRelacoes | null>(null)
    const [selectedAplicacao, setSelectedAplicacao] = useState<AplicacaoComRelacoes | null>(null)

    const supabase = createClient()

    const fetchData = useCallback(async () => {
        // Buscar paciente
        const { data: pacienteData, error: pacienteError } = await supabase
            .from('pacientes')
            .select('*')
            .eq('id', pacienteId)
            .single()

        if (pacienteError || !pacienteData) {
            toast.error('Paciente não encontrado')
            router.push('/pacientes')
            return
        }

        setPaciente(pacienteData)
        setEditForm(pacienteData)

        // Buscar agendamentos
        const { data: agendamentosData } = await supabase
            .from('agendamentos')
            .select('*, clinica:clinicas(nome), tipo:tipos_agendamento(nome, cor), profissional:profissionais(nome)')
            .eq('paciente_id', pacienteId)
            .order('data_hora', { ascending: false })
            .limit(20)

        if (agendamentosData) setAgendamentos(agendamentosData as AgendamentoComRelacoes[])

        // Buscar aplicações
        const { data: aplicacoesData } = await supabase
            .from('aplicacoes')
            .select('*, produto:produtos(nome), inscricao_plano:inscricoes_plano(plano_id)')
            .eq('paciente_id', pacienteId)
            .order('data_aplicacao', { ascending: false })
            .limit(20)

        if (aplicacoesData) setAplicacoes(aplicacoesData as AplicacaoComRelacoes[])

        // Buscar inscricoes em planos
        const { data: inscricoesData } = await supabase
            .from('inscricoes_plano')
            .select('*, plano:planos_acompanhamento(nome)')
            .eq('paciente_id', pacienteId)
            .order('data_inicio', { ascending: false })

        if (inscricoesData) setInscricoes(inscricoesData as InscricaoPlanoComRelacoes[])

        // Buscar transações completas
        const { data: transacoesData } = await supabase
            .from('transacoes')
            .select('*')
            .eq('paciente_id', pacienteId)
            .order('created_at', { ascending: false })

        if (transacoesData) {
            const total = transacoesData.reduce((sum, t) => sum + (t.valor || 0), 0)
            const ultima = transacoesData.length > 0
                ? transacoesData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
                : undefined
            setResumoFinanceiro({
                total_gasto: total,
                total_transacoes: transacoesData.length,
                ultima_transacao: ultima
            })
            setTransacoes(transacoesData as Transacao[])
        }

        setLoading(false)
    }, [supabase, pacienteId, router])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Handlers
    const handleSave = async () => {
        if (!editForm.nome || !editForm.telefone) {
            toast.error('Nome e telefone são obrigatórios')
            return
        }

        setSaving(true)
        try {
            const { error } = await supabase
                .from('pacientes')
                .update({
                    ...editForm,
                    updated_at: new Date().toISOString()
                })
                .eq('id', pacienteId)

            if (error) throw error
            toast.success('Paciente atualizado!')
            setPaciente(editForm as Paciente)
            setEditing(false)
        } catch (error) {
            console.error(error)
            toast.error('Erro ao salvar')
        } finally {
            setSaving(false)
        }
    }

    // Handler de upload de foto
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error('Apenas imagens são permitidas')
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Imagem muito grande (máximo 5MB)')
            return
        }

        setUploadingPhoto(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('folder', 'pacientes')
            formData.append('entityId', pacienteId)

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Erro no upload')
            }

            // Atualizar no banco
            const { error } = await supabase
                .from('pacientes')
                .update({ foto_url: result.url, updated_at: new Date().toISOString() })
                .eq('id', pacienteId)

            if (error) throw error

            // Atualizar estado local
            setPaciente(prev => prev ? { ...prev, foto_url: result.url } : null)
            toast.success('Foto atualizada!')
        } catch (error) {
            console.error('Erro no upload:', error)
            toast.error('Erro ao enviar foto')
        } finally {
            setUploadingPhoto(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // Handler de remover foto
    const handleRemovePhoto = async () => {
        if (!paciente?.foto_url) return

        setUploadingPhoto(true)
        try {
            // Extrair key da URL
            const url = new URL(paciente.foto_url)
            const key = url.pathname.split('/').slice(2).join('/') // Remove /bucket/

            // Deletar do MinIO
            await fetch('/api/upload/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key })
            })

            // Atualizar no banco
            const { error } = await supabase
                .from('pacientes')
                .update({ foto_url: null, updated_at: new Date().toISOString() })
                .eq('id', pacienteId)

            if (error) throw error

            setPaciente(prev => prev ? { ...prev, foto_url: undefined } : null)
            toast.success('Foto removida!')
        } catch (error) {
            console.error('Erro ao remover foto:', error)
            toast.error('Erro ao remover foto')
        } finally {
            setUploadingPhoto(false)
        }
    }

    // Handler de salvar ficha médica
    const handleSaveFicha = async () => {
        setSavingFicha(true)
        try {
            const { error } = await supabase
                .from('pacientes')
                .update({
                    altura_cm: editForm.altura_cm,
                    peso_inicial_kg: editForm.peso_inicial_kg,
                    peso_atual_kg: editForm.peso_atual_kg,
                    objetivo_peso_kg: editForm.objetivo_peso_kg,
                    comorbidades: editForm.comorbidades,
                    medicamentos_uso: editForm.medicamentos_uso,
                    alergias: editForm.alergias,
                    historico_cirurgias: editForm.historico_cirurgias,
                    observacoes_medicas: editForm.observacoes_medicas,
                    updated_at: new Date().toISOString()
                })
                .eq('id', pacienteId)

            if (error) throw error
            toast.success('Ficha médica atualizada!')
            setPaciente(prev => prev ? { ...prev, ...editForm } : null)
            setEditingFicha(false)
        } catch (error) {
            console.error(error)
            toast.error('Erro ao salvar ficha médica')
        } finally {
            setSavingFicha(false)
        }
    }

    // Abrir WhatsApp
    const openWhatsApp = () => {
        if (!paciente?.telefone) return
        const phone = paciente.telefone.replace(/\D/g, '')
        const phoneFormatted = phone.startsWith('55') ? phone : `55${phone}`
        window.open(`https://wa.me/${phoneFormatted}`, '_blank')
    }

    // Dados para gráfico de evolução de peso
    const getDadosGraficoPeso = () => {
        if (!paciente) return []
        const dados: { data: string; peso: number }[] = []

        if (paciente.peso_inicial_kg) {
            dados.push({ data: 'Início', peso: paciente.peso_inicial_kg })
        }

        aplicacoes
            .filter(a => a.peso_kg)
            .sort((a, b) => new Date(a.data_aplicacao).getTime() - new Date(b.data_aplicacao).getTime())
            .forEach(a => {
                dados.push({
                    data: new Date(a.data_aplicacao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                    peso: a.peso_kg!
                })
            })

        return dados
    }

    // Formatar método de pagamento
    const formatMetodoPagamento = (metodo?: string) => {
        const metodos: Record<string, string> = {
            'pix': 'PIX',
            'cartao_credito': 'Cartão Crédito',
            'cartao_debito': 'Cartão Débito',
            'dinheiro': 'Dinheiro',
            'boleto': 'Boleto',
            'transferencia': 'Transferência'
        }
        return metodos[metodo || ''] || metodo || 'N/A'
    }

    // Helpers
    const calcularIdade = (dataNascimento?: string) => {
        if (!dataNascimento) return null
        const hoje = new Date()
        const nascimento = new Date(dataNascimento)
        let idade = hoje.getFullYear() - nascimento.getFullYear()
        const m = hoje.getMonth() - nascimento.getMonth()
        if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--
        return idade
    }

    const calcularIMC = (peso?: number, altura?: number) => {
        if (!peso || !altura) return null
        const alturaM = altura / 100
        return peso / (alturaM * alturaM)
    }

    const getIMCClassificacao = (imc: number) => {
        if (imc < 18.5) return { label: 'Abaixo do peso', color: 'text-blue-500' }
        if (imc < 25) return { label: 'Normal', color: 'text-green-500' }
        if (imc < 30) return { label: 'Sobrepeso', color: 'text-yellow-500' }
        if (imc < 35) return { label: 'Obesidade I', color: 'text-orange-500' }
        if (imc < 40) return { label: 'Obesidade II', color: 'text-red-500' }
        return { label: 'Obesidade III', color: 'text-red-700' }
    }

    const getInitials = (nome: string) => {
        return nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    }

    const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR')
    const formatDateTime = (date: string) => new Date(date).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

    const formatTelefone = (tel: string) => {
        const cleaned = tel.replace(/\D/g, '')
        if (cleaned.length === 11) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
        return tel
    }

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            agendado: 'bg-blue-100 text-blue-800',
            confirmado: 'bg-green-100 text-green-800',
            concluido: 'bg-gray-100 text-gray-800',
            cancelado: 'bg-red-100 text-red-800',
            faltou: 'bg-orange-100 text-orange-800',
            em_andamento: 'bg-purple-100 text-purple-800'
        }
        return colors[status] || 'bg-gray-100 text-gray-800'
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8 min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!paciente) return null

    const imc = calcularIMC(paciente.peso_atual_kg, paciente.altura_cm)
    const pesosPerdidos = paciente.peso_inicial_kg && paciente.peso_atual_kg
        ? paciente.peso_inicial_kg - paciente.peso_atual_kg
        : 0
    const proximosAgendamentos = agendamentos.filter(a =>
        new Date(a.data_hora) > new Date() && a.status !== 'cancelado'
    )

    return (
        <>
            <div className="p-6 space-y-6">
                {/* Header com navegação */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/pacientes')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold tracking-tight">Perfil do Paciente</h1>
                    </div>
                </div>

                {/* Card Principal - Header do Paciente */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Avatar e Info Principal */}
                            <div className="flex items-start gap-4">
                                {/* Avatar com upload de foto */}
                                <div className="relative group">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handlePhotoUpload}
                                    />
                                    <Avatar
                                        className="h-20 w-20 cursor-pointer transition-opacity group-hover:opacity-75"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <AvatarImage src={paciente.foto_url || undefined} />
                                        <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                                            {getInitials(paciente.nome)}
                                        </AvatarFallback>
                                    </Avatar>
                                    {/* Overlay de câmera */}
                                    <div
                                        className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {uploadingPhoto ? (
                                            <Loader2 className="h-6 w-6 animate-spin text-white" />
                                        ) : (
                                            <Camera className="h-6 w-6 text-white" />
                                        )}
                                    </div>
                                    {/* Botão de remover foto */}
                                    {paciente.foto_url && !uploadingPhoto && (
                                        <button
                                            type="button"
                                            className="absolute -top-1 -right-1 h-6 w-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-destructive/90"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleRemovePhoto()
                                            }}
                                            title="Remover foto"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-bold">{paciente.nome}</h2>
                                        <Badge variant={paciente.ativo ? 'default' : 'secondary'}>
                                            {paciente.ativo ? 'Ativo' : 'Inativo'}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Phone className="h-3.5 w-3.5" />
                                            {formatTelefone(paciente.telefone)}
                                        </span>
                                        {paciente.email && (
                                            <span className="flex items-center gap-1">
                                                <Mail className="h-3.5 w-3.5" />
                                                {paciente.email}
                                            </span>
                                        )}
                                        {paciente.data_nascimento && (
                                            <span className="flex items-center gap-1">
                                                <Cake className="h-3.5 w-3.5" />
                                                {calcularIdade(paciente.data_nascimento)} anos
                                            </span>
                                        )}
                                    </div>
                                    {/* Botões de ação rápida */}
                                    <div className="flex gap-2 mt-3">
                                        <Button size="sm" variant="outline" onClick={openWhatsApp} className="text-green-600 hover:text-green-700 hover:bg-green-50">
                                            <MessageCircle className="h-4 w-4 mr-1" />
                                            WhatsApp
                                        </Button>
                                    </div>
                                    {/* Próxima consulta */}
                                    {proximosAgendamentos.length > 0 && (
                                        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-md">
                                            <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                Próxima: {new Date(proximosAgendamentos[0].data_hora).toLocaleDateString('pt-BR', {
                                                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                                })} - {proximosAgendamentos[0].tipo?.nome || 'Consulta'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* KPIs Individuais */}
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 md:border-l md:pl-6">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-primary">{agendamentos.length}</div>
                                    <div className="text-xs text-muted-foreground">Consultas</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-violet-500">{aplicacoes.length}</div>
                                    <div className="text-xs text-muted-foreground">Aplicações</div>
                                </div>
                                <div className="text-center">
                                    <div className={`text-2xl font-bold ${pesosPerdidos > 0 ? 'text-green-500' : pesosPerdidos < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                        {pesosPerdidos > 0 ? `-${pesosPerdidos.toFixed(1)}` : pesosPerdidos < 0 ? `+${Math.abs(pesosPerdidos).toFixed(1)}` : '0'} kg
                                    </div>
                                    <div className="text-xs text-muted-foreground">Perda de Peso</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                        {formatCurrency(resumoFinanceiro.total_gasto)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Total Gasto</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabs */}
                <Tabs defaultValue="dados" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="dados">
                            <User className="h-4 w-4 mr-2" />
                            Dados Pessoais
                        </TabsTrigger>
                        <TabsTrigger value="ficha">
                            <Heart className="h-4 w-4 mr-2" />
                            Ficha Médica
                        </TabsTrigger>
                        <TabsTrigger value="historico">
                            <Calendar className="h-4 w-4 mr-2" />
                            Histórico
                        </TabsTrigger>
                        <TabsTrigger value="financeiro">
                            <DollarSign className="h-4 w-4 mr-2" />
                            Financeiro
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab: Dados Pessoais */}
                    <TabsContent value="dados">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Dados Pessoais</CardTitle>
                                    <CardDescription>Informações cadastrais do paciente</CardDescription>
                                </div>
                                {editing ? (
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => { setEditing(false); setEditForm(paciente) }}>
                                            Cancelar
                                        </Button>
                                        <Button onClick={handleSave} disabled={saving}>
                                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                            <Save className="h-4 w-4 mr-2" />
                                            Salvar
                                        </Button>
                                    </div>
                                ) : (
                                    <Button variant="outline" onClick={() => setEditing(true)}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Editar
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-muted-foreground text-xs">Nome Completo</Label>
                                            {editing ? (
                                                <Input value={editForm.nome || ''} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} />
                                            ) : (
                                                <p className="font-medium">{paciente.nome}</p>
                                            )}
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground text-xs">Telefone</Label>
                                            {editing ? (
                                                <Input value={editForm.telefone || ''} onChange={e => setEditForm({ ...editForm, telefone: e.target.value })} />
                                            ) : (
                                                <p className="font-medium">{formatTelefone(paciente.telefone)}</p>
                                            )}
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground text-xs">Email</Label>
                                            {editing ? (
                                                <Input value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                                            ) : (
                                                <p className="font-medium">{paciente.email || '-'}</p>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-muted-foreground text-xs">CPF</Label>
                                                {editing ? (
                                                    <Input value={editForm.cpf || ''} onChange={e => setEditForm({ ...editForm, cpf: e.target.value })} />
                                                ) : (
                                                    <p className="font-medium">{paciente.cpf || '-'}</p>
                                                )}
                                            </div>
                                            <div>
                                                <Label className="text-muted-foreground text-xs">RG</Label>
                                                {editing ? (
                                                    <Input value={editForm.rg || ''} onChange={e => setEditForm({ ...editForm, rg: e.target.value })} />
                                                ) : (
                                                    <p className="font-medium">{paciente.rg || '-'}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-muted-foreground text-xs">Data de Nascimento</Label>
                                            {editing ? (
                                                <Input type="date" value={editForm.data_nascimento || ''} onChange={e => setEditForm({ ...editForm, data_nascimento: e.target.value })} />
                                            ) : (
                                                <p className="font-medium">{paciente.data_nascimento ? formatDate(paciente.data_nascimento) : '-'}</p>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-muted-foreground text-xs">Sexo</Label>
                                                {editing ? (
                                                    <Select value={editForm.sexo || ''} onValueChange={v => setEditForm({ ...editForm, sexo: v })}>
                                                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="M">Masculino</SelectItem>
                                                            <SelectItem value="F">Feminino</SelectItem>
                                                            <SelectItem value="O">Outro</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <p className="font-medium">{paciente.sexo === 'M' ? 'Masculino' : paciente.sexo === 'F' ? 'Feminino' : paciente.sexo || '-'}</p>
                                                )}
                                            </div>
                                            <div>
                                                <Label className="text-muted-foreground text-xs">Estado Civil</Label>
                                                {editing ? (
                                                    <Select value={editForm.estado_civil || ''} onValueChange={v => setEditForm({ ...editForm, estado_civil: v })}>
                                                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                                                            <SelectItem value="casado">Casado(a)</SelectItem>
                                                            <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                                                            <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <p className="font-medium capitalize">{paciente.estado_civil || '-'}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground text-xs">Profissão</Label>
                                            {editing ? (
                                                <Input value={editForm.profissao || ''} onChange={e => setEditForm({ ...editForm, profissao: e.target.value })} />
                                            ) : (
                                                <p className="font-medium">{paciente.profissao || '-'}</p>
                                            )}
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground text-xs">Endereço</Label>
                                            {editing ? (
                                                <AddressAutocomplete
                                                    value={editForm.endereco || ''}
                                                    onChange={(address) => setEditForm({ ...editForm, endereco: address })}
                                                    placeholder="Digite o endereço..."
                                                />
                                            ) : (
                                                <p className="font-medium flex items-center gap-1">
                                                    {paciente.endereco && <MapPin className="h-3.5 w-3.5 text-muted-foreground" />}
                                                    {paciente.endereco || '-'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab: Ficha Médica */}
                    <TabsContent value="ficha">
                        <div className="grid gap-4 md:grid-cols-2">
                            {/* Medidas Corporais */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Scale className="h-4 w-4" />
                                        Medidas Corporais
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground text-xs flex items-center gap-1">
                                                <Ruler className="h-3 w-3" /> Altura
                                            </Label>
                                            <p className="text-2xl font-bold">{paciente.altura_cm || '-'} <span className="text-sm font-normal">cm</span></p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground text-xs flex items-center gap-1">
                                                <Activity className="h-3 w-3" /> IMC
                                            </Label>
                                            {imc ? (
                                                <div>
                                                    <p className="text-2xl font-bold">{imc.toFixed(1)}</p>
                                                    <p className={`text-xs ${getIMCClassificacao(imc).color}`}>
                                                        {getIMCClassificacao(imc).label}
                                                    </p>
                                                </div>
                                            ) : (
                                                <p className="text-2xl font-bold text-muted-foreground">-</p>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground text-xs">Peso Inicial</Label>
                                            <p className="text-xl font-semibold">{paciente.peso_inicial_kg || '-'} <span className="text-sm font-normal">kg</span></p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground text-xs">Peso Atual</Label>
                                            <p className="text-xl font-semibold">{paciente.peso_atual_kg || '-'} <span className="text-sm font-normal">kg</span></p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground text-xs flex items-center gap-1">
                                                <Target className="h-3 w-3" /> Objetivo
                                            </Label>
                                            <p className="text-xl font-semibold">{paciente.objetivo_peso_kg || '-'} <span className="text-sm font-normal">kg</span></p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground text-xs flex items-center gap-1">
                                                <TrendingDown className="h-3 w-3" /> Perdido
                                            </Label>
                                            <p className={`text-xl font-semibold ${pesosPerdidos > 0 ? 'text-green-500' : ''}`}>
                                                {pesosPerdidos > 0 ? `-${pesosPerdidos.toFixed(1)}` : pesosPerdidos.toFixed(1)} <span className="text-sm font-normal">kg</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Barra de Progresso do Objetivo */}
                                    {paciente.peso_inicial_kg && paciente.objetivo_peso_kg && paciente.peso_atual_kg && (
                                        <div className="mt-6">
                                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                                <span>Início: {paciente.peso_inicial_kg}kg</span>
                                                <span>Objetivo: {paciente.objetivo_peso_kg}kg</span>
                                            </div>
                                            <div className="h-3 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-primary to-green-500 rounded-full transition-all"
                                                    style={{
                                                        width: `${Math.min(100, Math.max(0,
                                                            ((paciente.peso_inicial_kg - paciente.peso_atual_kg) /
                                                                (paciente.peso_inicial_kg - paciente.objetivo_peso_kg)) * 100
                                                        ))}%`
                                                    }}
                                                />
                                            </div>
                                            <p className="text-xs text-center mt-1 text-muted-foreground">
                                                {Math.round(((paciente.peso_inicial_kg - paciente.peso_atual_kg) / (paciente.peso_inicial_kg - paciente.objetivo_peso_kg)) * 100)}% do objetivo
                                            </p>
                                        </div>
                                    )}

                                    {/* Gráfico de Evolução de Peso */}
                                    {getDadosGraficoPeso().length > 1 && (
                                        <div className="mt-6">
                                            <Label className="text-muted-foreground text-xs mb-2 block">Evolução do Peso</Label>
                                            <div className="h-48">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={getDadosGraficoPeso()}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                        <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                                                        <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 10 }} />
                                                        <Tooltip
                                                            formatter={(value) => [`${value} kg`, 'Peso']}
                                                            contentStyle={{ fontSize: 12 }}
                                                        />
                                                        <Line
                                                            type="monotone"
                                                            dataKey="peso"
                                                            stroke="#8b5cf6"
                                                            strokeWidth={2}
                                                            dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
                                                        />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Histórico Médico */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Heart className="h-4 w-4" />
                                        Histórico Médico
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label className="text-muted-foreground text-xs">Comorbidades</Label>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {paciente.comorbidades && paciente.comorbidades.length > 0 ? (
                                                paciente.comorbidades.map((c, i) => (
                                                    <Badge key={i} variant="secondary">{c}</Badge>
                                                ))
                                            ) : (
                                                <span className="text-muted-foreground text-sm">Nenhuma registrada</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground text-xs">Medicamentos em Uso</Label>
                                        <p className="text-sm mt-1">{paciente.medicamentos_uso || 'Nenhum registrado'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground text-xs">Alergias</Label>
                                        <p className="text-sm mt-1">{paciente.alergias || 'Nenhuma registrada'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground text-xs">Histórico de Cirurgias</Label>
                                        <p className="text-sm mt-1">{paciente.historico_cirurgias || 'Nenhum registrado'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground text-xs">Observações Médicas</Label>
                                        <p className="text-sm mt-1">{paciente.observacoes_medicas || 'Nenhuma observação'}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Tab: Histórico */}
                    <TabsContent value="historico">
                        <div className="grid gap-4 md:grid-cols-2">
                            {/* Próximos Agendamentos */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Próximos Agendamentos
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {proximosAgendamentos.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-4">Nenhum agendamento futuro</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {proximosAgendamentos.slice(0, 5).map(ag => (
                                                <div key={ag.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                                    <div className="flex-shrink-0">
                                                        <Clock className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">{ag.tipo?.nome || 'Consulta'}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatDateTime(ag.data_hora)} • {ag.clinica?.nome}
                                                        </p>
                                                    </div>
                                                    <Badge className={getStatusColor(ag.status)}>
                                                        {ag.status}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Histórico de Agendamentos */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4" />
                                        Histórico de Consultas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {agendamentos.filter(a => new Date(a.data_hora) <= new Date()).length === 0 ? (
                                        <p className="text-muted-foreground text-center py-4">Nenhuma consulta realizada</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {agendamentos.filter(a => new Date(a.data_hora) <= new Date()).slice(0, 8).map(ag => (
                                                <div
                                                    key={ag.id}
                                                    className="flex items-center justify-between p-2 border-b last:border-0 cursor-pointer hover:bg-muted/50 rounded transition-colors"
                                                    onClick={() => setSelectedAgendamento(ag)}
                                                >
                                                    <div>
                                                        <p className="text-sm font-medium">{ag.tipo?.nome || 'Consulta'}</p>
                                                        <p className="text-xs text-muted-foreground">{formatDate(ag.data_hora)}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {ag.status === 'concluido' && <CheckCircle className="h-4 w-4 text-green-500" />}
                                                        {ag.status === 'cancelado' && <XCircle className="h-4 w-4 text-red-500" />}
                                                        {ag.status === 'faltou' && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Aplicações */}
                            <Card className="md:col-span-2">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Syringe className="h-4 w-4" />
                                        Aplicações Realizadas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {aplicacoes.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-4">Nenhuma aplicação registrada</p>
                                    ) : (
                                        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                                            {aplicacoes.slice(0, 9).map(ap => (
                                                <div key={ap.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                                    <Syringe className="h-4 w-4 text-violet-500" />
                                                    <div>
                                                        <p className="font-medium text-sm">{ap.produto?.nome || 'Medicamento'}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {ap.dose_mg}mg • {formatDate(ap.data_aplicacao)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Tab: Financeiro */}
                    <TabsContent value="financeiro">
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>Total Gasto</CardDescription>
                                    <CardTitle className="text-2xl flex items-center gap-2">
                                        <DollarSign className="h-5 w-5 text-green-500" />
                                        {formatCurrency(resumoFinanceiro.total_gasto)}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-xs text-muted-foreground">
                                    em {resumoFinanceiro.total_transacoes} transações
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>Planos Ativos</CardDescription>
                                    <CardTitle className="text-2xl flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-violet-500" />
                                        {inscricoes.filter(i => i.status === 'ativo').length}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-xs text-muted-foreground">
                                    de {inscricoes.length} total
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>Última Transação</CardDescription>
                                    <CardTitle className="text-lg">
                                        {resumoFinanceiro.ultima_transacao
                                            ? formatDate(resumoFinanceiro.ultima_transacao)
                                            : 'Nenhuma'}
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                        </div>

                        {/* Histórico de Transações */}
                        {transacoes.length > 0 && (
                            <Card className="mt-4">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <DollarSign className="h-4 w-4" />
                                        Histórico de Transações
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {transacoes.slice(0, 10).map(t => (
                                            <div key={t.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${t.tipo === 'pagamento' ? 'bg-green-100 text-green-600' :
                                                        t.tipo === 'estorno' ? 'bg-red-100 text-red-600' :
                                                            'bg-yellow-100 text-yellow-600'
                                                        }`}>
                                                        <DollarSign className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{t.descricao || 'Transação'}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatDate(t.created_at)} • {formatMetodoPagamento(t.metodo_pagamento)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`font-semibold ${t.tipo === 'pagamento' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {t.tipo === 'pagamento' ? '+' : '-'}{formatCurrency(t.valor)}
                                                    </p>
                                                    <Badge variant={t.status === 'confirmado' ? 'default' : 'secondary'} className="text-xs">
                                                        {t.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Lista de Planos */}
                        {inscricoes.length > 0 && (
                            <Card className="mt-4">
                                <CardHeader>
                                    <CardTitle className="text-base">Planos de Acompanhamento</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {inscricoes.map(insc => (
                                            <div key={insc.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                                <div>
                                                    <p className="font-medium">{insc.plano?.nome || 'Plano'}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Início: {formatDate(insc.data_inicio)}
                                                        {insc.data_fim_prevista && ` • Previsão: ${formatDate(insc.data_fim_prevista)}`}
                                                    </p>
                                                </div>
                                                <Badge variant={insc.status === 'ativo' ? 'default' : 'secondary'}>
                                                    {insc.status}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Modal de Detalhes da Consulta */}
            <Dialog open={!!selectedAgendamento} onOpenChange={() => setSelectedAgendamento(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Detalhes da Consulta
                        </DialogTitle>
                    </DialogHeader>
                    {selectedAgendamento && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground text-xs">Tipo</Label>
                                    <p className="font-medium">{selectedAgendamento.tipo?.nome || 'Consulta'}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-xs">Status</Label>
                                    <Badge className={getStatusColor(selectedAgendamento.status)}>
                                        {selectedAgendamento.status}
                                    </Badge>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground text-xs">Data/Hora</Label>
                                    <p className="font-medium">{formatDateTime(selectedAgendamento.data_hora)}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-xs">Duração</Label>
                                    <p className="font-medium">{selectedAgendamento.duracao_minutos} min</p>
                                </div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Clínica</Label>
                                <p className="font-medium">{selectedAgendamento.clinica?.nome || '-'}</p>
                            </div>
                            {selectedAgendamento.profissional?.nome && (
                                <div>
                                    <Label className="text-muted-foreground text-xs">Profissional</Label>
                                    <p className="font-medium">{selectedAgendamento.profissional.nome}</p>
                                </div>
                            )}
                            {selectedAgendamento.observacoes && (
                                <div>
                                    <Label className="text-muted-foreground text-xs">Observações</Label>
                                    <p className="text-sm">{selectedAgendamento.observacoes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal de Detalhes da Aplicação */}
            <Dialog open={!!selectedAplicacao} onOpenChange={() => setSelectedAplicacao(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Syringe className="h-5 w-5" />
                            Detalhes da Aplicação
                        </DialogTitle>
                    </DialogHeader>
                    {selectedAplicacao && (
                        <div className="space-y-4">
                            <div>
                                <Label className="text-muted-foreground text-xs">Medicamento</Label>
                                <p className="font-medium">{selectedAplicacao.produto?.nome || 'Medicamento'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground text-xs">Dose</Label>
                                    <p className="font-medium">{selectedAplicacao.dose_mg} mg</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-xs">Data</Label>
                                    <p className="font-medium">{formatDate(selectedAplicacao.data_aplicacao)}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground text-xs">Peso no dia</Label>
                                    <p className="font-medium">{selectedAplicacao.peso_kg || '-'} kg</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-xs">Lote</Label>
                                    <p className="font-medium">{selectedAplicacao.lote || '-'}</p>
                                </div>
                            </div>
                            {selectedAplicacao.observacoes && (
                                <div>
                                    <Label className="text-muted-foreground text-xs">Observações</Label>
                                    <p className="text-sm">{selectedAplicacao.observacoes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}