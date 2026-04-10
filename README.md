# 🌾 Krushi Seva Kendra ERP

A Mini ERP system for agricultural shop management. Manage products (seeds, fertilizers, pesticides), track orders, maintain farmer records, monitor inventory, and view sales insights.

## 🏗️ Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Backend   | Node.js, Express.js, MongoDB, Mongoose, JWT |
| Frontend  | React (Vite), Tailwind CSS, Axios, React Router |

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.x
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env   # fill in your values
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## 📁 Project Structure

```
krushi-seva-kendra/
├── backend/
│   ├── src/
│   │   ├── config/          # DB connection
│   │   ├── models/          # Mongoose schemas
│   │   ├── controllers/     # Request/response handlers
│   │   ├── routes/          # API route definitions
│   │   ├── middleware/      # Auth, error, logger
│   │   ├── services/        # Business logic (scalable)
│   │   ├── utils/           # Helpers (token, response)
│   │   ├── constants/       # Roles, statuses
│   │   ├── validations/     # Input validation schemas
│   │   ├── app.js
│   │   └── index.js
│   ├── uploads/
│   ├── logs/
│   └── server.js
└── frontend/
    └── src/
        ├── components/      # Reusable UI (common, layout, ui)
        ├── pages/           # Dashboard, Products, Orders, Customers, Login
        ├── features/        # auth, products, orders (Redux slices)
        ├── services/        # Axios API calls
        ├── store/           # Redux store
        ├── hooks/           # Custom hooks
        ├── utils/           # Helper functions
        └── routes/          # App routing
```

## 🔗 API Base URL

```
http://localhost:5000/api
```

## 📮 Postman Collection

Import `Krushi_Seva_Kendra.postman_collection.json` from the root folder.

Set environment variable `baseUrl = http://localhost:5000/api` and `token` (after login).

## 📄 License

MIT
