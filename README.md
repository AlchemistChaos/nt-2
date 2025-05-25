# 🥗 Nutrition Hero

An AI-powered nutrition tracking web application built with Next.js 15, Supabase, and OpenAI. Track your meals, plan your nutrition, and receive personalized dietary guidance through an intuitive chat interface.

## ✨ Features

- **AI-Powered Chat Interface**: Interact with Nutrition Hero through natural language
- **Image Analysis**: Upload food photos for automatic meal logging and nutritional analysis
- **Meal Tracking**: Log meals with automatic calorie and macronutrient estimation
- **Meal Planning**: Plan future meals and mark them as eaten when consumed
- **Dietary Preferences**: Manage allergies, restrictions, and dietary goals
- **Custom Meal Carousel**: Visual overview of today's meals and planned items
- **Real-time Streaming**: OpenAI responses stream in real-time for better UX
- **Secure Authentication**: Supabase Auth with email/password signup and login

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS + ShadCN UI components
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth
- **AI**: OpenAI GPT-4o/GPT-4o-mini with vision capabilities
- **Deployment**: Vercel-ready
- **Language**: TypeScript

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- OpenAI API key

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd nutrition-hero
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**Where to find these keys:**

1. **Supabase Keys**: Go to your [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → Settings → API
   - Copy the "Project URL" for `NEXT_PUBLIC_SUPABASE_URL`
   - Copy the "anon public" key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **OpenAI API Key**: Go to [OpenAI API Keys](https://platform.openai.com/api-keys) and create a new key

### 3. Database Setup

1. Create a new Supabase project
2. Run the migration script in the Supabase SQL editor:

```sql
-- Copy and paste the contents of supabase/migrations/001_initial_schema.sql
```

3. Enable Row Level Security policies (included in the migration)

### 4. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
nutrition-hero/
├── app/
│   ├── (auth)/
│   │   └── login/              # Authentication pages
│   ├── (main)/
│   │   ├── page.tsx            # Main dashboard
│   │   ├── MainPageClient.tsx  # Client-side main page
│   │   └── preferences/        # Preferences management
│   ├── api/
│   │   └── chat/               # OpenAI chat API route
│   ├── globals.css             # Global styles with ShadCN theme
│   └── layout.tsx              # Root layout
├── components/
│   ├── auth/
│   │   └── AuthForm.tsx        # Login/signup form
│   ├── custom/
│   │   ├── ChatMessage.tsx     # Chat message component
│   │   ├── CustomMealCarousel.tsx # Custom meal carousel
│   │   ├── CarouselCard.tsx    # Individual meal cards
│   │   └── ImageUploadButton.tsx # Image upload functionality
│   └── ui/                     # ShadCN UI components
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser client
│   │   ├── server.ts           # Server client
│   │   └── database.ts         # Database operations
│   ├── openai/
│   │   └── client.ts           # OpenAI configuration
│   └── utils.ts                # Utility functions
├── types/
│   └── index.ts                # TypeScript type definitions
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql # Database schema
└── middleware.ts               # Authentication middleware
```

## 🎯 Key Features Explained

### Chat Interface
- Natural language interaction with AI
- Streaming responses for real-time feedback
- Intent recognition for automatic actions
- Context-aware responses using user preferences and meal history

### Meal Tracking
- Text-based meal logging: "I ate an apple"
- Image-based logging with automatic food recognition
- Nutritional information extraction and estimation
- Meal type detection (breakfast, lunch, dinner, snack)

### Meal Planning
- Plan future meals: "Plan salmon for dinner"
- Convert planned meals to logged when eaten
- Visual distinction between planned and logged meals

### Custom Carousel
- Horizontally scrollable meal overview
- Shows today's logged and planned meals
- Placeholder cards for meal planning
- Summary statistics (meals logged, calories, etc.)

## 🔒 Security

- Row Level Security (RLS) policies ensure users only access their own data
- Secure authentication with Supabase Auth
- Protected API routes with user verification
- Middleware-based route protection

## 🚀 Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production

Make sure to set these environment variables in your deployment platform:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:

1. Check the environment variables are correctly set
2. Ensure Supabase database schema is properly migrated
3. Verify OpenAI API key has sufficient credits
4. Check browser console for any client-side errors

For additional help, please open an issue in the repository.
