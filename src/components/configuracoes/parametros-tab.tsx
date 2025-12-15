'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from "@/lib/supabase/client"
import { Configuracao } from "@/lib/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
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
import { Calendar, Bot, Settings2, ClipboardList, Plus, Save, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Interface para parâmetros de configuração
interface ParamConfig {
    chave: string
    label: string
    tipo: 'text' | 'number' | 'boolean' | 'select' | 'password'
    descricao: string
    sufixo?: string
    opcoes?: string[]
}

interface CategoriaConfig {
    title: string
    icon: React.ComponentType<{ className?: string }>
    description: string
    params: ParamConfig[]
}

// Definição dos parâmetros com sua categoria e metadados
const PARAMETROS_CONFIG: Record<string, CategoriaConfig> = {
    agendamento: {
        title: 'Agendamento',
        icon: Calendar,
        description: 'Configurações de duração e intervalos',
        params: [
            { chave: 'duracao_consulta_padrao', label: 'Duração Consulta', tipo: 'number', sufixo: 'min', descricao: 'Duração padrão de consulta em minutos' },
            { chave: 'duracao_aplicacao_padrao', label: 'Duração Aplicação', tipo: 'number', sufixo: 'min', descricao: 'Duração padrão de aplicação em minutos' },
            { chave: 'intervalo_slot_consulta', label: 'Intervalo Consulta', tipo: 'number', sufixo: 'min', descricao: 'Intervalo entre slots de consulta' },
            { chave: 'intervalo_slot_aplicacao', label: 'Intervalo Aplicação', tipo: 'number', sufixo: 'min', descricao: 'Intervalo entre slots de aplicação' },
            { chave: 'antecedencia_minima_horas', label: 'Antecedência Mínima', tipo: 'number', sufixo: 'h', descricao: 'Horas mínimas de antecedência para agendar' },
            { chave: 'bloquear_agendamento_passado', label: 'Bloquear Passado', tipo: 'boolean', descricao: 'Não permitir agendar no passado' },
        ]
    },
    ia: {
        title: 'Comunicação e IA',
        icon: Bot,
        description: 'Nome da assistente, modelo de IA e API key',
        params: [
            { chave: 'nome_assistente', label: 'Nome Assistente', tipo: 'text', descricao: 'Nome da assistente virtual' },
            { chave: 'nome_medico', label: 'Nome Médico', tipo: 'text', descricao: 'Nome do médico' },
            { chave: 'openrouter_api_key', label: 'API Key OpenRouter', tipo: 'password', descricao: 'Chave de API do OpenRouter' },
            { chave: 'modelo_ia_padrao', label: 'Modelo IA', tipo: 'select', opcoes: ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'gemini-2.0-flash-exp'], descricao: 'Modelo OpenRouter padrão' },
            { chave: 'max_horarios_exibir', label: 'Max Horários', tipo: 'number', descricao: 'Máximo de horários para IA oferecer' },
        ]
    },
    sistema: {
        title: 'Sistema',
        icon: Settings2,
        description: 'Fuso horário e formatos',
        params: [
            { chave: 'fuso_horario', label: 'Fuso Horário', tipo: 'select', opcoes: ['America/Sao_Paulo', 'America/Fortaleza', 'America/Manaus', 'America/Cuiaba'], descricao: 'Fuso horário do sistema' },
            { chave: 'formato_data', label: 'Formato Data', tipo: 'select', opcoes: ['dd/MM/yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy'], descricao: 'Formato de exibição de datas' },
            { chave: 'formato_hora', label: 'Formato Hora', tipo: 'select', opcoes: ['HH:mm', 'hh:mm a'], descricao: 'Formato de exibição de horas' },
        ]
    },
    tarefas: {
        title: 'Tarefas',
        icon: ClipboardList,
        description: 'Prazos padrão para tarefas',
        params: [
            { chave: 'prazo_tarefa_receita_dias', label: 'Prazo Receita', tipo: 'number', sufixo: 'dias', descricao: 'Prazo padrão para tarefas de receita' },
        ]
    }
}

interface ParametrosTabProps {
    className?: string
}

export function ParametrosTab({ className }: ParametrosTabProps) {
    const [configs, setConfigs] = useState<Record<string, Configuracao>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({})
    const [dialogOpen, setDialogOpen] = useState(false)
    const [newParamData, setNewParamData] = useState({ chave: '', valor: '', tipo: 'text', descricao: '' })
    const [openRouterModels, setOpenRouterModels] = useState<string[]>([])
    const [loadingModels, setLoadingModels] = useState(false)
    const supabase = createClient()

    const fetchConfigs = useCallback(async () => {
        const { data, error } = await supabase
            .from('configuracoes')
            .select('*')
            .order('chave')

        if (error) {
            toast.error('Erro ao carregar configurações')
            console.error(error)
        } else {
            const configMap: Record<string, Configuracao> = {}
            data?.forEach(c => {
                configMap[c.chave] = c
            })
            setConfigs(configMap)
        }
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        fetchConfigs()

        const channel = supabase
            .channel('config-params-changes')
            .on('postgres_changes', { event: '*', schema: 'drluisfarjallat', table: 'configuracoes' }, () => {
                fetchConfigs()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, fetchConfigs])

    const getValue = (chave: string, defaultValue: string = ''): string => {
        if (pendingChanges[chave] !== undefined) {
            return pendingChanges[chave]
        }
        return configs[chave]?.valor ?? defaultValue
    }

    const handleChange = (chave: string, valor: string) => {
        setPendingChanges(prev => ({ ...prev, [chave]: valor }))
    }

    const handleSave = async () => {
        if (Object.keys(pendingChanges).length === 0) {
            toast.info('Nenhuma alteração para salvar')
            return
        }

        setSaving(true)
        try {
            for (const [chave, valor] of Object.entries(pendingChanges)) {
                const existing = configs[chave]
                const param = Object.values(PARAMETROS_CONFIG).flatMap(c => c.params).find(p => p.chave === chave)

                if (existing) {
                    // Update existing
                    const { error } = await supabase
                        .from('configuracoes')
                        .update({ valor, updated_at: new Date().toISOString() })
                        .eq('id', existing.id)

                    if (error) throw error
                } else {
                    // Insert new
                    const { error } = await supabase
                        .from('configuracoes')
                        .insert({
                            chave,
                            valor,
                            tipo: param?.tipo === 'number' ? 'number' : param?.tipo === 'boolean' ? 'boolean' : 'text',
                            descricao: param?.descricao || ''
                        })

                    if (error) throw error
                }
            }

            toast.success('Configurações salvas!')
            setPendingChanges({})
            fetchConfigs()
        } catch (error) {
            console.error(error)
            toast.error('Erro ao salvar configurações')
        } finally {
            setSaving(false)
        }
    }

    const handleAddNew = async () => {
        if (!newParamData.chave || !newParamData.valor) {
            toast.error('Chave e valor são obrigatórios')
            return
        }

        const { error } = await supabase
            .from('configuracoes')
            .insert(newParamData)

        if (error) {
            toast.error('Erro ao criar parâmetro')
            console.error(error)
        } else {
            toast.success('Parâmetro criado!')
            setDialogOpen(false)
            setNewParamData({ chave: '', valor: '', tipo: 'text', descricao: '' })
        }
    }

    // Função para carregar modelos da OpenRouter API
    const fetchOpenRouterModels = async () => {
        const apiKey = getValue('openrouter_api_key', '') || configs['openrouter_api_key']?.valor
        if (!apiKey) {
            toast.error('Configure a API Key do OpenRouter primeiro')
            return
        }

        setLoadingModels(true)
        try {
            const response = await fetch('https://openrouter.ai/api/v1/models', {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                }
            })

            if (!response.ok) {
                throw new Error('Falha ao carregar modelos')
            }

            const data = await response.json()
            // Filtrar modelos populares e ordenar
            const popularModels = data.data
                .filter((m: { id: string }) =>
                    m.id.includes('gpt') ||
                    m.id.includes('claude') ||
                    m.id.includes('gemini') ||
                    m.id.includes('llama') ||
                    m.id.includes('mistral')
                )
                .map((m: { id: string }) => m.id)
                .sort()

            setOpenRouterModels(popularModels)
            toast.success(`${popularModels.length} modelos carregados!`)
        } catch (error) {
            console.error(error)
            toast.error('Erro ao carregar modelos do OpenRouter')
        } finally {
            setLoadingModels(false)
        }
    }

    // Obter opções para modelo_ia_padrao (dinâmicas ou estáticas)
    const getModelOptions = (param: ParamConfig): string[] => {
        if (param.chave === 'modelo_ia_padrao' && openRouterModels.length > 0) {
            return openRouterModels
        }
        return param.opcoes || []
    }

    const hasChanges = Object.keys(pendingChanges).length > 0

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className={className}>
            {/* Header com botões */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-semibold">Parâmetros do Sistema</h2>
                    <p className="text-sm text-muted-foreground">
                        Configure os valores padrão usados pela IA e pelo sistema
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Parâmetro
                    </Button>
                    <Button onClick={handleSave} disabled={!hasChanges || saving}>
                        {saving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        Salvar Alterações
                    </Button>
                </div>
            </div>

            {/* Grid de cards por categoria */}
            <div className="grid gap-6 md:grid-cols-2">
                {Object.entries(PARAMETROS_CONFIG).map(([key, categoria]) => {
                    const Icon = categoria.icon
                    return (
                        <Card key={key}>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Icon className="h-5 w-5 text-primary" />
                                    {categoria.title}
                                </CardTitle>
                                <CardDescription>{categoria.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4">
                                    {categoria.params.map(param => (
                                        <div key={param.chave} className="flex items-center gap-3">
                                            <Label className="w-32 text-sm text-muted-foreground shrink-0">
                                                {param.label}
                                            </Label>
                                            <div className="flex-1 flex items-center gap-2">
                                                {param.tipo === 'boolean' ? (
                                                    <Switch
                                                        checked={getValue(param.chave, 'false') === 'true'}
                                                        onCheckedChange={(checked) => handleChange(param.chave, checked.toString())}
                                                    />
                                                ) : param.tipo === 'select' ? (
                                                    <div className="flex items-center gap-1 flex-1">
                                                        <Select
                                                            value={getValue(param.chave, getModelOptions(param)[0] || '')}
                                                            onValueChange={(value) => handleChange(param.chave, value)}
                                                        >
                                                            <SelectTrigger className="h-9">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {getModelOptions(param).map(opt => (
                                                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {param.chave === 'modelo_ia_padrao' && (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="icon"
                                                                            className="h-9 w-9 shrink-0"
                                                                            onClick={fetchOpenRouterModels}
                                                                            disabled={loadingModels}
                                                                        >
                                                                            <RefreshCw className={`h-4 w-4 ${loadingModels ? 'animate-spin' : ''}`} />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Carregar modelos do OpenRouter</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <Input
                                                        type={param.tipo === 'number' ? 'number' : param.tipo === 'password' ? 'password' : 'text'}
                                                        value={getValue(param.chave, '')}
                                                        onChange={(e) => handleChange(param.chave, e.target.value)}
                                                        className="h-9"
                                                        placeholder={param.tipo === 'password' ? '••••••••••••••••' : undefined}
                                                    />
                                                )}
                                                {param.sufixo && (
                                                    <span className="text-sm text-muted-foreground shrink-0">
                                                        {param.sufixo}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Parâmetros adicionais não mapeados */}
            {Object.entries(configs).filter(([chave]) =>
                !Object.values(PARAMETROS_CONFIG).flatMap(c => c.params).some(p => p.chave === chave)
            ).length > 0 && (
                    <Card className="mt-6">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Outros Parâmetros</CardTitle>
                            <CardDescription>Parâmetros personalizados</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4">
                                {Object.entries(configs)
                                    .filter(([chave]) =>
                                        !Object.values(PARAMETROS_CONFIG).flatMap(c => c.params).some(p => p.chave === chave)
                                    )
                                    .map(([chave, config]) => (
                                        <div key={chave} className="flex items-center gap-3">
                                            <Label className="w-48 text-sm font-mono text-muted-foreground shrink-0 truncate" title={chave}>
                                                {chave}
                                            </Label>
                                            <Input
                                                value={getValue(chave, '')}
                                                onChange={(e) => handleChange(chave, e.target.value)}
                                                className="h-9 flex-1"
                                            />
                                        </div>
                                    ))
                                }
                            </div>
                        </CardContent>
                    </Card>
                )}

            {/* Dialog para novo parâmetro */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Novo Parâmetro</DialogTitle>
                        <DialogDescription>
                            Adicione um parâmetro personalizado ao sistema
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="new-chave">Chave *</Label>
                            <Input
                                id="new-chave"
                                value={newParamData.chave}
                                onChange={(e) => setNewParamData({ ...newParamData, chave: e.target.value })}
                                placeholder="ex: minha_configuracao"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="new-valor">Valor *</Label>
                            <Input
                                id="new-valor"
                                value={newParamData.valor}
                                onChange={(e) => setNewParamData({ ...newParamData, valor: e.target.value })}
                                placeholder="ex: 10"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="new-tipo">Tipo</Label>
                            <Select
                                value={newParamData.tipo}
                                onValueChange={(value) => setNewParamData({ ...newParamData, tipo: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="text">Texto</SelectItem>
                                    <SelectItem value="number">Número</SelectItem>
                                    <SelectItem value="boolean">Booleano</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="new-descricao">Descrição</Label>
                            <Input
                                id="new-descricao"
                                value={newParamData.descricao}
                                onChange={(e) => setNewParamData({ ...newParamData, descricao: e.target.value })}
                                placeholder="Descrição do parâmetro"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleAddNew}>
                            Criar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
