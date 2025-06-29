# Nutrition Hero - Codebase Documentation

## 🥗 Project Overview

**Nutrition Hero** is an AI-powered nutrition tracking web application that combines natural language processing, computer vision, and modern web technologies to create an intelligent nutrition assistant. Users can track meals through conversational AI, upload food photos for automatic analysis, and receive personalized dietary guidance.

### Core Value Proposition
- **Natural Language Meal Logging**: "I ate salmon for lunch" automatically logs a meal
- **Image Recognition**: Upload food photos for instant nutritional analysis  
- **Intelligent Planning**: Plan meals and mark them as eaten when consumed
- **Personalized Guidance**: AI-driven recommendations based on user preferences and goals

## 🏗️ Technical Architecture

### Tech Stack
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, ShadCN UI
- **Backend**: Supabase (PostgreSQL), OpenAI API, Supabase Auth
- **State Management**: TanStack Query for caching and data synchronization
- **Deployment**: Vercel-ready with environment configuration

### Key Design Patterns
- **Server-Side Rendering (SSR)** with client-side hydration
- **Real-time Streaming** for AI responses
- **Optimistic Updates** for better UX
- **Row Level Security (RLS)** for data privacy
- **Mobile-First Responsive Design**

## 📁 Codebase Structure

```
nt-2/
├── app/                          # Next.js App Router
│   ├── (auth)/login/            # Authentication pages
│   ├── (main)/                  # Main application pages
│   │   ├── page.tsx             # Main dashboard (SSR)
│   │   ├── MainPageClient.tsx   # Client-side main interface
│   │   ├── goals/               # Goals and biometrics management
│   │   ├── library/             # Quick add library
│   │   └── preferences/         # User preferences
│   ├── api/chat/route.ts        # OpenAI chat API endpoint
│   ├── layout.tsx               # Root layout with providers
│   └── globals.css              # Global styles and utilities
├── components/
│   ├── custom/                  # Application-specific components
│   │   ├── CustomMealCarousel.tsx  # Main meal display carousel
│   │   ├── ChatMessage.tsx         # AI chat message rendering
│   │   ├── CarouselCard.tsx        # Individual meal cards
│   │   └── ImageUploadButton.tsx   # Food photo upload
│   └── ui/                      # Reusable UI components (ShadCN)
├── lib/
│   ├── supabase/               # Database layer
│   │   ├── client.ts           # Browser Supabase client
│   │   ├── server.ts           # Server Supabase client
│   │   ├── database.ts         # Database operations
│   │   └── client-cache.ts     # React Query integration
│   ├── openai/client.ts        # OpenAI configuration
│   └── utils/                  # Utility functions
├── types/index.ts              # TypeScript type definitions
├── supabase/migrations/        # Database migrations
└── middleware.ts               # Authentication middleware
```

## 🗄️ Database Architecture

**🌐 REMOTE SUPABASE ONLY**: This project connects exclusively to a hosted Supabase instance via environment variables. The local `config.toml` file is not used.

### Core Tables
```sql
users                    # User profiles (linked to auth.users)
├── preferences         # Dietary restrictions, allergies, dislikes  
├── meals               # Individual meal entries
│   └── meal_items      # Detailed food items within meals
├── chat_messages       # AI conversation history
├── goals               # Weight/fitness goals
├── biometrics          # Body measurements over time
├── daily_targets       # Personalized daily nutrition targets
└── saved_items         # Quick add library
    ├── brands          # Restaurant/brand information
    ├── quick_add_patterns  # Smart recognition patterns
    └── supplement_schedules # Recurring supplement tracking
```

### Security Model
- **Row Level Security (RLS)** enforced on all tables
- Users can only access their own data
- Automated user profile creation on signup
- Secure API routes with user verification

## 🤖 AI Integration Flow

### 1. Chat API (`/api/chat/route.ts`)
```typescript
// User sends message (text + optional image)
POST /api/chat
├── Authenticate user
├── Save user message to database
├── Build context (preferences, recent meals, chat history)
├── Stream OpenAI response
├── Process intent and take actions
└── Save assistant response
```

### 2. Intent Recognition System
The AI processes user messages to identify intentions:

```typescript
// Intent: Meal Logging
"I ate salmon for lunch" → 
├── Extract food item: "salmon"
├── Determine meal type: "lunch"  
├── Estimate nutrition via OpenAI
├── Save to meals table
└── Update UI optimistically

// Intent: Preference Update
"I'm allergic to nuts" →
├── Extract allergen: "nuts"
├── Classify as "allergy"
├── Save to preferences table
└── Confirm with user

// Intent: Meal Planning
"Plan chicken for dinner" →
├── Extract food: "chicken"
├── Set status: "planned"
├── Save meal entry
└── Show in carousel as planned
```

### 3. Image Analysis Pipeline
```typescript
// Image upload flow
User uploads photo →
├── Convert to base64
├── Send to GPT-4o with vision
├── Extract food items and quantities
├── Estimate nutritional information
├── Auto-populate meal entry
└── Allow user confirmation/editing
```

## 🎯 Key Components Deep Dive

### MainPageClient.tsx
**The main application interface**
- Manages chat state and meal data
- Handles date navigation (view historical data)
- Coordinates between carousel and chat
- Implements responsive sidebar navigation
- Real-time streaming chat integration

```typescript
// Key features:
- Date-aware data fetching with React Query
- Optimistic updates for chat messages
- Responsive design with mobile optimization
- Read-only mode for historical dates
```

### CustomMealCarousel.tsx
**Visual meal overview with chronological slots**
- Displays meals in chronological order (breakfast → dinner)
- Shows placeholder cards for missing meals
- Real-time nutrition totals
- Horizontal scrolling with navigation controls

```typescript
// Chronological meal slots:
[Breakfast] [Morning Snack] [Lunch] [Afternoon Snack] [Dinner] [Evening Snack]
```

### ChatMessage.tsx
**Enhanced message rendering**
- Markdown-style formatting support
- Bullet points and numbered lists
- Bold text and proper line breaks
- Mobile-optimized typography

### Database Layer (`lib/supabase/`)
- **client.ts**: Browser-side Supabase client
- **server.ts**: Server-side client for API routes
- **database.ts**: High-level database operations
- **client-cache.ts**: React Query hooks for caching

## 🔄 Data Flow Patterns

### 1. Real-time Chat Flow
```
User Input → API Route → OpenAI Stream → UI Updates → Database Save
     ↓           ↓           ↓            ↓           ↓
   Local       Build      Stream       Update      Persist
   State      Context    Response      Messages     History
```

### 2. Meal Management Flow
```
Chat Input → Intent Recognition → Meal Extraction → Database Save → Cache Invalidation → UI Refresh
```

### 3. Date Navigation Flow
```
Date Selection → Query Cache Check → Database Fetch → Component Re-render
```

## 🎨 UI/UX Architecture

### Design System
- **ShadCN UI**: Consistent component library
- **Tailwind CSS**: Utility-first styling
- **Mobile-First**: Responsive breakpoints (sm: 640px, lg: 1024px)
- **Touch-Friendly**: 44px minimum touch targets

### Responsive Strategy
```css
/* Mobile-first approach */
.component {
  /* Mobile styles (default) */
  padding: 12px;
  
  /* Tablet and up */
  @media (min-width: 640px) {
    padding: 24px;
  }
  
  /* Desktop and up */
  @media (min-width: 1024px) {
    padding: 32px;
  }
}
```

### Navigation Pattern
- **Collapsible Sidebar**: Date navigation with mobile overlay
- **Header Actions**: Quick access to goals, library, preferences
- **Contextual Input**: Smart input area with image upload

## 🚀 Development Workflow

### Environment Setup
```bash
# Required environment variables
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=your-openai-key
```

### Database Migrations
**⚠️ IMPORTANT: This project uses REMOTE Supabase only - no local database!**

```bash
# Migrations are applied to remote Supabase via:
# 1. Supabase Dashboard SQL Editor (preferred)
# 2. OR: npx supabase db push (if linked to remote project)

001_initial_schema.sql      # Core tables and RLS
002_goals_biometrics.sql    # Goals and tracking
003_quick_add_library.sql   # Saved items and brands
004-009_*.sql              # Bug fixes and enhancements
```

**Note**: The `supabase/config.toml` file exists for potential local development but is NOT used in this project. All database operations connect to the remote Supabase instance via environment variables.

### Development Commands
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # ESLint check
```

## 🔧 Key Features Implementation

### 1. Smart Meal Recognition
- **Natural Language Processing**: Extract food items from conversational text
- **Nutritional Estimation**: AI-powered calorie and macro calculation
- **Context Awareness**: Consider meal timing and user preferences

### 2. Image Analysis
- **Computer Vision**: GPT-4o analyzes food photos
- **Portion Estimation**: Automatic serving size detection
- **Multi-food Recognition**: Handle complex meals with multiple items

### 3. Preference Management
- **Automatic Detection**: AI identifies dietary restrictions from conversation
- **Flexible Categories**: Allergies, dislikes, dietary restrictions
- **Context Integration**: Preferences inform meal recommendations

### 4. Goal Tracking
- **Personalized Targets**: AI-calculated daily nutrition goals
- **Progress Monitoring**: Visual progress indicators
- **Adaptive Recommendations**: Goals adjust based on user progress

## 🔒 Security & Privacy

### Authentication Flow
```
User Login → Supabase Auth → JWT Token → Middleware Verification → Route Access
```

### Data Protection
- **Row Level Security**: Database-level access control
- **Type Safety**: Full TypeScript coverage
- **Input Validation**: Sanitized user inputs
- **Secure API Routes**: Authentication required for all operations

## 📱 Mobile Optimization

### Recent Improvements
- **Touch-Friendly Interface**: Minimum 44px touch targets
- **Responsive Typography**: Adaptive text sizing
- **Mobile Navigation**: Collapsible sidebar with overlay
- **Optimized Spacing**: Comfortable padding and margins
- **Enhanced Chat UI**: Mobile-optimized message formatting

### Performance Optimizations
- **React Query Caching**: Efficient data fetching and caching
- **Optimistic Updates**: Immediate UI feedback
- **Streaming Responses**: Real-time AI interaction
- **Image Optimization**: Next.js automatic image optimization

## 🎯 Future Considerations

### Potential Enhancements
- **Offline Support**: Progressive Web App (PWA) capabilities
- **Push Notifications**: Meal reminders and goal updates
- **Social Features**: Meal sharing and community challenges
- **Advanced Analytics**: Nutrition trend analysis and insights
- **Integration APIs**: Fitness tracker and health app connections

### Scalability Considerations
- **Database Indexing**: Optimized queries for large datasets
- **CDN Integration**: Asset delivery optimization
- **Caching Strategy**: Redis for session and frequently accessed data
- **API Rate Limiting**: Protect against abuse and manage OpenAI costs

---

This documentation provides a comprehensive overview of the Nutrition Hero codebase architecture, design patterns, and implementation details. The application demonstrates modern web development practices with a focus on user experience, security, and maintainability. 