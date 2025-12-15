'use client'

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2, User, DollarSign } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

type Lead = { id: string; nome: string }
type Paciente = { id: string; nome: string }
type Produto = { id: string; nome: string }

interface OpportunityDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    opportunityId?: string | null // Se null, é criação
    initialStatus?: string
    onSuccess: () => void
}

export function OpportunityDialog({ open, onOpenChange, opportunityId, initialStatus, onSuccess }: OpportunityDialogProps) {
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    // Form Data
    const [leadId, setLeadId] = useState<string>("")
    const [pacienteId, setPacienteId] = useState<string>("")
    const [produtoId, setProdutoId] = useState<string>("")
    const [valor, setValor] = useState<string>("")
    const [status, setStatus] = useState<string>(initialStatus || "aberta")
    const [notas, setNotas] = useState("")
    const [probabilidade, setProbabilidade] = useState([50])
    const [prioridade, setPrioridade] = useState("media")
    const [previsao, setPrevisao] = useState<Date | undefined>()

    // Select Data
    const [leads, setLeads] = useState<Lead[]>([])
    const [pacientes, setPacientes] = useState<Paciente[]>([])
    const [produtos, setProdutos] = useState<Produto[]>([])

    const supabase = createClient()
    const isEditing = !!opportunityId

    useEffect(() => {
        if (open) {
            fetchOptions()
            if (isEditing) {
                fetchOpportunity()
            } else {
                resetForm()
            }
        }
    }, [open, opportunityId])

    const fetchOptions = async () => {
        const [leadsRes, pacientesRes, produtosRes] = await Promise.all([
            supabase.from('leads').select('id, nome').order('nome'),
            supabase.from('pacientes').select('id, nome').order('nome'),
            supabase.from('produtos').select('id, nome').order('nome')
        ])
        if (leadsRes.data) setLeads(leadsRes.data)
        if (pacientesRes.data) setPacientes(pacientesRes.data)
        if (produtosRes.data) setProdutos(produtosRes.data)
    }

    const fetchOpportunity = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('oportunidades')
            .select('*')
            .eq('id', opportunityId)
            .single()

        if (data) {
            setLeadId(data.lead_id || "")
            setPacienteId(data.paciente_id || "")
            setProdutoId(data.produto_id || "")
            setValor(data.valor_estimado?.toString() || "")
            setStatus(data.status)
            setNotas(data.notas || "")
            setProbabilidade([data.probabilidade || 50])
            setPrioridade(data.prioridade || "media")
            setPrevisao(data.previsao_fechamento ? new Date(data.previsao_fechamento) : undefined)
        }
        setLoading(false)
    }

    const resetForm = () => {
        setLeadId("")
        setPacienteId("")
        setProdutoId("")
        setValor("")
        setStatus(initialStatus || "aberta")
        setNotas("")
        setProbabilidade([50])
        setPrioridade("media")
        setPrevisao(undefined)
    }

    const handleSave = async () => {
        if ((!leadId && !pacienteId) || !valor) {
            toast.error("Preencha os campos obrigatórios")
            return
        }

        setSaving(true)
        const payload = {
            lead_id: leadId || null,
            paciente_id: pacienteId || null,
            produto_id: produtoId || null,
            valor_estimado: parseFloat(valor),
            status,
            notas,
            probabilidade: probabilidade[0],
            prioridade,
            previsao_fechamento: previsao ? format(previsao, 'yyyy-MM-dd') : null
        }

        let error
        if (isEditing) {
            const res = await supabase.from('oportunidades').update(payload).eq('id', opportunityId)
            error = res.error
        } else {
            const res = await supabase.from('oportunidades').insert([payload])
            error = res.error
        }

        if (error) {
            console.error(error)
            toast.error("Erro ao salvar oportunidade")
        } else {
            toast.success(isEditing ? "Oportunidade atualizada" : "Oportunidade criada")
            onOpenChange(false)
            onSuccess()
        }
        setSaving(false)
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[500px] overflow-y-auto">
                <SheetHeader className="pb-4 border-b">
                    <SheetTitle>{isEditing ? "Editar Oportunidade" : "Nova Oportunidade"}</SheetTitle>
                    <SheetDescription>
                        {isEditing ? "Atualize os detalhes da negociação." : "Cadastre uma nova oportunidade no pipeline."}
                    </SheetDescription>
                </SheetHeader>

                {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (
                    <div className="grid gap-6 py-6 px-1">
                        {/* Seção Cliente */}
                        <div className="space-y-4 bg-muted/40 p-5 rounded-xl border border-border/60">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2 mb-3">
                                <User className="h-4 w-4" /> Quem é o cliente?
                            </h3>
                            <div className="grid gap-5">
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground text-xs">Lead (Potencial)</Label>
                                    <Select
                                        value={leadId}
                                        onValueChange={(v) => { setLeadId(v); if (v) setPacienteId(""); }}
                                    >
                                        <SelectTrigger className="bg-background/80 border-muted-foreground/20 h-10">
                                            <SelectValue placeholder="Selecione um lead..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {leads.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="relative flex items-center justify-center">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-dashed border-muted-foreground/30" /></div>
                                    <span className="relative bg-muted/40 px-2 text-[10px] uppercase text-muted-foreground font-medium">Ou Cliente da Base</span>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-muted-foreground text-xs">Paciente (Já cadastrado)</Label>
                                    <Select
                                        value={pacienteId}
                                        onValueChange={(v) => { setPacienteId(v); if (v) setLeadId(""); }}
                                    >
                                        <SelectTrigger className="bg-background/80 border-muted-foreground/20 h-10">
                                            <SelectValue placeholder="Selecione um paciente..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {pacientes.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Seção Negócio */}
                        <div className="group space-y-4 border border-border/40 p-5 rounded-xl hover:border-border/80 transition-colors">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2 mb-3">
                                <DollarSign className="h-4 w-4" /> Detalhes da Negociação
                            </h3>

                            <div className="space-y-2">
                                <Label>Produto / Serviço</Label>
                                <Select value={produtoId} onValueChange={setProdutoId}>
                                    <SelectTrigger className="h-10 bg-muted/20">
                                        <SelectValue placeholder="O que está sendo negociado?" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-2">
                                    <Label>Valor Estimado</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-muted-foreground font-semibold">R$</span>
                                        <Input
                                            type="number"
                                            placeholder="0,00"
                                            className="pl-10 h-10 text-lg font-medium bg-muted/20"
                                            value={valor}
                                            onChange={e => setValor(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Previsão</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal h-10 bg-muted/20",
                                                    !previsao && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                                {previsao ? format(previsao, "dd/MM/yyyy") : <span>Estimativa</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="end">
                                            <Calendar
                                                mode="single"
                                                selected={previsao}
                                                onSelect={setPrevisao}
                                                initialFocus
                                                locale={ptBR}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </div>

                        {/* Seção Qualificação */}
                        <div className="space-y-4 border border-border/40 p-5 rounded-xl bg-gradient-to-br from-transparent to-muted/20">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2 mb-3">
                                <User className="h-4 w-4" /> Status & Qualificação
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Etapa do Funil</Label>
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger className="border-l-4 border-l-primary/50">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="aberta">⚪ Aberta</SelectItem>
                                            <SelectItem value="em_negociacao">🟡 Em Negociação</SelectItem>
                                            <SelectItem value="ganha">🟢 Ganha</SelectItem>
                                            <SelectItem value="perdida">🔴 Perdida</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Prioridade</Label>
                                    <Select value={prioridade} onValueChange={setPrioridade}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="baixa">Baixa</SelectItem>
                                            <SelectItem value="media">Média</SelectItem>
                                            <SelectItem value="alta">🔥 Alta</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4">
                                <div className="flex justify-between items-end">
                                    <Label className="text-xs flex flex-col gap-1">
                                        <span className="font-semibold text-foreground">Probabilidade de Fechamento</span>
                                        <span className="text-muted-foreground font-normal">Qual a chance deste negócio sair?</span>
                                    </Label>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "text-sm px-2 min-w-[3.5rem] justify-center",
                                            probabilidade[0] > 70 ? "border-green-500 text-green-500 bg-green-500/10" :
                                                probabilidade[0] < 30 ? "border-red-500 text-red-500 bg-red-500/10" : ""
                                        )}
                                    >
                                        {probabilidade}%
                                    </Badge>
                                </div>
                                <Slider
                                    value={probabilidade}
                                    onValueChange={setProbabilidade}
                                    max={100}
                                    step={10}
                                    className={cn(
                                        "py-2 cursor-pointer",
                                        probabilidade[0] > 70 ? "[&_.absolute]:bg-green-500" :
                                            probabilidade[0] < 30 ? "[&_.absolute]:bg-red-500" : ""
                                    )}
                                />
                            </div>
                        </div>

                        {/* Notas */}
                        <div className="space-y-2">
                            <Label>Notas e Observações</Label>
                            <Textarea
                                placeholder="Escreva detalhes importantes, dores do cliente ou próximos passos..."
                                rows={3}
                                className="resize-none bg-muted/20 focus:bg-background transition-colors"
                                value={notas}
                                onChange={e => setNotas(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                <SheetFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
