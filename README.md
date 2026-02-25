# 🌌 Neura Labs Dashboard

A premium, state-of-the-art Agency & Project Management Dashboard built for high-performance teams. Experience seamless client management, automated invoicing, and secure document signing in one unified, visually stunning interface.

![Dashboard Preview](https://github.com/nabil24024004/Dashboard-Neura-Labs/raw/main/public/preview-hero.png)

## ✨ Features

- **🚀 Real-time Overview**: Get instant insights into your business performance with live stats and activity feeds.
- **👥 Client Management**: Full-featured split-view CRM for managing client relationships and project history.
- **📂 Document Hub**: Secure file uploads directly to Supabase Storage with smart categorization (Contracts, Designs, Deliverables).
- **✍️ Digital Agreements**: Draft legal agreements and sign them digitally. Real-time PDF generation with `@react-pdf/renderer`.
- **💰 Financial Suite**: Professional invoice generation (Auto-INV numbers) and payment tracking with real-time balance calculations.
- **📅 Smart Meetings**: Schedule and track meetings with clients, integrated with project timelines.
- **📊 Analytics**: Insightful charts for revenue, project velocity, and client acquisition.
- **🛡️ Secure Auth**: Enterprise-grade authentication powered by Clerk.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/)
- **Backend / Database**: [Supabase](https://supabase.com/) (PostgreSQL & Storage)
- **Authentication**: [Clerk](https://clerk.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **PDF Generation**: [@react-pdf/renderer](https://react-pdf.org/)
- **Charts**: [Recharts](https://recharts.org/)

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- A Supabase project
- A Clerk account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/nabil24024004/Dashboard-Neura-Labs.git
   cd Dashboard-Neura-Labs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment Variables**
   Create a `.env.local` file and add your credentials:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
   CLERK_SECRET_KEY=
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open the browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ by [Neura Labs](https://neuralabs.ai)
