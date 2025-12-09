import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { filterCities } from "@/utils/indiaData";

export default function CityAutocomplete({ value, onChange, placeholder, error }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const wrapperRef = useRef(null);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);

    if (val.trim().length > 0) {
      const filtered = filterCities(val);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectCity = (cityItem) => {
    setInputValue(cityItem.city);
    onChange(cityItem.city);
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={error ? "border-red-500" : ""}
        onFocus={() => {
          if (inputValue.trim().length > 0) {
            const filtered = filterCities(inputValue);
            setSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
          }
        }}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectCity(item)}
              className="w-full px-4 py-2 text-left hover:bg-indigo-50 flex items-center justify-between border-b border-slate-100 last:border-0"
            >
              <span className="font-medium text-slate-800">{item.city}</span>
              <span className="text-sm text-slate-500">{item.state}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}