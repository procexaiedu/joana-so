'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from "@/lib/supabase/client"
import { Produto, Categoria } from "@/lib/types/database"
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
    Package,
    Plus,
    Search,
    Pencil,
    Trash2,
    Loader2,
    FolderTree,
    AlertCircle,
    Pill,
    Calendar,
    DollarSign,
    TrendingUp,
    Tag
} from "lucide-react"
import { toast } from "sonner"

interface CatalogoTabProps {
    className?: string
}

const initialProdutoForm = {
    nome: '',
    descricao: '',
    categoria_id: '',
    preco: '',
    dosagem_mg: '',
    duracao_minutos: '',
    requer_agendamento: false,
    requer_receita: false,
    ativo: true
}

const initialCategoriaForm = {
    nome: '',
    descricao: '',
    ordem: 0,
    ativo: true
}

export function CatalogoTab({ className }: CatalogoTabProps) {
    const [produtos, setProdutos] = useState<Produto[]>([])
    const [categorias, setCategorias] = useState<Categoria[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [categoriaFilter, setCategoriaFilter] = useState<string>('all')

    // Dialog states
    const [produtoDialogOpen, setProdutoDialogOpen] = useState(false)
    const [categoriaDialogOpen, setCategoriaDialogOpen] = useState(false)
    const [editingProduto, setEditingProduto] = useState<Produto | null>(null)
    const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null)
    const [produtoForm, setProdutoForm] = useState(initialProdutoForm)
    const [categoriaForm, setCategoriaForm] = useState(initialCategoriaForm)
    const [saving, setSaving] = useState(false)

    const supabase = createClient()

    const fetchData = useCallback(async () => {
        const [produtosRes, categoriasRes] = await Promise.all([
            supabase.from('produtos').select('*, categoria:categorias(*)').order('nome'),
            supabase.from('categorias').select('*').order('ordem').order('nome')
        ])

        if (produtosRes.error) {
            toast.error('Erro ao carregar produtos')
            console.error(produtosRes.error)
        } else {
            setProdutos(produtosRes.data || [])
        }

        if (categoriasRes.error) {
            toast.error('Erro ao carregar categorias')
            console.error(categoriasRes.error)
        } else {
            setCategorias(categoriasRes.data || [])
        }

        setLoading(false)
    }, [supabase])

    useEffect(() => {
        fetchData()

        // Realtime subscription
        const channel = supabase
            .channel('catalogo-changes')
            .on('postgres_changes', { event: '*', schema: 'drluisfarjallat', table: 'produtos' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'drluisfarjallat', table: 'categorias' }, fetchData)
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, fetchData])

    // Filtrar produtos
    const filteredProdutos = produtos.filter(p => {
        const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategoria = categoriaFilter === 'all' || p.categoria_id === categoriaFilter
        return matchesSearch && matchesCategoria
    })

    // Handlers Produto
    const openProdutoDialog = (produto?: Produto) => {
        if (produto) {
            setEditingProduto(produto)
            setProdutoForm({
                nome: produto.nome,
                descricao: produto.descricao || '',
                categoria_id: produto.categoria_id || '',
                preco: produto.preco.toString(),
                dosagem_mg: produto.dosagem_mg?.toString() || '',
                duracao_minutos: produto.duracao_minutos?.toString() || '',
                requer_agendamento: produto.requer_agendamento,
                requer_receita: produto.requer_receita,
                ativo: produto.ativo
            })
        } else {
            setEditingProduto(null)
            setProdutoForm(initialProdutoForm)
        }
        setProdutoDialogOpen(true)
    }

    const handleSaveProduto = async () => {
        if (!produtoForm.nome || !produtoForm.preco) {
            toast.error('Nome e preço são obrigatórios')
            return
        }

        setSaving(true)
        try {
            const payload = {
                nome: produtoForm.nome,
                descricao: produtoForm.descricao || null,
                categoria_id: produtoForm.categoria_id || null,
                preco: parseFloat(produtoForm.preco),
                dosagem_mg: produtoForm.dosagem_mg ? parseFloat(produtoForm.dosagem_mg) : null,
                duracao_minutos: produtoForm.duracao_minutos ? parseInt(produtoForm.duracao_minutos) : null,
                requer_agendamento: produtoForm.requer_agendamento,
                requer_receita: produtoForm.requer_receita,
                ativo: produtoForm.ativo,
                updated_at: new Date().toISOString()
            }

            if (editingProduto) {
                const { error } = await supabase
                    .from('produtos')
                    .update(payload)
                    .eq('id', editingProduto.id)
                if (error) throw error
                toast.success('Produto atualizado!')
            } else {
                const { error } = await supabase
                    .from('produtos')
                    .insert(payload)
                if (error) throw error
                toast.success('Produto criado!')
            }

            setProdutoDialogOpen(false)
            setProdutoForm(initialProdutoForm)
            setEditingProduto(null)
        } catch (error) {
            console.error(error)
            toast.error('Erro ao salvar produto')
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteProduto = async (produto: Produto) => {
        if (!confirm(`Tem certeza que deseja excluir "${produto.nome}"?`)) return

        const { error } = await supabase
            .from('produtos')
            .delete()
            .eq('id', produto.id)

        if (error) {
            toast.error('Erro ao excluir produto')
            console.error(error)
        } else {
            toast.success('Produto excluído!')
        }
    }

    // Handlers Categoria
    const openCategoriaDialog = (categoria?: Categoria) => {
        if (categoria) {
            setEditingCategoria(categoria)
            setCategoriaForm({
                nome: categoria.nome,
                descricao: categoria.descricao || '',
                ordem: categoria.ordem,
                ativo: categoria.ativo
            })
        } else {
            setEditingCategoria(null)
            setCategoriaForm(initialCategoriaForm)
        }
        setCategoriaDialogOpen(true)
    }

    const handleSaveCategoria = async () => {
        if (!categoriaForm.nome) {
            toast.error('Nome é obrigatório')
            return
        }

        setSaving(true)
        try {
            const payload = {
                nome: categoriaForm.nome,
                descricao: categoriaForm.descricao || null,
                ordem: categoriaForm.ordem,
                ativo: categoriaForm.ativo
            }

            if (editingCategoria) {
                const { error } = await supabase
                    .from('categorias')
                    .update(payload)
                    .eq('id', editingCategoria.id)
                if (error) throw error
                toast.success('Categoria atualizada!')
            } else {
                const { error } = await supabase
                    .from('categorias')
                    .insert(payload)
                if (error) throw error
                toast.success('Categoria criada!')
            }

            setCategoriaDialogOpen(false)
            setCategoriaForm(initialCategoriaForm)
            setEditingCategoria(null)
        } catch (error) {
            console.error(error)
            toast.error('Erro ao salvar categoria')
        } finally {
            setSaving(false)
        }
    }

    // Formatar preço
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value)
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
            {/* KPIs do Catálogo */}
            <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total de Produtos</CardDescription>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <Package className="h-5 w-5 text-primary" />
                            {produtos.filter(p => p.ativo).length}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                        {produtos.filter(p => !p.ativo).length} inativos
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Categorias Ativas</CardDescription>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <Tag className="h-5 w-5 text-violet-500" />
                            {categorias.filter(c => c.ativo).length}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                        de {categorias.length} total
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Preço Médio</CardDescription>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-green-500" />
                            {formatCurrency(
                                produtos.length > 0
                                    ? produtos.reduce((sum, p) => sum + p.preco, 0) / produtos.length
                                    : 0
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                        entre {formatCurrency(Math.min(...produtos.map(p => p.preco)))} e {formatCurrency(Math.max(...produtos.map(p => p.preco)))}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Itens c/ Agendamento</CardDescription>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-blue-500" />
                            {produtos.filter(p => p.requer_agendamento).length}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                        {produtos.filter(p => p.requer_receita).length} requerem receita
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-4">
                {/* Sidebar - Categorias */}
                <Card className="lg:col-span-1">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <FolderTree className="h-4 w-4" />
                                Categorias
                            </CardTitle>
                            <Button size="sm" variant="ghost" onClick={() => openCategoriaDialog()}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <button
                            onClick={() => setCategoriaFilter('all')}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${categoriaFilter === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                                }`}
                        >
                            Todas ({produtos.length})
                        </button>
                        {categorias.map(cat => {
                            const count = produtos.filter(p => p.categoria_id === cat.id).length
                            return (
                                <div key={cat.id} className="flex items-center group">
                                    <button
                                        onClick={() => setCategoriaFilter(cat.id)}
                                        className={`flex-1 text-left px-3 py-2 rounded-md text-sm transition-colors ${categoriaFilter === cat.id
                                            ? 'bg-primary text-primary-foreground'
                                            : 'hover:bg-muted'
                                            } ${!cat.ativo ? 'opacity-50' : ''}`}
                                    >
                                        {cat.nome} ({count})
                                    </button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                                        onClick={() => openCategoriaDialog(cat)}
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>

                {/* Main - Produtos */}
                <Card className="lg:col-span-3">
                    <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Produtos
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 w-[200px]"
                                    />
                                </div>
                                <Button onClick={() => openProdutoDialog()}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Novo Produto
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {filteredProdutos.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                <p>Nenhum produto encontrado</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Produto</TableHead>
                                        <TableHead>Categoria</TableHead>
                                        <TableHead className="text-right">Preço</TableHead>
                                        <TableHead>Flags</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredProdutos.map(produto => (
                                        <TableRow key={produto.id} className={!produto.ativo ? 'opacity-50' : ''}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {produto.dosagem_mg && (
                                                        <Pill className="h-4 w-4 text-primary" />
                                                    )}
                                                    <div>
                                                        <div className="font-medium">{produto.nome}</div>
                                                        {produto.dosagem_mg && (
                                                            <div className="text-xs text-muted-foreground">
                                                                {produto.dosagem_mg}mg
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {produto.categoria?.nome || 'Sem categoria'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(produto.preco)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {produto.requer_receita && (
                                                        <Badge variant="destructive" className="text-xs">
                                                            <AlertCircle className="h-3 w-3 mr-1" />
                                                            Receita
                                                        </Badge>
                                                    )}
                                                    {produto.requer_agendamento && (
                                                        <Badge variant="default" className="text-xs bg-blue-600 hover:bg-blue-700">
                                                            <Calendar className="h-3 w-3 mr-1" />
                                                            Agendar
                                                        </Badge>
                                                    )}
                                                    {!produto.ativo && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            Inativo
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => openProdutoDialog(produto)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteProduto(produto)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
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
            </div>

            {/* Dialog - Produto */}
            <Dialog open={produtoDialogOpen} onOpenChange={setProdutoDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingProduto ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
                        <DialogDescription>
                            {editingProduto ? 'Atualize os dados do produto' : 'Adicione um novo produto ao catálogo'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="nome">Nome *</Label>
                            <Input
                                id="nome"
                                value={produtoForm.nome}
                                onChange={(e) => setProdutoForm({ ...produtoForm, nome: e.target.value })}
                                placeholder="Nome do produto"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="descricao">Descrição</Label>
                            <Textarea
                                id="descricao"
                                value={produtoForm.descricao}
                                onChange={(e) => setProdutoForm({ ...produtoForm, descricao: e.target.value })}
                                placeholder="Descrição do produto"
                                rows={2}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="categoria">Categoria</Label>
                                <Select
                                    value={produtoForm.categoria_id}
                                    onValueChange={(v) => setProdutoForm({ ...produtoForm, categoria_id: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categorias.filter(c => c.ativo).map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.nome}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="preco">Preço *</Label>
                                <Input
                                    id="preco"
                                    type="number"
                                    step="0.01"
                                    value={produtoForm.preco}
                                    onChange={(e) => setProdutoForm({ ...produtoForm, preco: e.target.value })}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="dosagem">Dosagem (mg)</Label>
                                <Input
                                    id="dosagem"
                                    type="number"
                                    value={produtoForm.dosagem_mg}
                                    onChange={(e) => setProdutoForm({ ...produtoForm, dosagem_mg: e.target.value })}
                                    placeholder="Ex: 5"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="duracao">Duração (min)</Label>
                                <Input
                                    id="duracao"
                                    type="number"
                                    value={produtoForm.duracao_minutos}
                                    onChange={(e) => setProdutoForm({ ...produtoForm, duracao_minutos: e.target.value })}
                                    placeholder="Ex: 30"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Requer Receita</Label>
                                    <p className="text-xs text-muted-foreground">Precisa de receita médica</p>
                                </div>
                                <Switch
                                    checked={produtoForm.requer_receita}
                                    onCheckedChange={(v) => setProdutoForm({ ...produtoForm, requer_receita: v })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Requer Agendamento</Label>
                                    <p className="text-xs text-muted-foreground">Precisa agendar para consumir</p>
                                </div>
                                <Switch
                                    checked={produtoForm.requer_agendamento}
                                    onCheckedChange={(v) => setProdutoForm({ ...produtoForm, requer_agendamento: v })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Ativo</Label>
                                    <p className="text-xs text-muted-foreground">Disponível para venda</p>
                                </div>
                                <Switch
                                    checked={produtoForm.ativo}
                                    onCheckedChange={(v) => setProdutoForm({ ...produtoForm, ativo: v })}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setProdutoDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveProduto} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingProduto ? 'Salvar' : 'Criar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog - Categoria */}
            <Dialog open={categoriaDialogOpen} onOpenChange={setCategoriaDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
                        <DialogDescription>
                            {editingCategoria ? 'Atualize os dados da categoria' : 'Adicione uma nova categoria'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="cat-nome">Nome *</Label>
                            <Input
                                id="cat-nome"
                                value={categoriaForm.nome}
                                onChange={(e) => setCategoriaForm({ ...categoriaForm, nome: e.target.value })}
                                placeholder="Nome da categoria"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="cat-descricao">Descrição</Label>
                            <Textarea
                                id="cat-descricao"
                                value={categoriaForm.descricao}
                                onChange={(e) => setCategoriaForm({ ...categoriaForm, descricao: e.target.value })}
                                placeholder="Descrição opcional"
                                rows={2}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="cat-ordem">Ordem</Label>
                                <Input
                                    id="cat-ordem"
                                    type="number"
                                    value={categoriaForm.ordem}
                                    onChange={(e) => setCategoriaForm({ ...categoriaForm, ordem: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="flex items-center justify-between pt-6">
                                <Label>Ativa</Label>
                                <Switch
                                    checked={categoriaForm.ativo}
                                    onCheckedChange={(v) => setCategoriaForm({ ...categoriaForm, ativo: v })}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCategoriaDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveCategoria} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingCategoria ? 'Salvar' : 'Criar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
