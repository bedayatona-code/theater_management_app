# Theater Management System

A comprehensive web application for managing theater company events, players, payments, and invoices.

## Features

### Admin Features
- **Dashboard**: Overview of all events, players, payments, and outstanding fees
- **Event Management**: Create, view, edit, and manage events with commissioner/client information
- **Player Management**: Add players with full contact details, tax IDs, and login credentials
- **Event-Player Linking**: Link players to events with custom fees, roles, and payment due dates
- **Payment Tracking**: Record individual payment transactions with bank account and receipt links
- **Invoice Generation**: Automatically generate PDF invoices for players
- **Financial Overview**: Track paid and unpaid fees across all events and players

### Player Portal Features
- **Read-Only Dashboard**: View personal events, fees, and payment history
- **Payment Tracking**: See all payments received with dates and amounts
- **Invoice Access**: Password-protected invoice viewing and PDF download
- **Error Reporting**: Submit errors or suggestions to admin (read-only access)

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth.js
- **PDF Generation**: jsPDF

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository and navigate to the project directory

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
npx prisma migrate dev
```

4. Seed the database with sample data (creates admin user):
```bash
npm run seed
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

### Default Login Credentials

After running the seed script:

**Admin:**
- Email: `admin@theater.com`
- Password: `admin123`

**Sample Player:**
- Email: `player@theater.com`
- Password: `player123`

## Project Structure

```
├── app/
│   ├── admin/          # Admin portal pages
│   ├── api/            # API routes
│   ├── player/         # Player portal pages
│   ├── login/          # Login page
│   └── layout.tsx      # Root layout
├── components/         # Reusable React components
├── lib/                # Utility functions (Prisma, Auth, PDF)
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── seed.ts         # Database seed script
└── public/
    └── invoices/       # Generated invoice PDFs
```

## Key Features Explained

### Event Management
- Store event details including name, date, venue, description, and budget
- Track commissioner/client information (who is paying for the event)
- Link multiple players to each event with individual fees

### Player Management
- Full player profiles with contact information and tax IDs
- Automatic user account creation for player portal access
- Track all events and fees per player

### Payment Tracking
- Record individual payment transactions
- Link payments to specific event-player relationships
- Track bank account and receipt links
- Automatic payment status updates (unpaid, partially paid, fully paid)

### Invoice Generation
- Automatic invoice number generation (INV-YYYY-####)
- PDF generation with company and player details
- Password-protected player access
- Stored PDF archive

### Player Portal
- Read-only access to personal information
- View events, fees, and payment history
- Access password-protected invoices
- Submit error reports and suggestions

## Database Schema

- **User**: Authentication (admin/player roles)
- **Player**: Player information and details
- **Event**: Event information including commissioner
- **EventPlayer**: Junction table linking events to players with fees
- **Payment**: Individual payment transactions
- **Invoice**: Generated invoices with PDF paths
- **ErrorReport**: Player-submitted error reports and suggestions

## Customization

### Company Details for Invoices
Edit `lib/invoice-pdf.ts` to customize:
- Company name and address
- Contact information
- Tax ID

### Default Passwords
When creating new players, default password is `password123` if not specified. Players should change this on first login (feature to be implemented).

## Production Deployment

1. Update database to PostgreSQL or MySQL for production
2. Set up environment variables for database connection
3. Configure NextAuth secret in environment variables
4. Set up file storage for invoice PDFs (e.g., AWS S3, Cloudinary)
5. Run `npm run build` and deploy

## License

Private project for theater company use.
