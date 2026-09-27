# AgriAssist AI 🌾

> **Smart AI-Powered Farmer Advisory & Crop Health Platform**  
> Developed for Google Developer Groups (GDG) Hackathon.

AgriAssist AI is a single-page, client-side web application designed to empower smallholder farmers and agricultural extension workers with instant agronomic intelligence, vision-based plant disease diagnostics, crop recommendations, and Integrated Pest Management (IPM) guidance.

---

## 🌟 Key Features

1. **🌱 Crop Suggestion Engine**:
   - Rule-based decision system matching soil type (*Sandy, Clayey, Loamy, Black, Red*), season (*Kharif, Rabi, Zaid*), and water availability (*Low, Medium, High*).
   - Provides recommended crops, sowing windows, crop duration, and rationale.

2. **🤖 Ask the Advisor (AI Chat)**:
   - Intelligent agricultural assistant powered by Google Gemini AI (`gemini-flash-latest`).
   - Responds in clear, actionable, farmer-friendly agronomic guidance with guaranteed offline fallback advice.

3. **🔍 Plant Disease Check (Vision AI)**:
   - Vision-based leaf and crop pathology analysis.
   - Accurately identifies diseases, confidence levels (*High/Medium/Low*), and observed symptoms from uploaded or captured images.
   - Includes a 1-click sample leaf for pitch presentations.

4. **🛡️ Pest Control & IPM Guide**:
   - Generates 4-step Integrated Pest Management (IPM) plans:
     1. Immediate action
     2. Organic / Biological remedy
     3. Chemical treatment with safety cautions
     4. Prevention tips for subsequent crop cycles

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, Modern Vanilla CSS3, ES6+ JavaScript
- **AI / LLM**: Google Gemini API (`gemini-flash-latest` Multimodal & Text)
- **Icons**: Lucide Icons
- **Typography**: Inter & Outfit (Google Fonts)
- **Zero Build Step**: Fully self-contained, no `npm build` or backend server required.

---

## 🚀 Quick Start

1. Clone this repository:
   ```bash
   git clone https://github.com/sumitbadshah/agri_assit_gdg.git
   cd agri_assit_gdg
   ```

2. Open `index.html` directly in any modern web browser or run with a local live server:
   ```bash
   # Using Python
   python -m http.server 8000
   ```
   Open `http://localhost:8000` in your browser.

---

## 📄 License
MIT License
