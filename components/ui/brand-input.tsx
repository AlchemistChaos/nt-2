'use client'

import { useState } from 'react'
import { Brand } from '@/types'
import { useCreateBrand } from '@/lib/supabase/client-cache'

interface BrandInputProps {
  value: string | null
  onChange: (brandId: string | null, brandName: string | null) => void
  brands: Brand[]
  placeholder?: string
  className?: string
}

export function BrandInput({ 
  value, 
  onChange, 
  brands, 
  placeholder = "Type brand name...",
  className = ""
}: BrandInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const createBrand = useCreateBrand()

  // Get the current brand name for display
  const currentBrand = value ? brands.find(b => b.id === value) : null
  const displayValue = currentBrand ? currentBrand.name : ''

  // Filter suggestions based on input
  const filteredBrands = brands.filter(brand => 
    brand.name.toLowerCase().includes(inputValue.toLowerCase())
  )

  // Show "Create new brand" option if input doesn't match any existing brand
  const showCreateNew = inputValue.trim() && 
    !brands.some(b => b.name.toLowerCase() === inputValue.toLowerCase())

  const allOptions = [...filteredBrands]
  if (showCreateNew) {
    allOptions.push({ id: 'create-new', name: `Create brand: "${inputValue}"`, type: 'restaurant' } as Brand)
  }

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      
      if (selectedIndex >= 0 && selectedIndex < allOptions.length) {
        const selectedOption = allOptions[selectedIndex]
        
        if (selectedOption.id === 'create-new') {
          // Create new brand
          try {
            const newBrand = await createBrand.mutateAsync({
              name: inputValue.trim(),
              type: 'restaurant' // Default type, could be made configurable
            })
            onChange(newBrand.id, newBrand.name)
          } catch (error) {
            console.error('Error creating brand:', error)
          }
        } else {
          // Select existing brand
          onChange(selectedOption.id, selectedOption.name)
        }
        
        setInputValue('')
        setShowSuggestions(false)
        setSelectedIndex(-1)
      } else if (inputValue.trim() && showCreateNew) {
        // Create new brand with typed value
        try {
          const newBrand = await createBrand.mutateAsync({
            name: inputValue.trim(),
            type: 'restaurant'
          })
          onChange(newBrand.id, newBrand.name)
          setInputValue('')
          setShowSuggestions(false)
        } catch (error) {
          console.error('Error creating brand:', error)
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => 
        prev < allOptions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedIndex(-1)
    } else if (e.key === 'Backspace' && !inputValue && currentBrand) {
      // Clear selection if backspace on empty input
      onChange(null, null)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setShowSuggestions(newValue.length > 0)
    
    // Clear selection when typing
    if (currentBrand) {
      onChange(null, null)
    }
  }

  const handleSuggestionClick = async (brand: Brand) => {
    if (brand.id === 'create-new') {
      try {
        const newBrand = await createBrand.mutateAsync({
          name: inputValue.trim(),
          type: 'restaurant'
        })
        onChange(newBrand.id, newBrand.name)
      } catch (error) {
        console.error('Error creating brand:', error)
      }
    } else {
      onChange(brand.id, brand.name)
    }
    
    setInputValue('')
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }

  const handleClearBrand = () => {
    onChange(null, null)
    setInputValue('')
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        {currentBrand ? (
          <div className="flex items-center gap-2 p-2 border border-gray-300 rounded-md bg-blue-50">
            <span className="text-blue-800 font-medium">{currentBrand.name}</span>
            <button
              type="button"
              onClick={handleClearBrand}
              className="text-blue-600 hover:text-blue-800"
            >
              ✕
            </button>
          </div>
        ) : (
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(inputValue.length > 0)}
            onBlur={() => {
              // Delay hiding suggestions to allow clicking
              setTimeout(() => setShowSuggestions(false), 150)
            }}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      {showSuggestions && allOptions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {allOptions.map((brand, index) => (
            <button
              key={brand.id}
              type="button"
              onClick={() => handleSuggestionClick(brand)}
              className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
                index === selectedIndex ? 'bg-blue-50 text-blue-700' : ''
              } ${brand.id === 'create-new' ? 'font-medium text-green-700' : ''}`}
            >
              {brand.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
} 