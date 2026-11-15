// Ark Vault • Digital Edition • Clean Slate LocalStorage Engine with Dark Mode & Enhanced Typography

const STORAGE_KEY = 'ark_vault_data_clean_v3';
const THEME_KEY = 'ark_theme';

// Clean Blank Default Dataset (Zero Preloaded Data)
const BLANK_VAULT_DATA = {
  familyName: "My Family Vault",
  urgent: [],
  finance: [],
  home: [],
  parents: [],
  sitter: {
    kids: "",
    allergies: "",
    contacts: "",
    house: ""
  }
};

// Optional Demo Dataset (Only loaded if user clicks "Load Demo Example Records")
const SAMPLE_VAULT_DATA = {
  familyName: "The Miller Family",
  urgent: [
    {
      id: "urg-1",
      badge: "CALL FIRST",
      title: "Dr. Sarah Miller (Sister)",
      ref: "(555) 234-8901",
      notes: "🔑 Has Spare Key: Master Safe #2\n⚖️ Legal Role: Alternate Co-Trustee",
      verified: true
    },
    {
      id: "urg-2",
      badge: "IMMEDIATE CASH",
      title: "$3,500 Cash Reserve",
      ref: "Master Bedroom Walk-in Closet",
      notes: "🔒 Safe Combination: 32 - 14 - 88\n💳 Joint Chase Card: In wallet (*4821)",
      verified: true
    },
    {
      id: "urg-3",
      badge: "WORK BENEFITS",
      title: "Apex Global HR Benefits",
      ref: "(800) 555-0199",
      notes: "💰 Group Policy: 2x Base Salary ($350,000)\n👤 Beneficiary: Spouse (100%)\n✉️ HR Email: benefits@apex.com",
      verified: true
    }
  ],
  finance: [
    {
      id: "fin-1",
      badge: "LIFE POLICY #1",
      title: "Northwestern Mutual ($1,000,000)",
      ref: "Policy #: NM-7749201-TL",
      notes: "📞 Claims Phone: (800) 388-8123\n👤 Agent: Mark Henderson\n⏱️ Payout Time: 5-7 business days",
      verified: true
    },
    {
      id: "fin-2",
      badge: "MORTGAGE",
      title: "Wells Fargo Home Mortgage ($3,140/mo)",
      ref: "Loan #: WF-992140-5",
      notes: "🗓️ Draft Date: 1st of month\n🏦 Paid From: Chase Checking (*4821)\n⚠️ Keep account funded!",
      verified: true
    },
    {
      id: "fin-3",
      badge: "PASSWORDS",
      title: "1Password Master Vault",
      ref: "All household logins & 2FA",
      notes: "📄 Emergency Sheet: Inside Master Safe\n🍎 Apple ID: Spouse set as Legacy Contact\n🔑 Secret Key: 34-character code in sheet",
      verified: true
    }
  ],
  home: [
    {
      id: "home-1",
      badge: "MAIN WATER",
      title: "Main Water Shutoff Valve",
      ref: "Basement north wall, behind water heater",
      notes: "Turn the yellow brass lever 90 degrees clockwise to stop whole-house flooding.",
      verified: true
    },
    {
      id: "home-2",
      badge: "ELECTRICAL",
      title: "Electrical Breaker Box",
      ref: "Garage wall next to interior entry door",
      notes: "Square D 200A panel. Fully labeled switches for all circuits and furnace.",
      verified: true
    },
    {
      id: "home-3",
      badge: "HVAC SPECS",
      title: "HVAC Air Filter Size",
      ref: "16 x 25 x 1 (MERV 11)",
      notes: "Spares stored on garage top shelf. Replace every 90 days. Filter arrow points toward blower.",
      verified: true
    }
  ],
  parents: [
    {
      id: "par-1",
      badge: "AGING PARENT",
      title: "Robert Miller (Dad • Age 74)",
      ref: "Portland, OR • Living Independently",
      notes: "✓ DPOA Active\nMedicare: Part A/B # 4TE2-MK8-901\nCardiologist: Dr. Thorne (503) 555-4301\nDaily Meds: Metoprolol (AM), Atorvastatin (PM)",
      verified: true
    },
    {
      id: "par-2",
      badge: "FRAUD SHIELD",
      title: "Senior Scam & Asset Safeguards",
      ref: "Equifax & Experian FROZEN 🔒",
      notes: "House Deed Title Lock: Monitored\nVanguard Brokerage Trusted Contact: Son (Active)",
      verified: true
    }
  ],
  sitter: {
    kids: "Leo (Age 7) & Maya (Age 4)",
    allergies: "• Leo (Age 7): Severe Peanut Allergy! EpiPen in kitchen top cabinet right of stove.\n• Maya (Age 4): No allergies.",
    contacts: "• Parents: (555) 234-8901 / (555) 234-8902\n• Pediatrician: Dr. Sarah Bennett (555-902-1144)",
    house: "• Front Door Code: #4829\n• Wi-Fi: MillerFamily_5G (Pass: OakTree2024!)\n• Bedtimes: Maya at 7:45 PM; Leo at 8:15 PM."
  }
};

// Sound Synthesizer
class SoundController {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
  pop(freq = 520) {
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      g.gain.setValueAtTime(0.04, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.12);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch (e) {}
  }
}
const sound = new SoundController();

// Toast Notification
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');
function showToast(msg) {
  sound.pop(640);
  toastMsg.innerText = msg;
  toast.classList.remove('translate-y-16', 'opacity-0', 'pointer-events-none');
  setTimeout(() => {
    toast.classList.add('translate-y-16', 'opacity-0', 'pointer-events-none');
  }, 2200);
}

// ================= THEME MANAGER =================
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeToggleIcon = document.getElementById('themeToggleIcon');

function updateThemeUI(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark');
    themeToggleIcon.innerText = '☀️';
    themeToggleBtn.title = "Switch to Light Mode";
  } else {
    document.documentElement.classList.remove('dark');
    themeToggleIcon.innerText = '🌙';
    themeToggleBtn.title = "Switch to Dark Mode";
  }
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved === 'dark' || (!saved && systemDark);
  updateThemeUI(isDark);
}

themeToggleBtn.addEventListener('click', () => {
  sound.pop(720);
  const isCurrentlyDark = document.documentElement.classList.contains('dark');
  const newDark = !isCurrentlyDark;
  localStorage.setItem(THEME_KEY, newDark ? 'dark' : 'light');
  updateThemeUI(newDark);
  showToast(newDark ? "Dark mode activated 🌙" : "Light mode activated ☀️");
});

// State Manager
let vaultState = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      vaultState = JSON.parse(raw);
    } else {
      vaultState = JSON.parse(JSON.stringify(BLANK_VAULT_DATA));
      saveState();
    }
  } catch (err) {
    console.error("Failed to parse vault state, resetting to clean blank:", err);
    vaultState = JSON.parse(JSON.stringify(BLANK_VAULT_DATA));
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vaultState));
  } catch (e) {
    console.error("Local storage error:", e);
  }
}

// Category Guidance & Empty State Configuration
const EMPTY_STATE_CONFIG = {
  urgent: {
    icon: "🚨",
    title: "No First 24-Hour Lifelines Added",
    desc: "Add your primary next-of-kin contact, emergency cash reserve location, or employer HR benefits line.",
    badge: "CALL FIRST",
    btnColor: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800"
  },
  finance: {
    icon: "💳",
    title: "No Financial Lifelines Mapped",
    desc: "Record your term life insurance policies, mortgage draft dates, or master password vault location.",
    badge: "LIFE POLICY",
    btnColor: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800"
  },
  home: {
    icon: "🏡",
    title: "No Home Utility Specs Recorded",
    desc: "Document your main water shutoff valve, electrical breaker panel location, or HVAC filter dimensions.",
    badge: "WATER VALVE",
    btnColor: "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800"
  },
  parents: {
    icon: "👵",
    title: "No Aging Parent Records Added",
    desc: "Track elderly parents' Medicare IDs, cardiologists, active Power of Attorney, or fraud protection locks.",
    badge: "MEDICARE / DPOA",
    btnColor: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800"
  }
};

function getBadgeColors(cat) {
  switch (cat) {
    case 'urgent': return { bg: 'bg-rose-50 dark:bg-rose-950/50', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-900/60' };
    case 'finance': return { bg: 'bg-blue-50 dark:bg-blue-950/50', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-900/60' };
    case 'home': return { bg: 'bg-amber-50 dark:bg-amber-950/50', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-900/60' };
    case 'parents': return { bg: 'bg-purple-50 dark:bg-purple-950/50', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-900/60' };
    default: return { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' };
  }
}

// Create dynamic card element with enhanced typography & animations
function createCardElement(cat, item, index = 0) {
  const colors = getBadgeColors(cat);
  const card = document.createElement('div');
  card.className = 'card-item bg-white dark:bg-[#101726] rounded-2xl border border-slate-200 dark:border-slate-800/90 p-5 shadow-sm hover:shadow-md dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-3.5';
  card.style.animationDelay = `${index * 0.05}s`;
  card.dataset.id = item.id;
  card.dataset.cat = cat;

  const notesHtml = (item.notes || 'No extra notes recorded.')
    .split('\n')
    .map(line => `<div>${escapeHtml(line)}</div>`)
    .join('');

  card.innerHTML = `
    <div>
      <div class="flex items-center justify-between mb-2.5">
        <span class="px-2.5 py-1 rounded-full text-xs font-bold ${colors.bg} ${colors.text} border ${colors.border} font-mono uppercase tracking-wider">
          ${escapeHtml(item.badge || 'LIFELINE')}
        </span>
        <button class="toggle-verify-btn text-sm font-bold ${item.verified ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'} hover:opacity-80 transition-all flex items-center gap-1.5 font-display" title="Toggle verification status">
          ${item.verified ? '✓ VERIFIED' : '⚪ UNVERIFIED'}
        </button>
      </div>
      <h3 class="text-base md:text-lg font-black text-slate-900 dark:text-white font-display leading-snug">${escapeHtml(item.title)}</h3>
      <p class="text-xs md:text-sm font-mono font-medium text-slate-500 dark:text-slate-400 mt-1">${escapeHtml(item.ref || 'No identifier recorded')}</p>
      <div class="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 text-xs md:text-sm text-slate-700 dark:text-slate-300 space-y-1.5 font-sans leading-relaxed">
        ${notesHtml}
      </div>
    </div>
    <div class="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between no-print">
      <button class="edit-btn text-xs md:text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-display active:scale-95 transition-transform">
        ✏️ Edit
      </button>
      <button class="delete-btn text-xs md:text-sm font-bold text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-display active:scale-95 transition-transform">
        🗑️ Delete
      </button>
    </div>
  `;

  card.querySelector('.edit-btn').addEventListener('click', () => openEditModal(cat, item.id));
  card.querySelector('.delete-btn').addEventListener('click', () => deleteRecord(cat, item.id));
  card.querySelector('.toggle-verify-btn').addEventListener('click', () => toggleVerify(cat, item.id));

  return card;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}

// Render entire UI
function renderAll() {
  const name = vaultState.familyName || "My Family Vault";
  document.getElementById('familyNameDisplay').innerText = name;
  document.getElementById('printFamilyTitle').innerText = `${name}`;

  const grids = {
    urgent: document.getElementById('urgentGrid'),
    finance: document.getElementById('financeGrid'),
    home: document.getElementById('homeGrid'),
    parents: document.getElementById('parentsGrid')
  };

  ['urgent', 'finance', 'home', 'parents'].forEach(cat => {
    const container = grids[cat];
    container.innerHTML = '';
    const items = vaultState[cat] || [];
    const cfg = EMPTY_STATE_CONFIG[cat];

    if (items.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'col-span-full p-8 md:p-10 text-center bg-white/80 dark:bg-slate-900/60 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-3.5 transition-colors';
      emptyDiv.innerHTML = `
        <div class="text-4xl transform hover:scale-110 transition-transform duration-200">${cfg.icon}</div>
        <div>
          <h4 class="text-base md:text-lg font-black text-slate-800 dark:text-slate-200 font-display">${cfg.title}</h4>
          <p class="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed">${cfg.desc}</p>
        </div>
        <button class="add-cat-btn px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${cfg.btnColor} font-display active:scale-95 shadow-sm">
          ➕ Add First ${cfg.badge}
        </button>
      `;
      emptyDiv.querySelector('.add-cat-btn').addEventListener('click', () => {
        openAddModal(cat, cfg.badge);
      });
      container.appendChild(emptyDiv);
    } else {
      items.forEach((item, idx) => {
        container.appendChild(createCardElement(cat, item, idx));
      });
    }
  });

  // Counters
  const uCount = (vaultState.urgent || []).length;
  const fCount = (vaultState.finance || []).length;
  const hCount = (vaultState.home || []).length;
  const pCount = (vaultState.parents || []).length;

  document.getElementById('tileUrgentCount').innerText = `${uCount} Actions`;
  document.getElementById('tileFinanceCount').innerText = `${fCount} Accounts`;
  document.getElementById('tileHomeCount').innerText = `${hCount} Specs`;
  document.getElementById('tileParentsCount').innerText = `${pCount} Records`;

  document.getElementById('urgentTabCount').innerText = `${uCount} Actions`;
  document.getElementById('financeTabCount').innerText = `${fCount} Accounts Mapped`;
  document.getElementById('homeTabCount').innerText = `${hCount} Specs Saved`;

  // Sitter form values
  const sitter = vaultState.sitter || {};
  document.getElementById('sitterKidsInput').value = sitter.kids || '';
  document.getElementById('sitterAllergiesInput').value = sitter.allergies || '';
  document.getElementById('sitterContactsInput').value = sitter.contacts || '';
  document.getElementById('sitterHouseInput').value = sitter.house || '';

  // Calculate score
  calculateReadinessScore();
}

function calculateReadinessScore() {
  const allCards = [
    ...(vaultState.urgent || []),
    ...(vaultState.finance || []),
    ...(vaultState.home || []),
    ...(vaultState.parents || [])
  ];

  const total = allCards.length;
  if (total === 0) {
    updateReadinessUI(0, 0, 0, "⚪ Status: Clean Slate", "0 Lifelines Added — Add your first record to begin");
    document.getElementById('heroSubtitle').innerText = "Your vault is completely private and saved in your local browser storage. Start by adding your first lifeline.";
    return;
  }

  const verified = allCards.filter(c => c.verified).length;
  const percent = Math.round((verified / total) * 100);

  let statusLabel = "🟢 Status: Strong";
  if (percent < 50) statusLabel = "🔴 Status: Vulnerable";
  else if (percent < 80) statusLabel = "🟡 Status: In Progress";

  document.getElementById('heroSubtitle').innerText = `${verified} of ${total} records currently verified. Export to USB or print your safe binder anytime.`;
  updateReadinessUI(percent, verified, total, statusLabel, `${verified} of ${total} Lifelines Verified`);
}

function updateReadinessUI(percent, verified, total, status, details) {
  document.getElementById('scoreReadout').innerText = `${percent}%`;
  document.getElementById('scoreHeadlineSpan').innerText = `${percent}%`;
  document.getElementById('scoreStatusLabel').innerText = status;
  document.getElementById('scoreDetailsLabel').innerText = details;
}

// Delete Record
function deleteRecord(cat, id) {
  sound.pop(380);
  if (confirm("Are you sure you want to delete this record from your vault?")) {
    vaultState[cat] = (vaultState[cat] || []).filter(item => item.id !== id);
    saveState();
    renderAll();
    showToast("Record deleted from vault 🗑️");
  }
}

// Toggle Verify
function toggleVerify(cat, id) {
  sound.pop(600);
  const item = (vaultState[cat] || []).find(i => i.id === id);
  if (item) {
    item.verified = !item.verified;
    saveState();
    renderAll();
    showToast(item.verified ? "Marked as Verified ✓" : "Marked as Unverified ⚪");
  }
}

// Modal Controllers
const recordModal = document.getElementById('recordModal');
const modalHeading = document.getElementById('modalHeading');
const editRecordId = document.getElementById('editRecordId');
const cardCat = document.getElementById('cardCat');
const cardBadge = document.getElementById('cardBadge');
const cardTitle = document.getElementById('cardTitle');
const cardRef = document.getElementById('cardRef');
const cardNotes = document.getElementById('cardNotes');
const deleteRecordModalBtn = document.getElementById('deleteRecordModalBtn');

function openAddModal(preselectedCat = null, defaultBadge = null) {
  sound.pop(560);
  modalHeading.innerText = "Add New Household Lifeline";
  editRecordId.value = "";
  cardCat.disabled = false;
  if (preselectedCat) cardCat.value = preselectedCat;
  cardBadge.value = defaultBadge || "";
  cardTitle.value = "";
  cardRef.value = "";
  cardNotes.value = "";
  deleteRecordModalBtn.classList.add('hidden');
  recordModal.classList.remove('hidden');
}

function openEditModal(cat, id) {
  sound.pop(560);
  const item = (vaultState[cat] || []).find(i => i.id === id);
  if (!item) return;

  modalHeading.innerText = "Edit Household Record";
  editRecordId.value = id;
  cardCat.value = cat;
  cardCat.disabled = true;
  cardBadge.value = item.badge || "";
  cardTitle.value = item.title || "";
  cardRef.value = item.ref || "";
  cardNotes.value = item.notes || "";
  deleteRecordModalBtn.classList.remove('hidden');
  recordModal.classList.remove('hidden');
}

function closeRecordModal() {
  recordModal.classList.add('hidden');
}

document.getElementById('addCardBtn').addEventListener('click', () => openAddModal());
document.getElementById('closeModal').addEventListener('click', closeRecordModal);
document.getElementById('cancelModal').addEventListener('click', closeRecordModal);

// Close modal on backdrop click
recordModal.addEventListener('click', (e) => {
  if (e.target === recordModal) closeRecordModal();
});

deleteRecordModalBtn.addEventListener('click', () => {
  const cat = cardCat.value;
  const id = editRecordId.value;
  if (id) {
    closeRecordModal();
    deleteRecord(cat, id);
  }
});

document.getElementById('saveCardBtn').addEventListener('click', () => {
  const cat = cardCat.value;
  const id = editRecordId.value;
  const title = cardTitle.value.trim();
  const badge = cardBadge.value.trim().toUpperCase() || 'LIFELINE';
  const ref = cardRef.value.trim();
  const notes = cardNotes.value.trim();

  if (!title) {
    showToast('Please enter a title for this record');
    return;
  }

  if (id) {
    const item = (vaultState[cat] || []).find(i => i.id === id);
    if (item) {
      item.badge = badge;
      item.title = title;
      item.ref = ref;
      item.notes = notes;
    }
    showToast(`Updated: ${title} ✨`);
  } else {
    const newId = `${cat}-${Date.now()}`;
    const newRecord = {
      id: newId,
      badge: badge,
      title: title,
      ref: ref,
      notes: notes,
      verified: true
    };
    if (!vaultState[cat]) vaultState[cat] = [];
    vaultState[cat].unshift(newRecord);
    showToast(`Saved to Vault: ${title} ✨`);
  }

  saveState();
  renderAll();
  closeRecordModal();

  document.querySelector(`[data-tab="${cat}"]`)?.click();
});

// Tab Switching & Clickable Hero Tiles
const tabChips = document.querySelectorAll('.tab-chip');
const tabPanels = {
  urgent: document.getElementById('tab-urgent'),
  finance: document.getElementById('tab-finance'),
  home: document.getElementById('tab-home'),
  parents: document.getElementById('tab-parents'),
  sitter: document.getElementById('tab-sitter')
};

const chipColorMap = {
  urgent: { bg: 'bg-rose-600', text: 'text-white', shadow: 'shadow-rose-600/20' },
  finance: { bg: 'bg-blue-600', text: 'text-white', shadow: 'shadow-blue-600/20' },
  home: { bg: 'bg-amber-600', text: 'text-white', shadow: 'shadow-amber-600/20' },
  parents: { bg: 'bg-purple-600', text: 'text-white', shadow: 'shadow-purple-600/20' },
  sitter: { bg: 'bg-emerald-600', text: 'text-white', shadow: 'shadow-emerald-600/20' }
};

function switchTab(target) {
  if (!target || !tabPanels[target]) return;

  sound.pop(480);

  tabChips.forEach(c => {
    c.className = 'tab-chip px-4.5 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 shadow-sm whitespace-nowrap transition-all font-display';
  });

  const activeBtn = document.querySelector(`.tab-chip[data-tab="${target}"]`);
  if (activeBtn) {
    const color = chipColorMap[target] || chipColorMap.urgent;
    activeBtn.className = `tab-chip px-4.5 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 ${color.bg} ${color.text} shadow-md ${color.shadow} whitespace-nowrap transition-all font-display`;
  }

  Object.keys(tabPanels).forEach(k => {
    if (k === target) {
      tabPanels[k].classList.remove('hidden');
    } else {
      tabPanels[k].classList.add('hidden');
    }
  });
}

tabChips.forEach(chip => {
  chip.addEventListener('click', () => switchTab(chip.dataset.tab));
});

// Clickable Hero Tiles navigate directly to tabs
document.querySelectorAll('[data-nav-tab]').forEach(tile => {
  tile.addEventListener('click', () => {
    const target = tile.dataset.navTab;
    if (target) {
      switchTab(target);
      window.scrollTo({ top: 320, behavior: 'smooth' });
    }
  });
});

// Sitter Briefing
const saveSitterBtn = document.getElementById('saveSitterBtn');
const copySitterAction = document.getElementById('copySitterAction');

function syncSitterFromInputs() {
  vaultState.sitter = {
    kids: document.getElementById('sitterKidsInput').value.trim(),
    allergies: document.getElementById('sitterAllergiesInput').value.trim(),
    contacts: document.getElementById('sitterContactsInput').value.trim(),
    house: document.getElementById('sitterHouseInput').value.trim()
  };
  saveState();
}

saveSitterBtn.addEventListener('click', () => {
  syncSitterFromInputs();
  showToast("Babysitter briefing saved! 👶");
});

copySitterAction.addEventListener('click', () => {
  syncSitterFromInputs();
  const s = vaultState.sitter || {};
  const kids = s.kids || "Children";
  const allergies = s.allergies || "None recorded.";
  const contacts = s.contacts || "See emergency contacts.";
  const house = s.house || "Standard routine.";

  const text = `👶 ${kids.toUpperCase()} — BABYSITTER BRIEFING

⚠️ ALLERGIES & MEDS:
${allergies}

📞 CONTACTS:
${contacts}

🏡 HOUSE & BEDTIME:
${house}

— Private Briefing via Ark Vault (Offline Household OS)`;

  navigator.clipboard.writeText(text).then(() => {
    showToast('Sitter SMS copied! Ready to text to babysitter 📱');
  }).catch(() => {
    showToast('Failed to copy to clipboard automatically');
  });
});

// Family Name Modal
const familyNameModal = document.getElementById('familyNameModal');
const familyNameInput = document.getElementById('familyNameInput');
const editFamilyBtn = document.getElementById('editFamilyBtn');
const cancelFamilyBtn = document.getElementById('cancelFamilyBtn');
const saveFamilyBtn = document.getElementById('saveFamilyBtn');

editFamilyBtn.addEventListener('click', () => {
  sound.pop(520);
  familyNameInput.value = vaultState.familyName || "My Family Vault";
  familyNameModal.classList.remove('hidden');
});

cancelFamilyBtn.addEventListener('click', () => familyNameModal.classList.add('hidden'));
familyNameModal.addEventListener('click', (e) => {
  if (e.target === familyNameModal) familyNameModal.classList.add('hidden');
});

saveFamilyBtn.addEventListener('click', () => {
  const val = familyNameInput.value.trim();
  if (val) {
    vaultState.familyName = val;
    saveState();
    renderAll();
    familyNameModal.classList.add('hidden');
    showToast(`Household name set to: ${val}`);
  }
});

// Backup & Restore Modal
const backupModal = document.getElementById('backupModal');
const backupBtn = document.getElementById('backupBtn');
const closeBackupModal = document.getElementById('closeBackupModal');
const doneBackupBtn = document.getElementById('doneBackupBtn');
const downloadBackupBtn = document.getElementById('downloadBackupBtn');
const triggerImportBtn = document.getElementById('triggerImportBtn');
const importFileInput = document.getElementById('importFileInput');

backupBtn.addEventListener('click', () => {
  sound.pop(520);
  backupModal.classList.remove('hidden');
});
closeBackupModal.addEventListener('click', () => backupModal.classList.add('hidden'));
doneBackupBtn.addEventListener('click', () => backupModal.classList.add('hidden'));
backupModal.addEventListener('click', (e) => {
  if (e.target === backupModal) backupModal.classList.add('hidden');
});

// Export JSON
downloadBackupBtn.addEventListener('click', () => {
  sound.pop(640);
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(vaultState, null, 2));
  const downloadAnchor = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `ark-family-vault-backup-${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast("Backup exported successfully! 💾");
});

// Import JSON
triggerImportBtn.addEventListener('click', () => importFileInput.click());

importFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const imported = JSON.parse(event.target.result);
      if (imported && (imported.urgent || imported.finance || imported.familyName)) {
        vaultState = imported;
        saveState();
        renderAll();
        backupModal.classList.add('hidden');
        showToast("Vault successfully restored from backup! ✨");
      } else {
        alert("The selected file does not appear to be a valid Ark Vault backup.");
      }
    } catch (err) {
      alert("Error reading backup file: Invalid JSON format.");
    } finally {
      importFileInput.value = '';
    }
  };
  reader.readAsText(file);
});

// Template Reset Modal
const templateModal = document.getElementById('templateModal');
const templateMenuBtn = document.getElementById('templateMenuBtn');
const closeTemplateModal = document.getElementById('closeTemplateModal');
const cancelTemplateBtn = document.getElementById('cancelTemplateBtn');
const clearToBlankBtn = document.getElementById('clearToBlankBtn');
const loadSampleDataBtn = document.getElementById('loadSampleDataBtn');

templateMenuBtn.addEventListener('click', () => {
  sound.pop(520);
  templateModal.classList.remove('hidden');
});
closeTemplateModal.addEventListener('click', () => templateModal.classList.add('hidden'));
cancelTemplateBtn.addEventListener('click', () => templateModal.classList.add('hidden'));
templateModal.addEventListener('click', (e) => {
  if (e.target === templateModal) templateModal.classList.add('hidden');
});

clearToBlankBtn.addEventListener('click', () => {
  if (confirm("Clear all cards and reset to clean blank state?")) {
    vaultState = JSON.parse(JSON.stringify(BLANK_VAULT_DATA));
    saveState();
    renderAll();
    templateModal.classList.add('hidden');
    showToast("Vault reset to clean blank state 🧹");
  }
});

loadSampleDataBtn.addEventListener('click', () => {
  if (confirm("Load demo example records (The Miller Family)?")) {
    vaultState = JSON.parse(JSON.stringify(SAMPLE_VAULT_DATA));
    saveState();
    renderAll();
    templateModal.classList.add('hidden');
    showToast("Demo example records loaded! ✨");
  }
});

// Universal Keyboard listener (Escape closes modals)
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    recordModal.classList.add('hidden');
    familyNameModal.classList.add('hidden');
    backupModal.classList.add('hidden');
    templateModal.classList.add('hidden');
  }
});

// Print Binder Handling
function preparePrint() {
  document.getElementById('printDateSpan').innerText = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

document.getElementById('printBtn').addEventListener('click', () => {
  showToast('Preparing physical safe binder...');
  preparePrint();
  setTimeout(() => {
    window.print();
  }, 250);
});

// Hardened Print Hooks to prevent dark ink waste
window.addEventListener('beforeprint', () => {
  preparePrint();
  document.documentElement.classList.remove('dark');
});

window.addEventListener('afterprint', () => {
  const saved = localStorage.getItem(THEME_KEY);
  const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved === 'dark' || (!saved && systemDark)) {
    document.documentElement.classList.add('dark');
  }
});

// Initial boot
initTheme();
loadState();
renderAll();
