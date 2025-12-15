'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CatalogoTab } from "@/components/produtos/catalogo-tab"
import { EstoqueTab } from "@/components/produtos/estoque-tab"

export default function ProdutosPage() {
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Produtos e Estoque</h1>
                <p className="text-muted-foreground">
                    Gerencie o catálogo de produtos e controle o estoque por clínica
                </p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="catalogo" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
                    <TabsTrigger value="estoque">Estoque</TabsTrigger>
                </TabsList>

                <TabsContent value="catalogo">
                    <CatalogoTab />
                </TabsContent>

                <TabsContent value="estoque">
                    <EstoqueTab />
                </TabsContent>
            </Tabs>
        </div>
    )
}
