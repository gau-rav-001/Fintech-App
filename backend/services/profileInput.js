const { parseRupees } = require("./financialAmount");

const namePattern = /^[\p{L}\p{M}][\p{L}\p{M}\p{Zs}.'’-]*$/u;
const fields = new Set(["fullName", "dob", "gender", "occupation", "maritalStatus", "dependents", "city", "state", "country", "location", "income", "riskProfile", "mobile", "profilePicture", "expenses", "goals", "investments", "loans"]);
const itemMoney = {
  expenses: ["amount"],
  investments: ["investedAmount", "currentValue"],
  loans: ["outstandingAmount", "loanAmount", "emi"],
  goals: ["targetAmount", "currentSavings"],
};
function requireObject(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error(path + " must be an object.");
}
function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function money(record, key, required = false) {
  if (!(key in record) && !required) return;
  const amount = parseRupees(record[key]);
  if (amount === null || amount > 9999999999999.99) throw Error(key + " must be a valid rupee amount with up to two decimal places.");
  record[key] = amount;
}
function validatePhoto(value) {
  if (typeof value !== "string") return false;
  if (/^https:\/\//i.test(value) && value.length <= 2048) {
    try { return Boolean(new URL(value).hostname); } catch { return false; }
  }
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length > 350000) return false;
  const data = Buffer.from(match[2], "base64");
  if (data.length > 256 * 1024 || data.toString("base64") !== match[2]) return false;
  if (match[1] === "png") return data.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
  if (match[1] === "jpeg") return data.subarray(0, 3).toString("hex") === "ffd8ff";
  return data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP";
}
function validateProfile(input) {
  requireObject(input, "Profile");
  for (const key of ["location", "income", "riskProfile"]) {
    if (key in input) requireObject(input[key], key);
  }
  for (const key of Object.keys(input)) if (!fields.has(key)) throw Error("Unsupported profile field.");
  if ("fullName" in input && (typeof input.fullName !== "string" || input.fullName.length > 255 || !namePattern.test(input.fullName.trim()))) throw Error("Enter a valid full name.");
  if ("dob" in input) {
    const oldest = new Date();
    oldest.setUTCFullYear(oldest.getUTCFullYear() - 125);
    if (!validDate(input.dob) || input.dob > new Date().toISOString().slice(0,10) || input.dob < oldest.toISOString().slice(0,10)) throw Error("Enter a valid date of birth.");
  }
  if ("mobile" in input && input.mobile !== "" && !(typeof input.mobile === "string" && /^\+?[\d -]+$/.test(input.mobile) && /^\d{7,15}$/.test(input.mobile.replace(/\D/g, "")))) throw Error("Enter a valid mobile number.");
  if ("profilePicture" in input && !validatePhoto(input.profilePicture)) throw Error("Choose a PNG, JPEG or WebP image up to 256 KB.");
  if ("income" in input) {
    requireObject(input.income, "Income");
    money(input.income, "monthly");
    money(input.income, "additionalMonthly");
    if ("annualGrowthPct" in input.income && (!Number.isFinite(input.income.annualGrowthPct) || input.income.annualGrowthPct < 0 || input.income.annualGrowthPct > 100)) throw Error("Annual growth must be between 0 and 100.");
  }
  for (const [group, keys] of Object.entries(itemMoney)) {
    if (!(group in input)) continue;
    const rows = input[group];
    if (!Array.isArray(rows) || rows.length > 500) throw Error(group + " must contain at most 500 entries.");
    for (const row of rows) {
      requireObject(row, group);
      for (const key of keys) money(row, key, key === keys[0]);
      if (group === "goals" && (row.targetAmount <= 0 || (row.targetDate && !validDate(row.targetDate)))) throw Error("Enter a positive goal and valid target date.");
      for (const key of ["durationMonths", "remainingMonths"]) {
        if (key in row && (!Number.isInteger(row[key]) || row[key] < 0 || row[key] > 1200)) throw Error("Enter a valid tenure in months.");
      }
      for (const key of ["interestRate", "expectedReturn"]) {
        if (key in row && (!Number.isFinite(row[key]) || row[key] < (key === "expectedReturn" ? -100 : 0) || row[key] > 100)) throw Error("Enter a valid percentage.");
      }
      for (const value of Object.values(row)) if (typeof value === "string" && value.length > 255) throw Error("Financial item text exceeds 255 characters.");
    }
  }
  return true;
}
module.exports = { validateProfile, validatePhoto, validDate };
