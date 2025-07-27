# BeLink Web3 Quest Platform

A modern, full-stack, Web3 Quest Platform for community engagement, project discovery, and gamified rewards. Built with Next.js, TypeScript, Supabase, Tailwind CSS, Shadcn UI, and Radix UI.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)

---

## 🚀 Project Overview

BeLink is a Web3 Quest Platform that enables:
- **Projects** to create quests, engage communities, and distribute rewards.
- **Users** to discover projects, complete quests, earn XP, and climb the leaderboard.

The platform supports wallet, email, and social authentication, robust project/quest management, and real-time verification for social tasks (Twitter/X, Discord, Telegram, etc.).

---

## ✨ Features

- **Project & Quest Management**: Register projects, create multi-step quests, and manage tasks (social, download, form, visit, learn/quiz).
- **Wallet, Email, and Social Auth**: Secure authentication via wallet (EVM/Solana), email, and OAuth (Twitter/X, Discord, Telegram).
- **XP & Leaderboard**: Earn XP for completing quests, view global and quest-specific leaderboards.
- **Real-Time Social Verification**: Automatic verification for social actions (follow, join, like, retweet, subscribe) using X/Twitter, Discord, Telegram APIs.
- **Responsive UI**: Mobile-first, accessible, and consistent design using Tailwind CSS, Shadcn UI, and Radix UI.
- **User Dashboard**: Track active/completed quests, badges, and achievements.
- **Profile Management**: Edit profile, link/unlink social accounts, manage wallet/email.
- **Robust Security**: Encrypted tokens, RLS policies, and secure OAuth flows.
- **Privacy & Compliance**: GDPR-friendly privacy and terms.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Shadcn UI, Radix UI, Lucide Icons
- **Backend/DB**: Supabase (Postgres, Auth, Storage, RLS)
- **State/Data**: React Query, Zustand, Zod (validation)
- **Social APIs**: Twitter/X, Discord, Telegram
- **Testing**: Jest, React Testing Library

---

## ⚡ Getting Started

### 1. Clone the repository
```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

### 2. Install dependencies
```sh
npm install
# or
pnpm install
```

### 3. Configure environment variables
Create a `.env.local` file with the following:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
# ...other social API keys as needed
```

### 4. Run local development
```sh
npm run dev
# or
pnpm dev
```

---

## 🚢 Deployment

- Deploy to [Vercel](https://vercel.com/) or your preferred platform.
- Database schema is managed through Supabase MCP and the provided SQL files.

---

## 🧪 Testing

- Unit tests: `npm test` or `pnpm test`
- Test setup: Jest, React Testing Library

---

## 🔒 Security & Privacy

- All tokens and sensitive data are encrypted at rest.
- Row Level Security (RLS) enforced in Supabase.
- OAuth flows for social logins (Twitter/X, Discord, Telegram).
- [Privacy Policy](./app/privacy.tsx) | [Terms of Service](./app/terms.tsx)

---

## 📄 License

This project is licensed under the MIT License.

---

## 📬 Contact

For support or questions, contact: [support@zaloyal.vercel.app](mailto:support@zaloyal.vercel.app)
