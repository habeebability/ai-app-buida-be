# Technical Requirements

## Core Tech Stack (Fixed for Initial Version)

### Frontend Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Heroicons
- **Package Manager**: npm
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form
- **Validation**: Zod

### Backend & Database
- **Database ORM**: Prisma
- **Authentication**: NextAuth.js / Clerk
- **API**: Next.js API Routes (App Router)

### Development Tools
- **Testing**: Jest + React Testing Library
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript 5.0+

## Code Quality Standards

### ESLint Configuration
```json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "prefer-const": "error",
    "no-console": "warn"
  }
}
```

### Quality Metrics
- **ESLint Compliance**: 100%
- **TypeScript Errors**: 0
- **Test Coverage**: 95%+
- **Security Issues**: 0

## Project Structure Template (App Router)
```
generated-app/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   └── users/route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   └── features/
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── utils.ts
│   │   └── validations.ts
│   ├── hooks/
│   └── types/
├── prisma/
├── public/
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

## Performance Requirements
- **Generation Speed**: < 30 seconds for complete app
- **Code Bundle Size**: Optimized for production
- **Runtime Performance**: 90+ Lighthouse score
- **Component Loading**: Lazy loading where appropriate

## Security Requirements
- **No eval() usage**
- **Safe innerHTML handling** (DOMPurify required)
- **Environment variable protection** (no client-side exposure)
- **Input validation** (Zod schemas)
- **Authentication security** (secure session handling)

## Browser Support
- **Modern browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile compatibility**: iOS Safari, Android Chrome
- **Responsive design**: Mobile-first approach

## Development Environment
- **Node.js**: 18.0+
- **NPM**: 9.0+
- **Operating Systems**: macOS, Windows, Linux
- **IDE Support**: VS Code optimized
