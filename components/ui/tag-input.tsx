'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { X } from 'lucide-react'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
  className?: string
  onCreateNew?: (value: string) => Promise<void> | void
  createNewLabel?: string
}

export function TagInput({ 
  value, 
  onChange, 
  suggestions = [], 
  placeholder = "Type and press Enter...",
  className = "",
  onCreateNew,
  createNewLabel = "Create new"
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter suggestions based on input and exclude already selected tags
  const filteredSuggestions = suggestions.filter(suggestion => 
    suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
    !value.includes(suggestion)
  )

  // Show "Create new" option if input doesn't match any existing suggestion
  const showCreateNew = onCreateNew && inputValue.trim() && 
    !suggestions.some(s => s.toLowerCase() === inputValue.toLowerCase())

  const allOptions = [...filteredSuggestions]
  if (showCreateNew) {
    allOptions.push(`${createNewLabel}: "${inputValue}"`)
  }

  useEffect(() => {
    setSelectedIndex(-1)
  }, [inputValue])

  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      
      if (selectedIndex >= 0 && selectedIndex < allOptions.length) {
        const selectedOption = allOptions[selectedIndex]
        
        if (selectedOption.startsWith(createNewLabel)) {
          // Create new item
          if (onCreateNew) {
            await onCreateNew(inputValue.trim())
          }
          addTag(inputValue.trim())
        } else {
          // Add existing suggestion
          addTag(selectedOption)
        }
      } else if (inputValue.trim()) {
        // Add the typed value
        if (showCreateNew && onCreateNew) {
          await onCreateNew(inputValue.trim())
        }
        addTag(inputValue.trim())
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
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag if input is empty
      onChange(value.slice(0, -1))
    }
  }

  const addTag = (tag: string) => {
    if (tag && !value.includes(tag)) {
      onChange([...value, tag])
    }
    setInputValue('')
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }

  const removeTag = (indexToRemove: number) => {
    onChange(value.filter((_, index) => index !== indexToRemove))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setShowSuggestions(newValue.length > 0)
  }

  const handleSuggestionClick = async (suggestion: string) => {
    if (suggestion.startsWith(createNewLabel)) {
      if (onCreateNew) {
        await onCreateNew(inputValue.trim())
      }
      addTag(inputValue.trim())
    } else {
      addTag(suggestion)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 min-h-[42px]">
        {value.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="hover:bg-blue-200 rounded-full p-0.5"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(inputValue.length > 0)}
          onBlur={() => {
            // Delay hiding suggestions to allow clicking
            setTimeout(() => setShowSuggestions(false), 150)
          }}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 outline-none bg-transparent min-w-[120px]"
        />
      </div>

      {showSuggestions && allOptions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {allOptions.map((option, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(option)}
              className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
                index === selectedIndex ? 'bg-blue-50 text-blue-700' : ''
              } ${option.startsWith(createNewLabel) ? 'font-medium text-green-700' : ''}`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  )
} 