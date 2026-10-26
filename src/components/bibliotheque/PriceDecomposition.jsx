import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Label } from 'recharts';

/**
 * Format a number as EUR currency (French locale)
 * @param {number} amount
 * @returns {string}
 */
const formatPrice = (amount) => {
  if (amount == null) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Custom tooltip for the pie chart
 */
function ChartTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0;

  return (
    <div className="bg-surface border border-bord rounded-lg shadow-e2 px-3 py-2 text-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${entry.payload.point}`} />
        <span className="font-medium text-encre">
          {entry.name}
        </span>
      </div>
      <div className="text-encre-2">
        {formatPrice(entry.value)}
      </div>
      <div className="text-encre-3 text-xs">
        {pct}% du total
      </div>
    </div>
  );
}

/**
 * Custom center label rendered inside the donut
 */
function CenterLabel({ viewBox, total }) {
  const { cx, cy } = viewBox;
  return (
    <g>
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs fill-encre-3"
      >
        Total
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        dominantBaseline="central"
        className="text-sm font-semibold fill-encre"
      >
        {formatPrice(total)}
      </text>
    </g>
  );
}

/**
 * PriceDecomposition - Displays the price breakdown of a BTP ouvrage
 * using a recharts donut chart and a summary table.
 *
 * @param {number} fourniture  - Cost of supplies
 * @param {number} mainOeuvre  - Cost of labour
 * @param {number} materiel    - Cost of equipment
 */
export default function PriceDecomposition({
  fourniture,
  mainOeuvre,
  materiel,
}) {
  const total = (fourniture || 0) + (mainOeuvre || 0) + (materiel || 0);

  if (total === 0) return null;

  const data = [
    {
      name: 'Fourniture',
      value: fourniture || 0,
      fill: 'fill-alerte-point',
      point: 'bg-alerte-point',
      label: 'F',
    },
    {
      name: "Main d'oeuvre",
      value: mainOeuvre || 0,
      fill: 'fill-info-point',
      point: 'bg-info-point',
      label: 'MO',
    },
    {
      name: 'Matériel',
      value: materiel || 0,
      fill: 'fill-succes-point',
      point: 'bg-succes-point',
      label: 'Mat',
    },
  ].filter((d) => d.value > 0);

  // ── Styling tokens ──────────────────────────────────────────────
  const bg = 'bg-fond';
  const textPrimary = 'text-encre';
  const textSecondary = 'text-encre-3';
  const borderColor = 'border-bord';

  return (
    <div className={`rounded-xl ${bg} p-4`}>
      {/* ── Section title ─────────────────────────────────────────── */}
      <h4 className={`text-sm font-semibold ${textPrimary} mb-3`}>
        Décomposition du prix
      </h4>

      {/* ── Donut chart ───────────────────────────────────────────── */}
      <div style={{ width: '100%', height: 180, minWidth: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((d) => (
                <Cell key={d.name} className={d.fill} />
              ))}

              {/* Center label showing total */}
              <Label
                content={<CenterLabel total={total} />}
                position="center"
              />
            </Pie>
            <Tooltip
              content={<ChartTooltip total={total} />}
              wrapperStyle={{ outline: 'none' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* ── Summary table ─────────────────────────────────────────── */}
      <table className="w-full mt-3 text-sm">
        <thead>
          <tr className={`border-b ${borderColor}`}>
            <th className={`text-left pb-2 font-medium ${textSecondary}`}>
              Composante
            </th>
            <th className={`text-right pb-2 font-medium ${textSecondary}`}>
              Montant
            </th>
            <th className={`text-right pb-2 font-medium ${textSecondary} w-16`}>
              %
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => {
            const pct = ((d.value / total) * 100).toFixed(1);
            return (
              <tr
                key={d.name}
                className={`border-b last:border-b-0 ${borderColor}`}
              >
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${d.point}`} />
                    <span className={textPrimary}>{d.name}</span>
                  </div>
                </td>
                <td className={`py-2 text-right font-medium ${textPrimary}`}>
                  {formatPrice(d.value)}
                </td>
                <td className={`py-2 text-right ${textSecondary}`}>
                  {pct}%
                </td>
              </tr>
            );
          })}
        </tbody>

        {/* Total row */}
        <tfoot>
          <tr className={`border-t ${borderColor}`}>
            <td className={`pt-2 font-semibold ${textPrimary}`}>Total</td>
            <td className={`pt-2 text-right font-semibold ${textPrimary}`}>
              {formatPrice(total)}
            </td>
            <td className={`pt-2 text-right font-semibold ${textSecondary}`}>
              100%
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
