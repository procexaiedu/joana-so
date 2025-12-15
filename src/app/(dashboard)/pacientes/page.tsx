'use client'

import { PacientesList } from "@/components/pacientes/pacientes-list"

export default function PacientesPage() {
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Pacientes</h1>
                <p className="text-muted-foreground">
                    Gerencie os pacientes da clínica
                </p>
            </div>

            {/* Content */}
            <PacientesList />
        </div>
    )
}
