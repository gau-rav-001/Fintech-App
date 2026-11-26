// ── Financial Calculation Utilities ───────────────────────────────────────────

// ── Compound Interest (Future Value) ──────────────────────────────────────────
// FV = PV × (1 + r)^n
function calculateFutureValue(principal, annualRate, years) {
  return principal * Math.pow(1 + annualRate / 100, years);
}

// ── SIP Future Value (Annuity) ────────────────────────────────────────────────
// FV = P × [((1 + r)^n - 1) / r] × (1 + r)
function calculateSIPFutureValue(monthlyAmount, annualRate, years) {
  const monthlyRate = annualRate / 100 / 12;
  const months = years * 12;
  return monthlyRate === 0 ? monthlyAmount * months
    : monthlyAmount * Math.expm1(months * Math.log1p(monthlyRate)) / monthlyRate;
}

// ── EMI Calculator ────────────────────────────────────────────────────────────
// EMI = [P × r × (1 + r)^n] / [(1 + r)^n - 1]
function calculateEMI(principal, annualRate, tenureMonths) {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / tenureMonths;
  return principal * monthlyRate / -Math.expm1(-tenureMonths * Math.log1p(monthlyRate));
}

// ── Present Value (PV) ────────────────────────────────────────────────────────
// PV = FV / (1 + r)^n
function calculatePresentValue(futureValue, annualRate, years) {
  return futureValue / Math.pow(1 + annualRate / 100, years);
}

// ── Lumpsum vs SIP Comparison ─────────────────────────────────────────────────
function compareLumpsumVsSIP(lumpsum, monthlyAmount, annualRate, years) {
  const lumpsumFV = calculateFutureValue(lumpsum, annualRate, years);
  const sipFV = calculateSIPFutureValue(monthlyAmount, annualRate, years);

  return {
    lumpsum: {
      invested: lumpsum,
      value: parseFloat(lumpsumFV.toFixed(2)),
      returns: parseFloat((lumpsumFV - lumpsum).toFixed(2)),
    },
    sip: {
      invested: monthlyAmount * years * 12,
      value: parseFloat(sipFV.toFixed(2)),
      returns: parseFloat((sipFV - monthlyAmount * years * 12).toFixed(2)),
    },
  };
}

// ── CAGR (Compound Annual Growth Rate) ────────────────────────────────────────
// CAGR = [(FV / PV)^(1/n) - 1] × 100
function calculateCAGR(initialValue, finalValue, years) {
  if (initialValue <= 0 || years <= 0) return 0;
  return (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100;
}

// ── Inflation Adjusted Return (Real Return) ───────────────────────────────────
// Real Return = [(1 + nominal) / (1 + inflation)] - 1
function calculateRealReturn(nominalRate, inflationRate) {
  return ((1 + nominalRate / 100) / (1 + inflationRate / 100) - 1) * 100;
}

// ── Tax-Adjusted Return ───────────────────────────────────────────────────────
// Post-tax return = Pre-tax return × (1 - tax rate)
function calculatePostTaxReturn(pretaxReturn, taxRate) {
  return pretaxReturn * (1 - taxRate / 100);
}

// ── Break-Even Point (for expenses) ───────────────────────────────────────────
function calculateBreakEven(fixedCosts, variableCostPerUnit, pricePerUnit) {
  const contribution = pricePerUnit - variableCostPerUnit;
  if (contribution <= 0) return Infinity;
  return fixedCosts / contribution;
}

// ── Loan Amortization Schedule (first N months) ───────────────────────────────
function generateAmortizationSchedule(principal, annualRate, tenureMonths, numMonths = 12) {
  const monthlyRate = annualRate / 100 / 12;
  const emi = calculateEMI(principal, annualRate, tenureMonths);
  let balance = principal;
  const schedule = [];

  for (let month = 1; month <= Math.min(numMonths, tenureMonths); month++) {
    const interest = balance * monthlyRate;
    const principalPaid = emi - interest;
    balance -= principalPaid;

    schedule.push({
      month,
      emi: parseFloat(emi.toFixed(2)),
      interest: parseFloat(interest.toFixed(2)),
      principal: parseFloat(principalPaid.toFixed(2)),
      balance: parseFloat(Math.max(0, balance).toFixed(2)),
    });
  }

  return schedule;
}

// ── Rule of 72 (Doubling Time) ────────────────────────────────────────────────
// Years to double = 72 / annual return rate
function ruleOf72(annualRate) {
  return annualRate > 0 ? 72 / annualRate : Infinity;
}

// ── Required Monthly SIP to reach goal ────────────────────────────────────────
function calculateRequiredSIP(targetAmount, years, annualRate) {
  return targetAmount / calculateSIPFutureValue(1, annualRate, years);
}

// ── Portfolio Weighted Average Return ─────────────────────────────────────────
function calculateWeightedReturn(holdings) {
  // holdings = [{ value, returnPct }, ...]
  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
  if (totalValue === 0) return 0;

  const weightedSum = holdings.reduce((sum, h) => {
    const weight = h.value / totalValue;
    return sum + weight * h.returnPct;
  }, 0);

  return weightedSum;
}

// ── Sharpe Ratio (Risk-Adjusted Return) ───────────────────────────────────────
// Sharpe = (Return - Risk-free rate) / Standard Deviation
function calculateSharpeRatio(portfolioReturn, riskFreeRate, stdDeviation) {
  if (stdDeviation === 0) return 0;
  return (portfolioReturn - riskFreeRate) / stdDeviation;
}

// ── Life Insurance Coverage Needed ─────────────────────────────────────────────
// Human Life Value approach
function calculateLifeInsuranceNeeded(
  annualIncome,
  yearsToRetirement,
  existingCoverage,
  liabilities
) {
  // Simple formula: 10-15x annual income + liabilities - existing coverage
  const multiplier = 12; // Conservative estimate
  const needed = annualIncome * multiplier + liabilities - existingCoverage;
  return Math.max(0, needed);
}

// ── Emergency Fund Target ─────────────────────────────────────────────────────
function calculateEmergencyFundTarget(monthlyExpenses, targetMonths = 6) {
  return monthlyExpenses * targetMonths;
}

// ── Retirement Corpus with Inflation ──────────────────────────────────────────
// How much needed at retirement to sustain monthly expense for N years
function calculateRetirementCorpusNeeded(
  monthlyExpense,
  yearsInRetirement,
  inflationRate,
  withdrawalRate
) {
  // Simplified: Adjust expense for inflation, then calculate corpus
  const annualExpense = monthlyExpense * 12;
  const inflationAdjusted = annualExpense * Math.pow(1 + inflationRate / 100, 1);
  const corpus = (inflationAdjusted * yearsInRetirement) / (withdrawalRate / 100);
  return corpus;
}

// ── Financial Independence Number ─────────────────────────────────────────────
// Amount needed to live off returns (4% rule)
function calculateFINumber(annualExpenses) {
  return annualExpenses * 25; // 4% safe withdrawal rate
}

// ── Asset Allocation by Age (Rule of Thumb) ───────────────────────────────────
// Equity % = 100 - age (or 120 - age for aggressive)
function suggestAssetAllocation(age, riskProfile = "moderate") {
  const multipliers = {
    conservative: 100,
    moderate: 110,
    aggressive: 120,
  };
  const equity = Math.max(0, Math.min(100, multipliers[riskProfile] - age));
  const debt = 100 - equity;

  return { equity, debt };
}

// ── Opportunity Cost ──────────────────────────────────────────────────────────
function calculateOpportunityCost(amount, years, returnRate) {
  // What you'd earn if invested instead of spending
  return calculateFutureValue(amount, returnRate, years) - amount;
}

// ── Debt Snowball (smallest to largest) ──────────────────────────────────────
function calculateDebtSnowball(debts, extraPayment = 0) {
  // debts = [{ name, balance, minPayment, rate }, ...]
  // Sort by balance (smallest first)
  const sorted = [...debts].sort((a, b) => a.balance - b.balance);

  const plan = sorted.map((debt, idx) => {
    const totalPayment = idx === 0 ? debt.minPayment + extraPayment : debt.minPayment;
    const monthsToPayoff = Math.ceil(debt.balance / totalPayment);

    return {
      name: debt.name,
      balance: debt.balance,
      payment: totalPayment,
      monthsToPayoff,
      order: idx + 1,
    };
  });

  return plan;
}

// ── Debt Avalanche (highest interest first) ──────────────────────────────────
function calculateDebtAvalanche(debts, extraPayment = 0) {
  // Sort by interest rate (highest first)
  const sorted = [...debts].sort((a, b) => b.rate - a.rate);

  const plan = sorted.map((debt, idx) => {
    const totalPayment = idx === 0 ? debt.minPayment + extraPayment : debt.minPayment;
    const monthsToPayoff = Math.ceil(debt.balance / totalPayment);

    return {
      name: debt.name,
      balance: debt.balance,
      rate: debt.rate,
      payment: totalPayment,
      monthsToPayoff,
      order: idx + 1,
    };
  });

  return plan;
}

// ── Monte Carlo Simulation (simplified) ──────────────────────────────────────
function runMonteCarloRetirement(
  currentCorpus,
  monthlySIP,
  years,
  avgReturn,
  stdDev,
  simulations = 1000
) {
  const results = [];

  for (let i = 0; i < simulations; i++) {
    let corpus = currentCorpus;
    for (let year = 0; year < years; year++) {
      // Random return based on normal distribution (simplified)
      const randomReturn = avgReturn + (Math.random() - 0.5) * 2 * stdDev;
      corpus = corpus * (1 + randomReturn / 100) + monthlySIP * 12;
    }
    results.push(corpus);
  }

  results.sort((a, b) => a - b);

  return {
    median: results[Math.floor(simulations / 2)],
    percentile10: results[Math.floor(simulations * 0.1)],
    percentile90: results[Math.floor(simulations * 0.9)],
    best: results[simulations - 1],
    worst: results[0],
  };
}

module.exports = {
  calculateFutureValue,
  calculateSIPFutureValue,
  calculateEMI,
  calculatePresentValue,
  compareLumpsumVsSIP,
  calculateCAGR,
  calculateRealReturn,
  calculatePostTaxReturn,
  calculateBreakEven,
  generateAmortizationSchedule,
  ruleOf72,
  calculateRequiredSIP,
  calculateWeightedReturn,
  calculateSharpeRatio,
  calculateLifeInsuranceNeeded,
  calculateEmergencyFundTarget,
  calculateRetirementCorpusNeeded,
  calculateFINumber,
  suggestAssetAllocation,
  calculateOpportunityCost,
  calculateDebtSnowball,
  calculateDebtAvalanche,
  runMonteCarloRetirement,
};
