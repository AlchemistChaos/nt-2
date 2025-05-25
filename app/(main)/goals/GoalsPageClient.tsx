'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Biometric, Goal, DailyTarget, CalorieRecommendation } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

import { ArrowLeft, Target, TrendingUp, Calculator, Check, AlertCircle } from 'lucide-react'
import { calculateNutritionRecommendations, canCalculateRecommendations, createUserProfile } from '@/lib/nutrition/recommendations'
import { addBiometricClient, addGoalClient, addDailyTargetClient } from '@/lib/supabase/database-client'

interface GoalsPageClientProps {
  user: User
  initialBiometric: Biometric | null
  initialGoal: Goal | null
  initialDailyTarget: DailyTarget | null
}

export function GoalsPageClient({ user, initialBiometric, initialGoal, initialDailyTarget }: GoalsPageClientProps) {
  const router = useRouter()
  const [biometric, setBiometric] = useState(initialBiometric)
  const [goal, setGoal] = useState(initialGoal)
  const [dailyTarget, setDailyTarget] = useState(initialDailyTarget)
  const [recommendations, setRecommendations] = useState<CalorieRecommendation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Form states
  const [biometricForm, setBiometricForm] = useState({
    weight_kg: biometric?.weight_kg?.toString() || '',
    height_cm: biometric?.height_cm?.toString() || '',
    body_fat_percentage: biometric?.body_fat_percentage?.toString() || ''
  })
  
  const [goalForm, setGoalForm] = useState({
    goal_type: goal?.goal_type || 'maintenance',
    target_weight_kg: goal?.target_weight_kg?.toString() || '',
    target_body_fat_percentage: goal?.target_body_fat_percentage?.toString() || '',
    target_date: goal?.target_date || ''
  })
  
  const [userProfile, setUserProfile] = useState({
    age: '30',
    gender: 'male' as 'male' | 'female',
    activityLevel: 'moderately_active'
  })

  const handleBiometricSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const newBiometric = await addBiometricClient(user.id, {
        weight_kg: parseFloat(biometricForm.weight_kg),
        height_cm: parseFloat(biometricForm.height_cm),
        body_fat_percentage: biometricForm.body_fat_percentage ? parseFloat(biometricForm.body_fat_percentage) : undefined,
        recorded_at: new Date().toISOString()
      })
      
      if (newBiometric) {
        setBiometric(newBiometric)
      }
    } catch (error) {
      console.error('Error saving biometric:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const newGoal = await addGoalClient(user.id, {
        goal_type: goalForm.goal_type as Goal['goal_type'],
        target_weight_kg: goalForm.target_weight_kg ? parseFloat(goalForm.target_weight_kg) : undefined,
        target_body_fat_percentage: goalForm.target_body_fat_percentage ? parseFloat(goalForm.target_body_fat_percentage) : undefined,
        target_date: goalForm.target_date || undefined,
        is_active: true
      })
      
      if (newGoal) {
        setGoal(newGoal)
      }
    } catch (error) {
      console.error('Error saving goal:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateRecommendations = () => {
    if (!biometric || !goal) return
    
    try {
      const profile = createUserProfile(
        biometric,
        goal,
        parseInt(userProfile.age),
        userProfile.gender,
        userProfile.activityLevel
      )
      
      const recs = calculateNutritionRecommendations(profile)
      setRecommendations(recs)
    } catch (error) {
      console.error('Error calculating recommendations:', error)
    }
  }

  const handleAcceptRecommendations = async () => {
    if (!recommendations) return
    
    setIsLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const newTarget = await addDailyTargetClient(user.id, {
        goal_id: goal?.id,
        date: today,
        calories_target: recommendations.dailyCalories,
        protein_target: recommendations.dailyProtein,
        carbs_target: recommendations.dailyCarbs,
        fat_target: recommendations.dailyFat,
        is_accepted: true
      })
      
      if (newTarget) {
        setDailyTarget(newTarget)
      }
    } catch (error) {
      console.error('Error accepting recommendations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const canCalculate = canCalculateRecommendations(biometric, goal)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-gray-900">🎯 Goals & Profile</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Current Biometrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Current Biometrics
            </CardTitle>
            <CardDescription>
              Track your physical measurements to get accurate recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBiometricSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={biometricForm.weight_kg}
                    onChange={(e) => setBiometricForm(prev => ({ ...prev, weight_kg: e.target.value }))}
                    placeholder="70.5"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    value={biometricForm.height_cm}
                    onChange={(e) => setBiometricForm(prev => ({ ...prev, height_cm: e.target.value }))}
                    placeholder="175.5"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="bodyfat" className="block text-sm font-medium text-gray-700 mb-1">Body Fat % (optional)</label>
                  <Input
                    id="bodyfat"
                    type="number"
                    step="0.1"
                    value={biometricForm.body_fat_percentage}
                    onChange={(e) => setBiometricForm(prev => ({ ...prev, body_fat_percentage: e.target.value }))}
                    placeholder="15.5"
                  />
                </div>
              </div>
              <Button type="submit" disabled={isLoading}>
                Update Biometrics
              </Button>
            </form>
            
            {biometric && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Last updated: {new Date(biometric.recorded_at).toLocaleDateString()}
                </p>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div>
                    <p className="font-medium">{biometric.weight_kg}kg</p>
                    <p className="text-sm text-gray-500">Weight</p>
                  </div>
                  <div>
                    <p className="font-medium">{biometric.height_cm}cm</p>
                    <p className="text-sm text-gray-500">Height</p>
                  </div>
                  <div>
                    <p className="font-medium">{biometric.body_fat_percentage || 'N/A'}%</p>
                    <p className="text-sm text-gray-500">Body Fat</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Goals
            </CardTitle>
            <CardDescription>
              Set your fitness and health targets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGoalSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="goalType" className="block text-sm font-medium text-gray-700 mb-1">Goal Type</label>
                  <select 
                    id="goalType"
                    value={goalForm.goal_type} 
                                         onChange={(e) => setGoalForm(prev => ({ ...prev, goal_type: e.target.value as Goal['goal_type'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="weight_loss">Weight Loss</option>
                    <option value="weight_gain">Weight Gain</option>
                    <option value="body_fat_reduction">Body Fat Reduction</option>
                    <option value="muscle_gain">Muscle Gain</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
                  <Input
                    id="targetDate"
                    type="date"
                    value={goalForm.target_date}
                    onChange={(e) => setGoalForm(prev => ({ ...prev, target_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="targetWeight" className="block text-sm font-medium text-gray-700 mb-1">Target Weight (kg)</label>
                  <Input
                    id="targetWeight"
                    type="number"
                    step="0.1"
                    value={goalForm.target_weight_kg}
                    onChange={(e) => setGoalForm(prev => ({ ...prev, target_weight_kg: e.target.value }))}
                    placeholder="65.0"
                  />
                </div>
                <div>
                  <label htmlFor="targetBodyFat" className="block text-sm font-medium text-gray-700 mb-1">Target Body Fat %</label>
                  <Input
                    id="targetBodyFat"
                    type="number"
                    step="0.1"
                    value={goalForm.target_body_fat_percentage}
                    onChange={(e) => setGoalForm(prev => ({ ...prev, target_body_fat_percentage: e.target.value }))}
                    placeholder="12.0"
                  />
                </div>
              </div>
              <Button type="submit" disabled={isLoading}>
                Update Goals
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* User Profile for Calculations */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Additional information for accurate calorie calculations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                <Input
                  id="age"
                  type="number"
                  value={userProfile.age}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, age: e.target.value }))}
                  placeholder="30"
                />
              </div>
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select 
                  id="gender"
                  value={userProfile.gender} 
                  onChange={(e) => setUserProfile(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label htmlFor="activity" className="block text-sm font-medium text-gray-700 mb-1">Activity Level</label>
                <select 
                  id="activity"
                  value={userProfile.activityLevel} 
                  onChange={(e) => setUserProfile(prev => ({ ...prev, activityLevel: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="sedentary">Sedentary (desk job)</option>
                  <option value="lightly_active">Lightly Active (1-3 days/week)</option>
                  <option value="moderately_active">Moderately Active (3-5 days/week)</option>
                  <option value="very_active">Very Active (6-7 days/week)</option>
                  <option value="extremely_active">Extremely Active (2x/day)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Nutrition Recommendations
            </CardTitle>
            <CardDescription>
              Get personalized daily calorie and protein targets based on your goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!canCalculate ? (
              <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <p className="text-yellow-800">
                  Please enter your weight, height, and set a goal to get recommendations.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <Button onClick={calculateRecommendations} disabled={isLoading}>
                  Calculate Recommendations
                </Button>
                
                {recommendations && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-900">{recommendations.dailyCalories}</p>
                        <p className="text-sm text-blue-700">Daily Calories</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-900">{recommendations.dailyProtein}g</p>
                        <p className="text-sm text-green-700">Daily Protein</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-900">{recommendations.dailyCarbs}g</p>
                        <p className="text-sm text-purple-700">Daily Carbs</p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-900">{recommendations.dailyFat}g</p>
                        <p className="text-sm text-orange-700">Daily Fat</p>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">Calculation Details:</h4>
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">{recommendations.reasoning}</pre>
                    </div>
                    
                    {!dailyTarget?.is_accepted && (
                      <Button onClick={handleAcceptRecommendations} disabled={isLoading} className="w-full">
                        <Check className="h-4 w-4 mr-2" />
                        Accept & Apply These Targets
                      </Button>
                    )}
                    
                    {dailyTarget?.is_accepted && (
                      <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <Check className="h-5 w-5 text-green-600" />
                        <p className="text-green-800">
                          Daily targets are active! Your meal tracking will now show progress against these goals.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 