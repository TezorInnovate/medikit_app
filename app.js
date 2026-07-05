import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, set, update, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// TODO: Replace with your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyCXMze8mtNtwObI3sS9V8fWrRwgorWuthc",
  authDomain: "medikit-ad410.firebaseapp.com",
  databaseURL: "https://medikit-ad410-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "medikit-ad410",
  storageBucket: "medikit-ad410.firebasestorage.app",
  messagingSenderId: "961350110233",
  appId: "1:961350110233:web:294f690eb0a60df9ac6e88"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM Elements
const drawersContainer = document.getElementById('drawersContainer');
const openAllBtn = document.getElementById('openAllBtn');
const closeAllBtn = document.getElementById('closeAllBtn');
const alertOverlay = document.getElementById('alertOverlay');
const alertMessage = document.getElementById('alertMessage');
const acceptBtn = document.getElementById('acceptBtn');
const toastEl = document.getElementById('toast');

// State
let drawersData = {};
let activeAlertDrawer = null;

// Initialization: Render Cards
function initDrawers() {
  drawersContainer.innerHTML = '';
  for (let i = 1; i <= 6; i++) {
    const card = document.createElement('div');
    card.className = 'glass-panel drawer-card';
    card.id = `drawer-${i}`;
    
    card.innerHTML = `
      <div class="card-header">
        <div class="drawer-title">
          <div class="glow-orb" style="width:10px; height:10px;"></div>
          DRAWER 0${i}
        </div>
        <div id="status-${i}" class="status-badge status-closed">CLOSED</div>
      </div>
      
      <div class="input-group">
        <label>Medicine Name</label>
        <input type="text" id="name-${i}" class="custom-input" placeholder="e.g. Aspirin">
      </div>
      
      <div class="input-group">
        <label>Alarm Time (HH:MM)</label>
        <input type="time" id="time-${i}" class="custom-input">
      </div>
      
      <div style="display: flex; gap: 10px; margin-top: -0.5rem; width: 100%;">
        <button class="btn save-btn" onclick="saveSettings(${i})">SAVE</button>
        <button class="btn delete-btn" onclick="deleteSettings(${i})">DELETE</button>
      </div>

      <div class="card-actions">
        <button class="btn btn-outline-cyan" onclick="operateDrawer(${i}, 'open')">OPEN</button>
        <button class="btn btn-outline-red" onclick="operateDrawer(${i}, 'close')">CLOSE</button>
      </div>
    `;
    drawersContainer.appendChild(card);
  }
}

// Global scope functions for inline onclick handlers
window.saveSettings = function(id) {
  const name = document.getElementById(`name-${id}`).value;
  const time = document.getElementById(`time-${id}`).value;
  
  update(ref(db, `drawers/${id}`), {
    name: name,
    alarmTime: time
  }).then(() => {
    showToast(`Drawer ${id} settings saved!`);
  });
};

window.deleteSettings = function(id) {
  update(ref(db, `drawers/${id}`), {
    name: "",
    alarmTime: ""
  }).then(() => {
    showToast(`Drawer ${id} settings deleted!`);
    document.getElementById(`name-${id}`).value = '';
    document.getElementById(`time-${id}`).value = '';
  });
};

window.operateDrawer = function(id, action) {
  const currentStatus = drawersData[id]?.status || 'closed';
  
  if (action === 'open' && currentStatus === 'open') {
    showToast(`Drawer ${id} is already OPEN!`);
    return;
  }
  if (action === 'close' && currentStatus === 'closed') {
    showToast(`Drawer ${id} is already CLOSED!`);
    return;
  }
  
  // Send command
  set(ref(db, 'command'), `${action}_${id}_${Date.now()}`);
  showToast(`Command sent: ${action.toUpperCase()} Drawer ${id}`);
};

// Global Commands
openAllBtn.addEventListener('click', () => {
  set(ref(db, 'command'), `open_all_${Date.now()}`);
  showToast('Opening all drawers...');
});

closeAllBtn.addEventListener('click', () => {
  set(ref(db, 'command'), `close_all_${Date.now()}`);
  showToast('Closing all drawers...');
});

// Real-time Listeners
function setupListeners() {
  // Listen to drawers state
  onValue(ref(db, 'drawers'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
      drawersData = data;
      for (let i = 1; i <= 6; i++) {
        const d = data[i];
        if (d) {
          // Update status badge
          const statusEl = document.getElementById(`status-${i}`);
          if(statusEl) {
            statusEl.textContent = (d.status || 'CLOSED').toUpperCase();
            if (d.status === 'open') {
              statusEl.className = 'status-badge status-open';
            } else {
              statusEl.className = 'status-badge status-closed';
            }
          }
          
          // Only populate inputs if they aren't actively being focused
          const nameInput = document.getElementById(`name-${i}`);
          const timeInput = document.getElementById(`time-${i}`);
          
          if (nameInput && document.activeElement !== nameInput) {
            nameInput.value = d.name || '';
          }
          if (timeInput && document.activeElement !== timeInput) {
            timeInput.value = d.alarmTime || '';
          }
        }
      }
    }
  });

  // Listen to alerts
  onValue(ref(db, 'alerts'), (snapshot) => {
    const alerts = snapshot.val();
    if (alerts) {
      let foundAlert = false;
      for (let i = 1; i <= 6; i++) {
        if (alerts[i] === true) {
          activeAlertDrawer = i;
          foundAlert = true;
          
          const medName = drawersData[i]?.name || 'Medicine';
          alertMessage.innerHTML = `Time to take <strong>${medName}</strong> from Drawer 0${i}`;
          alertOverlay.classList.remove('hidden');
          break; // Show one alert at a time
        }
      }
      if (!foundAlert) {
        alertOverlay.classList.add('hidden');
        activeAlertDrawer = null;
      }
    }
  });
}

// Accept Alert
acceptBtn.addEventListener('click', () => {
  if (activeAlertDrawer) {
    set(ref(db, `alerts/${activeAlertDrawer}`), false);
    showToast('Medication accepted. Alert cleared.');
    alertOverlay.classList.add('hidden');
  }
});

// Toast Utility
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  toastEl.classList.add('show');
  
  setTimeout(() => {
    toastEl.classList.remove('show');
    setTimeout(() => toastEl.classList.add('hidden'), 400); // Wait for transition
  }, 3000);
}

// Boot
initDrawers();
setupListeners();
