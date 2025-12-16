'use client'

import { Settings } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ParametrosTab, ClinicasTab, HorariosTab, AgendasTab } from "@/components/configuracoes"

export default function ConfiguracoesPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Settings className="h-8 w-8" />
                    Configurações
                </h1>
                <p className="text-muted-foreground">
                    Gerencie parâmetros do sistema, clínicas, horários e agendas
                </p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="parametros" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
                    <TabsTrigger value="parametros">Parâmetros</TabsTrigger>
                    <TabsTrigger value="clinicas">Clínicas</TabsTrigger>
                    <TabsTrigger value="horarios">Horários</TabsTrigger>
                    <TabsTrigger value="agendas">Agendas</TabsTrigger>
                </TabsList>

                <TabsContent value="parametros" className="mt-6">
                    <ParametrosTab />
                </TabsContent>

                <TabsContent value="clinicas" className="mt-6">
                    <ClinicasTab />
                </TabsContent>

                <TabsContent value="horarios" className="mt-6">
                    <HorariosTab />
                </TabsContent>

                <TabsContent value="agendas" className="mt-6">
                    <AgendasTab />
                </TabsContent>
            </Tabs>
        </div>
    )
}

