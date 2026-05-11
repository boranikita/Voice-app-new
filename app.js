// ==============================
// DATA STRUCTURE & STATE
// ==============================
const areaList = [
  "Crown", "Forehead", "Ajna", "Throat", "Front Heart", "Back Heart", 
  "Front Solar Plexus", "Back Solar Plexus", "Front Spleen", 
  "Back Spleen", "Navel", "Meng Mein", "Sex", "Basic"
];
const sortedAreaList = [...areaList].sort((a, b) => b.length - a.length);

const tableData = {};
areaList.forEach(area => {
  const safeId = area.toLowerCase().replace(/\s+/g, "");
  tableData[safeId] = { 
    before: { activation: "-", energy: "-" }, 
    after: { activation: "-", energy: "-" },
    originalName: area 
  };
});

// Active States
let activeChakra = null;
let activePhase = null;
let activeMode = null;

// Timers
let resetTimeout = null; 
let idleTimeout = null; 

// DOM Elements
let statusEl, heardEl;

// ==============================
// SPEECH RECOGNITION SETUP
// ==============================
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isRecording = false;

function initSpeech() {
  if (!SpeechRecognition) return alert("Speech Recognition not supported. Use Chrome.");
  const r = new SpeechRecognition();
  r.continuous = true;
  r.interimResults = true; 
  r.lang = "en-US";

  r.onstart = () => {
    isRecording = true;
    statusEl.innerHTML = "🎤 <strong>Listening...</strong>";
    statusEl.style.color = "green";
  };

  r.onend = () => {
    if (isRecording) r.start(); 
    else {
      statusEl.innerHTML = "⛔ <strong>Stopped</strong>";
      statusEl.style.color = "black";
    }
  };

  r.onresult = (event) => {
    let finalTranscript = "";
    let interimTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      else interimTranscript += event.results[i][0].transcript;
    }
    
    const textToParse = (finalTranscript || interimTranscript).toLowerCase().trim();
    heardEl.innerHTML = `"${textToParse}"`;
    
    parseRealTimeSpeech(textToParse);
  };
  return r;
}

// ==============================
// LOGIC: SPEECH PARSING
// ==============================
function parseRealTimeSpeech(transcript) {

  // --- SYSTEM VOICE COMMAND ---
  if (transcript.includes("download")) {
    downloadCSV();
    return;
  }

  // --- 1. GHOST WORD FILTER ---
  let containsChakra = false;
  for (let area of sortedAreaList) {
    if (new RegExp("\\b" + area.toLowerCase() + "\\b").test(transcript)) {
      containsChakra = true;
      break;
    }
  }

  // If the 1.5s reset timer is ticking (a command just successfully finished),
  // we completely ignore trailing split words (like a late "activated")
  // UNLESS the user is explicitly starting a new command with a Chakra name.
  if (resetTimeout && !containsChakra) {
    return;
  }

  // --- 2. DATA ENTRY COMMANDS ---

  // Check Chakra 
  if (containsChakra) {
    for (let area of sortedAreaList) {
      const exactWordRegex = new RegExp("\\b" + area.toLowerCase() + "\\b");
      if (exactWordRegex.test(transcript)) {
        selectChakra(area);
        break; 
      }
    }
  }

  // Check Phase 
  if (/\bbefore\b/.test(transcript)) selectPhase("before");
  else if (/\bafter\b/.test(transcript)) selectPhase("after");

  // Check Mode (With Scrubbing)
  // We temporarily remove "over/under activated" from the transcript 
  // so they don't accidentally trick the system into highlighting the Activation Mode!
  const textForMode = transcript.replace(/over\s*activat\w*/g, "").replace(/under\s*activat\w*/g, "");
  
  if (/\bactivat/.test(textForMode)) selectMode("activation"); 
  else if (/\benergy\b/.test(textForMode)) selectMode("energy");

  // Check State/Value
  if (/\bover/.test(transcript)) selectValue("O"); 
  else if (/\bunder/.test(transcript)) selectValue("U"); 
  else if (/\bnormal/.test(transcript)) selectValue("N");
  else if (/\bcongest/.test(transcript)) selectValue("C");
  else if (/\bdeplet/.test(transcript)) selectValue("D");
}

// ==============================
// LOGIC: UI UPDATERS
// ==============================
function updateTableHeadersUI() {
  // Forcefully clear ALL header cells
  document.querySelectorAll('th').forEach(th => {
    th.style.backgroundColor = "";
    th.style.color = "";
  });

  // Apply active Phase color
  if (activePhase) {
    const phaseEl = document.getElementById(`th-${activePhase}`);
    if(phaseEl) phaseEl.style.backgroundColor = "#c3e6cb"; 
  }

  // Apply active Mode color
  if (activePhase && activeMode) {
    const modeEl = document.getElementById(`th-${activePhase}-${activeMode}`);
    if (modeEl) {
      modeEl.style.backgroundColor = "#28a745";
      modeEl.style.color = "white";
    }
  }
}

// ==============================
// SAFETY NET: IDLE TIMER
// ==============================
// Give the user 60 seconds (1 minute) between words to complete the command
function resetIdleTimer() {
  if (idleTimeout) clearTimeout(idleTimeout);
  idleTimeout = setTimeout(() => {
    resetAllSelections();
  }, 60000); 
}

// ==============================
// LOGIC: STATE SELECTIONS 
// ==============================
function selectChakra(area) {
  if (resetTimeout) { clearTimeout(resetTimeout); resetTimeout = null; resetAllSelections(); }
  resetIdleTimer(); // Start 60-second safety net

  activeChakra = area;
  const safeId = area.toLowerCase().replace(/\s+/g, "");
  
  // Highlight Palette Button
  document.querySelectorAll('.btn-chakra').forEach(btn => btn.classList.remove('active-btn'));
  const btn = document.getElementById(`btn-chakra-${safeId}`);
  if(btn) btn.classList.add('active-btn');

  // Clear all name cells first
  document.querySelectorAll("td[id^='name-']").forEach(cell => {
    cell.style.backgroundColor = "";
    cell.style.color = "";
  });
  
  // Highlight active name cell
  const nameCell = document.getElementById(`name-${safeId}`);
  if (nameCell) {
    nameCell.style.backgroundColor = "#28a745";
    nameCell.style.color = "white";
  }
}

function selectPhase(phase) {
  if (resetTimeout) { clearTimeout(resetTimeout); resetTimeout = null; resetAllSelections(); }
  resetIdleTimer(); // Start 60-second safety net
  
  activePhase = phase;

  document.getElementById("btn-phase-before").classList.remove("active-btn");
  document.getElementById("btn-phase-after").classList.remove("active-btn");
  document.getElementById(`btn-phase-${phase}`).classList.add("active-btn");

  updateTableHeadersUI();
}

function selectMode(mode) {
  if (resetTimeout) { clearTimeout(resetTimeout); resetTimeout = null; resetAllSelections(); }
  resetIdleTimer(); // Start 60-second safety net

  activeMode = mode;

  document.getElementById("btn-mode-activation").classList.remove("active-btn");
  document.getElementById("btn-mode-energy").classList.remove("active-btn");
  document.getElementById(`btn-mode-${mode}`).classList.add("active-btn");

  updateTableHeadersUI();
}

function selectValue(letterCode) {
  if (!activeChakra || !activePhase || !activeMode) {
    heardEl.innerHTML = "<span style='color:red;'>Select Chakra, Phase, and Mode first!</span>";
    return;
  }

  // Command was successful! Clear ALL waiting timers.
  if (resetTimeout) clearTimeout(resetTimeout);
  if (idleTimeout) clearTimeout(idleTimeout); 

  // Highlight State Button
  document.querySelectorAll("button[onclick^='selectValue']").forEach(btn => btn.classList.remove('active-btn'));
  const stateBtn = document.querySelector(`button[onclick="selectValue('${letterCode}')"]`);
  if (stateBtn) stateBtn.classList.add('active-btn');

  // Save to Memory
  const safeAreaId = activeChakra.toLowerCase().replace(/\s+/g, "");
  tableData[safeAreaId][activePhase][activeMode] = letterCode;

  // Print to Table Cell
  const cellId = `${safeAreaId}-${activePhase}-${activeMode}`;
  const cell = document.getElementById(cellId);
  
  if (cell) {
    cell.innerText = letterCode; 
    cell.style.backgroundColor = "#28a745";
    cell.style.color = "white"; 
    cell.style.fontWeight = "bold";

    setTimeout(() => {
        cell.style.backgroundColor = "#d4f7d4"; 
        cell.style.color = "black";
        cell.style.fontWeight = "normal";
        setTimeout(() => { cell.style.backgroundColor = ""; }, 1500);
    }, 500);
  }

  // Trigger Full Fast Reset after 1.5 seconds so it instantly clears for the next row
  resetTimeout = setTimeout(() => {
    resetAllSelections();
  }, 1500);
}

// ==============================
// RESET FUNCTION
// ==============================
function resetAllSelections() {
  activeChakra = null;
  activePhase = null;
  activeMode = null;

  // Wipe all buttons
  document.querySelectorAll('button').forEach(btn => {
    btn.classList.remove('active-btn');
  });

  // Wipe table names
  document.querySelectorAll("td[id^='name-']").forEach(cell => {
    cell.style.backgroundColor = "";
    cell.style.color = "";
  });

  // Wipe table headers
  document.querySelectorAll('th').forEach(th => {
    th.style.backgroundColor = "";
    th.style.color = "";
  });
}

// ==============================
// CONTROLS & UTILS
// ==============================
async function startRecording() {
  try {
    if (!recognition) recognition = initSpeech();
    await navigator.mediaDevices.getUserMedia({ audio: true });
    isRecording = true;
    recognition.start();
  } catch (err) {
    statusEl.innerText = "❌ Mic permission denied";
  }
}

function stopRecording() {
  isRecording = false;
  if (recognition) recognition.stop();
  statusEl.innerHTML = "⛔ <strong>Stopped</strong>";
}

function speakWord(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); 
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 0.9;     
    window.speechSynthesis.speak(u);
  }
}

let isDownloading = false;
function downloadCSV() {
  if (isDownloading) return; 
  isDownloading = true;
  
  statusEl.innerHTML = "📥 <strong style='color:#0056b3;'>Downloading...</strong>";

  let csv = "Point/Area,Before Activation,Before Energy,After Activation,After Energy\n";
  for (let c in tableData) {
    csv += `${tableData[c].originalName},${tableData[c].before.activation},${tableData[c].before.energy},${tableData[c].after.activation},${tableData[c].after.energy}\n`;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "energy_data.csv";
  
  document.body.appendChild(a); 
  a.click();
  document.body.removeChild(a);

  setTimeout(() => { 
    isDownloading = false; 
    if (isRecording) {
      statusEl.innerHTML = "🎤 <strong>Listening...</strong>";
      statusEl.style.color = "green";
    } else {
      statusEl.innerHTML = "⛔ <strong>Stopped</strong>";
      statusEl.style.color = "black";
    }
  }, 2000); 
}

// ==============================
// INIT ON LOAD
// ==============================
window.addEventListener("DOMContentLoaded", () => {
  statusEl = document.getElementById("status");
  heardEl = document.getElementById("heardStatus");

  document.getElementById("startRecording").addEventListener("click", startRecording);
  document.getElementById("stopRecording").addEventListener("click", stopRecording);

  const btnContainer = document.getElementById("chakra-buttons-container");
  areaList.forEach(area => {
    const safeId = area.toLowerCase().replace(/\s+/g, "");
    const btn = document.createElement("button");
    btn.className = "opt-btn btn-chakra";
    btn.id = `btn-chakra-${safeId}`;
    btn.innerText = area;
    btn.onclick = () => selectChakra(area);
    btnContainer.appendChild(btn);
  });

  const tbody = document.getElementById("dynamicTableBody");
  areaList.forEach(area => {
    const safeId = area.toLowerCase().replace(/\s+/g, "");
    const tr = document.createElement("tr");
    
    tr.innerHTML = `
      <td id="name-${safeId}">
        <strong>${area}</strong>
        <button class="speak-btn" onclick="speakWord('${area}')" title="Hear Pronunciation">🔊</button>
      </td>
      <td id="${safeId}-before-activation" class="transition-bg">-</td>
      <td id="${safeId}-before-energy" class="transition-bg">-</td>
      <td id="${safeId}-after-activation" class="transition-bg">-</td>
      <td id="${safeId}-after-energy" class="transition-bg">-</td>
    `;
    tbody.appendChild(tr);
  });
});