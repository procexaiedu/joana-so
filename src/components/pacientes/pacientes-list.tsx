'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from "@/lib/supabase/client"
import { Paciente } from "@/lib/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Users,
    Plus,
    Search,
    Loader2,
    UserPlus,
    TrendingUp,
    Activity,
    Phone,
    Mail,
    ChevronRight,
    Scale
} from "lucide-react"
import { toast } from "sonner"
import { PacienteDialog } from "./paciente-dialog"

interface PacientesListProps {
    className?: string
}

export function PacientesList({ className }: PacientesListProps) {
    const [pacientes, setPacientes] = useState<Paciente[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingPaciente, setEditingPaciente] = useState<Paciente | null>(null)

    const supabase = createClient()
    const router = useRouter()

    const fetchData = useCallback(async () => {
        const { data, error } = await supabase
            .from('pacientes')
            .select('*')
            .order('nome')

        if (error) {
            toast.error('Erro ao carregar pacientes')
            console.error(error)
        } else {
            setPacientes(data || [])
        }

        setLoading(false)
    }, [supabase])

    useEffect(() => {
        fetchData()

        // Realtime subscription
        const channel = supabase
            .channel('pacientes-changes')
            .on('postgres_changes', { event: '*', schema: 'drluisfarjallat', table: 'pacientes' }, fetchData)
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, fetchData])

    // Filtros
    const filteredPacientes = pacientes.filter(p => {
        const matchesSearch =
            p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.telefone?.includes(searchTerm) ||
            p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.cpf?.includes(searchTerm)
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'ativos' && p.ativo) ||
            (statusFilter === 'inativos' && !p.ativo)
        return matchesSearch && matchesStatus
    })

    // KPIs
    const totalPacientes = pacientes.length
    const pacientesAtivos = pacientes.filter(p => p.ativo).length
    const novosNoMes = pacientes.filter(p => {
        const createdAt = new Date(p.created_at)
        const now = new Date()
        return createdAt.getMonth() === now.getMonth() &&
            createdAt.getFullYear() === now.getFullYear()
    }).length
    const mediaIMC = pacientes.reduce((sum, p) => {
        if (p.altura_cm && p.peso_atual_kg) {
            const alturaM = p.altura_cm / 100
            const imc = p.peso_atual_kg / (alturaM * alturaM)
            return sum + imc
        }
        return sum
    }, 0) / (pacientes.filter(p => p.altura_cm && p.peso_atual_kg).length || 1)

    // Handlers
    const openDialog = (paciente?: Paciente) => {
        setEditingPaciente(paciente || null)
        setDialogOpen(true)
    }

    const calcularIdade = (dataNascimento?: string) => {
        if (!dataNascimento) return null
        const hoje = new Date()
        const nascimento = new Date(dataNascimento)
        let idade = hoje.getFullYear() - nascimento.getFullYear()
        const m = hoje.getMonth() - nascimento.getMonth()
        if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
            idade--
        }
        return idade
    }

    const getInitials = (nome: string) => {
        return nome
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()
    }

    const formatTelefone = (tel: string) => {
        const cleaned = tel.replace(/\D/g, '')
        if (cleaned.length === 11) {
            return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
        }
        return tel
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
            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total de Pacientes</CardDescription>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            {totalPacientes}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                        {pacientesAtivos} ativos, {totalPacientes - pacientesAtivos} inativos
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Novos este Mês</CardDescription>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-green-500" />
                            {novosNoMes}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                        cadastrados em {new Date().toLocaleDateString('pt-BR', { month: 'long' })}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>IMC Médio</CardDescription>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <Scale className="h-5 w-5 text-blue-500" />
                            {mediaIMC.toFixed(1)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                        dos pacientes com medidas
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Em Acompanhamento</CardDescription>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <Activity className="h-5 w-5 text-violet-500" />
                            {pacientesAtivos}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                        com planos ativos
                    </CardContent>
                </Card>
            </div>

            {/* Header com busca e filtros */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Lista de Pacientes
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nome, telefone, CPF..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 w-[280px]"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="ativos">Ativos</SelectItem>
                                    <SelectItem value="inativos">Inativos</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button onClick={() => openDialog()}>
                                <Plus className="h-4 w-4 mr-2" />
                                Novo Paciente
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredPacientes.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p>Nenhum paciente encontrado</p>
                            <Button variant="outline" className="mt-4" onClick={() => openDialog()}>
                                <Plus className="h-4 w-4 mr-2" />
                                Cadastrar primeiro paciente
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Paciente</TableHead>
                                    <TableHead>Contato</TableHead>
                                    <TableHead>Idade</TableHead>
                                    <TableHead>Peso</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ação</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPacientes.map(paciente => (
                                    <TableRow
                                        key={paciente.id}
                                        className={`cursor-pointer hover:bg-muted/50 ${!paciente.ativo ? 'opacity-50' : ''}`}
                                        onClick={() => router.push(`/pacientes/${paciente.id}`)}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={paciente.foto_url || undefined} />
                                                    <AvatarFallback className="bg-primary/10 text-primary">
                                                        {getInitials(paciente.nome)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium">{paciente.nome}</div>
                                                    {paciente.cpf && (
                                                        <div className="text-xs text-muted-foreground">
                                                            CPF: {paciente.cpf}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-sm">
                                                    <Phone className="h-3 w-3 text-muted-foreground" />
                                                    {formatTelefone(paciente.telefone)}
                                                </div>
                                                {paciente.email && (
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <Mail className="h-3 w-3" />
                                                        {paciente.email}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {paciente.data_nascimento ? (
                                                <span className="text-sm">
                                                    {calcularIdade(paciente.data_nascimento)} anos
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {paciente.peso_atual_kg ? (
                                                <div className="space-y-0.5">
                                                    <div className="font-medium">{paciente.peso_atual_kg} kg</div>
                                                    {paciente.peso_inicial_kg && paciente.peso_atual_kg !== paciente.peso_inicial_kg && (
                                                        <div className={`text-xs flex items-center gap-0.5 ${paciente.peso_atual_kg < paciente.peso_inicial_kg
                                                                ? 'text-green-600'
                                                                : 'text-red-500'
                                                            }`}>
                                                            <TrendingUp className={`h-3 w-3 ${paciente.peso_atual_kg < paciente.peso_inicial_kg
                                                                    ? 'rotate-180'
                                                                    : ''
                                                                }`} />
                                                            {Math.abs(paciente.peso_atual_kg - paciente.peso_inicial_kg).toFixed(1)} kg
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={paciente.ativo ? 'default' : 'secondary'}>
                                                {paciente.ativo ? 'Ativo' : 'Inativo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="icon" variant="ghost">
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Dialog de cadastro/edição */}
            <PacienteDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                paciente={editingPaciente}
                onSuccess={() => {
                    setDialogOpen(false)
                    setEditingPaciente(null)
                }}
            />
        </div>
    )
}
