const Card = ({ title, value, icon, color = 'green', subtitle }) => {
  const colors = {
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm font-semibold mt-1">{title}</p>
      {subtitle && <p className="text-xs mt-0.5 opacity-70">{subtitle}</p>}
    </div>
  );
};

export default Card;
