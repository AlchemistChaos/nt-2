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