# AutoMart Backend — NestJS + Node.js Middleware

## Service Map

| Service    | URL                        | Tech           |
|------------|----------------------------|----------------|
| Middleware | http://localhost:3000       | Node.js/Express|
| Backend    | http://localhost:4000       | NestJS         |
| Swagger    | http://localhost:4000/docs  | @nestjs/swagger|
| MySQL      | localhost:3306              | AWS RDS / Local|
| Redis      | localhost:6379              | Cache/Sessions |

---

## Architecture

```
Client App
    │
    ▼
┌─────────────────────────────────┐
│  Middleware  :3000              │
│  • CORS                         │
│  • Rate Limiting                │
│  • appAuth (x-app-key)          │
│  • userAuth (Bearer JWT)        │
│  • Proxy → Backend :4000        │
└───────────────┬─────────────────┘
                │ proxy
                ▼
┌─────────────────────────────────┐
│  NestJS Backend  :4000          │
│  • Auth Module (login)          │
│  • JWT Strategy (Passport)      │
│  • TypeORM → MySQL              │
│  • Redis Cache (tokens)         │
│  • Swagger at /docs             │
└─────────────────────────────────┘
```

---

## Project Structure

```
automart/
├── middleware/                    # Node.js/Express proxy
│   ├── src/
│   │   ├── index.js               # Entry point
│   │   └── middlewares/
│   │       ├── appAuth.middleware.js    # Validates x-app-key header
│   │       ├── userAuth.middleware.js   # Validates Bearer JWT
│   │       └── errorHandler.middleware.js
│   ├── .env
│   └── package.json
│
└── backend/                       # NestJS API
    ├── src/
    │   ├── main.ts                # Bootstrap + Swagger setup
    │   ├── app.module.ts          # Root module (TypeORM, Redis, Throttler)
    │   ├── auth/
    │   │   ├── auth.module.ts
    │   │   ├── auth.controller.ts # POST /api/login
    │   │   ├── auth.service.ts    # Sequential login logic + MD5
    │   │   ├── dto/
    │   │   │   └── login.dto.ts
    │   │   ├── entities/
    │   │   │   ├── admin.entity.ts
    │   │   │   ├── user.entity.ts
    │   │   │   ├── seller.entity.ts
    │   │   │   ├── marketing.entity.ts
    │   │   │   ├── telecaller.entity.ts
    │   │   │   ├── auth.entity.ts
    │   │   │   └── cart.entity.ts
    │   │   └── strategies/
    │   │       └── jwt.strategy.ts
    │   └── common/
    │       ├── guards/
    │       │   └── jwt-auth.guard.ts
    │       ├── decorators/
    │       │   └── public.decorator.ts
    │       └── filters/
    │           └── http-exception.filter.ts
    ├── .env
    ├── nest-cli.json
    ├── tsconfig.json
    └── package.json
```

---

## Setup & Run

### Prerequisites
- Node.js >= 18
- MySQL running (local or AWS RDS)
- Redis running on port 6379

### 1. Middleware

```bash
cd middleware
npm install
cp .env.example .env    # Fill in APP_KEY, JWT_SECRET
npm run dev             # nodemon → :3000
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env    # Fill in DB creds, JWT_SECRET, Redis
npm run start:dev       # NestJS watch → :4000
```

### 3. Redis (Docker quick-start)

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### 4. Swagger

Open http://localhost:4000/docs

Click **Authorize** → add your `x-app-key` value.

---

## Login API

### `POST /api/login`

Filters: `appauth`, `cors`

**Request Headers:**
```
x-app-key: your_app_level_key_here
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "web.admin@gmail.com",
  "password": "Admin@123",
  "fcm_token": "optional_fcm_token",
  "device_type": "android",
  "guestID": "guest_abc123"
}
```

**Logic Flow:**
1. Validate `email` not null → 400 if missing
2. MD5-hash the password
3. Query `admin` table → return token if match
4. Query `user` table by `email OR phone` → merge guest cart → return `token + totalQuantity`
5. Query `seller` table (only `acc_status = 'verified'`) → return token
6. Query `marketing` table → return token
7. Query `telecaller` table → return token
8. No match → 401 Invalid credentials

**Response (Admin/Seller/Marketing/Telecaller):**
```json
{ "message": "Login Successful", "token": "eyJ..." }
```

**Response (User):**
```json
{ "message": "Login Successful", "token": "eyJ...", "totalQuantity": 3 }
```

**JWT Payload:**
```json
// Admin / Marketing / Telecaller
{ "name": "Admin", "email": "...", "type": "admin", "iat": 0, "exp": 0 }

// User / Seller
{ "firstName": "John", "lastName": "Doe", "email": "...", "type": "user", "iat": 0, "exp": 0 }
```

---

## Adding New API Modules

```bash
# Generate a new module (e.g. Products)
cd backend
npx nest g module products
npx nest g controller products
npx nest g service products
```

Then in the controller use `@ApiBearerAuth('access-token')` for protected endpoints.

---

## Environment Variables

### Middleware `.env`
| Variable     | Description                     |
|--------------|---------------------------------|
| PORT         | Middleware port (3000)           |
| BACKEND_URL  | NestJS backend URL               |
| JWT_SECRET   | Same secret as backend           |
| APP_KEY      | App-level key for x-app-key header |

### Backend `.env`
| Variable     | Description                     |
|--------------|---------------------------------|
| PORT         | Backend port (4000)              |
| DB_HOST      | MySQL host                       |
| DB_PORT      | MySQL port (3306)                |
| DB_USERNAME  | MySQL username                   |
| DB_PASSWORD  | MySQL password                   |
| DB_NAME      | Database name (automart)         |
| JWT_SECRET   | JWT signing secret               |
| JWT_EXPIRY   | Token expiry (30d)               |
| REDIS_HOST   | Redis host (localhost)           |
| REDIS_PORT   | Redis port (6379)                |
| REDIS_TTL    | Cache TTL in seconds (86400)     |
