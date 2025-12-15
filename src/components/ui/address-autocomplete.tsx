'use client'

import * as React from 'react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { MapPin, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PlacePrediction {
    place_id: string
    description: string
    structured_formatting: {
        main_text: string
        secondary_text: string
    }
}

interface AddressAutocompleteProps {
    value: string
    onChange: (value: string, googleMapsUrl?: string) => void
    placeholder?: string
    className?: string
    id?: string
}

// Carregar o script do Google Places dinamicamente
function useGooglePlacesScript(apiKey: string | undefined) {
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!apiKey) {
            setError('API Key do Google não configurada')
            return
        }

        // Verificar se já está carregado
        if (window.google?.maps?.places) {
            setLoaded(true)
            return
        }

        // Verificar se o script já existe
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
        if (existingScript) {
            existingScript.addEventListener('load', () => setLoaded(true))
            return
        }

        // Criar e adicionar o script
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
        script.async = true
        script.defer = true
        script.onload = () => setLoaded(true)
        script.onerror = () => setError('Erro ao carregar Google Maps')
        document.head.appendChild(script)

        return () => {
            // Não remover o script para evitar recarregar
        }
    }, [apiKey])

    return { loaded, error }
}

export function AddressAutocomplete({
    value,
    onChange,
    placeholder = 'Digite o endereço...',
    className,
    id
}: AddressAutocompleteProps) {
    const [inputValue, setInputValue] = useState(value)
    const [suggestions, setSuggestions] = useState<PlacePrediction[]>([])
    const [loading, setLoading] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)

    // Ler API key diretamente (NEXT_PUBLIC_* está disponível no cliente)
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    const inputRef = useRef<HTMLInputElement>(null)
    const suggestionsRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<NodeJS.Timeout | null>(null)
    const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
    const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)

    const { loaded, error } = useGooglePlacesScript(apiKey)

    // Atualizar inputValue quando value mudar externamente
    useEffect(() => {
        setInputValue(value)
    }, [value])

    // Inicializar serviços do Google Places quando o script carregar
    useEffect(() => {
        if (loaded && window.google?.maps?.places) {
            autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
            // Criar um elemento dummy para o PlacesService
            const dummyDiv = document.createElement('div')
            placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv)
        }
    }, [loaded])

    // Fechar sugestões ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                suggestionsRef.current &&
                !suggestionsRef.current.contains(event.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(event.target as Node)
            ) {
                setShowSuggestions(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Buscar sugestões do Google Places API
    const searchAddresses = useCallback(async (query: string) => {
        if (query.length < 3 || !autocompleteServiceRef.current) {
            setSuggestions([])
            return
        }

        setLoading(true)
        try {
            autocompleteServiceRef.current.getPlacePredictions(
                {
                    input: query,
                    componentRestrictions: { country: 'br' }, // Restringir ao Brasil
                    // Sem restrição de types = retorna endereços + estabelecimentos
                },
                (predictions, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                        setSuggestions(predictions.map(p => ({
                            place_id: p.place_id,
                            description: p.description,
                            structured_formatting: {
                                main_text: p.structured_formatting?.main_text || '',
                                secondary_text: p.structured_formatting?.secondary_text || ''
                            }
                        })))
                    } else {
                        setSuggestions([])
                    }
                    setLoading(false)
                }
            )
        } catch (err) {
            console.error('Erro ao buscar endereços:', err)
            setSuggestions([])
            setLoading(false)
        }
    }, [])

    // Handler de input com debounce
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setInputValue(newValue)
        setShowSuggestions(true)
        setSelectedIndex(-1)

        // Debounce de 300ms para evitar muitas requisições
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }
        debounceRef.current = setTimeout(() => {
            searchAddresses(newValue)
        }, 300)
    }

    // Selecionar uma sugestão
    const handleSelectSuggestion = (prediction: PlacePrediction) => {
        setInputValue(prediction.description)
        setSuggestions([])
        setShowSuggestions(false)

        // Buscar detalhes do lugar para obter coordenadas
        if (placesServiceRef.current) {
            placesServiceRef.current.getDetails(
                { placeId: prediction.place_id, fields: ['geometry', 'formatted_address'] },
                (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
                        const lat = place.geometry.location.lat()
                        const lng = place.geometry.location.lng()
                        const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
                        onChange(prediction.description, googleMapsUrl)
                    } else {
                        // Fallback: usar URL de busca
                        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(prediction.description)}`
                        onChange(prediction.description, googleMapsUrl)
                    }
                }
            )
        } else {
            const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(prediction.description)}`
            onChange(prediction.description, googleMapsUrl)
        }
    }

    // Navegação por teclado
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions || suggestions.length === 0) return

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1))
                break
            case 'ArrowUp':
                e.preventDefault()
                setSelectedIndex(prev => Math.max(prev - 1, -1))
                break
            case 'Enter':
                e.preventDefault()
                if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                    handleSelectSuggestion(suggestions[selectedIndex])
                }
                break
            case 'Escape':
                setShowSuggestions(false)
                break
        }
    }

    // Ao perder foco, atualizar o valor
    const handleBlur = () => {
        // Delay para permitir clique na sugestão
        setTimeout(() => {
            if (inputValue !== value) {
                onChange(inputValue)
            }
        }, 200)
    }

    // Se não tem API key, mostrar mensagem
    if (!apiKey) {
        return (
            <div className="relative">
                <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id={id}
                        type="text"
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.target.value)
                            onChange(e.target.value)
                        }}
                        placeholder={placeholder}
                        className={cn("pl-9", className)}
                    />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY para autocomplete
                </p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="relative">
                <Input
                    id={id}
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value)
                        onChange(e.target.value)
                    }}
                    placeholder={placeholder}
                    className={className}
                />
                <p className="text-xs text-destructive mt-1">{error}</p>
            </div>
        )
    }

    return (
        <div className="relative">
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    ref={inputRef}
                    id={id}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => inputValue.length >= 3 && setShowSuggestions(true)}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    className={cn("pl-9 pr-9", className)}
                    autoComplete="off"
                />
                {loading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
            </div>

            {/* Dropdown de sugestões */}
            {showSuggestions && suggestions.length > 0 && (
                <div
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md overflow-hidden"
                >
                    {suggestions.map((prediction, index) => (
                        <button
                            key={prediction.place_id}
                            type="button"
                            className={cn(
                                "w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-start gap-2 transition-colors",
                                selectedIndex === index && "bg-accent"
                            )}
                            onClick={() => handleSelectSuggestion(prediction)}
                        >
                            <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                            <div className="flex flex-col">
                                <span className="font-medium">
                                    {prediction.structured_formatting.main_text}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {prediction.structured_formatting.secondary_text}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
