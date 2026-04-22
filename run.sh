# 1. Run the Backend 
uvicorn app.main:app --reload

# Backend - http://127.0.0.1:8000/health

# 2. Run the Frontend 
npm run dev

# The UI will be available at http://127.0.0.1:<port>/login where port is assigned by npm run dev and check in terminal.