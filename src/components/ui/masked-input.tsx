'use client'

import * as React from 'react'
import { IMaskInput } from 'react-imask'
import { cn } from '@/lib/utils'

// Máscaras predefinidas
export const MASKS: Record<string, string> = {
    cpf: '000.000.000-00',
    cnpj: '00.000.000/0000-00',
    telefone: '(00) 00000-0000',
    celular: '(00) 00000-0000',
    cep: '00000-000',
    rg: '00.000.000-0',
}

export interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    mask: keyof typeof MASKS | string
    onValueChange?: (value: string, unmaskedValue: string) => void
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
    ({ className, mask, onValueChange, value, ...props }, ref) => {
        // Resolve a máscara - pode ser um nome pré-definido ou uma string de máscara direta
        const resolvedMask = MASKS[mask as keyof typeof MASKS] || mask

        return (
            <IMaskInput
                mask={resolvedMask}
                value={value as string || ''}
                unmask={false}
                onAccept={(maskedValue: string, maskRef) => {
                    onValueChange?.(maskedValue, maskRef.unmaskedValue)
                }}
                className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                inputRef={ref as React.RefCallback<HTMLInputElement>}
                {...props}
            />
        )
    }
)
MaskedInput.displayName = 'MaskedInput'

export { MaskedInput }

