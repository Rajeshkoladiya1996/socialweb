# 🌐 Social Web

A full-stack social media application with image support, likes, user profiles, and JWT authentication.

---

## 🛠 Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/)
- **Backend**: [Node.js](https://nodejs.org/), [Express](https://expressjs.com/)
- **Database**: MySQL
- **Authentication**: JWT
- **File Uploads**: Multer
- **ORM**: Raw SQL with Promise-based connection pool

---

## ⚙️ Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/Rajeshkoladiya1996/socialweb.git
cd socialweb
```

---

## 📦 Backend Setup

### 2. Install dependencies

```bash
cd backend
npm install
```

### 3. Create `.env` file in `backend/`

```env
PORT=5000
JWT_SECRET=your_jwt_secret
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=socialweb
```

### 4. Start the backend server

```bash
node server.js
```

Server will run at: `http://localhost:5000`

---

## 💻 Frontend Setup

### 5. Install dependencies

```bash
cd ../frontend
npm install
```

### 6. Create `.env.local` file in `frontend/`

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 7. Run the frontend development server

```bash
npm run dev
```

Frontend will run at: `http://localhost:3000`

---

## 🧑‍💻 Author

**Rajesh Koladiya**
🔗 [GitHub](https://github.com/Rajeshkoladiya1996)

---

