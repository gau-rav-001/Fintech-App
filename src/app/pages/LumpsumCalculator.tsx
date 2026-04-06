import { useState } from "react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { useAuth } from "../auth/AuthContext";
import { getUserProfile, saveUserProfile } from "../data/userProfile";
import { syncProfileToFinancialData } from "../data/syncProfile";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Calculator, TrendingUp } from "lucide-react";

export function LumpsumCalculator() {
  const { user } = useAuth();
  const [investmentAmount, setInvestmentAmount] = useState(100000);
  const [expectedReturn, setExpectedReturn] = useState(12);
  const [timePeriod, setTimePeriod] = useState(10);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  function handleSavePlan() {
    if (!user) { setSavedToast("Please log in to save."); setTimeout(() => setSavedToast(null), 3000); return; }
    const up = getUserProfile(user.id);
    if (!up) return;
    const updated = {
      ...up,
      investments: [
        ...up.investments.filter(i => !i.id.startsWith("lump_")),
        {
          id: `lump_${Date.now()}`,
          type: "mutual_fund" as const,
          name: `Lumpsum — ₹${investmentAmount.toLocaleString("en-IN")}`,
          investedAmount: investmentAmount,
          currentValue: result.futureValue,
          durationMonths: timePeriod * 12,
          expectedReturn,
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    saveUserProfile(updated);
    syncProfileToFinancialData(updated);
    setSavedToast("Investment saved to your profile!");
    setTimeout(() => setSavedToast(null), 3000);
  }

  // Calculate Lumpsum returns
  const calculateLumpsum = () => {
    const rate = expectedReturn / 100;
    const futureValue = investmentAmount * Math.pow(1 + rate, timePeriod);
    const returns = futureValue - investmentAmount;

    return {
      futureValue: Math.round(futureValue),
      invested: investmentAmount,
      returns: Math.round(returns),
    };
  };

  const result = calculateLumpsum();

  // Generate chart data
  const generateChartData = () => {
    const data = [];
    for (let year = 0; year <= timePeriod; year++) {
      const rate = expectedReturn / 100;
      const futureValue = investmentAmount * Math.pow(1 + rate, year);

      data.push({
        year: year === 0 ? "Start" : `Year ${year}`,
        invested: investmentAmount,
        totalValue: Math.round(futureValue),
      });
    }
    return data;
  };

  const chartData = generateChartData();

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <Navbar />

      {/* Header */}
      <section className="bg-gradient-to-br from-[#2563EB] to-[#1E40AF] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center">
              <Calculator className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Lumpsum Calculator</h1>
              <p className="text-xl text-white/90 mt-2">
                Calculate returns on one-time investments
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Calculator Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Side - Inputs */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">Input Details</h3>

              <div className="space-y-8">
                {/* Investment Amount */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="font-medium text-gray-700">Total Investment</label>
                    <span className="font-bold text-[#2563EB]">₹{investmentAmount.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max="10000000"
                    step="10000"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>₹10,000</span>
                    <span>₹1,00,00,000</span>
                  </div>
                </div>

                {/* Expected Return Rate */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="font-medium text-gray-700">Expected Return Rate (p.a.)</label>
                    <span className="font-bold text-[#2563EB]">{expectedReturn}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="0.5"
                    value={expectedReturn}
                    onChange={(e) => setExpectedReturn(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>1%</span>
                    <span>30%</span>
                  </div>
                </div>

                {/* Time Period */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="font-medium text-gray-700">Time Period (Years)</label>
                    <span className="font-bold text-[#2563EB]">{timePeriod} Years</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="40"
                    step="1"
                    value={timePeriod}
                    onChange={(e) => setTimePeriod(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>1 Year</span>
                    <span>40 Years</span>
                  </div>
                </div>
              </div>

              {/* Results Summary */}
              <div className="mt-8 space-y-4">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Total Invested Amount</p>
                  <p className="text-2xl font-bold text-gray-900">₹{result.invested.toLocaleString()}</p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Estimated Returns</p>
                  <p className="text-2xl font-bold text-green-600">₹{result.returns.toLocaleString()}</p>
                </div>
                
                <div className="p-4 bg-gradient-to-r from-[#2563EB] to-[#1E40AF] rounded-xl text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/80 mb-1">Total Future Value</p>
                      <p className="text-3xl font-bold">₹{result.futureValue.toLocaleString()}</p>
                    </div>
                    <TrendingUp className="w-12 h-12 text-white/30" />
                  </div>
                </div>

                <button
                  onClick={handleSavePlan}
                  className="w-full mt-2 rounded-xl bg-[#1A5F3D] text-white font-semibold py-3 hover:bg-[#154d32] transition"
                >
                  Save Investment to Profile
                </button>
                {savedToast && (
                  <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800 font-medium text-center">
                    ✓ {savedToast}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Chart */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">Growth Projection</h3>

              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="year" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="invested"
                    stroke="#9CA3AF"
                    strokeWidth={2}
                    name="Invested Amount"
                    strokeDasharray="5 5"
                  />
                  <Line
                    type="monotone"
                    dataKey="totalValue"
                    stroke="#2563EB"
                    strokeWidth={3}
                    name="Total Value"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center mb-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full mr-2" />
                    <p className="text-sm text-gray-600">Principal</p>
                  </div>
                  <p className="text-xl font-bold text-gray-900">₹{result.invested.toLocaleString()}</p>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center mb-2">
                    <div className="w-3 h-3 bg-[#2563EB] rounded-full mr-2" />
                    <p className="text-sm text-gray-600">Interest</p>
                  </div>
                  <p className="text-xl font-bold text-gray-900">₹{result.returns.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-12 bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">What is Lumpsum Investment?</h3>
            <p className="text-gray-600 mb-4">
              A lumpsum investment is a one-time investment where you invest a large amount at once instead of spreading it over time. 
              This approach can be beneficial when you have a significant amount of capital available and want to take advantage of market opportunities.
            </p>
            <div className="grid md:grid-cols-3 gap-6 mt-6">
              <InfoCard
                title="Immediate Market Exposure"
                description="Benefit from market growth right away"
              />
              <InfoCard
                title="Compounding Benefits"
                description="Maximize returns through longer compounding period"
              />
              <InfoCard
                title="Suitable for Windfalls"
                description="Ideal for bonuses, inheritance, or large savings"
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function InfoCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
      <h4 className="font-bold text-gray-900 mb-2">{title}</h4>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}