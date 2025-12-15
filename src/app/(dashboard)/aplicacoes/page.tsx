'use client'

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState, useCallback } from "react"
import { Aplicacao, Paciente, Profissional } from "@/lib/types/database"
import { Badge } from "@/components/ui/badge"
import { Activity, User, Calendar, Weight, Pill, Image } from "lucide-react"
import { toast } from "sonner"

export default function AplicacoesPage() {
    const [aplicacoes, setAplicacoes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const fetchAplicacoes = useCallback(async () => {
        const { data, error } = await supabase
            .from('aplicacoes')
            .select(`
        *,
        paciente:pacientes(*),
        enfermeiro:profissionais(*)
      `)
            .order('data_aplicacao', { ascending: false })
            .limit(50)

        if (error) {
            toast.error('Erro ao carregar aplicações')
        } else {
            setAplicacoes(data || [])
        }
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        fetchAplicacoes()
        const channel = supabase
            .channel('aplicacoes-changes')
            .on('postgres_changes', { event: '*', schema: 'drluisfarjallat', table: 'aplicacoes' }, () => fetchAplicacoes())
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [supabase, fetchAplicacoes])

    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

    // Stats
    const today = new Date().toISOString().split('T')[0]
    const aplicacoesHoje = aplicacoes.filter(a => a.data_aplicacao?.startsWith(today)).length
    const comBioimpedancia = aplicacoes.filter(a => a.bioimpedancia_imagem_url).length

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Activity className="h-8 w-8" />
                        Aplicações
                    </h1>
                    <p className="text-muted-foreground">Registro de aplicações de medicamento</p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                        <span className="text-primary mr-1">{aplicacoesHoje}</span> hoje
                    </Badge>
                    <Badge variant="outline" className="text-lg px-4 py-2">
                        <Image className="h-4 w-4 mr-1" />
                        {comBioimpedancia} com bioimpedância
                    </Badge>
                </div>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Carregando...</div>
                ) : aplicacoes.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground rounded-xl border bg-card">
                        Nenhuma aplicação registrada
                    </div>
                ) : (
                    aplicacoes.map((aplicacao) => (
                        <div key={aplicacao.id} className="p-4 rounded-xl border bg-card">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <User className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">{aplicacao.paciente?.nome || 'Paciente'}</p>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {formatDate(aplicacao.data_aplicacao)}
                                            {aplicacao.enfermeiro && (
                                                <span className="ml-2">• {aplicacao.enfermeiro.nome}</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Badge variant="default" className="mb-1">
                                        <Pill className="h-3 w-3 mr-1" />
                                        {aplicacao.dose_mg}mg
                                    </Badge>
                                    {aplicacao.lote && (
                                        <p className="text-xs text-muted-foreground">Lote: {aplicacao.lote}</p>
                                    )}
                                </div>
                            </div>

                            {/* Bioimpedância data */}
                            {aplicacao.peso_kg && (
                                <div className="mt-3 pt-3 border-t grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                                    {aplicacao.peso_kg && (
                                        <div>
                                            <p className="text-muted-foreground">Peso</p>
                                            <p className="font-semibold">{aplicacao.peso_kg} kg</p>
                                        </div>
                                    )}
                                    {aplicacao.taxa_gordura_percentual && (
                                        <div>
                                            <p className="text-muted-foreground">% Gordura</p>
                                            <p className="font-semibold">{aplicacao.taxa_gordura_percentual}%</p>
                                        </div>
                                    )}
                                    {aplicacao.massa_muscular_kg && (
                                        <div>
                                            <p className="text-muted-foreground">Massa Muscular</p>
                                            <p className="font-semibold">{aplicacao.massa_muscular_kg} kg</p>
                                        </div>
                                    )}
                                    {aplicacao.imc && (
                                        <div>
                                            <p className="text-muted-foreground">IMC</p>
                                            <p className="font-semibold">{aplicacao.imc}</p>
                                        </div>
                                    )}
                                    {aplicacao.gordura_visceral && (
                                        <div>
                                            <p className="text-muted-foreground">Gordura Visceral</p>
                                            <p className="font-semibold">{aplicacao.gordura_visceral}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
