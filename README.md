# syntxt_

> A minimalist, text-only microblogging platform for hackers, developers, and thinkers.

![syntxt_ banner](./public/og-image.png)

## Overview

**syntxt_** is a modern, minimalist microblogging platform inspired by terminal aesthetics and hacker culture. It focuses on pure text content, eliminating the noise of images, videos, and complex media to let your words take center stage.

### Key Features

- **📝 Text-Only Posts** - Share your thoughts in 300 characters or less
- **🔐 Neon Auth Integration** - Secure authentication with email verification
- **💚 Terminal Aesthetic** - Dark theme with monospace fonts and hacker vibes
- **⚡ Instant Interactions** - Optimistic UI updates for likes, reposts, and bookmarks
- **🔒 Smart Caching** - Session-based caching for lightning-fast page loads
- **📱 PWA Ready** - Install as a native app on any device
- **🌙 Dark Mode** - Beautiful dark theme with system preference support
- **🔔 Real-time Notifications** - Stay updated with mentions and interactions
- **💬 Direct Messages** - Private conversations with other users
- **🔍 User Search** - Find and follow interesting people
- **👤 Custom Profiles** - Display name, bio, and avatar customization
- **🏷️ Hashtags & Mentions** - Organize content and mention other users
- **🌐 Link Previews** - Automatic link preview cards
- **🌍 Translation** - Built-in post translation

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Database**: [Prisma ORM](https://www.prisma.io/) with SQLite
- **Authentication**: [Neon Auth](https://neon.tech/)
- **Image Storage**: [Cloudinary](https://cloudinary.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## Getting Started

### Prerequisites

- Node.js 18+
- Bun (recommended) or npm
- A Neon account for Auth

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/syntxt.git
cd syntxt
```

2. Install dependencies:
```bash
bun install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file:
```env
DATABASE_URL="file:./dev.db"
NEON_AUTH_URL="your-neon-auth-url"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

5. Initialize the database:
```bash
bun run db:push
```

6. Start the development server:
```bash
bun run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
syntxt/
├── public/                 # Static assets
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── api/           # API routes
│   │   ├── layout.tsx     # Root layout
│   │   └── page.tsx       # Main page
│   ├── components/
│   │   ├── syntxt/        # App components
│   │   └── ui/            # shadcn/ui components
│   ├── hooks/             # Custom React hooks
│   └── lib/               # Utilities and helpers
├── prisma/
│   └── schema.prisma      # Database schema
└── README.md
```

## Features in Detail

### Authentication

- **Sign Up**: Display Name, Username, Email, Password
- **Email Verification**: 6-digit code verification
- **Sign In**: Email/Username + Password
- **Password Recovery**: Email verification + reset

### Smart Caching

The app uses intelligent session-based caching:
- Posts are cached in `sessionStorage`
- Cache persists until the tab is closed
- Instant page loads on subsequent visits
- Background refresh keeps data current

### Post Interactions

All interactions use optimistic updates for instant feedback:
- **Like/Unlike**: Instant UI update, background sync
- **Bookmark**: Save posts for later
- **Repost**: Share to your followers
- **Quote Post**: Add your commentary
- **Reply**: Threaded conversations

### Performance

- Initial load: 30 posts preloaded
- SessionStorage caching
- Optimistic UI updates
- Lazy-loaded components
- Responsive design

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful components
- [Lucide](https://lucide.dev/) for the icons
- [Neon](https://neon.tech/) for the authentication and database

---

<p align="center">
  <strong>syntxt_</strong> — <em>Text is all you need.</em>
</p>
