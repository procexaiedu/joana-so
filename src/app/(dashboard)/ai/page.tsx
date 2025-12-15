'use client'

import { Bot, Send, Plus, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useState } from "react"

export default function AIPage() {
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
        {
            role: 'assistant',
            content: 'Olá! Sou a Joana, sua assistente de IA. Como posso ajudar você hoje?\n\nPosso ajudar com:\n- Informações sobre pacientes\n- Agendamentos e agenda\n- Análise de dados\n- Dúvidas sobre o sistema'
        }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSend = async () => {
        if (!input.trim() || loading) return

        const userMessage = input.trim()
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMessage }])
        setLoading(true)

        // Simulated response - will be replaced with actual OpenRouter integration
        setTimeout(() => {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '🚧 A integração com OpenRouter será implementada na Fase 6.\n\nPor enquanto, este é um preview da interface do chat. Em breve você poderá:\n- Fazer perguntas sobre pacientes\n- Solicitar relatórios\n- Obter insights automáticos\n- E muito mais!'
            }])
            setLoading(false)
        }, 1000)
    }

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Bot className="h-8 w-8" />
                        IA Assistant
                    </h1>
                    <p className="text-muted-foreground">Chat inteligente integrado ao sistema</p>
                </div>
                <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Conversa
                </Button>
            </div>

            {/* Chat Container */}
            <div className="flex-1 flex gap-4">
                {/* Threads Sidebar */}
                <div className="w-64 rounded-xl border bg-card p-4 hidden lg:block">
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Conversas</h3>
                    <div className="space-y-2">
                        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                            <p className="text-sm font-medium truncate">Nova conversa</p>
                            <p className="text-xs text-muted-foreground">Agora</p>
                        </div>
                        <div className="p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                            <p className="text-sm font-medium truncate text-muted-foreground">Relatório mensal</p>
                            <p className="text-xs text-muted-foreground">2 dias atrás</p>
                        </div>
                        <div className="p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                            <p className="text-sm font-medium truncate text-muted-foreground">Análise pacientes</p>
                            <p className="text-xs text-muted-foreground">1 semana atrás</p>
                        </div>
                    </div>
                </div>

                {/* Main Chat */}
                <div className="flex-1 flex flex-col rounded-xl border bg-card overflow-hidden">
                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4 max-w-3xl mx-auto">
                            {messages.map((message, i) => (
                                <div
                                    key={i}
                                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {message.role === 'assistant' && (
                                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                                            <Bot className="h-4 w-4 text-primary-foreground" />
                                        </div>
                                    )}
                                    <div
                                        className={`rounded-2xl px-4 py-3 max-w-[80%] ${message.role === 'user'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted'
                                            }`}
                                    >
                                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                    </div>
                                    {message.role === 'user' && (
                                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                            <MessageSquare className="h-4 w-4" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {loading && (
                                <div className="flex gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                                        <Bot className="h-4 w-4 text-primary-foreground animate-pulse" />
                                    </div>
                                    <div className="rounded-2xl px-4 py-3 bg-muted">
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Input */}
                    <div className="p-4 border-t">
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSend() }}
                            className="flex gap-2 max-w-3xl mx-auto"
                        >
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Digite sua mensagem..."
                                className="flex-1"
                                disabled={loading}
                            />
                            <Button type="submit" disabled={loading || !input.trim()}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
