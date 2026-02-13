from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/home")
def hello():
    return jsonify({"message": "Homepage Template"})

if __name__ == "__main__":
    app.run(debug=True)
