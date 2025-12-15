import { NextRequest, NextResponse } from 'next/server'
import { uploadFile } from '@/lib/minio'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const folder = (formData.get('folder') as string) || 'uploads'
        const entityId = formData.get('entityId') as string | null

        if (!file) {
            return NextResponse.json({ error: 'Arquivo não fornecido' }, { status: 400 })
        }

        // Validar tipo de arquivo (apenas imagens)
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Tipo de arquivo não permitido' }, { status: 400 })
        }

        // Validar tamanho (máximo 5MB)
        const maxSize = 5 * 1024 * 1024
        if (file.size > maxSize) {
            return NextResponse.json({ error: 'Arquivo muito grande (máximo 5MB)' }, { status: 400 })
        }

        // Converter para buffer
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Gerar nome do arquivo - usa entityId se fornecido, senão timestamp
        const extension = file.name.split('.').pop() || 'jpg'
        const filename = entityId
            ? `${entityId}.${extension}`
            : `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`
        const key = `${folder}/${filename}`

        const result = await uploadFile(buffer, key, file.type)

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            url: result.url,
            key: result.key
        })
    } catch (error) {
        console.error('Erro no upload:', error)
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
    }
}

