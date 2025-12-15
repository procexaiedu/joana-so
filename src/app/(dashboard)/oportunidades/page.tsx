'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from "@/lib/supabase/client"
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Plus, MoreHorizontal, DollarSign, Calendar, Search, Filter, AlertCircle, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { OpportunityDialog } from "@/components/crm/opportunity-dialog"
import { OpportunityViewModal } from "@/components/crm/opportunity-view-modal"

// Definição dos status (colunas do Kanban)
const COLUMNS = [
    { id: 'aberta', title: 'Aberta', color: 'bg-blue-500', barColor: 'bg-blue-500' },
    { id: 'em_negociacao', title: 'Em Negociação', color: 'bg-yellow-500', barColor: 'bg-yellow-500' },
    { id: 'ganha', title: 'Ganha', color: 'bg-green-500', barColor: 'bg-green-500' },
    { id: 'perdida', title: 'Perdida', color: 'bg-red-500', barColor: 'bg-red-500' },
]

type Oportunidade = {
    id: string
    status: string
    valor_estimado: number | null
    notas: string | null
    created_at: string
    probabilidade?: number
    prioridade?: 'alta' | 'media' | 'baixa'
    previsao_fechamento?: string
    lead?: { id: string, nome: string, email: string, telefone?: string }
    paciente?: { id: string, nome: string, email: string }
    produto?: { nome: string }
}

export default function OportunidadesPage() {
    const [oportunidades, setOportunidades] = useState<Oportunidade[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Modals State
    const [dialogOpen, setDialogOpen] = useState(false)
    const [viewOpen, setViewOpen] = useState(false)
    const [selectedOpId, setSelectedOpId] = useState<string | null>(null)
    const [viewOp, setViewOp] = useState<Oportunidade | null>(null)

    // Filters State
    const [showFilters, setShowFilters] = useState(false)
    const [filterPriority, setFilterPriority] = useState<string[]>([])
    const [filterValueMin, setFilterValueMin] = useState([0])

    const supabase = createClient()

    const fetchOportunidades = useCallback(async () => {
        const { data, error } = await supabase
            .from('oportunidades')
            .select(`
        *,
        lead:leads(id, nome, email, telefone),
        paciente:pacientes(id, nome, email),
        produto:produtos(nome)
      `)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Erro ao buscar oportunidades:', error)
            toast.error('Erro ao carregar oportunidades')
        } else {
            setOportunidades(data || [])
        }
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        fetchOportunidades()

        const channel = supabase
            .channel('oportunidades-kanban')
            .on('postgres_changes', { event: '*', schema: 'drluisfarjallat', table: 'oportunidades' }, () => {
                fetchOportunidades()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [supabase, fetchOportunidades])

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result

        if (!destination) return
        if (destination.droppableId === source.droppableId && destination.index === source.index) return

        const newStatus = destination.droppableId

        // Otimistic UI Update
        const updatedOportunidades = oportunidades.map(op =>
            op.id === draggableId ? { ...op, status: newStatus } : op
        )
        setOportunidades(updatedOportunidades)

        // Backend Update
        const updates: any = { status: newStatus }
        if (newStatus === 'ganha') updates.probabilidade = 100
        if (newStatus === 'perdida') updates.probabilidade = 0

        const { error } = await supabase
            .from('oportunidades')
            .update(updates)
            .eq('id', draggableId)

        if (error) {
            toast.error('Erro ao atualizar status')
            fetchOportunidades()
        }
    }

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('oportunidades').delete().eq('id', id)
        if (error) {
            toast.error("Erro ao excluir")
        } else {
            toast.success("Oportunidade excluída")
            fetchOportunidades()
        }
    }

    // Modal Handlers
    const handleCardClick = (op: Oportunidade) => {
        setViewOp(op)
        setViewOpen(true)
    }

    const handleEditFromView = () => {
        if (viewOp) {
            setSelectedOpId(viewOp.id)
            setDialogOpen(true)
        }
    }

    const handleEditDirect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedOpId(id)
        setDialogOpen(true)
    }

    const handleNew = () => {
        setSelectedOpId(null)
        setDialogOpen(true)
    }

    const togglePriorityFilter = (priority: string) => {
        setFilterPriority(prev =>
            prev.includes(priority) ? prev.filter(p => p !== priority) : [...prev, priority]
        )
    }

    const clearFilters = () => {
        setFilterPriority([])
        setFilterValueMin([0])
        setSearchTerm('')
    }

    const getColumnData = (columnId: string) => {
        return oportunidades.filter(op => {
            // Status Filter
            if (op.status !== columnId) return false

            // Search Filter
            const matchesSearch =
                (op.lead?.nome || op.paciente?.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (op.produto?.nome || '').toLowerCase().includes(searchTerm.toLowerCase())

            if (!matchesSearch) return false

            // Complexity Filters
            if (filterPriority.length > 0) {
                const p = op.prioridade || 'media'
                if (!filterPriority.includes(p)) return false
            }

            if (filterValueMin[0] > 0) {
                if ((op.valor_estimado || 0) < filterValueMin[0]) return false
            }

            return true
        })
    }

    const getColumnTotal = (columnId: string) => {
        const items = getColumnData(columnId)
        return items.reduce((acc, curr) => acc + (curr.valor_estimado || 0), 0)
    }

    const formatCurrency = (value: number | null) => {
        if (!value) return 'R$ 0,00'
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    const getInitials = (name: string) => {
        return name ? name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() : '??'
    }

    const activeFiltersCount = (filterPriority.length > 0 ? 1 : 0) + (filterValueMin[0] > 0 ? 1 : 0)

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-card/50">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <DollarSign className="h-8 w-8 text-primary" />
                        Pipeline
                    </h1>
                    <p className="text-muted-foreground">Gestão de oportunidades e negociações</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative w-64 hidden md:block">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar oportunidade..."
                            className="pl-8 bg-background"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <Popover open={showFilters} onOpenChange={setShowFilters}>
                        <PopoverTrigger asChild>
                            <Button variant={activeFiltersCount > 0 ? "secondary" : "outline"} size="icon" className="relative">
                                <Filter className="h-4 w-4" />
                                {activeFiltersCount > 0 && (
                                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary animate-pulse" />
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" align="end">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-medium leading-none">Filtros Avançados</h4>
                                    {(activeFiltersCount > 0 || searchTerm) && (
                                        <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground" onClick={clearFilters}>
                                            Limpar
                                        </Button>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Prioridade</Label>
                                    <div className="flex gap-2">
                                        {['alta', 'media', 'baixa'].map(p => (
                                            <Badge
                                                key={p}
                                                variant={filterPriority.includes(p) ? "default" : "outline"}
                                                className="cursor-pointer capitalize"
                                                onClick={() => togglePriorityFilter(p)}
                                            >
                                                {p}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground flex justify-between">
                                        <span>Valor Mínimo</span>
                                        <span>{formatCurrency(filterValueMin[0])}</span>
                                    </Label>
                                    <Slider
                                        min={0}
                                        max={10000}
                                        step={500}
                                        value={filterValueMin}
                                        onValueChange={setFilterValueMin}
                                    />
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Button onClick={handleNew} className="shadow-lg shadow-primary/20">
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Oportunidade
                    </Button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-muted/10">
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex h-full gap-6 min-w-[1200px]">
                        {COLUMNS.map((column) => (
                            <div key={column.id} className="flex-1 flex flex-col min-w-[300px] h-full rounded-2xl bg-muted/40 border border-border/60 shadow-sm transition-all">
                                {/* Column Header */}
                                <div className="p-4 border-b bg-card/40 rounded-t-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${column.color}`} />
                                            <h3 className="font-semibold text-sm uppercase tracking-wide text-foreground/80">{column.title}</h3>
                                            <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 flex justify-center bg-background/80">
                                                {getColumnData(column.id).length}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="text-2xl font-bold tracking-tight text-foreground/90">
                                        {formatCurrency(getColumnTotal(column.id))}
                                    </div>
                                    <div className={`h-1 w-full rounded-full bg-muted overflow-hidden`}>
                                        <div className={`h-full ${column.barColor} w-full opacity-50`} />
                                    </div>
                                </div>

                                {/* Column Content */}
                                <Droppable droppableId={column.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className={`flex-1 p-3 space-y-3 overflow-y-auto ${snapshot.isDraggingOver ? 'bg-primary/5' : ''}`}
                                        >
                                            {getColumnData(column.id).map((op, index) => (
                                                <Draggable key={op.id} draggableId={op.id} index={index}>
                                                    {(provided, snapshot) => {
                                                        const nome = op.lead?.nome || op.paciente?.nome || 'Sem nome'
                                                        const probabilidade = op.probabilidade || 50

                                                        return (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                style={provided.draggableProps.style}
                                                                className="group relative"
                                                                onClick={() => handleCardClick(op)}
                                                            >
                                                                <Card className={`
                                                                    border-0 ring-1 ring-border/50 hover:ring-primary/50 transition-all duration-200 cursor-pointer
                                                                    ${snapshot.isDragging ? 'shadow-xl rotate-2 scale-105 z-50 ring-primary' : 'shadow-sm hover:shadow-md'}
                                                                    bg-card
                                                                `}>
                                                                    <CardContent className="p-4 space-y-4">
                                                                        {/* Header Card */}
                                                                        <div className="flex justify-between items-start gap-3">
                                                                            <div className="flex items-start gap-3">
                                                                                <Avatar className="h-9 w-9 border border-border">
                                                                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                                                                        {getInitials(nome)}
                                                                                    </AvatarFallback>
                                                                                </Avatar>
                                                                                <div className="space-y-0.5">
                                                                                    <h4 className="font-semibold text-sm leading-tight hover:text-primary transition-colors line-clamp-2">
                                                                                        {nome}
                                                                                    </h4>
                                                                                    {op.produto?.nome && (
                                                                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                                                                            {op.produto.nome}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <DropdownMenu>
                                                                                <DropdownMenuTrigger asChild>
                                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                                    </Button>
                                                                                </DropdownMenuTrigger>
                                                                                <DropdownMenuContent align="end">
                                                                                    <DropdownMenuItem onClick={(e) => handleEditDirect(op.id, e)}>Editar</DropdownMenuItem>
                                                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(op.id); }} className="text-destructive">Excluir</DropdownMenuItem>
                                                                                </DropdownMenuContent>
                                                                            </DropdownMenu>
                                                                        </div>

                                                                        {/* Info Money & Date */}
                                                                        <div className="flex items-center justify-between">
                                                                            <Badge variant="outline" className="font-mono font-medium text-xs border-primary/20 bg-primary/5 text-primary">
                                                                                {formatCurrency(op.valor_estimado)}
                                                                            </Badge>
                                                                            {op.prioridade === 'alta' && (
                                                                                <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Alta</Badge>
                                                                            )}
                                                                        </div>

                                                                        {/* Probabilidade */}
                                                                        <div className="space-y-1.5">
                                                                            <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                                                                <span>Probabilidade</span>
                                                                                <span>{probabilidade}%</span>
                                                                            </div>
                                                                            <Progress value={probabilidade} className="h-1.5" />
                                                                        </div>

                                                                        {/* Footer */}
                                                                        <div className="pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                                                                            <span className="flex items-center gap-1">
                                                                                <Calendar className="h-3 w-3" />
                                                                                {new Date(op.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                                                            </span>
                                                                            {op.previsao_fechamento && (
                                                                                <span className="flex items-center gap-1 text-orange-500/80" title="Previsão de Fechamento">
                                                                                    <AlertCircle className="h-3 w-3" />
                                                                                    {new Date(op.previsao_fechamento).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </CardContent>
                                                                </Card>
                                                            </div>
                                                        )
                                                    }}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        ))}
                    </div>
                </DragDropContext>
            </div>

            {/* Modals */}
            <OpportunityDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                opportunityId={selectedOpId}
                onSuccess={fetchOportunidades}
            />

            <OpportunityViewModal
                open={viewOpen}
                onOpenChange={setViewOpen}
                opportunity={viewOp}
                onEdit={handleEditFromView}
            />
        </div>
    )
}
