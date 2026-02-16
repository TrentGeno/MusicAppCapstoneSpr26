from flask import Flask
from database import db, init_db

app = Flask(__name__)
init_db(app) # Initializes the connection defined in the other file

@app.route('/')
def index():
    return "Connected to MusicApp DB!"

if __name__ == "__main__":
    app.run(debug=True)
