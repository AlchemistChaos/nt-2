import { Biometric, Goal, CalorieRecommendation } from '@/types'

interface UserProfile {
  biometric: Biometric
  goal: Goal
  age?: number // We'll need to add this to user profile later
  gender?: 'male' | 'female' // We'll need to add this to user profile later
  activityLevel?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active'
}

// Mifflin-St Jeor Equation for BMR calculation
function calculateBMR(weight_kg: number, height_cm: number, age: number, gender: 'male' | 'female'): number {
  if (gender === 'male') {
    return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
  } else {
    return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
  }
}

// Activity multipliers for TDEE calculation
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9
}

function calculateTDEE(bmr: number, activityLevel: string): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel as keyof typeof ACTIVITY_MULTIPLIERS] || 1.375
  return bmr * multiplier
}

function calculateWeeklyWeightChange(currentWeight: number, targetWeight: number, targetDate: string): number {
  const today = new Date()
  const target = new Date(targetDate)
  const weeksToTarget = Math.max(1, (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 7))
  
  const totalWeightChange = targetWeight - currentWeight
  return totalWeightChange / weeksToTarget
}

function calculateCalorieAdjustment(weeklyWeightChange: number): number {
  // 1 pound of fat = approximately 3500 calories
  // 1 kg of fat = approximately 7700 calories
  const caloriesPerKg = 7700
  const dailyCalorieChange = (weeklyWeightChange * caloriesPerKg) / 7
  return dailyCalorieChange
}

function calculateProteinTarget(weight_kg: number, goalType: string, activityLevel: string): number {
  let proteinPerKg: number
  
  switch (goalType) {
    case 'muscle_gain':
      proteinPerKg = activityLevel === 'very_active' || activityLevel === 'extremely_active' ? 2.2 : 1.8
      break
    case 'weight_loss':
      proteinPerKg = 1.6 // Higher protein during weight loss to preserve muscle
      break
    case 'body_fat_reduction':
      proteinPerKg = 1.8
      break
    case 'weight_gain':
      proteinPerKg = 1.4
      break
    case 'maintenance':
    default:
      proteinPerKg = 1.2
      break
  }
  
  return Math.round(weight_kg * proteinPerKg)
}

function generateRecommendationReasoning(
  profile: UserProfile,
  bmr: number,
  tdee: number,
  calorieAdjustment: number,
  finalCalories: number,
  proteinTarget: number
): string {
  const { biometric, goal } = profile
  const weightChange = goal.target_weight_kg ? goal.target_weight_kg - (biometric.weight_kg || 0) : 0
  const isWeightLoss = weightChange < 0
  const isWeightGain = weightChange > 0
  
  let reasoning = `Based on your current stats:\n`
  reasoning += `• Weight: ${biometric.weight_kg}kg, Height: ${biometric.height_cm}cm\n`
  reasoning += `• BMR (Base Metabolic Rate): ${Math.round(bmr)} calories\n`
  reasoning += `• TDEE (Total Daily Energy Expenditure): ${Math.round(tdee)} calories\n\n`
  
  if (goal.target_weight_kg && goal.target_date) {
    const weeklyChange = calculateWeeklyWeightChange(biometric.weight_kg || 0, goal.target_weight_kg, goal.target_date)
    reasoning += `Goal: ${goal.goal_type.replace('_', ' ')} to ${goal.target_weight_kg}kg by ${goal.target_date}\n`
    reasoning += `Target weekly change: ${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(2)}kg\n`
    
    if (isWeightLoss) {
      reasoning += `Calorie deficit: ${Math.abs(Math.round(calorieAdjustment))} calories/day\n`
    } else if (isWeightGain) {
      reasoning += `Calorie surplus: ${Math.round(calorieAdjustment)} calories/day\n`
    }
  }
  
  reasoning += `\nRecommended daily intake:\n`
  reasoning += `• Calories: ${finalCalories} (${calorieAdjustment > 0 ? '+' : ''}${Math.round(calorieAdjustment)} from maintenance)\n`
  reasoning += `• Protein: ${proteinTarget}g (${(proteinTarget / (biometric.weight_kg || 1)).toFixed(1)}g per kg body weight)\n`
  
  // Add safety warnings
  if (Math.abs(calorieAdjustment) > 500) {
    reasoning += `\n⚠️ This is an aggressive target. Consider a more gradual approach for sustainable results.`
  }
  
  if (finalCalories < bmr * 0.8) {
    reasoning += `\n⚠️ This calorie target is quite low. Ensure you're getting adequate nutrition and consider consulting a healthcare professional.`
  }
  
  return reasoning
}

export function calculateNutritionRecommendations(profile: UserProfile): CalorieRecommendation {
  const { biometric, goal } = profile
  
  // Default values if not provided
  const age = profile.age || 30
  const gender = profile.gender || 'male'
  const activityLevel = profile.activityLevel || 'moderately_active'
  
  if (!biometric.weight_kg || !biometric.height_cm) {
    throw new Error('Weight and height are required for calculations')
  }
  
  // Calculate BMR and TDEE
  const bmr = calculateBMR(biometric.weight_kg, biometric.height_cm, age, gender)
  const tdee = calculateTDEE(bmr, activityLevel)
  
  let calorieAdjustment = 0
  
  // Calculate calorie adjustment based on goal
  if (goal.target_weight_kg && goal.target_date) {
    const weeklyWeightChange = calculateWeeklyWeightChange(biometric.weight_kg, goal.target_weight_kg, goal.target_date)
    calorieAdjustment = calculateCalorieAdjustment(weeklyWeightChange)
  }
  
  // Apply safety limits
  const maxDeficit = tdee * 0.25 // Max 25% deficit
  const maxSurplus = tdee * 0.20 // Max 20% surplus
  
  if (calorieAdjustment < -maxDeficit) {
    calorieAdjustment = -maxDeficit
  } else if (calorieAdjustment > maxSurplus) {
    calorieAdjustment = maxSurplus
  }
  
  const finalCalories = Math.round(tdee + calorieAdjustment)
  const proteinTarget = calculateProteinTarget(biometric.weight_kg, goal.goal_type, activityLevel)
  
  // Calculate macros (rough estimates)
  const proteinCalories = proteinTarget * 4
  const fatCalories = finalCalories * 0.25 // 25% from fat
  const carbCalories = finalCalories - proteinCalories - fatCalories
  
  const dailyFat = Math.round(fatCalories / 9)
  const dailyCarbs = Math.round(carbCalories / 4)
  
  const reasoning = generateRecommendationReasoning(
    profile,
    bmr,
    tdee,
    calorieAdjustment,
    finalCalories,
    proteinTarget
  )
  
  return {
    dailyCalories: finalCalories,
    dailyProtein: proteinTarget,
    dailyCarbs,
    dailyFat,
    reasoning,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    deficit: calorieAdjustment < 0 ? Math.abs(Math.round(calorieAdjustment)) : undefined,
    surplus: calorieAdjustment > 0 ? Math.round(calorieAdjustment) : undefined
  }
}

// Helper function to validate if recommendations can be calculated
export function canCalculateRecommendations(biometric: Biometric | null, goal: Goal | null): boolean {
  return !!(
    biometric?.weight_kg &&
    biometric?.height_cm &&
    goal?.goal_type &&
    goal?.is_active
  )
}

// Helper function to get default user profile for calculations
export function createUserProfile(
  biometric: Biometric,
  goal: Goal,
  age: number = 30,
  gender: 'male' | 'female' = 'male',
  activityLevel: string = 'moderately_active'
): UserProfile {
  return {
    biometric,
    goal,
    age,
    gender,
    activityLevel: activityLevel as UserProfile['activityLevel']
  }
} 