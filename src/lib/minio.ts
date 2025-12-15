import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Cliente S3 compatível com MinIO
const s3Client = new S3Client({
    endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
    region: 'us-east-1', // MinIO não precisa de região real, mas a SDK exige
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || '',
        secretAccessKey: process.env.MINIO_SECRET_KEY || ''
    },
    forcePathStyle: true // Necessário para MinIO
})

const BUCKET_NAME = process.env.MINIO_BUCKET || 'joana-system'

export interface UploadResult {
    success: boolean
    url?: string
    key?: string
    error?: string
}

/**
 * Faz upload de um arquivo para o MinIO
 */
export async function uploadFile(
    file: Buffer | Uint8Array,
    key: string,
    contentType: string
): Promise<UploadResult> {
    try {
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: file,
            ContentType: contentType,
            ACL: 'public-read'
        }))

        // Montar URL pública
        const endpoint = process.env.MINIO_PUBLIC_URL || process.env.MINIO_ENDPOINT || 'http://localhost:9000'
        const url = `${endpoint}/${BUCKET_NAME}/${key}`

        return { success: true, url, key }
    } catch (error) {
        console.error('Erro no upload:', error)
        return { success: false, error: (error as Error).message }
    }
}

/**
 * Gera uma URL temporária assinada para upload direto do cliente
 */
export async function getPresignedUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType
    })

    return getSignedUrl(s3Client, command, { expiresIn })
}

/**
 * Gera uma URL temporária assinada para download
 */
export async function getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
    })

    return getSignedUrl(s3Client, command, { expiresIn })
}

/**
 * Deleta um arquivo do MinIO
 */
export async function deleteFile(key: string): Promise<boolean> {
    try {
        await s3Client.send(new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        }))
        return true
    } catch (error) {
        console.error('Erro ao deletar:', error)
        return false
    }
}

/**
 * Gera um nome de arquivo único para upload
 */
export function generateFileKey(folder: string, originalFilename: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const extension = originalFilename.split('.').pop() || 'jpg'
    return `${folder}/${timestamp}-${random}.${extension}`
}
