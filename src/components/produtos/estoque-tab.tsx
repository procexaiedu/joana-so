'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from "@/lib/supabase/client"
import { Produto, Clinica, Estoque, MovimentacaoEstoque } from "@/lib/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Package,
    Plus,
    Minus,
    ArrowUpDown,
    Loader2,
    Building2,
    AlertTriangle,
    Calendar,
    History,
    Boxes,
    DollarSign,
    TrendingUp
} from "lucide-react"
import { toast } from "sonner"

interface EstoqueTabProps {
    className?: string
}

type EstoqueComRelacoes = Estoque & {
    produto: Produto
    clinica: Clinica
}

type MovimentacaoComRelacoes = MovimentacaoEstoque & {
    estoque: EstoqueComRelacoes
}

const initialMovimentacaoForm = {
    estoque_id: '',
    produto_id: '',
    tipo: 'entrada' as 'entrada' | 'saida' | 'ajuste',
    quantidade: '',
    motivo: '',
    observacoes: '',
    data_validade: ''
}

export function EstoqueTab({ className }: EstoqueTabProps) {
    const [clinicas, setClinicas] = useState<Clinica[]>([])
    const [produtos, setProdutos] = useState<Produto[]>([])
    const [estoques, setEstoques] = useState<EstoqueComRelacoes[]>([])
    const [movimentacoes, setMovimentacoes] = useState<MovimentacaoComRelacoes[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedClinica, setSelectedClinica] = useState<string>('')

    // Dialog states
    const [movDialogOpen, setMovDialogOpen] = useState(false)
    const [movForm, setMovForm] = useState(initialMovimentacaoForm)
    const [saving, setSaving] = useState(false)

    const supabase = createClient()

    const fetchData = useCallback(async () => {
        const [clinicasRes, produtosRes, estoquesRes, movRes] = await Promise.all([
            supabase.from('clinicas').select('*').eq('ativo', true).order('nome'),
            supabase.from('produtos').select('*').eq('ativo', true).order('nome'),
            supabase.from('estoque').select('*, produto:produtos(*), clinica:clinicas(*)').order('produto_id'),
            supabase.from('movimentacoes_estoque')
                .select('*, estoque:estoque(*, produto:produtos(*), clinica:clinicas(*))')
                .order('created_at', { ascending: false })
                .limit(50)
        ])

        if (clinicasRes.data) setClinicas(clinicasRes.data)
        if (produtosRes.data) setProdutos(produtosRes.data)
        if (estoquesRes.data) setEstoques(estoquesRes.data as EstoqueComRelacoes[])
        if (movRes.data) setMovimentacoes(movRes.data as MovimentacaoComRelacoes[])

        // Auto-select primeira clínica
        if (clinicasRes.data && clinicasRes.data.length > 0 && !selectedClinica) {
            setSelectedClinica(clinicasRes.data[0].id)
        }

        setLoading(false)
    }, [supabase, selectedClinica])

    useEffect(() => {
        fetchData()

        // Realtime subscription
        const channel = supabase
            .channel('estoque-changes')
            .on('postgres_changes', { event: '*', schema: 'drluisfarjallat', table: 'estoque' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'drluisfarjallat', table: 'movimentacoes_estoque' }, fetchData)
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, fetchData])

    // Filtrar por clínica
    const estoquesFiltrados = estoques.filter(e =>
        !selectedClinica || e.clinica_id === selectedClinica
    )

    // Stats
    const totalItens = estoquesFiltrados.reduce((sum, e) => sum + e.quantidade, 0)
    const itensEstoqueBaixo = estoquesFiltrados.filter(e => e.quantidade < 5).length
    const itensVencendo = estoquesFiltrados.filter(e => {
        if (!e.data_validade) return false
        const validade = new Date(e.data_validade)
        const hoje = new Date()
        const diff = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
        return diff <= 30 && diff > 0
    }).length
    const valorTotalEstoque = estoquesFiltrados.reduce((sum, e) =>
        sum + (e.quantidade * (e.custo_unitario || 0)), 0
    )

    // Top 5 produtos por quantidade (para gráfico)
    const topProdutos = [...estoquesFiltrados]
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5)

    // Handlers
    const openMovDialog = (tipo: 'entrada' | 'saida' | 'ajuste', estoqueId?: string) => {
        setMovForm({
            ...initialMovimentacaoForm,
            tipo,
            estoque_id: estoqueId || ''
        })
        setMovDialogOpen(true)
    }

    const handleSaveMovimentacao = async () => {
        if (!movForm.quantidade || parseFloat(movForm.quantidade) <= 0) {
            toast.error('Quantidade deve ser maior que zero')
            return
        }

        setSaving(true)
        try {
            const quantidade = parseFloat(movForm.quantidade)

            // Se não tem estoque selecionado, precisa criar (apenas para entrada)
            let estoqueId = movForm.estoque_id

            if (!estoqueId && movForm.tipo === 'entrada' && movForm.produto_id) {
                // Criar novo registro de estoque
                const { data: novoEstoque, error: estoqueError } = await supabase
                    .from('estoque')
                    .insert({
                        produto_id: movForm.produto_id,
                        clinica_id: selectedClinica,
                        quantidade: 0,
                        unidade: 'unidade',
                        data_validade: movForm.data_validade || null
                    })
                    .select()
                    .single()

                if (estoqueError) throw estoqueError
                estoqueId = novoEstoque.id
            }

            if (!estoqueId) {
                toast.error('Selecione um produto/estoque')
                setSaving(false)
                return
            }

            // Buscar estoque atual
            const { data: estoqueAtual, error: fetchError } = await supabase
                .from('estoque')
                .select('quantidade')
                .eq('id', estoqueId)
                .single()

            if (fetchError) throw fetchError

            // Calcular nova quantidade
            let novaQuantidade = estoqueAtual.quantidade
            if (movForm.tipo === 'entrada') {
                novaQuantidade += quantidade
            } else if (movForm.tipo === 'saida') {
                if (quantidade > estoqueAtual.quantidade) {
                    toast.error('Quantidade insuficiente em estoque')
                    setSaving(false)
                    return
                }
                novaQuantidade -= quantidade
            } else {
                // Ajuste - quantidade absoluta
                novaQuantidade = quantidade
            }

            // Atualizar estoque - só atualiza validade em entradas com valor preenchido
            const updatePayload: Record<string, unknown> = {
                quantidade: novaQuantidade,
                updated_at: new Date().toISOString()
            }

            // Só atualiza data_validade em entradas com valor informado
            if (movForm.tipo === 'entrada' && movForm.data_validade) {
                updatePayload.data_validade = movForm.data_validade
            }

            const { error: updateError } = await supabase
                .from('estoque')
                .update(updatePayload)
                .eq('id', estoqueId)

            if (updateError) throw updateError

            // Registrar movimentação
            const { error: movError } = await supabase
                .from('movimentacoes_estoque')
                .insert({
                    estoque_id: estoqueId,
                    tipo: movForm.tipo === 'ajuste' ? 'entrada' : movForm.tipo,
                    quantidade: movForm.tipo === 'ajuste'
                        ? quantidade - estoqueAtual.quantidade
                        : quantidade,
                    motivo: movForm.motivo || (movForm.tipo === 'entrada' ? 'Compra' : movForm.tipo === 'saida' ? 'Uso' : 'Ajuste inventário'),
                    observacoes: movForm.observacoes || null
                })

            if (movError) throw movError

            toast.success(`Estoque ${movForm.tipo === 'entrada' ? 'atualizado' : movForm.tipo === 'saida' ? 'baixado' : 'ajustado'}!`)
            setMovDialogOpen(false)
            setMovForm(initialMovimentacaoForm)
        } catch (error) {
            console.error(error)
            toast.error('Erro ao registrar movimentação')
        } finally {
            setSaving(false)
        }
    }

    // Formatar data
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR')
    }

    // Verificar se está vencendo
    const getValidadeBadge = (dataValidade?: string) => {
        if (!dataValidade) return null
        const validade = new Date(dataValidade)
        const hoje = new Date()
        const diff = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))

        if (diff < 0) {
            return <Badge variant="destructive" className="text-xs">Vencido</Badge>
        } else if (diff <= 30) {
            return <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-600">Vence em {diff}d</Badge>
        }
        return null
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
            {/* Header com seletor de clínica */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <Select value={selectedClinica} onValueChange={setSelectedClinica}>
                        <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="Selecione a clínica" />
                        </SelectTrigger>
                        <SelectContent>
                            {clinicas.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => openMovDialog('saida')}>
                        <Minus className="h-4 w-4 mr-2" />
                        Baixa
                    </Button>
                    <Button onClick={() => openMovDialog('entrada')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Entrada
                    </Button>
                </div>
            </div>

            {/* Cards de resumo */}
            <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total em Estoque</CardDescription>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <Boxes className="h-5 w-5 text-primary" />
                            {totalItens}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                        {estoquesFiltrados.length} itens diferentes
                    </CardContent>
                </Card>
                <Card className={itensEstoqueBaixo > 0 ? 'border-yellow-500/50' : ''}>
                    <CardHeader className="pb-2">
                        <CardDescription>Estoque Baixo</CardDescription>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <AlertTriangle className={`h-5 w-5 ${itensEstoqueBaixo > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                            {itensEstoqueBaixo}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                        abaixo de 5 unidades
                    </CardContent>
                </Card>
                <Card className={itensVencendo > 0 ? 'border-orange-500/50' : ''}>
                    <CardHeader className="pb-2">
                        <CardDescription>Vencendo em 30d</CardDescription>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <Calendar className={`h-5 w-5 ${itensVencendo > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                            {itensVencendo}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                        requerem atenção
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Valor em Estoque</CardDescription>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-green-500" />
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotalEstoque)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                        custo total
                    </CardContent>
                </Card>
            </div>

            {/* Mini gráfico de distribuição */}
            {topProdutos.length > 0 && (
                <Card className="mb-6">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Top 5 Produtos em Estoque
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {topProdutos.map((item, index) => {
                                const maxQtd = topProdutos[0]?.quantidade || 1
                                const percentage = (item.quantidade / maxQtd) * 100
                                return (
                                    <div key={item.id} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="truncate max-w-[200px]">
                                                {index + 1}. {item.produto?.nome}
                                            </span>
                                            <span className="font-mono text-muted-foreground">
                                                {item.quantidade} {item.unidade}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary rounded-full transition-all"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tabs: Estoque / Histórico */}
            <Tabs defaultValue="estoque">
                <TabsList>
                    <TabsTrigger value="estoque">
                        <Package className="h-4 w-4 mr-2" />
                        Estoque Atual
                    </TabsTrigger>
                    <TabsTrigger value="historico">
                        <History className="h-4 w-4 mr-2" />
                        Movimentações
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="estoque" className="mt-4">
                    <Card>
                        <CardContent className="p-0">
                            {estoquesFiltrados.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                    <p>Nenhum item em estoque nesta clínica</p>
                                    <Button variant="outline" className="mt-4" onClick={() => openMovDialog('entrada')}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Adicionar primeiro item
                                    </Button>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Produto</TableHead>
                                            <TableHead className="text-center">Quantidade</TableHead>
                                            <TableHead>Validade</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {estoquesFiltrados.map(estoque => (
                                            <TableRow key={estoque.id}>
                                                <TableCell>
                                                    <div className="font-medium">{estoque.produto?.nome}</div>
                                                    {estoque.produto?.dosagem_mg && (
                                                        <div className="text-xs text-muted-foreground">
                                                            {estoque.produto.dosagem_mg}mg
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge
                                                        variant={estoque.quantidade < 5 ? "destructive" : "secondary"}
                                                        className="text-sm font-mono"
                                                    >
                                                        {estoque.quantidade} {estoque.unidade}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {estoque.data_validade && (
                                                            <span className="text-sm">
                                                                {formatDate(estoque.data_validade)}
                                                            </span>
                                                        )}
                                                        {getValidadeBadge(estoque.data_validade)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setMovForm({
                                                                    ...initialMovimentacaoForm,
                                                                    estoque_id: estoque.id,
                                                                    tipo: 'saida'
                                                                })
                                                                setMovDialogOpen(true)
                                                            }}
                                                        >
                                                            <Minus className="h-3 w-3 mr-1" />
                                                            Baixa
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setMovForm({
                                                                    ...initialMovimentacaoForm,
                                                                    estoque_id: estoque.id,
                                                                    tipo: 'entrada'
                                                                })
                                                                setMovDialogOpen(true)
                                                            }}
                                                        >
                                                            <Plus className="h-3 w-3 mr-1" />
                                                            Entrada
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="historico" className="mt-4">
                    <Card>
                        <CardContent className="p-0">
                            {movimentacoes.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                    <p>Nenhuma movimentação registrada</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Data</TableHead>
                                            <TableHead>Produto</TableHead>
                                            <TableHead>Clínica</TableHead>
                                            <TableHead className="text-center">Tipo</TableHead>
                                            <TableHead className="text-right">Qtd</TableHead>
                                            <TableHead>Motivo</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {movimentacoes
                                            .filter(m => !selectedClinica || m.estoque?.clinica_id === selectedClinica)
                                            .slice(0, 20)
                                            .map(mov => (
                                                <TableRow key={mov.id}>
                                                    <TableCell className="text-sm">
                                                        {formatDate(mov.created_at)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {mov.estoque?.produto?.nome || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {mov.estoque?.clinica?.nome || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant={mov.tipo === 'entrada' ? 'default' : 'secondary'}>
                                                            {mov.tipo === 'entrada' ? (
                                                                <Plus className="h-3 w-3 mr-1" />
                                                            ) : (
                                                                <Minus className="h-3 w-3 mr-1" />
                                                            )}
                                                            {mov.tipo}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {mov.tipo === 'entrada' ? '+' : '-'}{mov.quantidade}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {mov.motivo || '-'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Dialog - Movimentação */}
            <Dialog open={movDialogOpen} onOpenChange={setMovDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {movForm.tipo === 'entrada' && 'Entrada de Estoque'}
                            {movForm.tipo === 'saida' && 'Baixa de Estoque'}
                            {movForm.tipo === 'ajuste' && 'Ajuste de Inventário'}
                        </DialogTitle>
                        <DialogDescription>
                            {movForm.tipo === 'entrada' && 'Registre a entrada de produtos no estoque'}
                            {movForm.tipo === 'saida' && 'Registre a saída de produtos do estoque'}
                            {movForm.tipo === 'ajuste' && 'Ajuste a quantidade para corrigir inventário'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {!movForm.estoque_id && (
                            <div className="grid gap-2">
                                <Label>Produto *</Label>
                                <Select
                                    value={movForm.produto_id}
                                    onValueChange={(v) => setMovForm({ ...movForm, produto_id: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o produto..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {produtos.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.nome} {p.dosagem_mg && `(${p.dosagem_mg}mg)`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label>Tipo de Movimentação</Label>
                            <Select
                                value={movForm.tipo}
                                onValueChange={(v: 'entrada' | 'saida' | 'ajuste') => setMovForm({ ...movForm, tipo: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="entrada">Entrada</SelectItem>
                                    <SelectItem value="saida">Saída</SelectItem>
                                    <SelectItem value="ajuste">Ajuste</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Quantidade *</Label>
                            <Input
                                type="number"
                                min="0"
                                step="1"
                                value={movForm.quantidade}
                                onChange={(e) => setMovForm({ ...movForm, quantidade: e.target.value })}
                                placeholder={movForm.tipo === 'ajuste' ? 'Quantidade final' : 'Quantidade'}
                            />
                        </div>

                        {movForm.tipo === 'entrada' && (
                            <div className="grid gap-2">
                                <Label>Data de Validade</Label>
                                <Input
                                    type="date"
                                    value={movForm.data_validade}
                                    onChange={(e) => setMovForm({ ...movForm, data_validade: e.target.value })}
                                />
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label>Motivo</Label>
                            <Select
                                value={movForm.motivo}
                                onValueChange={(v) => setMovForm({ ...movForm, motivo: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {movForm.tipo === 'entrada' && (
                                        <>
                                            <SelectItem value="Compra">Compra</SelectItem>
                                            <SelectItem value="Transferência">Transferência</SelectItem>
                                            <SelectItem value="Devolução">Devolução</SelectItem>
                                            <SelectItem value="Bonificação">Bonificação</SelectItem>
                                        </>
                                    )}
                                    {movForm.tipo === 'saida' && (
                                        <>
                                            <SelectItem value="Uso">Uso em procedimento</SelectItem>
                                            <SelectItem value="Perda">Perda/Quebra</SelectItem>
                                            <SelectItem value="Vencimento">Vencimento</SelectItem>
                                            <SelectItem value="Transferência">Transferência</SelectItem>
                                        </>
                                    )}
                                    {movForm.tipo === 'ajuste' && (
                                        <>
                                            <SelectItem value="Inventário">Correção de inventário</SelectItem>
                                            <SelectItem value="Erro sistema">Correção de erro</SelectItem>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Observações</Label>
                            <Textarea
                                value={movForm.observacoes}
                                onChange={(e) => setMovForm({ ...movForm, observacoes: e.target.value })}
                                placeholder="Observações adicionais..."
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMovDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveMovimentacao} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
