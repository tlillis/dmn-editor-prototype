import type { DMNModel } from '../../../types/dmn'

export const sampleSnapModel: DMNModel = {
  id: 'snap_eligibility',
  name: 'SNAP Eligibility Determination',
  namespace: 'https://example.org/snap',
  description: 'Determines SNAP (food stamps) eligibility and benefit amount',
  inputs: [
    {
      id: 'householdSize',
      name: 'Household Size',
      typeRef: 'number',
      description: 'Number of people in the household',
    },
    {
      id: 'grossMonthlyIncome',
      name: 'Gross Monthly Income',
      typeRef: 'number',
      description: 'Total gross monthly income before deductions',
    },
    {
      id: 'earnedIncome',
      name: 'Earned Income',
      typeRef: 'number',
      description: 'Income from employment',
    },
    {
      id: 'dependentCareCosts',
      name: 'Dependent Care Costs',
      typeRef: 'number',
      description: 'Monthly costs for dependent care',
    },
    {
      id: 'medicalExpenses',
      name: 'Medical Expenses',
      typeRef: 'number',
      description: 'Monthly out-of-pocket medical expenses',
    },
    {
      id: 'shelterCosts',
      name: 'Shelter Costs',
      typeRef: 'number',
      description:
        'Monthly shelter costs including rent/mortgage and utilities',
    },
    {
      id: 'childSupportPaid',
      name: 'Child Support Paid',
      typeRef: 'number',
      description: 'Monthly child support payments made',
    },
    {
      id: 'countableResources',
      name: 'Countable Resources',
      typeRef: 'number',
      description: 'Total countable resources (bank accounts, etc.)',
    },
    {
      id: 'hasElderlyOrDisabled',
      name: 'Has Elderly Or Disabled Member',
      typeRef: 'boolean',
      description: 'Whether household has member 60+ or disabled',
    },
    {
      id: 'isUSCitizenOrEligibleNoncitizen',
      name: 'Is US Citizen Or Eligible Noncitizen',
      typeRef: 'boolean',
      description: 'Citizenship/immigration status requirement',
    },
    {
      id: 'isHomeless',
      name: 'Is Homeless',
      typeRef: 'boolean',
      description: 'Whether applicant is homeless',
    },
  ],
  businessKnowledgeModels: [
    {
      id: 'fplThresholds',
      name: 'FPL Thresholds',
      description: 'Federal Poverty Level thresholds by household size',
      variable: {
        name: 'FPL Thresholds',
        typeRef: 'context',
      },
      parameters: [{ name: 'size', typeRef: 'number' }],
      expression: {
        id: 'fpl-expr',
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
      id: 'standardDeductionLookup',
      name: 'Standard Deduction Lookup',
      description: 'Standard deduction amount by household size',
      variable: {
        name: 'Standard Deduction Lookup',
        typeRef: 'number',
      },
      parameters: [{ name: 'size', typeRef: 'number' }],
      expression: {
        id: 'std-deduct-expr',
        text: `if size <= 3 then 209
else if size = 4 then 234
else if size = 5 then 274
else 314`,
      },
      expressionType: 'literal',
    },
    {
      id: 'maxAllotmentLookup',
      name: 'Max Allotment Lookup',
      description: 'Maximum SNAP allotment by household size',
      variable: {
        name: 'Max Allotment Lookup',
        typeRef: 'number',
      },
      parameters: [{ name: 'size', typeRef: 'number' }],
      expression: {
        id: 'max-allot-expr',
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
      id: '_const_resource_limit_standard',
      name: 'RESOURCE_LIMIT_STANDARD',
      value: 3000,
      type: 'number',
      description: 'Standard resource limit for most households',
      category: 'Resource Limits',
    },
    {
      id: '_const_resource_limit_elderly',
      name: 'RESOURCE_LIMIT_ELDERLY_DISABLED',
      value: 4500,
      type: 'number',
      description: 'Resource limit for households with elderly or disabled members',
      category: 'Resource Limits',
    },
    {
      id: '_const_medical_expense_threshold',
      name: 'MEDICAL_EXPENSE_THRESHOLD',
      value: 35,
      type: 'number',
      description: 'Monthly medical expense threshold before deduction applies',
      category: 'Deductions',
    },
    {
      id: '_const_homeless_shelter_deduction',
      name: 'HOMELESS_SHELTER_DEDUCTION',
      value: 198.99,
      type: 'number',
      description: 'Standard utility allowance for homeless households',
      category: 'Deductions',
    },
    {
      id: '_const_shelter_deduction_cap',
      name: 'SHELTER_DEDUCTION_CAP',
      value: 672,
      type: 'number',
      description: 'Maximum shelter deduction for non-elderly/disabled households',
      category: 'Deductions',
    },
    {
      id: '_const_earned_income_deduction_rate',
      name: 'EARNED_INCOME_DEDUCTION_RATE',
      value: 0.20,
      type: 'number',
      description: 'Percentage of earned income that is deducted (20%)',
      category: 'Deductions',
    },
    {
      id: '_const_benefit_reduction_rate',
      name: 'BENEFIT_REDUCTION_RATE',
      value: 0.30,
      type: 'number',
      description: 'Rate at which net income reduces benefit amount (30%)',
      category: 'Benefit Calculation',
    },
  ],
  decisions: [
    {
      id: 'grossIncomeTest',
      name: 'Gross Income Test',
      description: 'Tests if gross income is within 130% FPL limit',
      variable: {
        name: 'Gross Income Test',
        typeRef: 'boolean',
      },
      informationRequirements: [
        { id: 'grit-1', type: 'input', href: 'householdSize' },
        { id: 'grit-2', type: 'input', href: 'grossMonthlyIncome' },
        { id: 'grit-3', type: 'input', href: 'hasElderlyOrDisabled' },
      ],
      knowledgeRequirements: [{ id: 'grit-k1', href: 'fplThresholds' }],
      expression: {
        id: 'grit-expr',
        text: `if Has Elderly Or Disabled Member then true
else Gross Monthly Income <= FPL Thresholds(Household Size).grossLimit`,
        typeRef: 'boolean',
      },
    },
    {
      id: 'standardDeduction',
      name: 'Standard Deduction',
      description: 'Calculates standard deduction based on household size',
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
        text: 'Standard Deduction Lookup(Household Size)',
        typeRef: 'number',
      },
    },
    {
      id: 'earnedIncomeDeduction',
      name: 'Earned Income Deduction',
      description: '20% deduction on earned income',
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
      description: 'Medical expense deduction for elderly/disabled households',
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
        text: `if Has Elderly Or Disabled Member and Medical Expenses > MEDICAL_EXPENSE_THRESHOLD
then Medical Expenses - MEDICAL_EXPENSE_THRESHOLD
else 0`,
        typeRef: 'number',
      },
    },
    {
      id: 'resourceTest',
      name: 'Resource Test',
      description: 'Tests if countable resources are within limits',
      variable: {
        name: 'Resource Test',
        typeRef: 'boolean',
      },
      informationRequirements: [
        { id: 'rt-1', type: 'input', href: 'countableResources' },
        { id: 'rt-2', type: 'input', href: 'hasElderlyOrDisabled' },
      ],
      knowledgeRequirements: [],
      expression: {
        id: 'rt-expr',
        text: `if Has Elderly Or Disabled Member then Countable Resources <= RESOURCE_LIMIT_ELDERLY_DISABLED
else Countable Resources <= RESOURCE_LIMIT_STANDARD`,
        typeRef: 'boolean',
      },
    },
    {
      id: 'citizenshipRequirementMet',
      name: 'Citizenship Requirement Met',
      description: 'Checks citizenship/immigration status',
      variable: {
        name: 'Citizenship Requirement Met',
        typeRef: 'boolean',
      },
      informationRequirements: [
        { id: 'crm-1', type: 'input', href: 'isUSCitizenOrEligibleNoncitizen' },
      ],
      knowledgeRequirements: [],
      expression: {
        id: 'crm-expr',
        text: 'Is US Citizen Or Eligible Noncitizen',
        typeRef: 'boolean',
      },
    },
    {
      id: 'adjustedIncomeBeforeShelter',
      name: 'Adjusted Income Before Shelter',
      description: 'Gross income minus all deductions except shelter',
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
else if Has Elderly Or Disabled Member then max(0, Shelter Costs - (Adjusted Income Before Shelter * 0.5))
else min(SHELTER_DEDUCTION_CAP, max(0, Shelter Costs - (Adjusted Income Before Shelter * 0.5)))`,
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
    {
      id: 'netIncomeTest',
      name: 'Net Income Test',
      description: 'Tests if net income is within 100% FPL limit',
      variable: {
        name: 'Net Income Test',
        typeRef: 'boolean',
      },
      informationRequirements: [
        { id: 'nit-1', type: 'input', href: 'householdSize' },
        { id: 'nit-2', type: 'decision', href: 'netMonthlyIncome' },
      ],
      knowledgeRequirements: [{ id: 'nit-k1', href: 'fplThresholds' }],
      expression: {
        id: 'nit-expr',
        text: 'Net Monthly Income <= FPL Thresholds(Household Size).netLimit',
        typeRef: 'boolean',
      },
    },
    {
      id: 'snapEligible',
      name: 'SNAP Eligible',
      description: 'Final eligibility determination',
      variable: {
        name: 'SNAP Eligible',
        typeRef: 'boolean',
      },
      informationRequirements: [
        { id: 'se-1', type: 'decision', href: 'grossIncomeTest' },
        { id: 'se-2', type: 'decision', href: 'netIncomeTest' },
        { id: 'se-3', type: 'decision', href: 'resourceTest' },
        { id: 'se-4', type: 'decision', href: 'citizenshipRequirementMet' },
      ],
      knowledgeRequirements: [],
      expression: {
        id: 'se-expr',
        text: 'Gross Income Test and Net Income Test and Resource Test and Citizenship Requirement Met',
        typeRef: 'boolean',
      },
    },
    {
      id: 'benefitAmount',
      name: 'Benefit Amount',
      description: 'Calculates monthly SNAP benefit amount',
      variable: {
        name: 'Benefit Amount',
        typeRef: 'number',
      },
      informationRequirements: [
        { id: 'ba-1', type: 'input', href: 'householdSize' },
        { id: 'ba-2', type: 'decision', href: 'netMonthlyIncome' },
        { id: 'ba-3', type: 'decision', href: 'snapEligible' },
      ],
      knowledgeRequirements: [{ id: 'ba-k1', href: 'maxAllotmentLookup' }],
      expression: {
        id: 'ba-expr',
        text: `if not(SNAP Eligible) then 0
else max(0, Max Allotment Lookup(Household Size) - (Net Monthly Income * BENEFIT_REDUCTION_RATE))`,
        typeRef: 'number',
      },
    },
  ],
}
