import { NextRequest, NextResponse } from 'next/server'
import { deleteFile } from '@/lib/minio'

export async function DELETE(request: NextRequest) {
    try {
        const { key } = await request.json()

        if (!key) {
            return NextResponse.json({ error: 'Key não fornecida' }, { status: 400 })
        }

        const success = await deleteFile(key)

        if (!success) {
            return NextResponse.json({ error: 'Erro ao deletar arquivo' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Erro ao deletar:', error)
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
    }
}
