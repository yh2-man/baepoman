import React, { useState, useEffect, useRef } from 'react';
import './AutocompleteSelect.css';
import Input from './Input';

const AutocompleteSelect = ({ options, value, onChange, placeholder = 'Search...', allOptionsLabel = null }) => {
  const [inputValue, setInputValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const componentRef = useRef(null);

  const allOptions = allOptionsLabel ? [allOptionsLabel, ...options] : options;

  const filteredOptions = allOptions.filter(option =>
    option.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Update internal input value when the external value changes
  useEffect(() => {
    if (value === allOptionsLabel) {
      setInputValue('');
    } else {
      setInputValue(value);
    }
  }, [value, allOptionsLabel]);

  // Handle clicks outside the component to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (componentRef.current && !componentRef.current.contains(event.target)) {
        setShowSuggestions(false);
        // If the user clicks away with an invalid value, reset it
        if (!allOptions.includes(inputValue)) {
          if (value === allOptionsLabel) {
            setInputValue('');
          } else {
            setInputValue(value);
          }
        }
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions, inputValue, value, allOptions, allOptionsLabel]);

  const handleSuggestionClick = (selectedValue) => {
    onChange(selectedValue);
    if (selectedValue === allOptionsLabel) {
      setInputValue('');
    } else {
      setInputValue(selectedValue);
    }
    setShowSuggestions(false);
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (newValue === '') {
      onChange(allOptionsLabel); // Empty input means 'All'
    } else {
      onChange(newValue);
    }

    if (!showSuggestions) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // A short delay to allow click events on suggestions to register
    setTimeout(() => {
      // If the current input is not a valid option and it's not an empty string (which is valid)
      if (!allOptions.includes(inputValue) && inputValue !== '') {
        // Reset to the last confirmed value
        if (value === allOptionsLabel) {
          setInputValue('');
        } else {
          setInputValue(value);
        }
      }
      setShowSuggestions(false);
    }, 150);
  };

  return (
    <div className="autocomplete-select" ref={componentRef}>
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setShowSuggestions(true)}
        onBlur={handleInputBlur}
        placeholder={placeholder}
      />
      {showSuggestions && (
        <div className="suggestions-panel">
          <ul className="suggestions-list">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <li key={option} onClick={() => handleSuggestionClick(option)}>
                  {option}
                </li>
              ))
            ) : (
              <li className="no-results">검색 결과가 없습니다.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AutocompleteSelect;
