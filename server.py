from flask import Flask, request, jsonify
import os
import re
import pdfplumber
import docx
import spacy
from werkzeug.utils import secure_filename
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"pdf", "docx"}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Load spaCy model
nlp = spacy.load("en_core_web_sm")

# Sample skills list (extendable)
STANDARD_SKILLS = [
    "python", "java", "c++", "html", "css", "javascript", "node.js", "react",
    "sql", "mongodb", "flask", "django", "machine learning", "data analysis",
    "docker", "git", "linux", "aws"
]

# === Utility Functions ===
def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_pdf(pdf_path):
    try:
        with pdfplumber.open(pdf_path) as pdf:
            return "\n".join([page.extract_text() for page in pdf.pages if page.extract_text()])
    except Exception as e:
        return ""

def extract_text_from_docx(docx_path):
    try:
        doc = docx.Document(docx_path)
        return "\n".join([para.text for para in doc.paragraphs])
    except Exception as e:
        return ""

def extract_entities(text):
    doc = nlp(text)
    name = ""
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            name = ent.text
            break

    email = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", text)
    phone = re.search(r"\+?\d[\d -]{8,12}\d", text)

    return {
        "name": name if name else "Unknown",
        "email": email.group() if email else "Not Found",
        "phone": phone.group() if phone else "Not Found"
    }

def extract_skills(text):
    found_skills = []
    text = text.lower()
    for skill in STANDARD_SKILLS:
        if skill.lower() in text:
            found_skills.append(skill)
    return found_skills

def score_resume(text, found_skills):
    total_score = 0
    weights = {
        "skills": 50,
        "education": 25,
        "experience": 25
    }

    # Skill score
    skill_score = (len(found_skills) / len(STANDARD_SKILLS)) * weights["skills"]

    # Education presence
    education_keywords = ["b.tech", "b.e", "m.tech", "mca", "bachelor", "master", "degree", "university", "institute"]
    has_education = any(keyword in text.lower() for keyword in education_keywords)
    education_score = weights["education"] if has_education else 0

    # Experience presence
    experience_keywords = ["experience", "intern", "project", "worked", "company"]
    has_experience = any(keyword in text.lower() for keyword in experience_keywords)
    experience_score = weights["experience"] if has_experience else 0

    total_score = skill_score + education_score + experience_score
    return round(total_score, 2)

def extract_resume_data(text):
    personal_info = extract_entities(text)
    skills = extract_skills(text)
    score = score_resume(text, skills)

    return {
        "name": personal_info["name"],
        "email": personal_info["email"],
        "phone": personal_info["phone"],
        "skills": skills,
        "ats_score": score,
        "text_preview": text[:1000]
    }

# === API Endpoint ===
@app.route("/upload", methods=["POST"])
def upload_resume():
    if "resume" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["resume"]

    if file.filename == "" or not allowed_file(file.filename):
        return jsonify({"error": "Invalid file format"}), 400

    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(file_path)

    # Extract text
    if filename.endswith(".pdf"):
        text = extract_text_from_pdf(file_path)
    else:
        text = extract_text_from_docx(file_path)

    if not text.strip():
        return jsonify({"error": "Could not extract text from file"}), 500

    data = extract_resume_data(text)
    return jsonify(data)

if __name__ == "__main__":
    app.run(debug=True)
