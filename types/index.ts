export interface User {
  id: string;
  auth_user_id: string;
  email: string;
  name?: string;
  created_at: string;
}

export interface Preference {
  id: string;
  user_id: string;
  type: string;
  food_name: string;
  notes?: string;
  created_at: string;
}

export interface Meal {
  id: string;
  user_id: string;
  date: string;
  meal_name?: string;
  meal_type?: string;
  kcal_total?: number;
  g_protein?: number;
  g_carb?: number;
  g_fat?: number;
  logged_at: string;
  image_url?: string;
  status: 'logged' | 'planned';
}

export interface MealItem {
  id: string;
  meal_id: string;
  food_name: string;
  quantity_grams?: number;
  quantity_ml?: number;
  kcal?: number;
  g_protein?: number;
  g_carb?: number;
  g_fat?: number;
  source?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  date: string; // Date of the chat session (YYYY-MM-DD format)
  created_at: string;
}

export interface MealWithItems extends Meal {
  meal_items?: MealItem[];
}

export interface ChatRequest {
  message: string;
  image?: string; // base64 encoded image
}

export interface ChatResponse {
  message: string;
  action?: {
    type: 'meal_logged' | 'meal_planned' | 'preference_updated' | 'meal_updated';
    data?: any;
  };
}

export interface NutritionData {
  kcal?: number;
  g_protein?: number;
  g_carb?: number;
  g_fat?: number;
}

export interface FoodItem {
  name: string;
  quantity_grams?: number;
  quantity_ml?: number;
  nutrition: NutritionData;
}

export interface Biometric {
  id: string;
  user_id: string;
  weight_kg?: number;
  height_cm?: number;
  body_fat_percentage?: number;
  recorded_at: string;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  goal_type: 'weight_loss' | 'weight_gain' | 'body_fat_reduction' | 'muscle_gain' | 'maintenance';
  target_weight_kg?: number;
  target_body_fat_percentage?: number;
  target_date?: string;
  daily_calorie_target?: number;
  daily_protein_target?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyTarget {
  id: string;
  user_id: string;
  goal_id?: string;
  date: string;
  calories_target: number;
  protein_target: number;
  carbs_target?: number;
  fat_target?: number;
  is_accepted: boolean;
  created_at: string;
}

export interface CalorieRecommendation {
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs?: number;
  dailyFat?: number;
  reasoning: string;
  bmr: number;
  tdee: number;
  deficit?: number;
  surplus?: number;
}

// Quick Add Library Types
export interface Brand {
  id: string;
  name: string;
  type: 'restaurant' | 'supplement_brand' | 'food_brand' | 'other';
  description?: string;
  website?: string;
  created_at: string;
  updated_at: string;
}

export interface SavedItem {
  id: string;
  user_id: string;
  brand_id?: string;
  brand?: Brand;
  name: string;
  category: 'meal' | 'snack' | 'supplement' | 'drink' | 'ingredient';
  serving_size?: string;
  kcal_per_serving?: number;
  g_protein_per_serving?: number;
  g_carb_per_serving?: number;
  g_fat_per_serving?: number;
  ingredients?: string[];
  allergens?: string[];
  notes?: string;
  image_url?: string;
  times_used: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface QuickAddPattern {
  id: string;
  saved_item_id: string;
  saved_item?: SavedItem;
  pattern: string;
  confidence_score: number;
  created_at: string;
}

export interface SupplementSchedule {
  id: string;
  user_id: string;
  saved_item_id: string;
  saved_item?: SavedItem;
  frequency: 'daily' | 'weekly' | 'as_needed';
  times_per_day: number;
  preferred_times?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
} 