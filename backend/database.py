import os
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv

# This looks for the .env file in your project root
load_dotenv()

db = SQLAlchemy()

def init_db(app):
    # Grab the values from the .env file
    user = os.getenv('DB_USER')
    password = os.getenv('DB_PASSWORD')
    host = os.getenv('DB_HOST')
    name = os.getenv('DB_NAME')

    # Construct the connection string using the variables
    # Format: mysql+mysqlconnector://user:password@host/dbname
    app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+mysqlconnector://{user}:{password}@{host}/{name}"
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)