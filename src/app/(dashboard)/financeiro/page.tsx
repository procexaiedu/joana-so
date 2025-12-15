'use client'

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState, useCallback } from "react"
import { Cobranca, Paciente } from "@/lib/types/database"
import { Badge } from "@/components/ui/badge"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { DollarSign, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"

const STATUS_OPTIONS = [
    { value: 'pendente', label: 'Pendente', color: 'bg-yellow-500', icon: Clock },
    { value: 'aguardando_pagamento', label: 'Aguardando', color: 'bg-blue-500', icon: Clock },
    { value: 'confirmado', label: 'Confirmado', color: 'bg-green-500', icon: CheckCircle },
    { value: 'recebido', label: 'Recebido', color: 'bg-green-600', icon: CheckCircle },
    { value: 'vencido', label: 'Vencido', color: 'bg-red-500', icon: XCircle },
    { value: 'cancelado', label: 'Cancelado', color: 'bg-gray-500', icon: XCircle },
]

export default function FinanceiroPage() {
    const [cobrancas, setCobrancas] = useState<(Cobranca & { paciente: Paciente })[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const fetchCobrancas = useCallback(async () => {
        const { data, error } = await supabase
            .from('cobrancas')
            .select('*, paciente:pacientes(*)')
            .order('created_at', { ascending: false })
            .limit(100)

        if (error) {
            toast.error('Erro ao carregar cobranças')
        } else {
            setCobrancas(data || [])
        }
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        fetchCobrancas()
        const channel = supabase
            .channel('cobrancas-changes')
            .on('postgres_changes', { event: '*', schema: 'drluisfarjallat', table: 'cobrancas' }, () => fetchCobrancas())
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [supabase, fetchCobrancas])

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    const formatDate = (dateString?: string) => dateString ? new Date(dateString).toLocaleDateString('pt-BR') : '-'

    const totalRecebido = cobrancas.filter(c => c.status === 'recebido').reduce((sum, c) => sum + c.valor, 0)
    const totalPendente = cobrancas.filter(c => ['pendente', 'aguardando_pagamento'].includes(c.status)).reduce((sum, c) => sum + c.valor, 0)
    const totalVencido = cobrancas.filter(c => c.status === 'vencido').reduce((sum, c) => sum + c.valor, 0)

    const getStatusBadge = (status: string) => {
        const statusInfo = STATUS_OPTIONS.find(s => s.value === status)
        return statusInfo || { label: status, color: 'bg-gray-500' }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <DollarSign className="h-8 w-8" />
                    Financeiro
                </h1>
                <p className="text-muted-foreground">Cobranças e pagamentos</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border bg-card p-6">
                    <div className="flex items-center gap-2 text-green-500 mb-2">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Recebido</span>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(totalRecebido)}</p>
                </div>
                <div className="rounded-xl border bg-card p-6">
                    <div className="flex items-center gap-2 text-yellow-500 mb-2">
                        <Clock className="h-5 w-5" />
                        <span className="text-sm font-medium">Pendente</span>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(totalPendente)}</p>
                </div>
                <div className="rounded-xl border bg-card p-6">
                    <div className="flex items-center gap-2 text-red-500 mb-2">
                        <XCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Vencido</span>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(totalVencido)}</p>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border bg-card">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Carregando...</div>
                ) : cobrancas.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">Nenhuma cobrança registrada</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Paciente</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Parcelas</TableHead>
                                <TableHead>Vencimento</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {cobrancas.map((cobranca) => {
                                const statusInfo = getStatusBadge(cobranca.status)
                                return (
                                    <TableRow key={cobranca.id}>
                                        <TableCell className="font-medium">{cobranca.paciente?.nome}</TableCell>
                                        <TableCell>{formatCurrency(cobranca.valor)}</TableCell>
                                        <TableCell>
                                            {cobranca.parcelas > 1
                                                ? `${cobranca.parcelas}x (${cobranca.parcelas_sem_juros} s/ juros)`
                                                : 'À vista'}
                                        </TableCell>
                                        <TableCell>{formatDate(cobranca.data_vencimento)}</TableCell>
                                        <TableCell>
                                            <Badge className={`${statusInfo.color} text-white`}>
                                                {statusInfo.label}
                                            </Badge>
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
