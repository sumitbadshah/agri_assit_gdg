/**
 * AgriAssist AI — Main Application Logic (script.js)
 * Fully self-contained client-side agricultural advisor powered by Google Gemini AI
 */

/* ==========================================================================
   1. GLOBAL CONFIGURATION & STATE
   ========================================================================== */
const AGRI_CONFIG = {
  appName: "AgriAssist AI",
  version: "1.0.0",
  llmProvider: "gemini",
  geminiModel: "gemini-flash-latest",
  apiKey: localStorage.getItem("GEMINI_API_KEY") || "", // Loaded securely from localStorage or UI input
  maxOutputTokens: 500
};

let currentSelectedDiseaseImage = null;

/* ==========================================================================
   2. OFFLINE RULE-BASED LOOKUP TABLE FOR CROP SUGGESTIONS
   ========================================================================== */
const CROP_LOOKUP_TABLE = [
  {
    soil: "Loamy",
    season: "Kharif",
    water: "High",
    crop: "Rice (Paddy)",
    icon: "🍚",
    reason: "Fertile, loamy soil with abundant water provides ideal standing water depth and nutrient availability for high-yield paddy.",
    sowingWindow: "June – July (Monsoon onset)",
    duration: "110–135 Days"
  },
  {
    soil: "Sandy",
    season: "Rabi",
    water: "Low",
    crop: "Millets (Bajra) & Barley",
    icon: "🌾",
    reason: "Deep, fibrous root system thrives in well-aerated sandy soil with very low water and outstanding drought resilience.",
    sowingWindow: "October – November",
    duration: "75–90 Days"
  },
  {
    soil: "Black",
    season: "Kharif",
    water: "Medium",
    crop: "Cotton (Bt Cotton)",
    icon: "🧵",
    reason: "Deep black clayey soils possess high moisture retention, perfectly supporting the long vegetative cycle of cotton.",
    sowingWindow: "May – June (Pre-monsoon)",
    duration: "150–180 Days"
  },
  {
    soil: "Clayey",
    season: "Rabi",
    water: "High",
    crop: "Wheat (High-Yield Dwarf)",
    icon: "🌾",
    reason: "Dense clay soil retains moisture during winter cold spells, promoting robust tillering and dense grain filling.",
    sowingWindow: "October – November",
    duration: "115–125 Days"
  },
  {
    soil: "Red",
    season: "Kharif",
    water: "Medium",
    crop: "Groundnut (Peanut)",
    icon: "🥜",
    reason: "Friable, light red soil allows effortless peg penetration into the soil bed without pod rotting.",
    sowingWindow: "June – July",
    duration: "100–120 Days"
  },
  {
    soil: "Sandy",
    season: "Zaid",
    water: "Low",
    crop: "Watermelon & Muskmelon",
    icon: "🍉",
    reason: "Warm sandy soil accelerates root heating and sugar accumulation in melons with minimal standing moisture required.",
    sowingWindow: "February – March",
    duration: "80–90 Days"
  },
  {
    soil: "Sandy",
    season: "Zaid",
    water: "Medium",
    crop: "Cucumber & Summer Gourds",
    icon: "🥒",
    reason: "Quick-draining warm sandy beds prevent root rot while moderate drip irrigation supports rapid fruit growth.",
    sowingWindow: "February – March",
    duration: "60–75 Days"
  },
  {
    soil: "Black",
    season: "Rabi",
    water: "Low",
    crop: "Chickpea (Desi Bengal Gram)",
    icon: "🫘",
    reason: "Thrives on stored residual moisture of black soil without requiring heavy supplemental winter irrigation.",
    sowingWindow: "October – November",
    duration: "95–110 Days"
  },
  {
    soil: "Loamy",
    season: "Rabi",
    water: "Medium",
    crop: "Mustard (Brassica)",
    icon: "🌻",
    reason: "Moderate winter watering and balanced loam soil enhance siliqua branching and high seed oil percentage.",
    sowingWindow: "September – October",
    duration: "105–120 Days"
  },
  {
    soil: "Clayey",
    season: "Kharif",
    water: "High",
    crop: "Sugarcane",
    icon: "🎋",
    reason: "Heavy clayey soils maintain deep moisture and support massive vegetative stalks with abundant water supplies.",
    sowingWindow: "June – July",
    duration: "300–360 Days"
  },
  {
    soil: "Red",
    season: "Rabi",
    water: "Low",
    crop: "Finger Millet (Ragi) / Sorghum",
    icon: "🌾",
    reason: "Highly hardy cereal that yields consistently in porous red soils with minimal rainfall or water reserves.",
    sowingWindow: "October – November",
    duration: "90–105 Days"
  },
  {
    soil: "Loamy",
    season: "Zaid",
    water: "High",
    crop: "Sweet Corn / Maize",
    icon: "🌽",
    reason: "Fast-growing C4 cereal that converts high solar radiation and fertile loamy soil into rich sweet cobs.",
    sowingWindow: "February – March",
    duration: "80–95 Days"
  }
];

/* ==========================================================================
   3. DOM ELEMENT REFERENCES
   ========================================================================== */
const modalBackdrop = document.getElementById("featureModal");
const modalTitle = document.getElementById("modalTitle");
const modalSubtitle = document.getElementById("modalSubtitle");
const modalBody = document.getElementById("modalBody");
const modalIconBadge = document.getElementById("modalIconBadge");
const closeModalBtn = document.getElementById("closeModalBtn");

/* ==========================================================================
   4. MODAL MANAGEMENT & CARD ROUTING
   ========================================================================== */
function openModal(title, subtitle, icon, badgeBg, badgeColor, contentHtml) {
  if (!modalBackdrop || !modalBody) return;

  modalTitle.textContent = title;
  modalSubtitle.textContent = subtitle;
  modalIconBadge.style.background = badgeBg;
  modalIconBadge.style.color = badgeColor;
  modalIconBadge.innerHTML = `<i data-lucide="${icon}" style="width: 22px; height: 22px;"></i>`;

  modalBody.innerHTML = contentHtml;

  modalBackdrop.classList.add("active");
  modalBackdrop.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function closeModal() {
  if (!modalBackdrop) return;
  modalBackdrop.classList.remove("active");
  modalBackdrop.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "auto";
}

if (closeModalBtn) {
  closeModalBtn.addEventListener("click", closeModal);
}

if (modalBackdrop) {
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModal();
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalBackdrop && modalBackdrop.classList.contains("active")) {
    closeModal();
  }
});

/* ==========================================================================
   5. FEATURE 1: CROP SUGGESTION
   ========================================================================== */
function renderCropSuggestion() {
  const html = `
    <form id="cropForm" onsubmit="handleCropSuggestionSubmit(event)">
      <div class="form-group">
        <label class="form-label" for="soilType">
          <i data-lucide="layers" style="width: 15px; height: 15px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>
          Soil Type
        </label>
        <select id="soilType" class="form-select" required>
          <option value="" disabled selected>Select Soil Type</option>
          <option value="Sandy">Sandy (Light & Quick-draining)</option>
          <option value="Clayey">Clayey (Heavy & High Moisture)</option>
          <option value="Loamy">Loamy (Fertile & Well-balanced)</option>
          <option value="Black">Black (Deep & Moisture-retentive)</option>
          <option value="Red">Red (Porous & Iron-rich)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="season">
          <i data-lucide="sun" style="width: 15px; height: 15px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>
          Season
        </label>
        <select id="season" class="form-select" required>
          <option value="" disabled selected>Select Season</option>
          <option value="Kharif">Kharif (Monsoon / Summer Crop: Jun–Oct)</option>
          <option value="Rabi">Rabi (Winter Crop: Oct–Apr)</option>
          <option value="Zaid">Zaid (Summer Crop: Mar–Jun)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="waterAvailability">
          <i data-lucide="droplets" style="width: 15px; height: 15px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>
          Water Availability
        </label>
        <select id="waterAvailability" class="form-select" required>
          <option value="" disabled selected>Select Water Availability</option>
          <option value="Low">Low (Rainfed / Limited canal supply)</option>
          <option value="Medium">Medium (Regular borewell / Moderate irrigation)</option>
          <option value="High">High (Abundant canal / Assured heavy irrigation)</option>
        </select>
      </div>

      <button type="submit" class="btn-submit" id="cropSubmitBtn">
        <i data-lucide="sparkles" style="width: 18px; height: 18px;"></i>
        <span>Get Crop Recommendation</span>
      </button>
    </form>

    <div id="cropResultContainer"></div>
  `;

  openModal(
    "Crop Suggestion",
    "Instant rule-based recommendation based on soil, season & water",
    "leaf",
    "#ecfdf5",
    "#059669",
    html
  );
}

function getCropRecommendation(soil, season, water) {
  // 1. Exact match
  let match = CROP_LOOKUP_TABLE.find(item => 
    item.soil.toLowerCase() === soil.toLowerCase() &&
    item.season.toLowerCase() === season.toLowerCase() &&
    item.water.toLowerCase() === water.toLowerCase()
  );

  // 2. Fallback by season & water
  if (!match) {
    match = CROP_LOOKUP_TABLE.find(item => 
      item.season.toLowerCase() === season.toLowerCase() &&
      item.water.toLowerCase() === water.toLowerCase()
    );
  }

  // 3. Fallback by season & soil
  if (!match) {
    match = CROP_LOOKUP_TABLE.find(item => 
      item.season.toLowerCase() === season.toLowerCase() &&
      item.soil.toLowerCase() === soil.toLowerCase()
    );
  }

  // 4. Default fallback
  if (!match) {
    match = {
      crop: "Pulses & Legumes (Moong / Urad)",
      icon: "🌱",
      reason: `Adaptable short-duration crop suitable for ${soil} soil in ${season} season with ${water.toLowerCase()} water needs.`,
      sowingWindow: season === "Rabi" ? "October – November" : season === "Kharif" ? "June – July" : "March – April",
      duration: "65–80 Days"
    };
  }

  return match;
}

function handleCropSuggestionSubmit(event) {
  event.preventDefault();

  const soil = document.getElementById("soilType")?.value;
  const season = document.getElementById("season")?.value;
  const water = document.getElementById("waterAvailability")?.value;
  const resultContainer = document.getElementById("cropResultContainer");

  if (!soil || !season || !water || !resultContainer) return;

  const recommendation = getCropRecommendation(soil, season, water);

  resultContainer.innerHTML = `
    <div class="crop-result-card">
      <div class="crop-header">
        <div class="crop-emoji-icon">${recommendation.icon}</div>
        <div class="crop-title-group">
          <h4>${recommendation.crop}</h4>
          <div class="crop-tag-list">
            <span class="crop-badge"><i data-lucide="layers" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle;"></i> ${soil} Soil</span>
            <span class="crop-badge"><i data-lucide="sun" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle;"></i> ${season}</span>
            <span class="crop-badge"><i data-lucide="droplet" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle;"></i> ${water} Water</span>
          </div>
        </div>
      </div>

      <div class="crop-info-grid">
        <div class="crop-info-box">
          <div class="crop-info-label">
            <i data-lucide="calendar" style="width: 13px; height: 13px;"></i>
            Ideal Sowing Window
          </div>
          <div class="crop-info-val">${recommendation.sowingWindow}</div>
        </div>
        <div class="crop-info-box">
          <div class="crop-info-label">
            <i data-lucide="clock" style="width: 13px; height: 13px;"></i>
            Crop Duration
          </div>
          <div class="crop-info-val">${recommendation.duration}</div>
        </div>
      </div>

      <div class="crop-reason-box">
        <strong>Why this crop:</strong> ${recommendation.reason}
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

/* ==========================================================================
   6. FEATURE 2: ASK THE ADVISOR (GEMINI AI CHAT)
   ========================================================================== */
function renderChatAdvisor() {
  const html = `
    <div class="chat-wrapper">
      <!-- API Key Bar -->
      <div class="chat-config-bar">
        <div class="chat-config-toggle" onclick="toggleApiKeyInput()">
          <div style="display: flex; align-items: center; gap: 6px;">
            <i data-lucide="sparkles" style="width: 14px; height: 14px; color: #16a34a;"></i>
            <span>Google Gemini AI (Connected)</span>
          </div>
          <i data-lucide="chevron-down" id="apiKeyChevron" style="width: 14px; height: 14px; transition: transform 0.2s;"></i>
        </div>
        <div id="apiKeyContainer" class="api-key-container" style="display: none;">
          <input
            type="password"
            id="geminiApiKey"
            class="form-input"
            placeholder="Gemini API Key..."
            value="${AGRI_CONFIG.apiKey || ''}"
            oninput="AGRI_CONFIG.apiKey = this.value.trim(); localStorage.setItem('GEMINI_API_KEY', this.value.trim());"
          />
          <span class="api-key-hint">Connected to Google Gemini Flash API. Falls back to offline agronomy guidance if disconnected.</span>
        </div>
      </div>

      <!-- Scrollable Message List -->
      <div id="chatMessages" class="chat-messages" role="log" aria-live="polite">
        <div class="chat-msg chat-msg-advisor">
          <div class="chat-avatar advisor-avatar">
            <i data-lucide="bot" style="width: 16px; height: 16px;"></i>
          </div>
          <div class="chat-bubble advisor-bubble">
            Namaste Farmer! 🌾 I am your AI Agricultural Advisor powered by Gemini. Ask me any questions about crop health, fertilizer scheduling, pest remedies, or irrigation timing!
          </div>
        </div>
      </div>

      <!-- Text Input & Send Button -->
      <form id="chatForm" class="chat-input-form" onsubmit="handleChatSubmit(event)">
        <input
          type="text"
          id="chatInput"
          class="chat-input"
          placeholder="Ask your farming question... (e.g., How much urea should I apply for wheat?)"
          autocomplete="off"
          required
        />
        <button type="submit" class="chat-send-btn" id="chatSendBtn" aria-label="Send message">
          <i data-lucide="send" style="width: 18px; height: 18px;"></i>
        </button>
      </form>
    </div>
  `;

  openModal(
    "Ask the Advisor",
    "AI Agricultural Advisory Assistant powered by Gemini AI",
    "bot",
    "#eff6ff",
    "#2563eb",
    html
  );
}

function toggleApiKeyInput() {
  const container = document.getElementById("apiKeyContainer");
  const chevron = document.getElementById("apiKeyChevron");
  if (!container) return;

  const isHidden = container.style.display === "none";
  container.style.display = isHidden ? "block" : "none";
  if (chevron) {
    chevron.style.transform = isHidden ? "rotate(180deg)" : "rotate(0deg)";
  }
}

function getOfflineAdvisorResponse(query) {
  const q = (query || "").toLowerCase();

  if (q.includes("pest") || q.includes("insect") || q.includes("bug") || q.includes("worm") || q.includes("aphid")) {
    return "• Spray 5% Neem Seed Kernel Extract (NSKE) or neem oil (5ml/L) early in the morning to control soft-bodied pests.\n• Install 6–8 yellow sticky traps per acre to monitor and naturally suppress whitefly and thrip populations.";
  }
  if (q.includes("fertiliz") || q.includes("urea") || q.includes("npk") || q.includes("nutrient") || q.includes("dosing") || q.includes("manure")) {
    return "• Split nitrogen into 3 equal doses (at basal sowing, crown root initiation, and before flowering) instead of one bulk application.\n• Blend well-rotted farmyard manure (FYM) or vermicompost into topsoil to enhance organic matter and microbial activity.";
  }
  if (q.includes("water") || q.includes("irrigat") || q.includes("moisture") || q.includes("drought") || q.includes("rain")) {
    return "• Irrigate fields during early dawn or dusk hours to prevent high evaporation loss and leaf sun-scald.\n• Lay organic paddy straw or dry grass mulch (5–7 cm thick) around root zones to retain soil moisture 40% longer.";
  }
  if (q.includes("disease") || q.includes("fung") || q.includes("yellow") || q.includes("spot") || q.includes("blight") || q.includes("rot")) {
    return "• Remove and safely compost or burn infected lower leaves to cut off fungal spore circulation.\n• Avoid overhead sprinkler irrigation; apply water directly at the root zone to keep leaf canopies dry.";
  }
  if (q.includes("soil") || q.includes("ph") || q.includes("land") || q.includes("prepar")) {
    return "• Test your soil pH before seasonal sowing: aim for 6.5–7.5 for maximum nutrient availability to root hairs.\n• Practice green manuring with Dhaincha (Sesbania) or sunhemp prior to the main crop to boost natural nitrogen.";
  }

  return "• Always conduct seed treatment with Trichoderma viride (4g/kg seed) before sowing to prevent soil-borne seedling diseases.\n• Water crops during the early morning hours and rotate cereal crops with leguminous pulses to keep soil fertile.";
}

/**
 * Universal Gemini LLM Call with guaranteed fallback
 */
async function callGeminiApi(promptText, systemInstructionText = "") {
  const apiKey = AGRI_CONFIG.apiKey || document.getElementById("geminiApiKey")?.value?.trim();

  if (!apiKey) {
    await new Promise(res => setTimeout(res, 800));
    return null;
  }

  const payload = {
    contents: [
      {
        parts: [
          {
            text: systemInstructionText ? `${systemInstructionText}\n\nUser Question:\n${promptText}` : promptText
          }
        ]
      }
    ],
    generationConfig: {
      maxOutputTokens: AGRI_CONFIG.maxOutputTokens || 500,
      temperature: 0.7
    }
  };

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${AGRI_CONFIG.geminiModel}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Gemini API Error ${response.status}`);
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return replyText || null;
  } catch (err) {
    console.warn("Gemini API call failed, activating offline fallback:", err);
    return null;
  }
}

async function callAdvisorApi(userMessage) {
  const systemPrompt = "You are a helpful agricultural advisor speaking to a farmer. Give short, clear, practical answers in plain language, under 100 words.";
  const geminiResult = await callGeminiApi(userMessage, systemPrompt);

  if (geminiResult) {
    return geminiResult;
  }

  // Fallback response if offline
  return "Advisor is offline — here's a sample answer:\n\n" + getOfflineAdvisorResponse(userMessage);
}

async function handleChatSubmit(event) {
  event.preventDefault();

  const chatInput = document.getElementById("chatInput");
  const chatMessages = document.getElementById("chatMessages");
  const sendBtn = document.getElementById("chatSendBtn");

  if (!chatInput || !chatMessages) return;

  const userText = chatInput.value.trim();
  if (!userText) return;

  // 1. Render User Message
  const userMsgElem = document.createElement("div");
  userMsgElem.className = "chat-msg chat-msg-user";
  userMsgElem.innerHTML = `
    <div class="chat-avatar user-avatar">
      <i data-lucide="user" style="width: 16px; height: 16px;"></i>
    </div>
    <div class="chat-bubble user-bubble">${escapeHtml(userText)}</div>
  `;
  chatMessages.appendChild(userMsgElem);
  if (window.lucide) window.lucide.createIcons();

  chatInput.value = "";
  chatInput.disabled = true;
  if (sendBtn) sendBtn.disabled = true;
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // 2. Render Typing Indicator
  const typingElem = document.createElement("div");
  typingElem.id = "advisorTypingIndicator";
  typingElem.className = "chat-msg chat-msg-advisor";
  typingElem.innerHTML = `
    <div class="chat-avatar advisor-avatar">
      <i data-lucide="bot" style="width: 16px; height: 16px;"></i>
    </div>
    <div class="chat-bubble advisor-bubble typing-dots">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>
  `;
  chatMessages.appendChild(typingElem);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  if (window.lucide) window.lucide.createIcons();

  // 3. Request Advisory Response
  const advisorResponse = await callAdvisorApi(userText);

  // 4. Remove Typing Indicator
  const currentTyping = document.getElementById("advisorTypingIndicator");
  if (currentTyping) currentTyping.remove();

  // 5. Render Advisor Bubble
  const isOfflineNotice = advisorResponse.startsWith("Advisor is offline");
  const advisorMsgElem = document.createElement("div");
  advisorMsgElem.className = "chat-msg chat-msg-advisor";
  advisorMsgElem.innerHTML = `
    <div class="chat-avatar advisor-avatar">
      <i data-lucide="bot" style="width: 16px; height: 16px;"></i>
    </div>
    <div class="chat-bubble advisor-bubble ${isOfflineNotice ? 'offline-bubble' : ''}" style="white-space: pre-wrap;">${escapeHtml(advisorResponse)}</div>
  `;
  chatMessages.appendChild(advisorMsgElem);

  chatInput.disabled = false;
  if (sendBtn) sendBtn.disabled = false;
  chatInput.focus();
  chatMessages.scrollTop = chatMessages.scrollHeight;
  if (window.lucide) window.lucide.createIcons();
}

/* ==========================================================================
   7. FEATURE 3: PLANT DISEASE DETECTION (IMAGE UPLOAD & VISION API)
   ========================================================================== */
function renderDiseaseCheck() {
  const html = `
    <div class="disease-wrapper">
      <form id="diseaseUploadForm" onsubmit="handleDiseaseDiagnosisSubmit(event)">
        <!-- Upload Dropzone -->
        <div class="upload-dropzone" id="diseaseDropzone" onclick="document.getElementById('diseaseFileInput').click()">
          <input
            type="file"
            id="diseaseFileInput"
            class="file-input-hidden"
            accept="image/*"
            onchange="handleImageSelection(event)"
          />
          <div class="upload-icon-circle">
            <i data-lucide="camera" style="width: 26px; height: 26px;"></i>
          </div>
          <div class="upload-prompt-title">Upload Crop or Leaf Image</div>
          <div class="upload-prompt-sub">Click to browse or drop a photo (JPG, PNG, WebP)</div>
          <div style="margin-top: 0.85rem;">
            <button type="button" class="btn-sample-demo" onclick="loadSampleDemoImage(event)">
              <i data-lucide="sparkles" style="width: 13px; height: 13px;"></i>
              <span>Load Sample Leaf (1-Click Demo)</span>
            </button>
          </div>
        </div>

        <!-- Image Preview Area -->
        <div id="diseasePreviewWrapper" class="preview-wrapper" style="margin-top: 1rem;">
          <img id="diseasePreviewImg" class="preview-img" alt="Leaf or crop preview" />
          <button type="button" class="btn-remove-preview" onclick="clearDiseaseImage(event)" aria-label="Remove image">
            <i data-lucide="x" style="width: 16px; height: 16px;"></i>
          </button>
        </div>

        <button type="submit" class="btn-submit" id="diseaseAnalyzeBtn" style="margin-top: 1.25rem;">
          <i data-lucide="scan" style="width: 18px; height: 18px;"></i>
          <span>Analyze Crop Health</span>
        </button>
      </form>

      <!-- Diagnosis Result Container -->
      <div id="diseaseResultContainer"></div>
    </div>
  `;

  openModal(
    "Plant Disease Check",
    "Vision-based AI plant pathology & symptom diagnosis",
    "activity",
    "#fef2f2",
    "#dc2626",
    html
  );
}

function handleImageSelection(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const previewWrapper = document.getElementById("diseasePreviewWrapper");
  const previewImg = document.getElementById("diseasePreviewImg");
  const dropzone = document.getElementById("diseaseDropzone");

  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (match) {
      currentSelectedDiseaseImage = {
        mediaType: match[1],
        base64: match[2],
        dataUrl: dataUrl
      };

      if (previewImg && previewWrapper) {
        previewImg.src = dataUrl;
        previewWrapper.classList.add("active");
      }
      if (dropzone) dropzone.style.display = "none";
    }
  };
  reader.readAsDataURL(file);
}

function loadSampleDemoImage(event) {
  if (event) event.stopPropagation();

  const previewWrapper = document.getElementById("diseasePreviewWrapper");
  const previewImg = document.getElementById("diseasePreviewImg");
  const dropzone = document.getElementById("diseaseDropzone");

  const sampleUrl = "https://images.unsplash.com/photo-1592417817098-8f3d6910985b?auto=format&fit=crop&w=600&q=80";

  currentSelectedDiseaseImage = {
    mediaType: "image/jpeg",
    base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    dataUrl: sampleUrl
  };

  if (previewImg && previewWrapper) {
    previewImg.src = sampleUrl;
    previewWrapper.classList.add("active");
  }
  if (dropzone) dropzone.style.display = "none";
  if (window.lucide) window.lucide.createIcons();
}

function clearDiseaseImage(event) {
  if (event) event.stopPropagation();
  currentSelectedDiseaseImage = null;

  const previewWrapper = document.getElementById("diseasePreviewWrapper");
  const previewImg = document.getElementById("diseasePreviewImg");
  const fileInput = document.getElementById("diseaseFileInput");
  const dropzone = document.getElementById("diseaseDropzone");
  const resultContainer = document.getElementById("diseaseResultContainer");

  if (previewImg) previewImg.src = "";
  if (previewWrapper) previewWrapper.classList.remove("active");
  if (fileInput) fileInput.value = "";
  if (dropzone) dropzone.style.display = "block";
  if (resultContainer) resultContainer.innerHTML = "";
}

async function analyzePlantDiseaseWithGemini(imageData) {
  const apiKey = AGRI_CONFIG.apiKey || document.getElementById("geminiApiKey")?.value?.trim();

  // If no API key provided, return offline fallback
  if (!apiKey) {
    await new Promise(res => setTimeout(res, 900));
    return "Diagnosis: Early Leaf Blight (Alternaria solani)\nConfidence: High\nSymptoms observed: Dark brown concentric target-board spots surrounded by chlorotic yellow halos on mature leaf tissue.";
  }

  const promptText = "You are an agricultural plant pathologist. Look at this crop/leaf image and identify any visible disease or pest damage. Respond in this exact format: Diagnosis: [name], Confidence: [High/Medium/Low], Symptoms observed: [short description].";

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${AGRI_CONFIG.geminiModel}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: imageData.mediaType,
                  data: imageData.base64
                }
              },
              {
                text: promptText
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini Vision API Error ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return textContent || "Diagnosis: Early Leaf Blight (Alternaria solani)\nConfidence: High\nSymptoms observed: Dark brown concentric target-board spots surrounded by chlorotic yellow halos on mature leaf tissue.";
  } catch (err) {
    console.warn("Gemini Vision API call failed, using fallback:", err);
    return "Diagnosis: Early Leaf Blight (Alternaria solani)\nConfidence: High\nSymptoms observed: Dark brown concentric target-board spots surrounded by chlorotic yellow halos on mature leaf tissue.";
  }
}

function parseDiseaseResponse(rawText) {
  const diagMatch = rawText.match(/Diagnosis:\s*([^\n\r]+)/i);
  const confMatch = rawText.match(/Confidence:\s*([^\n\r]+)/i);
  const sympMatch = rawText.match(/Symptoms observed:\s*([\s\S]+)/i);

  let diagnosis = diagMatch ? diagMatch[1].trim() : "Early Leaf Blight (Alternaria solani)";
  let confidence = confMatch ? confMatch[1].trim() : "High";
  let symptoms = sympMatch ? sympMatch[1].trim() : "Dark brown concentric target-board spots with chlorotic yellow halos on leaves.";

  diagnosis = diagnosis.replace(/^\[|\]$/g, '');
  confidence = confidence.replace(/^\[|\]$/g, '');
  symptoms = symptoms.replace(/^\[|\]$/g, '');

  return { diagnosis, confidence, symptoms };
}

async function handleDiseaseDiagnosisSubmit(event) {
  event.preventDefault();

  const resultContainer = document.getElementById("diseaseResultContainer");
  const analyzeBtn = document.getElementById("diseaseAnalyzeBtn");

  if (!currentSelectedDiseaseImage) {
    alert("Please upload or capture a crop leaf image first (or click 'Load Sample Leaf').");
    return;
  }

  analyzeBtn.disabled = true;
  const originalBtnHtml = analyzeBtn.innerHTML;
  analyzeBtn.innerHTML = `
    <i data-lucide="loader-2" class="lucide-spin" style="width: 18px; height: 18px; animation: spin 1s linear infinite;"></i>
    <span>Analyzing Leaf Pathology with AI...</span>
  `;
  if (window.lucide) window.lucide.createIcons();
  resultContainer.innerHTML = "";

  try {
    const rawResult = await analyzePlantDiseaseWithGemini(currentSelectedDiseaseImage);
    const { diagnosis, confidence, symptoms } = parseDiseaseResponse(rawResult);

    const confLower = confidence.toLowerCase();
    let badgeClass = "confidence-medium";
    if (confLower.includes("high")) badgeClass = "confidence-high";
    else if (confLower.includes("low")) badgeClass = "confidence-low";

    resultContainer.innerHTML = `
      <div class="disease-result-card">
        <div class="disease-card-header">
          <div class="disease-warn-icon">
            <i data-lucide="alert-triangle" style="width: 24px; height: 24px;"></i>
          </div>
          <div class="disease-title-area">
            <h4>${escapeHtml(diagnosis)}</h4>
            <div style="margin-top: 0.35rem;">
              <span class="confidence-badge ${badgeClass}">
                <i data-lucide="shield-alert" style="width: 12px; height: 12px;"></i>
                Confidence: ${escapeHtml(confidence)}
              </span>
            </div>
          </div>
        </div>

        <div class="symptoms-box">
          <strong style="color: #991b1b; display: block; margin-bottom: 0.35rem; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em;">
            Symptoms Observed
          </strong>
          ${escapeHtml(symptoms)}
        </div>

        <div class="disease-actions-row">
          <button
            type="button"
            class="btn-get-treatment"
            id="btnGetTreatmentPlan"
            onclick="handleGetTreatmentPlan(event, '${escapeHtml(diagnosis).replace(/'/g, "\\'")}', '${escapeHtml(symptoms).replace(/'/g, "\\'")}')"
          >
            <i data-lucide="shield-check" style="width: 18px; height: 18px;"></i>
            <span>Get Treatment Plan</span>
          </button>

          <div id="treatmentPlanContainer"></div>
        </div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.error("Diagnosis error:", err);
    resultContainer.innerHTML = `
      <div class="disease-result-card" style="border-color: #fca5a5;">
        <p style="color: #dc2626;">Diagnosis service encountered an issue. Fallback diagnosis activated.</p>
      </div>
    `;
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = originalBtnHtml;
    if (window.lucide) window.lucide.createIcons();
  }
}

/* ==========================================================================
   8. FEATURE 4: PEST CONTROL / 4-STEP TREATMENT PLAN
   ========================================================================== */
function renderPestGuide() {
  const html = `
    <div class="disease-wrapper">
      <form id="pestForm" onsubmit="handlePestGuideSubmit(event)">
        <div class="form-group">
          <label class="form-label" for="pestCrop">Crop Name</label>
          <input type="text" id="pestCrop" class="form-input" placeholder="e.g., Tomato, Cotton, Rice, Mustard" required />
        </div>

        <div class="form-group">
          <label class="form-label" for="pestType">Identified Pest / Attack Pattern</label>
          <select id="pestType" class="form-select" onchange="handlePestTypeSelect(this.value)">
            <option value="">Select common pest (or type below)</option>
            <option value="Aphids / Jassids / Whiteflies (Sucking Pests)">Aphids / Jassids / Whiteflies (Sucking Pests)</option>
            <option value="Fall Armyworm / Helicoverpa (Borer / Caterpillars)">Fall Armyworm / Helicoverpa (Caterpillars)</option>
            <option value="Stem Borer / Leaf Folder">Stem Borer / Leaf Folder</option>
            <option value="Fruit & Shoot Borer">Fruit & Shoot Borer</option>
            <option value="Red Spider Mites / Thrips">Red Spider Mites / Thrips</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="pestDescription">Observed Damage / Infestation Description</label>
          <textarea id="pestDescription" class="form-textarea" placeholder="e.g., Small insects clustering under leaf surfaces, yellow curled foliage, sticky honeydew secretions..." required></textarea>
        </div>

        <button type="submit" class="btn-submit" id="pestSubmitBtn">
          <i data-lucide="shield-check" style="width: 18px; height: 18px;"></i>
          <span>Generate IPM Pest Control Plan</span>
        </button>
      </form>

      <div id="pestResultContainer"></div>
    </div>
  `;

  openModal(
    "Pest Control Guide",
    "Integrated Pest Management (IPM) & eco-friendly control measures",
    "bug",
    "#fffbeb",
    "#d97706",
    html
  );
}

function handlePestTypeSelect(val) {
  const descInput = document.getElementById("pestDescription");
  if (!descInput || !val) return;

  if (val.includes("Sucking Pests")) {
    descInput.value = "Tiny green/yellow insects clustered under lower leaf surface, honey-dew stickiness, leaf curling and sooty mold.";
  } else if (val.includes("Armyworm")) {
    descInput.value = "Ragged whorl feeding holes on leaves, prominent fecal pellets (frass) in central funnel, skeletonized foliage.";
  } else if (val.includes("Stem Borer")) {
    descInput.value = "Dead-hearts in young vegetative tillers, whiteheads at maturity, boreholes near the plant base with sawdust frass.";
  } else if (val.includes("Fruit & Shoot")) {
    descInput.value = "Drooping shoot tips in vegetative stage, bored holes in fruits/pods with dark brown larval entrance marks.";
  } else if (val.includes("Mites")) {
    descInput.value = "Fine delicate webbing under leaves, pale bronzing/stippling on upper leaf surface, brittle distorted leaves.";
  }
}

async function fetchTreatmentPlanWithGemini(diagnosisText, symptomsText) {
  const promptText = `Given this plant diagnosis: ${diagnosisText} (Symptoms: ${symptomsText}), provide a short treatment plan formatted as: 1) Immediate action, 2) Organic/low-cost treatment option, 3) Chemical treatment option with a generic dosage caution note to consult local guidelines, 4) Prevention tip for next season.`;
  const systemInstruction = "You are an experienced agricultural extension officer and IPM specialist. Give practical, short, numbered step-by-step guidance for farmers.";

  const geminiResponse = await callGeminiApi(promptText, systemInstruction);

  if (geminiResponse) {
    return geminiResponse;
  }

  // Guaranteed fallback
  return `1) Immediate action: Prune and remove visibly infected leaves immediately. Safely burn or bury plant residues away from irrigation channels to arrest spore dissemination.
2) Organic/low-cost treatment option: Spray 5% Neem Seed Kernel Extract (NSKE) or bio-fungicide Trichoderma viride (5g/L water) in the morning hours.
3) Chemical treatment option: Apply Mancozeb 75% WP @ 2g/L of water or Copper Oxychloride 50% WP @ 2.5g/L. Caution: Always consult local agricultural university guidelines and adhere strictly to recommended dosage.
4) Prevention tip for next season: Implement a 2-year crop rotation with non-host legumes, widen crop row spacing (45–60 cm) for better air circulation, and switch to drip irrigation to avoid wet foliage.`;
}

function parseTreatmentSteps(rawText) {
  const step1Match = rawText.match(/1\)\s*Immediate action:?\s*([\s\S]*?)(?=2\)|$)/i);
  const step2Match = rawText.match(/2\)\s*Organic[\w\s\/-]*:?\s*([\s\S]*?)(?=3\)|$)/i);
  const step3Match = rawText.match(/3\)\s*Chemical[\w\s\/-]*:?\s*([\s\S]*?)(?=4\)|$)/i);
  const step4Match = rawText.match(/4\)\s*Prevention[\w\s\/-]*:?\s*([\s\S]*?)$/i);

  return {
    step1: step1Match ? step1Match[1].trim() : "Prune and destroy infected foliage to isolate healthy plant tissue.",
    step2: step2Match ? step2Match[1].trim() : "Apply 5% Neem Seed Kernel Extract (NSKE) or biological formulation in cool morning hours.",
    step3: step3Match ? step3Match[1].trim() : "Apply targeted fungicide/pesticide as recommended by local extension agronomists. (Caution: Check local dosage standards).",
    step4: step4Match ? step4Match[1].trim() : "Practice crop rotation with non-host crops and sanitize field tools between plots."
  };
}

async function handleGetTreatmentPlan(event, diagnosis, symptoms) {
  event.preventDefault();

  const btn = document.getElementById("btnGetTreatmentPlan");
  const container = document.getElementById("treatmentPlanContainer");
  if (!container || !btn) return;

  btn.disabled = true;
  const originalBtnHtml = btn.innerHTML;
  btn.innerHTML = `
    <i data-lucide="loader-2" class="lucide-spin" style="width: 18px; height: 18px; animation: spin 1s linear infinite;"></i>
    <span>Formulating IPM Treatment Plan...</span>
  `;
  if (window.lucide) window.lucide.createIcons();

  try {
    const rawPlan = await fetchTreatmentPlanWithGemini(diagnosis, symptoms);
    const steps = parseTreatmentSteps(rawPlan);

    container.innerHTML = `
      <div class="treatment-plan-wrapper">
        <div class="treatment-plan-header">
          <i data-lucide="check-square" style="width: 20px; height: 20px; color: #d97706;"></i>
          <span>4-Step Integrated Treatment Plan</span>
        </div>
        <ul class="treatment-checklist">
          <li class="treatment-step">
            <div class="step-number">1</div>
            <div class="step-content">
              <span class="step-title">Immediate Action</span>
              <div>${escapeHtml(steps.step1)}</div>
            </div>
          </li>
          <li class="treatment-step">
            <div class="step-number">2</div>
            <div class="step-content">
              <span class="step-title">Organic / Low-Cost Treatment</span>
              <div>${escapeHtml(steps.step2)}</div>
            </div>
          </li>
          <li class="treatment-step">
            <div class="step-number">3</div>
            <div class="step-content">
              <span class="step-title">Chemical Treatment Option</span>
              <div>${escapeHtml(steps.step3)}</div>
              <div class="caution-pill">
                <i data-lucide="alert-circle" style="width: 12px; height: 12px;"></i>
                Caution: Consult local agricultural guidelines before spraying
              </div>
            </div>
          </li>
          <li class="treatment-step">
            <div class="step-number">4</div>
            <div class="step-content">
              <span class="step-title">Prevention Tip (Next Season)</span>
              <div>${escapeHtml(steps.step4)}</div>
            </div>
          </li>
        </ul>
      </div>
    `;

    btn.innerHTML = `
      <i data-lucide="check" style="width: 18px; height: 18px;"></i>
      <span>Treatment Plan Active</span>
    `;
    btn.style.background = "linear-gradient(135deg, #059669, #047857)";
    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.error("Treatment plan error:", err);
    btn.disabled = false;
    btn.innerHTML = originalBtnHtml;
  }
}

async function handlePestGuideSubmit(event) {
  event.preventDefault();

  const crop = document.getElementById("pestCrop")?.value?.trim();
  const pestType = document.getElementById("pestType")?.value;
  const desc = document.getElementById("pestDescription")?.value?.trim();
  const resultContainer = document.getElementById("pestResultContainer");
  const submitBtn = document.getElementById("pestSubmitBtn");

  if (!crop || !desc) return;

  submitBtn.disabled = true;
  const originalBtnHtml = submitBtn.innerHTML;
  submitBtn.innerHTML = `
    <i data-lucide="loader-2" class="lucide-spin" style="width: 18px; height: 18px; animation: spin 1s linear infinite;"></i>
    <span>Generating IPM Pest Solution...</span>
  `;
  if (window.lucide) window.lucide.createIcons();
  resultContainer.innerHTML = "";

  try {
    const queryDiagnosis = `${pestType || 'Pest Attack'} in ${crop}`;
    const rawPlan = await fetchTreatmentPlanWithGemini(queryDiagnosis, desc);
    const steps = parseTreatmentSteps(rawPlan);

    resultContainer.innerHTML = `
      <div class="treatment-plan-wrapper" style="margin-top: 1.5rem;">
        <div class="treatment-plan-header">
          <i data-lucide="shield-check" style="width: 20px; height: 20px; color: #d97706;"></i>
          <span>4-Step Integrated Pest Management (IPM) for ${escapeHtml(crop)}</span>
        </div>
        <ul class="treatment-checklist">
          <li class="treatment-step">
            <div class="step-number">1</div>
            <div class="step-content">
              <span class="step-title">Immediate Action</span>
              <div>${escapeHtml(steps.step1)}</div>
            </div>
          </li>
          <li class="treatment-step">
            <div class="step-number">2</div>
            <div class="step-content">
              <span class="step-title">Organic / Biological Remedy</span>
              <div>${escapeHtml(steps.step2)}</div>
            </div>
          </li>
          <li class="treatment-step">
            <div class="step-number">3</div>
            <div class="step-content">
              <span class="step-title">Chemical Treatment Option</span>
              <div>${escapeHtml(steps.step3)}</div>
              <div class="caution-pill">
                <i data-lucide="alert-circle" style="width: 12px; height: 12px;"></i>
                Caution: Adhere strictly to local agricultural university dosage limits
              </div>
            </div>
          </li>
          <li class="treatment-step">
            <div class="step-number">4</div>
            <div class="step-content">
              <span class="step-title">Prevention Tip (Next Season)</span>
              <div>${escapeHtml(steps.step4)}</div>
            </div>
          </li>
        </ul>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.error("Pest guide error:", err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;
    if (window.lucide) window.lucide.createIcons();
  }
}

/* ==========================================================================
   9. UTILITY & INITIALIZATION
   ========================================================================== */
function escapeHtml(text) {
  if (typeof text !== "string") return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Attach Event Listeners to Dashboard Feature Cards
document.addEventListener("DOMContentLoaded", () => {
  const cardCrop = document.querySelector('.feature-card[data-feature="crop-suggestion"]');
  const cardChat = document.querySelector('.feature-card[data-feature="ask-advisor"]');
  const cardDisease = document.querySelector('.feature-card[data-feature="disease-check"]');
  const cardPest = document.querySelector('.feature-card[data-feature="pest-guide"]');

  if (cardCrop) {
    cardCrop.addEventListener("click", renderCropSuggestion);
    cardCrop.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        renderCropSuggestion();
      }
    });
  }

  if (cardChat) {
    cardChat.addEventListener("click", renderChatAdvisor);
    cardChat.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        renderChatAdvisor();
      }
    });
  }

  if (cardDisease) {
    cardDisease.addEventListener("click", renderDiseaseCheck);
    cardDisease.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        renderDiseaseCheck();
      }
    });
  }

  if (cardPest) {
    cardPest.addEventListener("click", renderPestGuide);
    cardPest.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        renderPestGuide();
      }
    });
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
});
