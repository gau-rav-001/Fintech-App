import { useMemo, useState, type ReactNode } from "react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Calculator,
  TrendingUp,
  IndianRupee,
  Wallet,
  Sparkles,
  Target,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export function LumpsumCalculator() {
  const [investmentAmount, setInvestmentAmount] = useState(100000);
  const [expectedReturn, setExpectedReturn] = useState(12);
  const [timePeriod, setTimePeriod] = useState(10);

  const calculateLumpsum = () => {
    const rate = expectedReturn / 100;
    const futureValue = investmentAmount * Math.pow(1 + rate, timePeriod);
    const returns = futureValue - investmentAmount;

    return {
      futureValue: Math.round(futureValue),
      invested: Math.round(investmentAmount),
      returns: Math.round(returns),
    };
  };

  const result = useMemo(
    () => calculateLumpsum(),
    [investmentAmount, expectedReturn, timePeriod],
  );

  const chartData = useMemo(() => {
    const data = [];
    const rate = expectedReturn / 100;
    const useMonthlyView = timePeriod <= 3;

    data.push({
      label: useMonthlyView ? "M0" : "Y0",
      invested: Math.round(investmentAmount),
      totalValue: Math.round(investmentAmount),
      returns: 0,
    });

    if (useMonthlyView) {
      const monthlyRate = expectedReturn / 12 / 100;
      const totalMonths = timePeriod * 12;

      for (let month = 1; month <= totalMonths; month++) {
        const futureValue =
          investmentAmount * Math.pow(1 + monthlyRate, month);

        data.push({
          label: `M${month}`,
          invested: Math.round(investmentAmount),
          totalValue: Math.round(futureValue),
          returns: Math.round(futureValue - investmentAmount),
        });
      }
    } else {
      for (let year = 1; year <= timePeriod; year++) {
        const futureValue =
          investmentAmount * Math.pow(1 + rate, year);

        data.push({
          label: `Y${year}`,
          invested: Math.round(investmentAmount),
          totalValue: Math.round(futureValue),
          returns: Math.round(futureValue - investmentAmount),
        });
      }
    }

    return data;
  }, [investmentAmount, expectedReturn, timePeriod]);

  const pieData = [
    {
      name: "Invested",
      value: result.invested,
      color: "#2563EB",
    },
    {
      name: "Returns",
      value: result.returns,
      color: "#15803D",
    },
  ];

  const formatCurrency = (value: number) =>
    `₹${value.toLocaleString("en-IN")}`;

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-gray-900">
      <style>{`
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }

        input[type="range"]::-webkit-slider-runnable-track {
          height: 8px;
          border-radius: 9999px;
          background: linear-gradient(to right, #1A5F3D 0%, #2D7A4E 100%);
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          margin-top: -6px;
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          background: #ffffff;
          border: 3px solid #1A5F3D;
          box-shadow: 0 4px 12px rgba(26, 95, 61, 0.25);
          cursor: pointer;
        }

        input[type="range"]::-moz-range-track {
          height: 8px;
          border-radius: 9999px;
          background: linear-gradient(to right, #1A5F3D 0%, #2D7A4E 100%);
        }

        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          background: #ffffff;
          border: 3px solid #1A5F3D;
          box-shadow: 0 4px 12px rgba(26, 95, 61, 0.25);
          cursor: pointer;
        }
      `}</style>

      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#175c3c] via-[#1f7148] to-[#2d7a4e] text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-0 top-0 h-40 w-40 rounded-full bg-white blur-3xl" />
          <div className="absolute right-10 top-10 h-52 w-52 rounded-full bg-[#B8E986] blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
          <div className="grid lg:grid-cols-[1.3fr_0.9fr] gap-6 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur mb-4">
                <Sparkles className="w-4 h-4" />
                One-Time Investment Planner
              </div>

              <div className="flex items-start gap-4">
                <div className="hidden sm:flex h-14 w-14 rounded-2xl bg-white/12 items-center justify-center border border-white/10">
                  <Calculator className="w-7 h-7" />
                </div>

                <div>
                  <h1 className="text-3xl md:text-5xl font-bold leading-tight">
                    Lumpsum Calculator
                  </h1>
                  <p className="mt-3 max-w-2xl text-white/85 text-base md:text-lg leading-7">
                    Calculate the future value of a one-time
                    investment, track how compounding multiplies
                    your wealth over time.
                  </p>

                  <div className="flex flex-wrap gap-3 mt-5">
                    <QuickChip
                      label="₹1,00,000 invest"
                      onClick={() => setInvestmentAmount(100000)}
                    />
                    <QuickChip
                      label="12% return"
                      onClick={() => setExpectedReturn(12)}
                    />
                    <QuickChip
                      label="15 years"
                      onClick={() => setTimePeriod(15)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/15 bg-white/10 backdrop-blur-xl p-5 md:p-6 shadow-2xl">
              <p className="text-sm text-white/75 mb-1">
                Projected Future Value
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                {formatCurrency(result.futureValue)}
              </h2>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <MiniStat
                  title="Invested"
                  value={formatCurrency(result.invested)}
                />
                <MiniStat
                  title="Returns"
                  value={formatCurrency(result.returns)}
                />
              </div>

              <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
                <div>
                  <p className="text-xs text-white/70">
                    One-Time Investment
                  </p>
                  <p className="font-semibold text-lg">
                    {formatCurrency(investmentAmount)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main */}
      <section className="py-8 md:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid xl:grid-cols-12 gap-6">
            {/* Left */}
            <div className="xl:col-span-4">
              <div className="rounded-[28px] bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)] border border-gray-100 p-5 md:p-6 sticky top-6">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold">
                    Investment Details
                  </h3>
                  <p className="text-gray-500 mt-1 leading-6">
                    Adjust the values and instantly see your
                    estimated lumpsum maturity amount.
                  </p>
                </div>

                <div className="space-y-6">
                  <SliderInput
                    label="Investment Amount"
                    value={investmentAmount}
                    setValue={setInvestmentAmount}
                    min={1000}
                    max={10000000}
                    step={1000}
                    prefix="₹"
                  />

                  <SliderInput
                    label="Expected Return Rate"
                    value={expectedReturn}
                    setValue={setExpectedReturn}
                    min={1}
                    max={30}
                    step={0.5}
                    suffix="%"
                  />

                  <SliderInput
                    label="Time Period"
                    value={timePeriod}
                    setValue={setTimePeriod}
                    min={1}
                    max={40}
                    step={1}
                    suffix=" Years"
                  />
                </div>

                <div className="mt-7 space-y-3">
                  <ResultCard
                    title="Total Invested"
                    value={formatCurrency(result.invested)}
                    icon={<Wallet className="w-5 h-5" />}
                    tone="neutral"
                  />
                  <ResultCard
                    title="Estimated Returns"
                    value={formatCurrency(result.returns)}
                    icon={<TrendingUp className="w-5 h-5" />}
                    tone="success"
                  />
                  <ResultCard
                    title="Maturity Value"
                    value={formatCurrency(result.futureValue)}
                    icon={<IndianRupee className="w-5 h-5" />}
                    tone="primary"
                  />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button className="rounded-2xl bg-[#1A5F3D] text-white font-semibold py-3 px-4 hover:bg-[#154d32] transition">
                    Invest Now
                  </button>
                  <button className="rounded-2xl border border-gray-200 bg-gray-50 text-gray-700 font-semibold py-3 px-4 hover:bg-gray-100 transition">
                    Save Plan
                  </button>
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="xl:col-span-8 space-y-6">
              {/* Chart */}
              <div className="rounded-[28px] bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)] border border-gray-100 p-5 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-2xl font-bold">
                      Growth Projection
                    </h3>
                    <p className="text-gray-500 mt-1">
                      {timePeriod <= 3
                        ? "Month-by-month comparison of invested amount and total value."
                        : "Year-by-year comparison of invested amount and total value."}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#ECFDF3] border border-[#D1FADF] px-4 py-3 min-w-[180px]">
                    <p className="text-xs text-[#667085]">
                      Final Wealth Value
                    </p>
                    <p className="text-xl font-bold text-[#166534]">
                      {formatCurrency(result.futureValue)}
                    </p>
                  </div>
                </div>

                <div className="h-[360px] md:h-[420px] w-full rounded-2xl bg-gradient-to-b from-[#FCFDFC] to-[#F8FAFC] p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{
                        top: 16,
                        right: 16,
                        left: 8,
                        bottom: 8,
                      }}
                    >
                      <defs>
                        <linearGradient
                          id="investedGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#2563EB"
                            stopOpacity={0.28}
                          />
                          <stop
                            offset="100%"
                            stopColor="#2563EB"
                            stopOpacity={0.03}
                          />
                        </linearGradient>
                        <linearGradient
                          id="valueGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#15803D"
                            stopOpacity={0.34}
                          />
                          <stop
                            offset="100%"
                            stopColor="#15803D"
                            stopOpacity={0.04}
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        stroke="#E5E7EB"
                        strokeDasharray="4 4"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        minTickGap={timePeriod <= 3 ? 14 : 24}
                        tick={{ fill: "#6B7280", fontSize: 12 }}
                      />

                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        width={56}
                        tick={{ fill: "#6B7280", fontSize: 12 }}
                        tickFormatter={(value) =>
                          value >= 10000000
                            ? `${(value / 10000000).toFixed(1)}Cr`
                            : value >= 100000
                              ? `${(value / 100000).toFixed(1)}L`
                              : value >= 1000
                                ? `${Math.round(value / 1000)}k`
                                : `${value}`
                        }
                      />

                      <Tooltip content={<CustomTooltip />} />

                      <Area
                        type="monotone"
                        dataKey="invested"
                        name="Invested Amount"
                        stroke="#2563EB"
                        fill="url(#investedGradient)"
                        strokeWidth={2.5}
                        activeDot={{
                          r: 5,
                          fill: "#2563EB",
                          stroke: "#ffffff",
                          strokeWidth: 2,
                        }}
                      />

                      <Area
                        type="monotone"
                        dataKey="totalValue"
                        name="Total Value"
                        stroke="#15803D"
                        fill="url(#valueGradient)"
                        strokeWidth={3}
                        activeDot={{
                          r: 6,
                          fill: "#15803D",
                          stroke: "#ffffff",
                          strokeWidth: 2,
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <LegendPill
                    color="bg-blue-600"
                    label="Invested Amount"
                  />
                  <LegendPill
                    color="bg-green-700"
                    label="Total Value"
                  />
                </div>
              </div>

              {/* lower cards */}
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="rounded-[28px] bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)] border border-gray-100 p-5 md:p-6">
                  <h3 className="text-2xl font-bold">
                    Investment Breakdown
                  </h3>
                  <p className="text-gray-500 mt-1 mb-5">
                    See how much comes from your principal and
                    how much is generated as returns.
                  </p>

                  <div className="relative h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={78}
                          outerRadius={115}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {pieData.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={entry.color}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) =>
                            formatCurrency(value)
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full bg-white shadow-md border border-gray-100 h-28 w-28 flex flex-col items-center justify-center text-center">
                        <p className="text-[11px] text-gray-500 leading-4">
                          Total Value
                        </p>
                        <p className="text-sm font-bold text-gray-900 px-2 leading-5">
                          {formatCurrency(result.futureValue)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    {pieData.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: item.color,
                            }}
                          />
                          <span className="font-medium text-gray-700">
                            {item.name}
                          </span>
                        </div>
                        <span className="font-bold text-gray-900">
                          {formatCurrency(item.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)] border border-gray-100 p-5 md:p-6">
                  <h3 className="text-2xl font-bold">
                    Why Lumpsum Works
                  </h3>
                  <p className="text-gray-500 mt-1 mb-5">
                    A one-time investment lets your entire
                    capital benefit from compounding right from
                    day one.
                  </p>

                  <div className="space-y-4">
                    <FeatureCard
                      icon={<Target className="w-5 h-5" />}
                      title="Maximum Compounding Time"
                      description="Your entire principal starts compounding immediately from the day you invest."
                    />
                    <FeatureCard
                      icon={<TrendingUp className="w-5 h-5" />}
                      title="Higher Long-Term Returns"
                      description="Lumpsum investments can outperform SIPs when markets trend upward over time."
                    />
                    <FeatureCard
                      icon={<ShieldCheck className="w-5 h-5" />}
                      title="Ideal for Windfalls"
                      description="Perfect for deploying a bonus, inheritance, or any large one-time cash inflow."
                    />
                  </div>

                  <div className="mt-5 rounded-2xl bg-gradient-to-r from-[#F0FDF4] to-[#ECFDF3] border border-[#D1FADF] p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-[#166534] font-semibold">
                        Invest once, grow for decades
                      </p>
                      <p className="text-xs text-[#166534]/80 mt-1">
                        Time in the market beats timing the
                        market.
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shrink-0">
                      <ArrowRight className="w-5 h-5 text-[#166534]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* bottom info */}
              <div className="rounded-[28px] bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)] border border-gray-100 p-5 md:p-6">
                <h3 className="text-2xl font-bold mb-3">
                  What is a Lumpsum Investment?
                </h3>
                <p className="text-gray-600 leading-7">
                  A lumpsum investment is a one-time, single
                  large investment made in a mutual fund or
                  financial instrument. Unlike SIP, where you
                  invest small amounts regularly, lumpsum
                  investing puts your entire capital to work
                  from day one, maximising the power of
                  compounding over the chosen investment
                  horizon.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function SliderInput({
  label,
  value,
  setValue,
  min,
  max,
  step,
  prefix = "",
  suffix = "",
}: {
  label: string;
  value: number;
  setValue: (value: number) => void;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl bg-[#F8FAFC] border border-gray-100 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <label className="text-sm font-semibold text-gray-700">
          {label}
        </label>
        <div className="rounded-xl bg-white border border-gray-200 px-3 py-1.5 text-sm font-bold text-[#1A5F3D] shadow-sm">
          {prefix}
          {value.toLocaleString("en-IN")}
          {suffix}
        </div>
      </div>

      <div className="mb-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-full h-5 cursor-pointer appearance-none bg-transparent"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-gray-400">
          {prefix}
          {min.toLocaleString("en-IN")}
          {suffix}
        </span>

        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isNaN(next)) return;
            setValue(Math.min(max, Math.max(min, next)));
          }}
          className="w-28 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-[#1A5F3D]/20"
        />

        <span className="text-xs text-gray-400 text-right">
          {prefix}
          {max.toLocaleString("en-IN")}
          {suffix}
        </span>
      </div>
    </div>
  );
}

function ResultCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  tone: "neutral" | "success" | "primary";
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        tone === "primary"
          ? "bg-gradient-to-r from-[#1A5F3D] to-[#2D7A4E] border-transparent text-white shadow-lg"
          : tone === "success"
            ? "bg-[#F0FDF4] border-[#DCFCE7] text-gray-900"
            : "bg-[#F8FAFC] border-gray-100 text-gray-900"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p
            className={`text-sm mb-1 ${
              tone === "primary"
                ? "text-white/75"
                : "text-gray-500"
            }`}
          >
            {title}
          </p>
          <p className="text-2xl font-bold">{value}</p>
        </div>

        <div
          className={`h-11 w-11 rounded-xl flex items-center justify-center ${
            tone === "primary"
              ? "bg-white/10 text-white"
              : tone === "success"
                ? "bg-[#DCFCE7] text-[#166534]"
                : "bg-gray-100 text-gray-700"
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-[#FAFBFC] p-4 hover:shadow-sm transition">
      <div className="flex gap-4">
        <div className="h-11 w-11 rounded-xl bg-[#EAF7EF] text-[#1A5F3D] flex items-center justify-center shrink-0">
          {icon}
        </div>

        <div>
          <h4 className="font-bold text-gray-900 mb-1">
            {title}
          </h4>
          <p className="text-sm text-gray-600 leading-6">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function QuickChip({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20 transition"
    >
      {label}
    </button>
  );
}

function MiniStat({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 border border-white/5">
      <p className="text-xs text-white/70 mb-1">{title}</p>
      <p className="text-lg font-semibold leading-6">{value}</p>
    </div>
  );
}

function LegendPill({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      {label}
    </div>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const invested = payload.find(
    (item) => item.dataKey === "invested",
  )?.value;
  const totalValue = payload.find(
    (item) => item.dataKey === "totalValue",
  )?.value;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
      <p className="font-semibold text-gray-900 mb-2">
        {label}
      </p>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-6">
          <span className="text-blue-600 font-medium">
            Invested
          </span>
          <span className="font-semibold text-gray-900">
            ₹{invested?.toLocaleString("en-IN")}
          </span>
        </div>

        <div className="flex items-center justify-between gap-6">
          <span className="text-green-700 font-medium">
            Total Value
          </span>
          <span className="font-semibold text-gray-900">
            ₹{totalValue?.toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    </div>
  );
}
