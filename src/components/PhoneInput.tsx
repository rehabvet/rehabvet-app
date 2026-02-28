'use client';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  placeholder?: string;
}

/**
 * Singapore phone input with 🇸🇬 +65 prefix.
 * Stores and emits the full number string (e.g. "+65 90589285").
 * Strips the +65 prefix for the editable portion.
 */
export default function PhoneInput({ value, onChange, className = '', required, placeholder = '9123 4567' }: PhoneInputProps) {
  // Extract the local portion (after +65 prefix)
  const local = value.replace(/^\+65\s?/, '').replace(/^\+65/, '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and spaces
    const raw = e.target.value.replace(/[^\d\s]/g, '');
    onChange(raw ? `+65 ${raw}` : '');
  };

  return (
    <div className={`flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#EC6496] focus-within:border-[#EC6496] bg-white ${className}`}>
      {/* Country code prefix */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-50 border-r border-gray-300 shrink-0 select-none">
        <span className="text-base leading-none">🇸🇬</span>
        <span className="text-sm font-medium text-gray-700">+65</span>
        <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {/* Number input */}
      <input
        type="tel"
        inputMode="numeric"
        required={required}
        placeholder={placeholder}
        value={local}
        onChange={handleChange}
        className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent min-w-0"
      />
    </div>
  );
}
