import type { DMNModel } from '../../../types/dmn'

// Colorado SNAP Eligibility Model
// Based on FY 2025 values (October 2024 - September 2025)
// Colorado uses Broad-Based Categorical Eligibility (BBCE) with 200% FPL gross income limit
// Sources:
// - https://cdhs.colorado.gov/snap
// - https://www.fns.usda.gov/snap/fy-2025-cola
// - https://snapbenefitcalculator.com/colorado-snap-income-limits/

export const sampleSnapModel: DMNModel = {
  id: 'snap_eligibility_colorado',
  name: 'Colorado SNAP Eligibility',
  namespace: 'https://example.org/snap/colorado',
  description:
    'Determines SNAP (food stamps) eligibility and benefit amount for Colorado households (FY 2025)',
  inputs: [
    {
      id: 'householdSize',
      name: 'Household Size',
      typeRef: 'number',
      description: 'Number of people in the household (1-8+)',
    },
    {
      id: 'grossMonthlyIncome',
      name: 'Gross Monthly Income',
      typeRef: 'number',
      description: 'Total gross monthly income before any deductions',
    },
    {
      id: 'earnedIncome',
      name: 'Earned Income',
      typeRef: 'number',
      description: 'Monthly income from employment (subset of gross income)',
    },
    {
      id: 'dependentCareCosts',
      name: 'Dependent Care Costs',
      typeRef: 'number',
      description: 'Monthly costs for care of a child or disabled adult',
    },
    {
      id: 'shelterCosts',
      name: 'Shelter Costs',
      typeRef: 'number',
      description: 'Monthly rent/mortgage, utilities, and housing costs',
    },
    {
      id: 'childSupportPaid',
      name: 'Child Support Paid',
      typeRef: 'number',
      description: 'Legally obligated child support payments made',
    },
    {
      id: 'medicalExpenses',
      name: 'Medical Expenses',
      typeRef: 'number',
      description:
        'Out-of-pocket medical expenses for elderly/disabled members',
    },
    {
      id: 'hasElderlyOrDisabled',
      name: 'Has Elderly Or Disabled',
      typeRef: 'boolean',
      description: 'Household has member age 60+ or receiving disability',
    },
    {
      id: 'isHomeless',
      name: 'Is Homeless',
      typeRef: 'boolean',
      description: 'Household lacks fixed, regular nighttime residence',
    },
    {
      id: 'meetsNonFinancialRequirements',
      name: 'Meets Non Financial Requirements',
      typeRef: 'boolean',
      description:
        'Meets citizenship, residency, work registration, and SSN requirements',
    },
  ],
  businessKnowledgeModels: [
    {
      id: 'netIncomeLimitLookup',
      name: 'Net Income Limit',
      description: 'Net monthly income limit (100% FPL) by household size',
      variable: {
        name: 'Net Income Limit',
        typeRef: 'number',
      },
      parameters: [{ name: 'size', typeRef: 'number' }],
      expression: {
        id: 'nil-expr',
        // FY 2025 100% FPL values
        text: `if size = 1 then 1255
else if size = 2 then 1704
else if size = 3 then 2152
else if size = 4 then 2600
else if size = 5 then 3049
else if size = 6 then 3497
else if size = 7 then 3945
else if size = 8 then 4394
else 4394 + (size - 8) * 449`,
      },
      expressionType: 'literal',
    },
    {
      id: 'grossIncomeLimitLookup',
      name: 'Gross Income Limit',
      description:
        'Gross monthly income limit (200% FPL for Colorado BBCE) by household size',
      variable: {
        name: 'Gross Income Limit',
        typeRef: 'number',
      },
      parameters: [{ name: 'size', typeRef: 'number' }],
      expression: {
        id: 'gil-expr',
        // FY 2025 200% FPL values (Colorado BBCE)
        text: `if size = 1 then 2510
else if size = 2 then 3408
else if size = 3 then 4304
else if size = 4 then 5200
else if size = 5 then 6098
else if size = 6 then 6994
else if size = 7 then 7890
else if size = 8 then 8788
else 8788 + (size - 8) * 898`,
      },
      expressionType: 'literal',
    },
    {
      id: 'standardDeductionLookup',
      name: 'Standard Deduction',
      description: 'Standard deduction amount by household size (FY 2025)',
      variable: {
        name: 'Standard Deduction',
        typeRef: 'number',
      },
      parameters: [{ name: 'size', typeRef: 'number' }],
      expression: {
        id: 'sd-expr',
        // FY 2025 standard deductions for 48 states + DC
        text: `if size <= 3 then 204
else if size = 4 then 217
else if size = 5 then 254
else 291`,
      },
      expressionType: 'literal',
    },
    {
      id: 'maxAllotmentLookup',
      name: 'Max Allotment',
      description: 'Maximum SNAP benefit by household size (FY 2025)',
      variable: {
        name: 'Max Allotment',
        typeRef: 'number',
      },
      parameters: [{ name: 'size', typeRef: 'number' }],
      expression: {
        id: 'ma-expr',
        // FY 2025 maximum allotments
        text: `if size = 1 then 292
else if size = 2 then 536
else if size = 3 then 768
else if size = 4 then 975
else if size = 5 then 1158
else if size = 6 then 1390
else if size = 7 then 1536
else if size = 8 then 1756
else 1756 + (size - 8) * 220`,
      },
      expressionType: 'literal',
    },
  ],
  constants: [
    {
      id: '_const_earned_income_deduction_rate',
      name: 'EARNED_INCOME_DEDUCTION_RATE',
      value: 0.2,
      type: 'number',
      description: '20% of earned income is deducted',
      category: 'Deductions',
    },
    {
      id: '_const_medical_expense_threshold',
      name: 'MEDICAL_EXPENSE_THRESHOLD',
      value: 35,
      type: 'number',
      description:
        'Medical expenses above this amount are deductible (elderly/disabled only)',
      category: 'Deductions',
    },
    {
      id: '_const_shelter_deduction_cap',
      name: 'SHELTER_DEDUCTION_CAP',
      value: 712,
      type: 'number',
      description:
        'Maximum excess shelter deduction for non-elderly/disabled households',
      category: 'Deductions',
    },
    {
      id: '_const_homeless_shelter_deduction',
      name: 'HOMELESS_SHELTER_DEDUCTION',
      value: 190.3,
      type: 'number',
      description: 'Standard shelter deduction for homeless households',
      category: 'Deductions',
    },
    {
      id: '_const_benefit_reduction_rate',
      name: 'BENEFIT_REDUCTION_RATE',
      value: 0.3,
      type: 'number',
      description: '30% of net income reduces benefit amount',
      category: 'Benefit Calculation',
    },
    {
      id: '_const_minimum_benefit',
      name: 'MINIMUM_BENEFIT',
      value: 23,
      type: 'number',
      description: 'Minimum monthly benefit for 1-2 person households',
      category: 'Benefit Calculation',
    },
  ],
  decisions: [
    // === ELIGIBILITY TESTS ===
    {
      id: 'grossIncomeTest',
      name: 'Gross Income Test',
      description:
        'Passes if gross income is at or below 200% FPL (Colorado BBCE)',
      variable: {
        name: 'Gross Income Test',
        typeRef: 'boolean',
      },
      informationRequirements: [
        { id: 'git-1', type: 'input', href: 'householdSize' },
        { id: 'git-2', type: 'input', href: 'grossMonthlyIncome' },
      ],
      knowledgeRequirements: [{ id: 'git-k1', href: 'grossIncomeLimitLookup' }],
      expression: {
        id: 'git-expr',
        text: 'Gross Monthly Income <= Gross Income Limit(Household Size)',
        typeRef: 'boolean',
      },
    },
    {
      id: 'netIncomeTest',
      name: 'Net Income Test',
      description: 'Passes if net income is at or below 100% FPL',
      variable: {
        name: 'Net Income Test',
        typeRef: 'boolean',
      },
      informationRequirements: [
        { id: 'nit-1', type: 'input', href: 'householdSize' },
        { id: 'nit-2', type: 'decision', href: 'netMonthlyIncome' },
      ],
      knowledgeRequirements: [{ id: 'nit-k1', href: 'netIncomeLimitLookup' }],
      expression: {
        id: 'nit-expr',
        text: 'Net Monthly Income <= Net Income Limit(Household Size)',
        typeRef: 'boolean',
      },
    },

    // === DEDUCTION CALCULATIONS ===
    {
      id: 'standardDeduction',
      name: 'Standard Deduction',
      description: 'Standard deduction based on household size',
      variable: {
        name: 'Standard Deduction',
        typeRef: 'number',
      },
      informationRequirements: [
        { id: 'sd-1', type: 'input', href: 'householdSize' },
      ],
      knowledgeRequirements: [{ id: 'sd-k1', href: 'standardDeductionLookup' }],
      expression: {
        id: 'sd-expr',
        text: 'Standard Deduction(Household Size)',
        typeRef: 'number',
      },
    },
    {
      id: 'earnedIncomeDeduction',
      name: 'Earned Income Deduction',
      description: '20% deduction of earned income',
      variable: {
        name: 'Earned Income Deduction',
        typeRef: 'number',
      },
      informationRequirements: [
        { id: 'eid-1', type: 'input', href: 'earnedIncome' },
      ],
      knowledgeRequirements: [],
      expression: {
        id: 'eid-expr',
        text: 'Earned Income * EARNED_INCOME_DEDUCTION_RATE',
        typeRef: 'number',
      },
    },
    {
      id: 'medicalDeduction',
      name: 'Medical Deduction',
      description:
        'Medical expenses over $35/month for elderly/disabled households',
      variable: {
        name: 'Medical Deduction',
        typeRef: 'number',
      },
      informationRequirements: [
        { id: 'md-1', type: 'input', href: 'medicalExpenses' },
        { id: 'md-2', type: 'input', href: 'hasElderlyOrDisabled' },
      ],
      knowledgeRequirements: [],
      expression: {
        id: 'md-expr',
        text: `if Has Elderly Or Disabled and Medical Expenses > MEDICAL_EXPENSE_THRESHOLD
then Medical Expenses - MEDICAL_EXPENSE_THRESHOLD
else 0`,
        typeRef: 'number',
      },
    },
    {
      id: 'adjustedIncomeBeforeShelter',
      name: 'Adjusted Income Before Shelter',
      description: 'Income after all deductions except shelter',
      variable: {
        name: 'Adjusted Income Before Shelter',
        typeRef: 'number',
      },
      informationRequirements: [
        { id: 'aibs-1', type: 'input', href: 'grossMonthlyIncome' },
        { id: 'aibs-2', type: 'input', href: 'dependentCareCosts' },
        { id: 'aibs-3', type: 'input', href: 'childSupportPaid' },
        { id: 'aibs-4', type: 'decision', href: 'standardDeduction' },
        { id: 'aibs-5', type: 'decision', href: 'earnedIncomeDeduction' },
        { id: 'aibs-6', type: 'decision', href: 'medicalDeduction' },
      ],
      knowledgeRequirements: [],
      expression: {
        id: 'aibs-expr',
        text: `max(0, Gross Monthly Income - Standard Deduction - Earned Income Deduction - Dependent Care Costs - Medical Deduction - Child Support Paid)`,
        typeRef: 'number',
      },
    },
    {
      id: 'excessShelterDeduction',
      name: 'Excess Shelter Deduction',
      description: 'Shelter costs exceeding 50% of adjusted income',
      variable: {
        name: 'Excess Shelter Deduction',
        typeRef: 'number',
      },
      informationRequirements: [
        { id: 'esd-1', type: 'input', href: 'shelterCosts' },
        { id: 'esd-2', type: 'input', href: 'hasElderlyOrDisabled' },
        { id: 'esd-3', type: 'input', href: 'isHomeless' },
        { id: 'esd-4', type: 'decision', href: 'adjustedIncomeBeforeShelter' },
      ],
      knowledgeRequirements: [],
      expression: {
        id: 'esd-expr',
        text: `if Is Homeless then HOMELESS_SHELTER_DEDUCTION
else if Has Elderly Or Disabled then max(0, Shelter Costs - Adjusted Income Before Shelter * 0.5)
else min(SHELTER_DEDUCTION_CAP, max(0, Shelter Costs - Adjusted Income Before Shelter * 0.5))`,
        typeRef: 'number',
      },
    },
    {
      id: 'netMonthlyIncome',
      name: 'Net Monthly Income',
      description: 'Final net income after all deductions',
      variable: {
        name: 'Net Monthly Income',
        typeRef: 'number',
      },
      informationRequirements: [
        { id: 'nmi-1', type: 'decision', href: 'adjustedIncomeBeforeShelter' },
        { id: 'nmi-2', type: 'decision', href: 'excessShelterDeduction' },
      ],
      knowledgeRequirements: [],
      expression: {
        id: 'nmi-expr',
        text: 'max(0, Adjusted Income Before Shelter - Excess Shelter Deduction)',
        typeRef: 'number',
      },
    },

    // === FINAL ELIGIBILITY ===
    {
      id: 'snapEligible',
      name: 'SNAP Eligible',
      description: 'Final eligibility: must pass all tests',
      variable: {
        name: 'SNAP Eligible',
        typeRef: 'boolean',
      },
      informationRequirements: [
        { id: 'se-1', type: 'input', href: 'meetsNonFinancialRequirements' },
        { id: 'se-2', type: 'decision', href: 'grossIncomeTest' },
        { id: 'se-3', type: 'decision', href: 'netIncomeTest' },
      ],
      knowledgeRequirements: [],
      expression: {
        id: 'se-expr',
        text: 'Meets Non Financial Requirements and Gross Income Test and Net Income Test',
        typeRef: 'boolean',
      },
    },

    // === BENEFIT CALCULATION ===
    {
      id: 'calculatedBenefit',
      name: 'Calculated Benefit',
      description: 'Raw benefit before minimum/eligibility adjustments',
      variable: {
        name: 'Calculated Benefit',
        typeRef: 'number',
      },
      informationRequirements: [
        { id: 'cb-1', type: 'input', href: 'householdSize' },
        { id: 'cb-2', type: 'decision', href: 'netMonthlyIncome' },
      ],
      knowledgeRequirements: [{ id: 'cb-k1', href: 'maxAllotmentLookup' }],
      expression: {
        id: 'cb-expr',
        text: 'max(0, Max Allotment(Household Size) - Net Monthly Income * BENEFIT_REDUCTION_RATE)',
        typeRef: 'number',
      },
    },
    {
      id: 'benefitAmount',
      name: 'Benefit Amount',
      description: 'Final monthly SNAP benefit (0 if not eligible)',
      variable: {
        name: 'Benefit Amount',
        typeRef: 'number',
      },
      informationRequirements: [
        { id: 'ba-1', type: 'input', href: 'householdSize' },
        { id: 'ba-2', type: 'decision', href: 'snapEligible' },
        { id: 'ba-3', type: 'decision', href: 'calculatedBenefit' },
      ],
      knowledgeRequirements: [],
      expression: {
        id: 'ba-expr',
        text: `if not(SNAP Eligible) then 0
else if Household Size <= 2 and Calculated Benefit < MINIMUM_BENEFIT then MINIMUM_BENEFIT
else Calculated Benefit`,
        typeRef: 'number',
      },
    },
  ],
}
