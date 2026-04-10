/**
 * Select component — mirrors Input.jsx styling exactly.
 * Usage:
 *   <Select label="Category" value={val} onChange={fn} error={errors.category}>
 *     <option value="">Choose...</option>
 *     <option value="seed">Seed</option>
 *   </Select>
 */
const Select = ({ label, error, className = '', children, ...props }) => {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <select
        className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white ${
          error ? 'border-red-400' : 'border-gray-300'
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default Select;