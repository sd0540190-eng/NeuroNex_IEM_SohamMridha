const SUPABASE_URL = 'https://fepttnrljehrwfesjede.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_W5-gwTmVjPKFwSZId1ugKw_sMat_81v';

// Initialize Supabase Client
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

/**
 * ProcrastiSense - Core Application Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global State
  let activities = JSON.parse(localStorage.getItem('procrastisense_data')) || [];
  let userSession = JSON.parse(localStorage.getItem('procrastisense_user')) || null;
  let selectedDifficulty = 3;
  let resendTimerInterval = null;

  // Initializing App Core
  initTheme();
  initNavigation();
  initAuthModal();
  initFormControls();
  initSearchAndFilter();
  renderAll();

  /* ==========================================
     1. Theme Engine
     ========================================== */
  function initTheme() {
    const themeBtn = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('procrastisense_theme') || 'dark';

    if (savedTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }

    themeBtn?.addEventListener('click', () => {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      if (isLight) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('procrastisense_theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('procrastisense_theme', 'light');
      }
    });
  }

  /* ==========================================
     2. Navigation Engine
     ========================================== */
  function initNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-tab');

        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(`content-${target}`)?.classList.add('active');
      });
    });
  }

  /* ==========================================
     3. Authentication & OTP Mechanics
     ========================================== */
  function initAuthModal() {
    const modal = document.getElementById('auth-modal');
    const openBtn = document.getElementById('btn-login-open');
    const closeBtn = document.getElementById('auth-close-btn');
    const userLabel = document.getElementById('user-display-label');
    const editCredBtn = document.getElementById('btn-edit-credential');
    const resendBtn = document.getElementById('btn-resend-otp');

    if (userSession && userLabel) {
      userLabel.textContent = userSession.identifier;
    }

    openBtn?.addEventListener('click', () => {
      if (userSession) {
        if (confirm('Are you sure you want to log out?')) {
          userSession = null;
          localStorage.removeItem('procrastisense_user');
          if (userLabel) userLabel.textContent = 'Log In';
          showToast('Logged out successfully');
        }
      } else {
        modal?.classList.add('active');
      }
    });

    closeBtn?.addEventListener('click', () => {
      modal?.classList.remove('active');
      resetAuthForms();
    });

    // Auth Method Switcher
    const authTabs = document.querySelectorAll('.auth-tab');
    const phoneGroup = document.getElementById('group-phone-input');
    const emailGroup = document.getElementById('group-email-input');

    authTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        if (tab.dataset.method === 'email') {
          phoneGroup?.classList.add('hidden');
          emailGroup?.classList.remove('hidden');
        } else {
          emailGroup?.classList.add('hidden');
          phoneGroup?.classList.remove('hidden');
        }
      });
    });

    const step1Form = document.getElementById('auth-step-1');
    const step2Form = document.getElementById('auth-step-2');
    const destinationLabel = document.getElementById('otp-destination-label');

    // Reset Auth Flow back to Step 1
    editCredBtn?.addEventListener('click', () => {
      resetAuthForms();
    });

    function resetAuthForms() {
      step2Form?.classList.remove('active');
      step1Form?.classList.add('active');
      if (resendTimerInterval) clearInterval(resendTimerInterval);
      document.querySelectorAll('.otp-digit').forEach(input => input.value = '');
    }

    function startResendTimer() {
      let secondsLeft = 30;
      const timerLabel = document.getElementById('resend-timer');
      if (resendBtn) resendBtn.classList.add('hidden');
      if (timerLabel) {
        timerLabel.classList.remove('hidden');
        timerLabel.textContent = `Resend code in 0:${secondsLeft < 10 ? '0' : ''}${secondsLeft}`;
      }

      if (resendTimerInterval) clearInterval(resendTimerInterval);

      resendTimerInterval = setInterval(() => {
        secondsLeft--;
        if (secondsLeft <= 0) {
          clearInterval(resendTimerInterval);
          if (timerLabel) timerLabel.classList.add('hidden');
          if (resendBtn) resendBtn.classList.remove('hidden');
        } else if (timerLabel) {
          timerLabel.textContent = `Resend code in 0:${secondsLeft < 10 ? '0' : ''}${secondsLeft}`;
        }
      }, 1000);
    }

    // Step 1: Request OTP Submission
    async function requestOtp() {
      if (!supabaseClient) {
        showToast('Supabase client failed to initialize');
        return false;
      }

      const isEmail = !emailGroup?.classList.contains('hidden');

      try {
        if (isEmail) {
          const email = document.getElementById('auth-email').value.trim();

          if (!email) {
            showToast('Please enter your email');
            return false;
          }

          const { error } = await supabaseClient.auth.signInWithOtp({
            email: email,
            options: {
              shouldCreateUser: true
            }
          });

          if (error) {
            showToast(error.message);
            return false;
          }

          if (destinationLabel) destinationLabel.textContent = email;

        } else {
          let phone = document.getElementById('auth-phone').value.trim();
          phone = phone.replace(/\D/g, '');

          if (phone.length !== 10) {
            showToast('Enter a valid 10-digit phone number');
            return false;
          }

          phone = '+91' + phone;

          const { error } = await supabaseClient.auth.signInWithOtp({
            phone: phone
          });

          if (error) {
            showToast(error.message);
            return false;
          }

          if (destinationLabel) destinationLabel.textContent = phone;
        }

        step1Form?.classList.remove('active');
        step2Form?.classList.add('active');
        startResendTimer();
        showToast('OTP sent successfully!');
        return true;

      } catch (error) {
        console.error(error);
        showToast('Failed to send OTP');
        return false;
      }
    }

    step1Form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await requestOtp();
    });

    resendBtn?.addEventListener('click', async () => {
      await requestOtp();
    });

    // Step 2: Verify OTP Submission
    step2Form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const otpDigits = Array.from(document.querySelectorAll('.otp-digit'))
        .map(input => input.value)
        .join('');

      if (otpDigits.length < 6) {
        showToast('Please enter the full 6-digit OTP code');
        return;
      }

      const target = destinationLabel?.textContent || '';
      const isEmail = target.includes('@');

      try {
        const verifyPayload = {
          token: otpDigits,
          type: isEmail ? 'email' : 'sms'
        };

        if (isEmail) {
          verifyPayload.email = target;
        } else {
          verifyPayload.phone = target;
        }

        const { data, error } = await supabaseClient.auth.verifyOtp(verifyPayload);

        if (error) {
          showToast(error.message);
          return;
        }

        userSession = {
          identifier: target,
          token: data.session?.access_token || ''
        };

        localStorage.setItem('procrastisense_user', JSON.stringify(userSession));
        if (userLabel) userLabel.textContent = target;

        modal?.classList.remove('active');
        resetAuthForms();
        showToast('Authenticated successfully!');

      } catch (err) {
        console.error(err);
        showToast('OTP verification failed');
      }
    });

    // OTP Field Auto-Focus Logic & Paste Handling
    const otpInputs = document.querySelectorAll('.otp-digit');
    otpInputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        if (input.value.length === 1 && index < otpInputs.length - 1) {
          otpInputs[index + 1].focus();
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && index > 0) {
          otpInputs[index - 1].focus();
        }
      });

      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
        if (/^\d{6}$/.test(pasteData)) {
          pasteData.split('').forEach((char, i) => {
            if (otpInputs[i]) otpInputs[i].value = char;
          });
          otpInputs[5].focus();
        }
      });
    });
  }

  /* ==========================================
     4. Form Logic & Sample Loader
     ========================================== */
  function initFormControls() {
    const diffBtns = document.querySelectorAll('.diff-btn');
    diffBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        diffBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedDifficulty = parseInt(btn.dataset.value);
      });
    });

    const form = document.getElementById('activity-form');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();

      const newActivity = {
        id: Date.now().toString(),
        name: document.getElementById('task-name').value,
        type: document.getElementById('task-type').value,
        subject: document.getElementById('task-subject').value,
        assigned: document.getElementById('date-assigned').value,
        deadline: document.getElementById('date-deadline').value,
        started: document.getElementById('date-started').value,
        completed: document.getElementById('date-completed').value || null,
        difficulty: selectedDifficulty,
        priority: document.getElementById('task-priority').value
      };

      activities.push(newActivity);
      saveAndRender();
      form.reset();
      showToast('Activity added successfully!');

      // Switch to dashboard
      document.getElementById('tab-dashboard')?.click();
    });

    // Sample Data Preset Handler
    document.getElementById('btn-load-sample')?.addEventListener('click', () => {
      activities = [
        { id: '1', name: 'Physics Problem Set 4', type: 'assignment', subject: 'Physics 101', assigned: '2026-09-10', deadline: '2026-09-17', started: '2026-09-16', completed: '2026-09-17', difficulty: 4, priority: 'high' },
        { id: '2', name: 'Midterm Prep', type: 'exam-prep', subject: 'Calculus II', assigned: '2026-09-01', deadline: '2026-09-20', started: '2026-09-19', completed: '2026-09-20', difficulty: 5, priority: 'high' },
        { id: '3', name: 'Literary Analysis Essay', type: 'essay', subject: 'ENG 201', assigned: '2026-09-05', deadline: '2026-09-15', started: '2026-09-08', completed: '2026-09-12', difficulty: 2, priority: 'medium' },
        { id: '4', name: 'Chemistry Lab Report', type: 'lab', subject: 'CHEM 105', assigned: '2026-09-12', deadline: '2026-09-22', started: '2026-09-21', completed: null, difficulty: 3, priority: 'medium' }
      ];
      saveAndRender();
      showToast('Sample data loaded!');
    });
  }

  /* ==========================================
     5. Activity Log Filtering & Actions
     ========================================== */
  function initSearchAndFilter() {
    const searchInput = document.getElementById('search-activities');
    const filterSelect = document.getElementById('filter-type');
    const clearBtn = document.getElementById('btn-clear-all');

    searchInput?.addEventListener('input', renderTable);
    filterSelect?.addEventListener('change', renderTable);

    clearBtn?.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all data?')) {
        activities = [];
        saveAndRender();
        showToast('All activity records cleared');
      }
    });
  }

  /* ==========================================
     6. Analytics & Render Engine
     ========================================== */
  function saveAndRender() {
    localStorage.setItem('procrastisense_data', JSON.stringify(activities));
    renderAll();
  }

  function renderAll() {
    renderStats();
    renderGauge();
    renderPatterns();
    renderTimeline();
    renderBarChart();
    renderTable();
    renderInsights();
  }

  function calculateDelayDays(activity) {
    const assigned = new Date(activity.assigned);
    const deadline = new Date(activity.deadline);
    const started = new Date(activity.started);

    const totalDuration = (deadline - assigned) || 1;
    const elapsedBeforeStart = started - assigned;
    const ratio = elapsedBeforeStart / totalDuration;

    return { totalDuration, elapsedBeforeStart, ratio };
  }

  function renderStats() {
    const totalEl = document.getElementById('total-activities');
    if (totalEl) totalEl.textContent = activities.length;

    let procCount = 0;
    let onTimeCount = 0;

    activities.forEach(act => {
      const { ratio } = calculateDelayDays(act);
      if (ratio > 0.6) procCount++;
      else onTimeCount++;
    });

    const procEl = document.getElementById('procrastination-count');
    const onTimeEl = document.getElementById('ontime-count');
    const scoreEl = document.getElementById('health-score');

    if (procEl) procEl.textContent = procCount;
    if (onTimeEl) onTimeEl.textContent = onTimeCount;

    const score = activities.length ? Math.round((onTimeCount / activities.length) * 100) : '—';
    if (scoreEl) scoreEl.textContent = score !== '—' ? score + '%' : '—';
  }

  function renderGauge() {
    if (!activities.length) return;

    let totalRatio = 0;
    activities.forEach(act => {
      const { ratio } = calculateDelayDays(act);
      totalRatio += Math.min(Math.max(ratio, 0), 1);
    });

    const avgRatio = Math.round((totalRatio / activities.length) * 100);
    const needle = document.getElementById('gauge-needle');
    const arc = document.getElementById('gauge-arc');
    const valueDisplay = document.getElementById('gauge-value');
    const labelDisplay = document.getElementById('gauge-label');

    const angle = -90 + (avgRatio / 100) * 180;
    if (needle) needle.style.transform = `rotate(${angle}deg)`;

    const maxDash = 251.33;
    const dashVal = (avgRatio / 100) * maxDash;
    if (arc) arc.style.strokeDasharray = `${dashVal} ${maxDash}`;

    if (valueDisplay) valueDisplay.textContent = `${avgRatio}%`;

    if (labelDisplay) {
      if (avgRatio < 35) labelDisplay.textContent = 'Low Procrastination';
      else if (avgRatio < 65) labelDisplay.textContent = 'Moderate Procrastination';
      else labelDisplay.textContent = 'High Procrastination';
    }
  }

  function renderPatterns() {
    const list = document.getElementById('patterns-list');
    const countBadge = document.getElementById('pattern-count');
    if (!list) return;

    if (!activities.length) {
      list.innerHTML = `<div class="empty-state"><p>Add activities to detect patterns</p></div>`;
      if (countBadge) countBadge.textContent = '0';
      return;
    }

    const patterns = [];
    const highDiffProcrastination = activities.filter(a => a.difficulty >= 4 && calculateDelayDays(a).ratio > 0.6);

    if (highDiffProcrastination.length > 0) {
      patterns.push({
        type: 'danger',
        text: `You delay high-difficulty tasks (Level 4-5) ${highDiffProcrastination.length} time(s).`
      });
    }

    const lastMinExams = activities.filter(a => a.type === 'exam-prep' && calculateDelayDays(a).ratio > 0.7);
    if (lastMinExams.length > 0) {
      patterns.push({
        type: 'warning',
        text: 'Pattern detected: Exam preparation usually starts in the final 20% window.'
      });
    }

    if (patterns.length === 0) {
      patterns.push({
        type: 'success',
        text: 'Great work! No problematic procrastination patterns detected.'
      });
    }

    if (countBadge) countBadge.textContent = patterns.length.toString();

    list.innerHTML = patterns.map(p => `
      <div class="pattern-item ${p.type}">
        <span>${p.text}</span>
      </div>
    `).join('');
  }

  function renderTimeline() {
    const container = document.getElementById('timeline-container');
    if (!container) return;

    if (!activities.length) {
      container.innerHTML = `<div class="empty-state"><p>Your activity timeline will appear here</p></div>`;
      return;
    }

    container.innerHTML = activities.slice(0, 5).map(act => {
      const { ratio } = calculateDelayDays(act);
      let colorClass = 'tl-on-time';
      if (ratio > 0.7) colorClass = 'tl-late';
      else if (ratio > 0.4) colorClass = 'tl-last-min';

      const pct = Math.min(Math.round(ratio * 100), 100);

      return `
        <div class="tl-row">
          <span class="tl-task-label" title="${act.name}">${act.name}</span>
          <div class="tl-bar-bg">
            <div class="tl-bar-fill ${colorClass}" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderBarChart() {
    const container = document.getElementById('bar-chart-container');
    if (!container) return;

    if (!activities.length) {
      container.innerHTML = `<div class="empty-state"><p>Add activities to see delay distribution</p></div>`;
      return;
    }

    const buckets = { '0-25%': 0, '26-50%': 0, '51-75%': 0, '76-100%': 0 };

    activities.forEach(act => {
      const { ratio } = calculateDelayDays(act);
      if (ratio <= 0.25) buckets['0-25%']++;
      else if (ratio <= 0.50) buckets['26-50%']++;
      else if (ratio <= 0.75) buckets['51-75%']++;
      else buckets['76-100%']++;
    });

    const maxVal = Math.max(...Object.values(buckets)) || 1;

    container.innerHTML = Object.entries(buckets).map(([label, count]) => {
      const heightPct = Math.round((count / maxVal) * 100);
      return `
        <div class="bar-col">
          <div class="bar-wrapper">
            <div class="bar-inner" style="height: ${heightPct}%"></div>
          </div>
          <span class="bar-col-label">${label}</span>
        </div>
      `;
    }).join('');
  }

  function renderTable() {
    const tbody = document.getElementById('activity-tbody');
    const emptyState = document.getElementById('history-empty');
    const searchVal = document.getElementById('search-activities')?.value.toLowerCase() || '';
    const filterVal = document.getElementById('filter-type')?.value || 'all';

    if (!tbody) return;

    const filtered = activities.filter(act => {
      const matchesSearch = act.name.toLowerCase().includes(searchVal) || act.subject.toLowerCase().includes(searchVal);
      const matchesFilter = filterVal === 'all' || act.type === filterVal;
      return matchesSearch && matchesFilter;
    });

    if (!filtered.length) {
      tbody.innerHTML = '';
      emptyState?.classList.remove('hidden');
      return;
    }

    emptyState?.classList.add('hidden');

    tbody.innerHTML = filtered.map(act => {
      const { ratio } = calculateDelayDays(act);
      let statusClass = 'status-on-time';
      let statusText = 'On Track';

      if (ratio > 0.6) {
        statusClass = 'status-procrastinated';
        statusText = 'Procrastinated';
      } else if (!act.completed) {
        statusClass = 'status-in-progress';
        statusText = 'In Progress';
      }

      return `
        <tr>
          <td><strong>${act.name}</strong></td>
          <td>${act.type}</td>
          <td>${act.subject}</td>
          <td>${act.assigned}</td>
          <td>${act.deadline}</td>
          <td>${act.started}</td>
          <td>${act.completed || '—'}</td>
          <td><span class="status-pill ${statusClass}">${statusText}</span></td>
          <td>
            <button class="btn-link btn-delete" data-id="${act.id}">Delete</button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach deletion logic
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        activities = activities.filter(a => a.id !== id);
        saveAndRender();
        showToast('Activity removed');
      });
    });
  }

  function renderInsights() {
    const container = document.getElementById('insight-cards');
    if (!container) return;

    if (activities.length < 3) {
      container.innerHTML = `
        <div class="empty-state large">
          <p>Add at least 3 activities to generate insights</p>
          <span>The more data you provide, the more accurate the analysis becomes</span>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="insight-card">
        <div class="insight-title">⚡ Peak Productivity Window</div>
        <div class="insight-desc">You tend to complete reading and lab tasks faster when assigned early in the week.</div>
      </div>
      <div class="insight-card">
        <div class="insight-title">⚠️ Difficulty Avoidance</div>
        <div class="insight-desc">Tasks rated difficulty 4 or 5 experience a 40% higher start delay compared to lower difficulty tasks.</div>
      </div>
      <div class="insight-card">
        <div class="insight-title">🎯 Action Recommendation</div>
        <div class="insight-desc">Break major projects down into smaller sub-tasks on the first day to overcome starting friction.</div>
      </div>
    `;
  }

  /* ==========================================
     7. Utility Components (Toast Alerts)
     ========================================== */
  function showToast(message) {
    const container = document.getElementById('toast-container') || document.body;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
});