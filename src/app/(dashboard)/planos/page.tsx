'use client'

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState, useCallback } from "react"
import { InscricaoPlano, Paciente, PlanoAcompanhamento, Produto } from "@/lib/types/database"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ClipboardList, User, Calendar, Pill } from "lucide-react"
import { toast } from "sonner"

export default function PlanosPage() {
    const [inscricoes, setInscricoes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const fetchInscricoes = useCallback(async () => {
        const { data, error } = await supabase
            .from('inscricoes_plano')
            .select(`
        *,
        paciente:pacientes(*),
        plano:planos_acompanhamento(*, produto:produtos(*))
      `)
            .order('created_at', { ascending: false })

        if (error) {
            toast.error('Erro ao carregar planos')
        } else {
            setInscricoes(data || [])
        }
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        fetchInscricoes()
        const channel = supabase
            .channel('inscricoes-changes')
            .on('postgres_changes', { event: '*', schema: 'drluisfarjallat', table: 'inscricoes_plano' }, () => fetchInscricoes())
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [supabase, fetchInscricoes])

    const formatDate = (dateString?: string) => dateString ? new Date(dateString).toLocaleDateString('pt-BR') : '-'

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ativo': return 'bg-green-500'
            case 'pausado': return 'bg-yellow-500'
            case 'concluido': return 'bg-blue-500'
            case 'cancelado': return 'bg-red-500'
            default: return 'bg-gray-500'
        }
    }

    const calcProgress = (aplicado?: number, total?: number) => {
        if (!total || !aplicado) return 0
        return Math.min((aplicado / total) * 100, 100)
    }

    const ativos = inscricoes.filter(i => i.status === 'ativo').length
    const concluidos = inscricoes.filter(i => i.status === 'concluido').length

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <ClipboardList className="h-8 w-8" />
                        Planos de Acompanhamento
                    </h1>
                    <p className="text-muted-foreground">Pacientes em tratamento ativo</p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                        <span className="text-green-500 mr-1">{ativos}</span> ativos
                    </Badge>
                    <Badge variant="outline" className="text-lg px-4 py-2">
                        <span className="text-blue-500 mr-1">{concluidos}</span> concluídos
                    </Badge>
                </div>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Carregando...</div>
                ) : inscricoes.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground rounded-xl border bg-card">
                        Nenhum plano cadastrado
                    </div>
                ) : (
                    inscricoes.map((inscricao) => {
                        const progress = calcProgress(inscricao.medicamento_aplicado_mg, inscricao.medicamento_total_mg)
                        return (
                            <div key={inscricao.id} className="p-4 rounded-xl border bg-card">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <User className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">{inscricao.paciente?.nome}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {inscricao.plano?.produto?.nome || 'Plano personalizado'}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge className={`${getStatusColor(inscricao.status)} text-white`}>
                                        {inscricao.status}
                                    </Badge>
                                </div>

                                {/* Progress bar */}
                                <div className="space-y-2 mb-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="flex items-center gap-1 text-muted-foreground">
                                            <Pill className="h-3 w-3" />
                                            Medicamento aplicado
                                        </span>
                                        <span className="font-medium">
                                            {inscricao.medicamento_aplicado_mg || 0}mg / {inscricao.medicamento_total_mg || 0}mg
                                        </span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        Início: {formatDate(inscricao.data_inicio)}
                                    </span>
                                    {inscricao.data_fim_prevista && (
                                        <span>→ Fim previsto: {formatDate(inscricao.data_fim_prevista)}</span>
                                    )}
                                    {inscricao.consultas_disponiveis > 0 && (
                                        <Badge variant="outline">{inscricao.consultas_disponiveis} consultas restantes</Badge>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
