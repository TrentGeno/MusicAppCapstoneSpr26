
# Music App

A full-stack music library application built with React and Flask.

## Setup

### Frontend
```bash
# Create frontend folder
mkdir frontend
cd frontend

# Create Vite React project
npm create vite@latest . -- --template react -- --variant js+swc

# Install dependencies
npm install
```

### Backend
```bash
# Create backend folder
mkdir backend
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # On Windows
# or
source venv/bin/activate  # On macOS/Linux

# Install dependencies
pip install flask flask-cors flask-sqlalchemy flask-jwt-extended
pip freeze > requirements.txt
```

## Running the Project

### Start Flask Backend
```bash
cd backend
python app.py
```

### Start React Frontend
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5174
- Backend API: http://127.0.0.1:5000
