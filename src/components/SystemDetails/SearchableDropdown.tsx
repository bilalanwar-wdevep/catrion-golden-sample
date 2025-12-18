import React, { useState, useRef, useEffect } from 'react'

interface DropdownOption {
  value: string
  label: string
}

interface SearchableDropdownProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  options: DropdownOption[]
  disabled?: boolean
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  label,
  value,
  onChange,
  placeholder,
  options,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (option: DropdownOption) => {
    onChange(option.value)
    setIsOpen(false)
    setSearchTerm('')
  }

  const selectedOption = options.find(option => option.value === value)

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full rounded-lg px-4 py-3 placeholder-gray-400 focus:outline-none text-left flex items-center justify-between transition-all duration-200 ${
            disabled 
              ? 'bg-[#0F1419] text-gray-500 cursor-not-allowed' 
              : 'bg-[#171C2A] text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer'
          }`}
        >
          <span className={`transition-colors duration-200 ${disabled ? 'text-gray-500' : (selectedOption ? 'text-white' : 'text-gray-400')}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg 
            className={`w-5 h-5 transition-all duration-200 ${disabled ? 'text-gray-600' : 'text-gray-400'} ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && !disabled && (
          <div className="absolute z-10 w-full mt-1 bg-[#171C2A] border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-gray-600">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#242835] text-white px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {/* Options List */}
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className="w-full text-left px-4 py-3 text-white hover:bg-[#242835] transition-colors flex items-center justify-between"
                  >
                    <span>{option.label}</span>
                    {value === option.value && (
                      <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-gray-400 text-sm">No options found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchableDropdown
