# Sistema Belleza - Backend

Backend API for the Sistema Belleza appointment booking system.

## Structure

```
src/
├── config/         # Configuration files (env, database)
├── controllers/    # Request handlers
├── middleware/     # Express middleware (auth, validation, errors)
├── models/         # Mongoose models
├── routes/         # API routes
├── services/       # Business logic
├── utils/          # Utility functions
├── validators/     # Validation schemas
└── index.js        # Application entry point
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 6+

### Installation

```bash
cd Backend_Belleza
npm install
```

### Configuration

Copy `.env.example` to `.env` and adjust values:

```bash
cp .env.example .env
```

### Development

```bash
npm run dev
```

Server starts on http://localhost:3000

### Production

```bash
npm start
```

## API Endpoints

### Health Check

- `GET /api/health` - Basic health check
- `GET /api/health/db` - Database connection status

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment | development |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/belleza |
| JWT_SECRET | JWT signing secret | - |
| JWT_EXPIRES_IN | Access token expiration | 7d |
| JWT_REFRESH_SECRET | Refresh token secret | - |
| JWT_REFRESH_EXPIRES_IN | Refresh token expiration | 30d |
| CORS_ORIGIN | Frontend URL for CORS | http://localhost:5173 |
| FRONTEND_URL | Frontend URL | http://localhost:5173 |

## Models

- **Business** - Business configuration
- **Service** - Services offered
- **Professional** - Professionals/staff
- **Schedule** - Weekly recurring schedules
- **ScheduleBlock** - Time blocks (breaks, vacations, etc.)
- **Client** - Customers
- **Reservation** - Appointments
- **Payment** - Payments (Mercado Pago, manual)
- **Notification** - Notifications (WhatsApp, email)