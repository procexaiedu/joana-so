'use client'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
    Calendar,
    DollarSign,
    User,
    Mail,
    Phone,
    Clock,
    Tag,
    PenLine,
    CheckCircle2,
    XCircle,
    Building2,
    ArrowUpRight
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface OpportunityViewModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    opportunity: any // Tipagem idealmente viria do banco, mas vou usar any por flexibilidade agora
    onEdit: () => void
}

export function OpportunityViewModal({ open, onOpenChange, opportunity, onEdit }: OpportunityViewModalProps) {
    if (!opportunity) return null

    const statusColors = {
        aberta: "bg-blue-500",
        em_negociacao: "bg-yellow-500",
        ganha: "bg-green-500",
        perdida: "bg-red-500"
    }

    const statusLabels = {
        aberta: "Aberta",
        em_negociacao: "Em Negociação",
        ganha: "Ganha",
        perdida: "Perdida"
    }

    const priorityColors = {
        baixa: "bg-gray-500",
        media: "bg-blue-500",
        alta: "bg-red-500"
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
    }

    const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

    // Cor do status atual
    const currentColor = statusColors[opportunity.status as keyof typeof statusColors] || "bg-gray-500"
    const currentLabel = statusLabels[opportunity.status as keyof typeof statusLabels] || opportunity.status

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl">
                {/* Header Colorido */}
                <div className={`h-2 ${currentColor} w-full`} />

                <div className="p-6 pb-0">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-start gap-4">
                            <Avatar className="h-16 w-16 border-2 border-background shadow-md">
                                <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                                    {getInitials(opportunity.lead?.nome || opportunity.paciente?.nome)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <DialogTitle className="text-2xl font-bold tracking-tight">
                                    {opportunity.lead?.nome || opportunity.paciente?.nome || "Sem Nome"}
                                </DialogTitle>
                                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                    <Building2 className="h-3 w-3" />
                                    <span>{opportunity.produto?.nome || "Produto não definido"}</span>
                                </div>
                                <div className="flex gap-2 mt-1">
                                    <Badge variant="secondary" className={`${currentColor} bg-opacity-10 text-opacity-100 hover:bg-opacity-20 border-0`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${currentColor} mr-1.5`} />
                                        {currentLabel}
                                    </Badge>
                                    {opportunity.prioridade === 'alta' && (
                                        <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Alta Prioridade</Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Valor Estimado</p>
                            <p className="text-3xl font-bold text-foreground">{formatCurrency(opportunity.valor_estimado)}</p>
                        </div>
                    </div>

                    <Separator className="mb-6" />

                    <div className="grid grid-cols-2 gap-8 mb-6">
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Detalhes</h4>

                            <div className="flex items-center gap-3 text-sm">
                                <div className="p-2 rounded-md bg-muted/50 text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Previsão de Fechamento</p>
                                    <p className="font-medium">
                                        {opportunity.previsao_fechamento
                                            ? format(new Date(opportunity.previsao_fechamento), "d 'de' MMMM", { locale: ptBR })
                                            : "Não definida"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-sm">
                                <div className="p-2 rounded-md bg-muted/50 text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Criado em</p>
                                    <p className="font-medium">
                                        {opportunity.created_at
                                            ? format(new Date(opportunity.created_at), "dd/MM/yyyy")
                                            : "-"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Probabilidade</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium">
                                    <span>Chance de Sucesso</span>
                                    <span className="text-primary">{opportunity.probabilidade || 50}%</span>
                                </div>
                                <Progress value={opportunity.probabilidade || 50} className="h-2" />
                                <p className="text-xs text-muted-foreground text-right mt-1">
                                    Baseado no histórico e etapa atual
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-4 mb-6 border border-border/50">
                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                            <PenLine className="h-3 w-3" /> Notas
                        </h4>
                        <p className="text-sm text-muted-foreground italic leading-relaxed">
                            "{opportunity.notas || "Nenhuma observação registrada."}"
                        </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Criado em {opportunity.created_at ? format(new Date(opportunity.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '-'}</span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="bg-muted/20 p-4 border-t flex flex-row justify-between items-center sm:justify-between">
                    <div className="flex gap-2">

                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
                        <Button onClick={() => { onOpenChange(false); onEdit(); }} className="gap-2">
                            <PenLine className="h-4 w-4" /> Editar
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
