import { Bot, Users, Calendar, DollarSign, Activity, TrendingUp } from "lucide-react"

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">Visão geral da operação</p>
            </div>

            {/* Metric Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Total Pacientes"
                    value="1,245"
                    change="+12% este mês"
                    icon={Users}
                />
                <MetricCard
                    title="Agendamentos Hoje"
                    value="84"
                    change="15 aplicações"
                    icon={Calendar}
                />
                <MetricCard
                    title="Faturamento Mês"
                    value="R$ 142.500"
                    change="+8% vs anterior"
                    icon={DollarSign}
                />
                <MetricCard
                    title="AI Insights"
                    value="5"
                    change="pendentes"
                    icon={Bot}
                    highlight
                />
            </div>

            {/* Charts Section */}
            <div className="grid gap-4 lg:grid-cols-7">
                {/* Main Chart */}
                <div className="lg:col-span-4 rounded-xl border bg-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Evolução de Pacientes</h2>
                        <select className="text-sm bg-muted rounded-md px-2 py-1 border-none">
                            <option>Últimos 6 meses</option>
                            <option>Último ano</option>
                        </select>
                    </div>
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        {/* Chart placeholder - will be replaced with actual chart */}
                        <div className="text-center">
                            <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-30" />
                            <p>Gráfico de evolução será renderizado aqui</p>
                        </div>
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="lg:col-span-3 rounded-xl border bg-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Atividade Recente</h2>
                        <span className="text-xs text-primary">Real time</span>
                    </div>
                    <div className="space-y-4">
                        <ActivityItem
                            icon={Users}
                            iconBg="bg-blue-500/10 text-blue-500"
                            title="Novo Paciente Registrado"
                            description="Sarah Jones"
                            time="12 horas atrás"
                        />
                        <ActivityItem
                            icon={Activity}
                            iconBg="bg-red-500/10 text-red-500"
                            title="Alerta IA"
                            description="Resultado de exame anormal detectado"
                            time="13 horas atrás"
                        />
                        <ActivityItem
                            icon={Calendar}
                            iconBg="bg-purple-500/10 text-purple-500"
                            title="Consulta Confirmada"
                            description="Dr. Lee"
                            time="12 horas atrás"
                        />
                        <ActivityItem
                            icon={Bot}
                            iconBg="bg-primary/10 text-primary"
                            title="AI Insight"
                            description="3 pacientes com evolução excepcional"
                            time="14 horas atrás"
                        />
                    </div>
                </div>
            </div>

            {/* AI Assistant Button - Fixed position */}
            <button className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all ai-glow animate-pulse-glow flex items-center justify-center">
                <Bot className="h-6 w-6" />
            </button>
        </div>
    )
}

// Metric Card Component
function MetricCard({
    title,
    value,
    change,
    icon: Icon,
    highlight = false,
}: {
    title: string
    value: string
    change: string
    icon: React.ComponentType<{ className?: string }>
    highlight?: boolean
}) {
    return (
        <div className={`rounded-xl border bg-card p-6 ${highlight ? 'border-primary/50 ai-glow' : ''}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{title}</span>
                <Icon className={`h-4 w-4 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground mt-1">{change}</p>
        </div>
    )
}

// Activity Item Component
function ActivityItem({
    icon: Icon,
    iconBg,
    title,
    description,
    time,
}: {
    icon: React.ComponentType<{ className?: string }>
    iconBg: string
    title: string
    description: string
    time: string
}) {
    return (
        <div className="flex items-start gap-3">
            <div className={`h-8 w-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
                <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{title}</p>
                <p className="text-xs text-muted-foreground truncate">{description}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{time}</p>
            </div>
        </div>
    )
}
