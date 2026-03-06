import React from 'react';
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
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg px-3 py-2 text-sm">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: entry.payload.color }}
        />
        <span className="font-medium text-gray-900 dark:text-white">
          {entry.name}
        </span>
      </div>
      <div className="text-gray-600 dark:text-gray-300">
        {formatPrice(entry.value)}
      </div>
      <div className="text-gray-400 dark:text-gray-500 text-xs">
        {pct}% du total
      </div>
    </div>
  );
}

/**
 * Custom center label rendered inside the donut
 */
function CenterLabel({ viewBox, total, isDark }) {
  const { cx, cy } = viewBox;
  return (
    <g>
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        dominantBaseline="central"
        className="text-[11px]"
        fill={isDark ? '#9ca3af' : '#6b7280'}
      >
        Total
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        dominantBaseline="central"
        className="text-[13px] font-semibold"
        fill={isDark ? '#ffffff' : '#111827'}
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
 * @param {boolean} isDark     - Dark mode flag
 * @param {string} couleur     - Accent colour (unused currently, reserved)
 */
export default function PriceDecomposition({
  fourniture,
  mainOeuvre,
  materiel,
  isDark = false,
  couleur = '#f97316',
}) {
  const total = (fourniture || 0) + (mainOeuvre || 0) + (materiel || 0);

  if (total === 0) return null;

  const data = [
    {
      name: 'Fourniture',
      value: fourniture || 0,
      color: '#f59e0b',
      lightBg: 'bg-amber-50',
      darkBg: 'bg-amber-900/20',
      label: 'F',
    },
    {
      name: "Main d'oeuvre",
      value: mainOeuvre || 0,
      color: '#3b82f6',
      lightBg: 'bg-blue-50',
      darkBg: 'bg-blue-900/20',
      label: 'MO',
    },
    {
      name: 'Matériel',
      value: materiel || 0,
      color: '#10b981',
      lightBg: 'bg-emerald-50',
      darkBg: 'bg-emerald-900/20',
      label: 'Mat',
    },
  ].filter((d) => d.value > 0);

  // ── Styling tokens ──────────────────────────────────────────────
  const bg = isDark ? 'bg-gray-700/50' : 'bg-gray-50';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const borderColor = isDark ? 'border-gray-600' : 'border-gray-200';

  return (
    <div className={`rounded-xl ${bg} p-4`}>
      {/* ── Section title ─────────────────────────────────────────── */}
      <h4 className={`text-sm font-semibold ${textPrimary} mb-3`}>
        Décomposition du prix
      </h4>

      {/* ── Donut chart ───────────────────────────────────────────── */}
      <ResponsiveContainer width="100%" height={180}>
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
              <Cell key={d.name} fill={d.color} />
            ))}

            {/* Center label showing total */}
            <Label
              content={<CenterLabel total={total} isDark={isDark} />}
              position="center"
            />
          </Pie>
          <Tooltip
            content={<ChartTooltip total={total} />}
            wrapperStyle={{ outline: 'none' }}
          />
        </PieChart>
      </ResponsiveContainer>

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
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: d.color }}
                    />
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
