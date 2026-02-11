# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 프로젝트 개요

뚝딱민턴 - 배드민턴 동호회 관리 시스템. Next.js 16 + TypeScript + Tailwind CSS 프론트엔드와 Supabase 백엔드로 구성된 풀스택 애플리케이션입니다.

## 개발 명령어

```bash
# 개발 서버 실행 (Turbopack)
npm run dev          # http://localhost:3000

# 프로덕션 빌드
npm run build

# 린트
npm run lint
```

## 기술 스택

- **프레임워크**: Next.js 16 (App Router, Turbopack)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS v4
- **백엔드/DB**: Supabase (PostgreSQL, Auth, Realtime)
- **배포**: Vercel (GitHub 연동 자동배포)

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router 페이지
│   ├── page.tsx           # 대시보드 (메인)
│   ├── login/             # 로그인
│   ├── members/           # 회원관리
│   ├── registrations/     # 신규회원관리
│   ├── payments/          # 회비관리
│   ├── meetings/          # 모임관리
│   ├── matches/           # 대진표
│   ├── settings/          # 설정
│   ├── layout.tsx         # 루트 레이아웃
│   └── globals.css        # 전역 스타일
├── components/
│   ├── layout/            # 레이아웃 컴포넌트
│   │   ├── MainLayout.tsx # 메인 레이아웃 (사이드바 토글 관리)
│   │   ├── Sidebar.tsx    # 사이드바 (모바일 오버레이)
│   │   └── Header.tsx     # 헤더 (햄버거 메뉴)
│   └── auth/              # 인증 관련
│       └── AuthGuard.tsx  # 인증 가드
├── lib/
│   ├── supabase.ts        # Supabase 클라이언트
│   └── auth.ts            # 인증 유틸리티
└── types/
    └── database.ts        # DB 타입 정의
```

## 반응형 디자인 규칙

**중요: 모든 페이지는 모바일 반응형으로 구현되어야 합니다.**

### 브레이크포인트
- **모바일**: < 768px (기본)
- **태블릿**: md (≥ 768px)
- **데스크톱**: lg (≥ 1024px)

### 레이아웃 패턴
```tsx
// 사이드바: 모바일에서 햄버거 메뉴로 토글
// MainLayout.tsx에서 isMobile 상태 관리

// 그리드: 모바일 2열 → 데스크톱 4열
<div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">

// 검색/필터: 모바일 세로 → 데스크톱 가로
<div className="flex flex-col md:flex-row gap-2 md:gap-4">

// 텍스트 크기
<h1 className="text-xl md:text-2xl font-bold">

// 버튼 텍스트: 모바일에서 축약
<span className="hidden md:inline">회원등록</span>
<span className="md:hidden">추가</span>

// 도움말: 모바일에서 숨김
<div className="text-sm text-gray-500 hidden md:block">
```

### 테이블 반응형
```tsx
// 테이블 컨테이너에 가로 스크롤
<div className="table-container overflow-auto max-h-[calc(100vh-300px)]">
  <table className="table">
    <thead className="sticky top-0 z-10 bg-gray-50">
```

## CSS/스타일 규칙

### 전역 스타일 (globals.css)
```css
/* 카드 */
.card { @apply bg-white rounded-lg shadow-sm border border-gray-200 p-6; }

/* 버튼 */
.btn { @apply px-4 py-2 rounded-lg font-medium transition-colors; }
.btn-primary { @apply bg-emerald-600 text-white hover:bg-emerald-700; }
.btn-secondary { @apply bg-gray-200 text-gray-700 hover:bg-gray-300; }

/* 테이블 */
.table { @apply w-full border-collapse; }
.table th { @apply px-4 py-3 text-sm font-semibold text-gray-600 bg-gray-50 border-b; }
.table td { @apply px-4 py-3 text-sm text-gray-700 border-b; }

/* 모바일 애니메이션 */
.animate-slide-in { animation: slide-in 0.2s ease-out; }
```

### 색상 팔레트
- **Primary**: emerald-600 (#10b981)
- **Success**: emerald (green 계열)
- **Danger**: red-600
- **Warning**: yellow/orange
- **Text**: gray-800 (제목), gray-600 (본문), gray-400 (보조)

## Supabase 데이터베이스

### 주요 테이블
- `members`: 회원 정보 (이름, 닉네임, 연락처, 역할, 상태, 가입일)
- `member_registrations`: 신규회원 가입절차 (자기소개, 회비납부, 재가입 여부)
- `payments`: 회비 납부 내역 (회원ID, 납부월, 금액, 납부일)
- `meetings`: 모임 정보 (날짜, 요일, 장소, 시간, 참석자)

### 타입 정의 (types/database.ts)
```typescript
type MemberRole = 'leader' | 'advisor' | 'staff' | 'member'
type MemberStatus = 'active' | 'left' | 'kicked'
```

## 인증

- Supabase Auth 사용
- JWT 토큰 localStorage 저장
- AuthGuard 컴포넌트로 보호된 라우트 처리
- 로그인 페이지: `/login`

## 환경 변수

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 배포

- **플랫폼**: Vercel
- **도메인**: ddminton.vercel.app
- **자동배포**: GitHub main 브랜치 push 시 자동 배포
- **환경변수**: Vercel 프로젝트 Settings > Environment Variables에서 설정

## 개발 규칙

1. **컴포넌트**: 함수형 컴포넌트 + hooks 사용
2. **상태관리**: useState, useEffect (필요시 Zustand)
3. **API 호출**: Supabase 클라이언트 직접 사용
4. **에러처리**: try-catch + alert 또는 toast
5. **타입**: 모든 props와 state에 TypeScript 타입 명시
