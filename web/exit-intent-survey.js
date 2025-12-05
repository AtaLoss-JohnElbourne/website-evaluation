(() => {
  /* -----------------------  CONFIG  ----------------------- */
  const CONFIG = {
    // Triggering
    armAfterMs: 10000,        // detector "arms" after 10s (0 to arm immediately)
    fallbackAfterMs: {
      mobile: 45000,          // 45s fallback timer on mobile devices
      desktop: 0              // disabled on desktop (exit-intent only)
    },
    topThresholdPx: 12,       // pixels from top to count as exit intent
    oncePerSession: true,     // don't show more than once per tab session

    // UX / style
    brandColor: '#6D5DF6',    // Feedback button + primary accents

    // UI Text & Labels
    ui: {
      title: 'Website Survey',
      subtitle: "To improve our website, we're running this survey for two weeks.\n\nPlease help us by taking 1 minute to answer:",
      step1Instruction: 'Choose one option:',
      requiredIndicator: '(required)',
      otherPlaceholder: 'Please explain...',
      buttons: {
        more: 'Next',
        back: 'Back',
        submit: 'Submit'
      }
    },

    // Form Validation
    validation: {
      otherTextMaxLength: 200,
      commentsMaxLength: 500
    },

    // API Configuration
    api: {
      endpoint: 'https://apps.ataloss.org/survey-api/survey',
      method: 'POST',
      headers: {'Content-Type': 'application/json'}
    },

    // Frequency capping
    ttlDays: 28,              // don't auto-show again for this many days (set to 28 for 2-week survey campaign)
    surveyId: 'exit-survey-v2.1',

    // Step 1 question
    question: 'How helpful was your visit today?',
    options: [
      {id:'very',        label:'Very helpful',      stars:5},
      {id:'helpful',     label:'Helpful',           stars:4},
      {id:'somewhat',    label:'Somewhat helpful',  stars:3},
      {id:'notHelpful',  label:'Not very helpful',  stars:2},
      {id:'unhelpful',   label:'Unhelpful',         stars:1},
    ],

    // Step 2 questions
    step2: {
      visitingReasons: {
        question: 'Why are you visiting AtaLoss.org?',
        subtitle: '(tick all that are relevant)',
        options: [
          {id: 'bereavement_services', label: 'To find bereavement services/information'},
          {id: 'memorial_page', label: 'To set up a memorial page'},
          {id: 'shop', label: 'To shop'},
          {id: 'about_ataloss', label: 'To find out about AtaLoss/its services'},
          {id: 'news_newsletter', label: 'To read news/sign up for the newsletter'},
          {id: 'check_listing', label: 'To check my listing/information'},
          {id: 'collaborate_donate', label: 'To offer information, collaborate or donate'},
          {id: 'contact', label: 'To contact AtaLoss'},
          {id: 'other_visiting', label: 'Other (please explain)', hasOther: true}
        ]
      },
      visitingFor: {
        question: 'I am visiting AtaLoss.org:',
        subtitle: '(tick all that are relevant)',
        options: [
          {id: 'myself', label: 'For myself'},
          {id: 'friend_family', label: 'For a friend or family member'},
          {id: 'organisation', label: 'On behalf of my organisation'},
          {id: 'other_for', label: 'Other (please explain)', hasOther: true}
        ]
      },
      heardWhere: {
        question: 'Where did you first hear about this website:',
        options: [
          {id: '', label: 'Select an option'},
          {id: 'search_engine', label: 'Search engine'},
          {id: 'media_social', label: 'Media/social media'},
          {id: 'friend_family', label: 'Friend or family'},
          {id: 'support_professional', label: 'Support Professional'},
          {id: 'organisation', label: 'Organisation'},
          {id: 'ataloss_newsletter', label: 'AtaLoss newsletter/email'},
          {id: 'other_heard', label: 'Other (please explain)', hasOther: true}
        ]
      }
    },

    // Step 3 questions
    step3: {
      ageGroup: {
        question: 'Age group (optional)',
        options: [
          {id: '', label: 'Select an option'},
          {id: 'under_18', label: 'Under 18'},
          {id: '18_30', label: '18-30'},
          {id: '31_44', label: '31-44'},
          {id: '45_59', label: '45-59'},
          {id: '60_74', label: '60-74'},
          {id: '75_plus', label: '75+'},
          {id: 'prefer_not_say', label: 'Prefer not to say'}
        ]
      },
      gender: {
        question: 'Gender (optional)',
        options: [
          {id: '', label: 'Select an option'},
          {id: 'male', label: 'Male'},
          {id: 'female', label: 'Female'},
          {id: 'non_binary', label: 'Non-binary'},
          {id: 'other', label: 'Other'},
          {id: 'prefer_not_say', label: 'Prefer not to say'}
        ]
      },
      ethnicity: {
        question: 'Ethnic identity (optional)',
        options: [
          {id: '', label: 'Select an option'},
          {id: 'white', label: 'White'},
          {id: 'mixed', label: 'Mixed/multiple ethnicity'},
          {id: 'asian', label: 'Asian/Asian British'},
          {id: 'black', label: 'Black/African/Caribbean/Black British'},
          {id: 'other_ethnic', label: 'Other ethnic group'},
          {id: 'prefer_not_say', label: 'Prefer not to say'}
        ]
      },
      barriers: {
        question: 'Can you tell us if you experienced any of these difficulties?',
        subtitle: '(select all that apply)',
        options: [
          {id: 'cant_find', label: "Couldn't find the right page/information"},
          {id: 'unclear', label: "Content wasn't relevant/clear"},
          {id: 'nav', label: 'Navigation was confusing'},
          {id: 'form', label: 'A form/process was hard to complete'},
          {id: 'tech', label: 'Technical issue / error / broken link'},
          {id: 'slow', label: 'Page was slow'},
          {id: 'other', label: 'Other (please explain)', hasOther: true}
        ]
      },
      contactMessage: {
        title: 'Need to share more feedback?',
        text: 'Please use the Contact link at the bottom of any of our pages to send us detailed feedback.'
      }
    },

    debug: false
  };

  /* -----------------------  SUBMISSION HANDLER  ----------------------- */
  const submitSurvey = async (payload) => {
    try {
      const response = await fetch(CONFIG.api.endpoint, {
        method: CONFIG.api.method,
        headers: CONFIG.api.headers,
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Survey submitted successfully:', result);
      return result;
    } catch (error) {
      console.error('Error submitting survey:', error);
      throw error;
    }
  };

  /* --- Do not run on Squarespace domains or counsellor page --- */
  const host = location.hostname;
  const isSquarespace = (host === 'squarespace.com') || host.endsWith('.squarespace.com');
  const isCounsellorPage = location.pathname === '/find-support/talk-to-a-counsellor';
  if (isSquarespace || isCounsellorPage) return;

  /* -------------------  GUARD: TTL / SESSION  ------------------- */
  const LS_KEY = `exitSurvey:${CONFIG.surveyId}`;
  let state = null;
  try { state = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch(_) { state = null; }

  // Hide auto-triggers within TTL, but still render & allow FAB open
  let suppressAuto = false;
  if (state?.lastTs) {
    const ageDays = (Date.now() - state.lastTs) / (1000*60*60*24);
    if (ageDays < CONFIG.ttlDays) suppressAuto = true;
  }

  /* -----------------------  STYLES  ----------------------- */
  const styles = `
  :root { --es-brand:${CONFIG.brandColor}; --es-text:#111827; --es-subtle:#6b7280; --es-bg:#fff; --es-ring: rgba(109,93,246,.35); --es-font: PlusJakartaSans-Light, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
  .es-hidden { display:none !important; }
  [hidden] { display:none !important; }

  .es-fab {
    position: fixed; left: 16px; bottom: 16px; z-index: 2147483000;
    background: var(--es-brand); color: #fff; border: 0; border-radius: 14px;
    padding: 12px 16px; font: 600 15px/1.1 var(--es-font);
    box-shadow: 0 10px 25px rgba(0,0,0,.15); cursor: pointer;
  }
  .es-fab:focus { outline: 3px solid var(--es-ring); outline-offset: 2px; }

  .es-modal {
    position: fixed; inset: 0; z-index: 2147483001; display: grid; place-items: center;
    background: rgba(17,24,39,.45); backdrop-filter: saturate(140%) blur(2px);
  }
  .es-dialog {
    width: min(560px, calc(100vw - 32px));
    background: var(--es-bg); color: var(--es-text); border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,.25);
    padding: 18px; outline: none;
    max-height: calc(100vh - 48px); overflow:auto;
  }
  .es-dialog, .es-dialog * { box-sizing: border-box; }

  .es-header { display:flex; align-items:center; justify-content: space-between; margin-bottom: 6px; }
  .es-title { font: 700 18px/1.2 var(--es-font); }
  .es-body .es-title { margin-bottom: 20px; } /* Add space when title is in body (Step 1) */
  .es-subtitle { font: 400 18px/1.2 var(--es-font); color: var(--es-subtle); margin-bottom: 16px; }
  .es-step-title { font: 600 17px/1.3 var(--es-font); color: var(--es-text); margin-bottom: 4px; }
  .es-required { color: var(--es-subtle); font-weight: 500; margin-left: 6px; font-size: 17px; }

  .es-close {
    appearance:none; border:0; background:transparent; font-size:20px; line-height:1; padding:6px; margin:-6px;
    border-radius:8px; color:#6b7280; cursor:pointer;
  }
  .es-close:focus { outline:3px solid var(--es-ring); }

  .es-body { margin-top: 8px; }
  .es-list { margin: 8px 0 4px; display:grid; gap:8px; }

  .es-option {
    display:flex; align-items:center; gap:10px; padding:10px; border-radius:12px; cursor:pointer; border:1px solid #e5e7eb;
  }
  .es-option:hover { background:#f9fafb; }
  .es-option input { accent-color: var(--es-brand); }
  .es-stars { display:inline-flex; gap:3px; }
  .es-star { width:18px; height:18px; display:inline-block; }

  .es-label { font: 600 17px/1.2 var(--es-font); color:#111827; }
  .es-sub { color:var(--es-subtle); font: 500 17px/1.2 var(--es-font); margin-bottom:6px; }

  .es-form { display:grid; gap:16px; margin-bottom: 8px; } /* Added bottom margin to create space before buttons */
  .es-field { display:grid; gap:8px; } /* Increased from 6px to 8px */
  .es-grid  { display:grid; gap:12px; grid-template-columns: 1fr 1fr; }
  @media (max-width:560px){ .es-grid { grid-template-columns: 1fr; } }

  .es-input, .es-select, .es-textarea {
    width:100%; border-radius:12px; border:1px solid #e5e7eb; padding:10px 12px;
    font:400 17px/1.35 var(--es-font);
  }
  .es-input:focus, .es-select:focus, .es-textarea:focus {
    outline: 3px solid var(--es-ring); outline-offset: 2px; border-color: var(--es-brand);
  }
  .es-radio { display:flex; align-items:center; gap:10px; }
  .es-radio input[type="checkbox"], .es-radio input[type="radio"] { 
    width: 16px; height: 16px; flex-shrink: 0; 
  }
  
  /* Styling for conditional "Other" text fields */
  .es-field .es-field {
    margin-left: 26px; /* Indent to align with checkbox text */
    margin-top: 12px; /* Increased spacing between checkbox and text field */
    margin-bottom: 8px; /* Add bottom margin to prevent cramping */
  }
  .es-field .es-field .es-input {
    font-size: 17px; /* Increased from 13px to match other inputs */
    padding: 10px 12px; /* Increased padding for better touch targets */
    border-color: #d1d5db;
    width: 100%; /* Ensure full width */
  }

  /* Styling for message text */
  .es-message {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 12px 16px;
    margin-top: 4px;
  }
  .es-message-prominent {
    background: #ffffff;
    border: 2px solid #3b82f6;
    border-radius: 8px;
    padding: 16px 20px;
    margin-top: 8px;
    margin-bottom: 20px;
  }
  .es-message-text {
    margin: 0;
    font: 400 17px/1.4 var(--es-font);
    color: var(--es-subtle);
  }
  .es-message-prominent .es-message-text {
    font: 400 17px/1.4 var(--es-font);
    color: #000000;
  }
  
  /* Larger text for first screen subtitle only */
  .es-body[data-step="1"] .es-message-prominent .es-message-text {
    font: 400 18px/1.2 var(--es-font);
  }
  
  /* Ensure final screen uses smaller text */
  .es-body[data-step="3"] .es-message-prominent .es-message-text {
    font: 400 17px/1.4 var(--es-font) !important;
  }
    color: var(--es-subtle);
  }

  .es-actions { 
    margin-top: 20px; 
    display: flex; 
    justify-content: flex-end; 
    gap: 8px; 
    flex-wrap: wrap; 
  }
  
  /* Original working solution */
  div.es-actions {
    direction: ltr !important;
    text-align: right !important;
    justify-content: flex-end !important;
  }
  .es-more, .es-submit, .es-back {
    border:0; border-radius:12px; padding: 12px 18px; font: 700 17px/1 var(--es-font);
    cursor:pointer;
    flex-shrink: 0 !important;
  }
  .es-submit { background: var(--es-brand); color:#fff; }
  .es-more   { background: var(--es-brand); color:#fff; }
  .es-back   { background:#e5e7eb; color:#111827; }

  .es-more:disabled,
  .es-submit:disabled {
    background: #e5e7eb !important;
    color: #a1a1aa !important;
    cursor: not-allowed !important;
    opacity: 1 !important;
  }

  .es-toast {
    position: fixed; left:50%; transform: translateX(-50%);
    bottom: 24px; background:#111827; color:#fff; padding:10px 14px; border-radius:12px; z-index:2147483002;
    font: 600 17px/1 var(--es-font);
    box-shadow: 0 12px 28px rgba(0,0,0,.25);
  }

  fieldset.es-field { 
    border: 1px solid #e5e7eb; 
    border-radius: 8px; 
    padding: 12px 16px; /* Increased padding from 10px 12px to 12px 16px */
    margin: 0; 
  }
  `;

  /* -----------------------  DOM SHELL ----------------------- */
  const root  = document.createElement('div');
  const style = document.createElement('style');
  style.textContent = styles;
  document.head.appendChild(style);
  document.body.appendChild(root);

  // Floating Feedback button
  const fab = document.createElement('button');
  fab.className = 'es-fab';
  fab.type = 'button';
  fab.setAttribute('aria-label', 'Give feedback');
  fab.textContent = 'Feedback';
  root.appendChild(fab);

  // Update FAB text based on survey state
  const updateFabText = () => {
    const hasShown = sessionAlreadyShown();
    if (hasShown || suppressAuto) {
      fab.textContent = 'Feedback.'; // Dot after = already triggered or suppressed by TTL
      fab.setAttribute('aria-label', 'Give feedback (survey completed)');
    } else if (armed) {
      fab.textContent = '.Feedback'; // Dot before = armed and ready
      fab.setAttribute('aria-label', 'Give feedback (survey ready)');
    } else {
      fab.textContent = 'Feedback'; // No dot = not armed yet
      fab.setAttribute('aria-label', 'Give feedback');
    }
  };

  // Lift FAB above Squarespace cookie banner (if present)
  (function keepFabAboveCookieBanner(){
    const BASE_BOTTOM = 16, GAP = 12;
    const COOKIE_SELECTORS = [
      'section.gdpr-cookie-banner[aria-label="Cookie banner"]',
      '.cookie-banner-mount-point',
      '.sqs-cookie-banner-v2',
      '.sqs-cookie-banner-v2-cta-container',
      '[class*="cookie" i][role="region"]'
    ];
    const isVisible = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
      const r = el.getBoundingClientRect(); return r.width>0 && r.height>0;
    };
    const findBanner = () => {
      for (const sel of COOKIE_SELECTORS) {
        const el = document.querySelector(sel);
        if (el && isVisible(el)) return el;
      }
      return null;
    };
    const adjust = () => {
      const banner = findBanner(); let bottom = BASE_BOTTOM;
      if (banner) {
        const r = banner.getBoundingClientRect();
        const nearBottom = r.bottom >= innerHeight - 40;
        const coversRight = r.right >= innerWidth * 0.5;
        if (nearBottom && coversRight) bottom = BASE_BOTTOM + Math.ceil(r.height) + GAP;
      }
      fab.style.bottom = `calc(${bottom}px + env(safe-area-inset-bottom, 0px))`;
    };
    adjust();
    const mo = new MutationObserver(() => requestAnimationFrame(adjust));
    mo.observe(document.documentElement, { childList:true, subtree:true, attributes:true });
    addEventListener('resize', adjust);
    setTimeout(adjust,0); setTimeout(adjust,300); setTimeout(adjust,1200);
  })();

  /* -----------------------  UTIL ----------------------- */
  const starSvg = (filled) => `
    <svg class="es-star" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 17.3l-6.16 3.6 1.64-6.98L2 8.9l7.05-.6L12 1.8l2.95 6.5 7.05.6-5.48 5.02 1.64 6.98z"
            fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5"/>
    </svg>`;
  const starRow = (count) => {
    let html = '<span class="es-stars" aria-hidden="true">';
    for (let i = 0; i < 5; i++) html += starSvg(i < count);
    return html + '</span>';
  };

  // Create a user fingerprint for better resubmission linking
  const createUserFingerprint = () => {
    try {
      // Create a more comprehensive fingerprint
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 200;
      canvas.height = 50;
      
      // More complex canvas fingerprint
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('BrowserFingerprint 🔍', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Unique identifier', 4, 35);
      
      const canvasData = canvas.toDataURL();
      
      // Generate timestamp-based component for uniqueness
      const sessionStart = Date.now();
      const randomComponent = Math.random().toString(36).substr(2, 9);
      
      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        navigator.languages ? navigator.languages.join(',') : '',
        screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
        new Date().getTimezoneOffset(),
        navigator.platform,
        navigator.cookieEnabled,
        navigator.doNotTrack || 'unknown',
        navigator.hardwareConcurrency || 'unknown',
        navigator.maxTouchPoints || 0,
        window.devicePixelRatio || 1,
        canvasData.slice(-100), // Last 100 chars of canvas
        sessionStart, // Add timestamp for session uniqueness
        randomComponent // Add random component
      ].join('|');
      
      // Create a better hash
      let hash = 0;
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      
      // Make it more readable and unique
      const uniqueId = Math.abs(hash).toString(36) + sessionStart.toString(36).slice(-4);
      return uniqueId;
      
    } catch (error) {
      // Fallback if fingerprinting fails
      console.warn('Fingerprinting failed, using fallback:', error);
      return 'fallback_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
    }
  };

  const lockScroll   = () => { document.documentElement.style.overflow = 'hidden'; };
  const unlockScroll = () => { document.documentElement.style.overflow = ''; };

  const toast = (text) => {
    const t = document.createElement('div');
    t.className = 'es-toast';
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  };

  /* -----------------------  MODAL ----------------------- */
  let modal = null;
  let selected = null; // step 1 rating id

  // Global collector functions accessible by both modal and unload handlers
  const collectStep1 = () => {
    const opt = CONFIG.options.find(o => o.id === selected);
    const step1CommentsField = modal?.querySelector('#es-step1-comments-text');
    const step1Comments = step1CommentsField ? (step1CommentsField.value || '').trim() : '';
    
    return {
      selected: selected || null,
      label:   opt?.label || null,
      stars:   opt?.stars || null,
      comments: step1Comments || null // Include step1 comments in the comments field
    };
  };

  const collectStep2 = () => {
    const step2 = modal?.querySelector('#es-step2');
    if (!step2) return {};
    const fd = new FormData(step2);
    
    // Collect checkbox values for visiting reasons (intent)
    const visitingReasons = [...step2.querySelectorAll('input[name="visiting_reasons"]:checked')].map(cb => cb.value);
    const visitingReasonsOther = (fd.get('visiting_reasons_other') || '').trim();
    
    // Collect checkbox values for visiting for (audience)
    const visitingFor = [...step2.querySelectorAll('input[name="visiting_for"]:checked')].map(cb => cb.value);
    const visitingForOther = (fd.get('visiting_for_other') || '').trim();
    
    // Collect dropdown value and other text
    const heardWhere = fd.get('heardWhere') || null;
    const heardWhereOther = (fd.get('heard_where_other') || '').trim();
    
    // Format arrays as comma-separated strings for Excel compatibility
    const intentStr = visitingReasons.length ? visitingReasons.join(', ') : null;
    const audienceStr = visitingFor.length ? visitingFor.join(', ') : null;
    
    return {
      intent: intentStr,  // Maps visitingReasons to intent field expected by server
      audience: audienceStr,  // Maps visitingFor to audience field expected by server
      heardWhere: heardWhere,
      // Other text fields for comments consolidation
      _visitingReasonsOther: visitingReasonsOther,
      _visitingForOther: visitingForOther,
      _heardWhereOther: heardWhereOther
    };
  };

  const collectStep3 = () => {
    const step3 = modal?.querySelector('#es-step3');
    if (!step3) return {};
    const fd = new FormData(step3);
    const barriers = [...step3.querySelectorAll('input[name="barriers"]:checked')].map(cb => cb.value);
    const barriersOther = (fd.get('barriers_other') || '').trim();
    
    // Consolidate all free-text comments into one field with labels
    const commentsParts = [];
    
    // Step 1 comments (low rating feedback)
    const step1Data = collectStep1();
    if (step1Data.comments) {
      commentsParts.push(`Low rating feedback: ${step1Data.comments}`);
    }
    
    // Step 2 "other" fields
    const step2Data = collectStep2();
    if (step2Data._visitingReasonsOther) {
      commentsParts.push(`Why visiting - Other: ${step2Data._visitingReasonsOther}`);
    }
    if (step2Data._visitingForOther) {
      commentsParts.push(`Visiting for - Other: ${step2Data._visitingForOther}`);
    }
    if (step2Data._heardWhereOther) {
      commentsParts.push(`Heard where - Other: ${step2Data._heardWhereOther}`);
    }
    
    // Step 3 barriers other
    if (barriersOther) {
      commentsParts.push(`Barriers - Other: ${barriersOther}`);
    }
    
    const consolidatedComments = commentsParts.length > 0 ? commentsParts.join('\n') : null;
    
    return {
      ageGroup:  fd.get('ageGroup') || null,
      gender:    fd.get('gender')   || null,
      ethnicity: fd.get('ethnicity')|| null,
      barriers:  barriers.length ? barriers : null,
      comments:  consolidatedComments
    };
  };

  const openModal = () => {
    if (modal) return;

    // Reset state for new session
    selected = null;

    modal = document.createElement('div');
    modal.className = 'es-modal';
    modal.innerHTML = `
      <div class="es-dialog" role="dialog" aria-modal="true" aria-labelledby="es-title">
        <div class="es-header">
          <div></div>
          <button type="button" class="es-close" aria-label="Close dialog">×</button>
        </div>

        <!-- STEP 1 -->
        <div class="es-body" data-step="1">
          <div class="es-title">${CONFIG.ui.title}</div>
          <div class="es-message-prominent">
            <p class="es-message-text">${CONFIG.ui.subtitle}</p>
          </div>
          <div class="es-step-title">${CONFIG.question}<span class="es-required"> ${CONFIG.ui.requiredIndicator}</span></div>
          <div class="es-sub">${CONFIG.ui.step1Instruction}</div>
          <form id="es-step1" class="es-list">
            ${CONFIG.options.map((opt, i) => `
              <label class="es-option" for="es-${opt.id}">
                <input type="radio" id="es-${opt.id}" name="helpfulness" value="${opt.id}" ${i===0?'autofocus':''}/>
                ${starRow(opt.stars)}
                <span class="es-label">${opt.label}</span>
              </label>
            `).join('')}
          </form>
          
          <!-- Conditional text field for 1-2 star ratings -->
          <div class="es-field es-hidden" id="es-step1-comments" style="margin-top: 24px; margin-bottom: 20px;">
            <label for="es-step1-comments-text" class="es-label">Please tell us more about your experience:</label>
            <textarea id="es-step1-comments-text" name="step1_comments" class="es-textarea" maxlength="500" placeholder="Your feedback helps us improve the website..."></textarea>
            <div class="es-char-count" style="font-size: 17px; color: var(--es-subtle); text-align: right; margin-top: 4px; font-family: var(--es-font);">
              <span id="es-step1-char-count">0</span>/500 characters
            </div>
          </div>
          
          <div class="es-actions">
            <button type="button" class="es-more" id="es-more-1" disabled>${CONFIG.ui.buttons.more}</button>
          </div>
        </div>

        <!-- STEP 2 -->
        <div class="es-body es-hidden" data-step="2">
          <form id="es-step2" class="es-form" novalidate>
            <!-- Question 2: Why are you visiting ataloss.org? -->
            <fieldset class="es-field">
              <legend class="es-label">${CONFIG.step2.visitingReasons.question} <span class="es-required" aria-hidden="true">${CONFIG.step2.visitingReasons.subtitle}</span></legend>
              ${CONFIG.step2.visitingReasons.options.map(opt => `
                <label class="es-radio"><input type="checkbox" name="visiting_reasons" value="${opt.id}"${opt.hasOther ? ` id="visiting_other_cb"` : ''}> ${opt.label}</label>
                ${opt.hasOther ? `<div class="es-field es-hidden" id="visiting_other_text"><input type="text" name="visiting_reasons_other" class="es-input" placeholder="${CONFIG.ui.otherPlaceholder}" maxlength="${CONFIG.validation.otherTextMaxLength}"></div>` : ''}
              `).join('')}
            </fieldset>

            <!-- Question 3: I am visiting ataloss.org -->
            <fieldset class="es-field">
              <legend class="es-label">${CONFIG.step2.visitingFor.question} <span class="es-required" aria-hidden="true">${CONFIG.step2.visitingFor.subtitle}</span></legend>
              ${CONFIG.step2.visitingFor.options.map(opt => `
                <label class="es-radio"><input type="checkbox" name="visiting_for" value="${opt.id}"${opt.hasOther ? ` id="visiting_for_other_cb"` : ''}> ${opt.label}</label>
                ${opt.hasOther ? `<div class="es-field es-hidden" id="visiting_for_other_text"><input type="text" name="visiting_for_other" class="es-input" placeholder="${CONFIG.ui.otherPlaceholder}" maxlength="${CONFIG.validation.otherTextMaxLength}"></div>` : ''}
              `).join('')}
            </fieldset>

            <!-- Question 4: Where did you first hear about this website -->
            <div class="es-field">
              <label for="es-heard" class="es-label">${CONFIG.step2.heardWhere.question}</label>
              <select id="es-heard" name="heardWhere" class="es-select">
                ${CONFIG.step2.heardWhere.options.map(opt => `
                  <option value="${opt.id}">${opt.label}</option>
                `).join('')}
              </select>
              <div class="es-field es-hidden" id="heard_other_text">
                <input type="text" name="heard_where_other" class="es-input" placeholder="${CONFIG.ui.otherPlaceholder}" maxlength="${CONFIG.validation.otherTextMaxLength}">
              </div>
            </div>
          </form>
          <div class="es-actions">
            <button type="button" class="es-back" id="es-back-2">${CONFIG.ui.buttons.back}</button>
            <button type="button" class="es-more" id="es-more-2">${CONFIG.ui.buttons.more}</button>
          </div>
        </div>

        <!-- STEP 3 -->
        <div class="es-body es-hidden" data-step="3">
          <form id="es-step3" class="es-form" novalidate>
            <div class="es-grid">
              <div class="es-field">
                <label for="es-age" class="es-label">${CONFIG.step3.ageGroup.question}</label>
                <select id="es-age" name="ageGroup" class="es-select">
                  ${CONFIG.step3.ageGroup.options.map(opt => `
                    <option value="${opt.id}">${opt.label}</option>
                  `).join('')}
                </select>
              </div>
              <div class="es-field">
                <label for="es-gender" class="es-label">${CONFIG.step3.gender.question}</label>
                <select id="es-gender" name="gender" class="es-select">
                  ${CONFIG.step3.gender.options.map(opt => `
                    <option value="${opt.id}">${opt.label}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div class="es-field">
              <label for="es-eth" class="es-label">${CONFIG.step3.ethnicity.question}</label>
              <select id="es-eth" name="ethnicity" class="es-select">
                ${CONFIG.step3.ethnicity.options.map(opt => `
                  <option value="${opt.id}">${opt.label}</option>
                `).join('')}
              </select>
            </div>

            <fieldset class="es-field js-barriers" hidden>
              <legend class="es-label">${CONFIG.step3.barriers.question} <span class="es-required" aria-hidden="true">${CONFIG.step3.barriers.subtitle}</span></legend>
              ${CONFIG.step3.barriers.options.map(opt => `
                <label class="es-radio"><input type="checkbox" name="barriers" value="${opt.id}"${opt.hasOther ? ` id="barriers_other_cb"` : ''}> ${opt.label}</label>
                ${opt.hasOther ? `<div class="es-field es-hidden" id="barriers_other_text"><input type="text" name="barriers_other" class="es-input" placeholder="${CONFIG.ui.otherPlaceholder}" maxlength="${CONFIG.validation.otherTextMaxLength}"></div>` : ''}
              `).join('')}
            </fieldset>

            <div class="es-field">
              <!-- Hidden textarea to maintain form logic, always returns null -->
              <textarea id="es-comments" name="comments" class="es-textarea es-hidden" maxlength="${CONFIG.validation.commentsMaxLength}"></textarea>
              
              <!-- Message instead of free text input -->
              <div class="es-message-prominent">
                <p class="es-message-text"><strong>${CONFIG.step3.contactMessage.title}</strong><br>${CONFIG.step3.contactMessage.text}</p>
              </div>
            </div>
          </form>

          <div class="es-actions">
            <button type="button" class="es-back"   id="es-back-3">${CONFIG.ui.buttons.back}</button>
            <button type="button" class="es-submit" id="es-submit-3">${CONFIG.ui.buttons.submit}</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    lockScroll();

    const dialog   = modal.querySelector('.es-dialog');
    const closeBtn = modal.querySelector('.es-close');

    // Step toggling
    const showStep = (n) => {
      modal.querySelectorAll('[data-step]')
        .forEach(b => b.classList.toggle('es-hidden', +b.dataset.step !== n));
      if (n === 1) modal.querySelector('#es-step1 input[name="helpfulness"]')?.focus();
      if (n === 2) modal.querySelector('input[name="visiting_reasons"]')?.focus();
      if (n === 3) { syncBarriers(); modal.querySelector('#es-age')?.focus(); }
    };

    // --- STEP 1 wiring
    const step1 = modal.querySelector('#es-step1');
    const more1 = modal.querySelector('#es-more-1');
    const radios1 = [...step1.querySelectorAll('input[name="helpfulness"]')];
    const step1CommentsField = modal.querySelector('#es-step1-comments');
    const step1Textarea = modal.querySelector('#es-step1-comments-text');
    const step1CharCount = modal.querySelector('#es-step1-char-count');

    const enableStep1Buttons = () => {
      selected = radios1.find(r => r.checked)?.value || null;
      const enabled = !!selected;
      more1.disabled = !enabled;
      
      // Show/hide comments field based on star rating (1-2 stars)
      if (selected) {
        const opt = CONFIG.options.find(o => o.id === selected);
        const showComments = opt && opt.stars <= 2;
        step1CommentsField.classList.toggle('es-hidden', !showComments);
        
        if (showComments && step1Textarea) {
          setTimeout(() => step1Textarea.focus(), 100);
        } else if (step1Textarea) {
          step1Textarea.value = ''; // Clear text when hiding
        }
      } else {
        step1CommentsField.classList.add('es-hidden');
        if (step1Textarea) step1Textarea.value = '';
      }
    };
    
    // Character counter for step 1 comments
    if (step1Textarea && step1CharCount) {
      step1Textarea.addEventListener('input', () => {
        const length = step1Textarea.value.length;
        step1CharCount.textContent = length;
        
        // Optional: Change color when approaching limit
        if (length > 450) {
          step1CharCount.style.color = '#ef4444'; // Red
        } else if (length > 400) {
          step1CharCount.style.color = '#f59e0b'; // Orange
        } else {
          step1CharCount.style.color = 'var(--es-subtle)'; // Default
        }
      });
    }
    
    radios1.forEach(r => r.addEventListener('change', enableStep1Buttons));
    enableStep1Buttons();

    // --- STEP 2 wiring
    const step2 = modal.querySelector('#es-step2'); // now step3 form is step2
    const back2 = modal.querySelector('#es-back-2');
    const more2 = modal.querySelector('#es-more-2');

    // --- STEP 3 wiring
    const step3 = modal.querySelector('#es-step3'); // now step2 form is step3
    const back3 = modal.querySelector('#es-back-3');
    const sub3  = modal.querySelector('#es-submit-3');

    // Submission helper
    const submitPayload = async (stage) => {
      // re-submission flag/count
      const prev = state || { count: 0 };
      const isResubmission = prev.count > 0;

      // Create consistent user identifier (stable across sessions)
      const userFingerprint = createUserFingerprint();
      
      // Create session-specific ID (unique per browser session/visit)
      const sessionId = prev.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      
      const p = {
        surveyId: CONFIG.surveyId,
        submissionStage: stage,          // 1, 2, or 3
        trigger: window.__ES_triggerSource || 'unknown',
        path: location.pathname + location.search,
        timestamp: new Date().toISOString(), // UTC timestamp
        ua: navigator.userAgent,
        resubmission: isResubmission,
        resubmissionCount: prev.count || 0,
        userFingerprint: userFingerprint,
        sessionId: sessionId,
        ...collectStep1()
      };
      if (stage >= 2) Object.assign(p, collectStep2());
      if (stage >= 3) Object.assign(p, collectStep3());

      try { await submitSurvey(p); } catch (e) { console.error(e); }

      // Persist state for TTL + re-submissions (include sessionId for consistency)
      state = { 
        count: (prev.count||0) + 1, 
        lastTs: Date.now(),
        sessionId: sessionId, // Keep same session ID for this browser session
        submitted: true // Mark as already submitted to prevent double submission
      };
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch(_) {}

      toast('Thanks for your feedback!');
      close(true); // Pass true to indicate this is a proper submission
    };

    // Navigation
    more1.addEventListener('click', () => showStep(2));
    back2.addEventListener('click', () => showStep(1));
    more2.addEventListener('click', () => showStep(3));
    back3.addEventListener('click', () => showStep(2));
    sub3.addEventListener('click', () => submitPayload(3));

    // Handle "Other" option toggles in Step 2 and Step 3
    const setupOtherToggles = () => {
      // Visiting reasons "Other" toggle
      const visitingOtherCb = modal.querySelector('#visiting_other_cb');
      const visitingOtherText = modal.querySelector('#visiting_other_text');
      if (visitingOtherCb && visitingOtherText) {
        visitingOtherCb.addEventListener('change', () => {
          visitingOtherText.classList.toggle('es-hidden', !visitingOtherCb.checked);
          if (visitingOtherCb.checked) {
            visitingOtherText.querySelector('input').focus();
          } else {
            visitingOtherText.querySelector('input').value = '';
          }
        });
      }

      // Visiting for "Other" toggle
      const visitingForOtherCb = modal.querySelector('#visiting_for_other_cb');
      const visitingForOtherText = modal.querySelector('#visiting_for_other_text');
      if (visitingForOtherCb && visitingForOtherText) {
        visitingForOtherCb.addEventListener('change', () => {
          visitingForOtherText.classList.toggle('es-hidden', !visitingForOtherCb.checked);
          if (visitingForOtherCb.checked) {
            visitingForOtherText.querySelector('input').focus();
          } else {
            visitingForOtherText.querySelector('input').value = '';
          }
        });
      }

      // Heard where "Other" toggle
      const heardSelect = modal.querySelector('#es-heard');
      const heardOtherText = modal.querySelector('#heard_other_text');
      if (heardSelect && heardOtherText) {
        heardSelect.addEventListener('change', () => {
          const isOther = heardSelect.value === 'other_heard';
          heardOtherText.classList.toggle('es-hidden', !isOther);
          if (isOther) {
            heardOtherText.querySelector('input').focus();
          } else {
            heardOtherText.querySelector('input').value = '';
          }
        });
      }

      // Barriers "Other" toggle (Step 3)
      const barriersOtherCb = modal.querySelector('#barriers_other_cb');
      const barriersOtherText = modal.querySelector('#barriers_other_text');
      if (barriersOtherCb && barriersOtherText) {
        barriersOtherCb.addEventListener('change', () => {
          barriersOtherText.classList.toggle('es-hidden', !barriersOtherCb.checked);
          if (barriersOtherCb.checked) {
            barriersOtherText.querySelector('input').focus();
          } else {
            barriersOtherText.querySelector('input').value = '';
          }
        });
      }
    };

    // Set up other toggles after modal is ready
    setTimeout(setupOtherToggles, 0);

    // Close controls
    const close = (wasSubmitted = false) => {
      if (!modal) return;
      // Only submit on exit if the user didn't already submit via submit button
      if (!wasSubmitted) {
        submitOnExit(); // treat exit as submit only if not already submitted
      }
      modal.remove(); modal = null; unlockScroll();
    };
    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', function esc(e){
      if (e.key === 'Escape' && modal) { e.preventDefault(); close(); document.removeEventListener('keydown', esc); }
    });

    // Initial view
    showStep(1);
    setTimeout(() => dialog.focus(), 0);
  };

  function syncBarriers() {
    const barriersFieldset = modal.querySelector('.js-barriers');
    // Show only if selected rating is less than 4 stars
    const opt = CONFIG.options.find(o => o.id === selected);
    const showBarriers = opt && opt.stars < 4;
    barriersFieldset.hidden = !showBarriers;
  }

  /* -------------------  EXIT INTENT + FAB  ------------------- */
  const SESSION_KEY = `exitSurvey:session:${CONFIG.surveyId}`;
  const SITE_TIMER_KEY = `exitSurvey:siteTimer:${CONFIG.surveyId}`;
  let fired = false;
  let armed = false;
  let fallbackTimer = null;
  window.__ES_triggerSource = 'auto';

  // Check if user has been on site long enough (across pages)
  const getSiteEngagementTime = () => {
    try {
      const stored = sessionStorage.getItem(SITE_TIMER_KEY);
      if (stored) {
        const startTime = parseInt(stored);
        return Date.now() - startTime;
      } else {
        // First page visit - set the timer
        sessionStorage.setItem(SITE_TIMER_KEY, Date.now().toString());
        return 0;
      }
    } catch(_) {
      return 0;
    }
  };

  const markSessionShown = () => { try { localStorage.setItem(SESSION_KEY, '1'); } catch(_){} };
  const sessionAlreadyShown = () => {
    try { return CONFIG.oncePerSession && localStorage.getItem(SESSION_KEY) === '1'; }
    catch(_) { return false; }
  };
  const canShow = () => !fired && !sessionAlreadyShown();

  const trigger = (source = 'auto', { force = false } = {}) => {
    if (!force && !canShow()) return;
    fired = true;
    if (!force) markSessionShown();
    window.__ES_triggerSource = source;
    if (CONFIG.debug) console.log('[exit-survey] show via', source, `(site engagement: ${Math.round(getSiteEngagementTime()/1000)}s)`);
    openModal();
    updateFabText(); // Update FAB after survey shown
    document.removeEventListener('mouseout', onMouseOut);
    if (fallbackTimer) clearTimeout(fallbackTimer);
  };

  // Check site-wide engagement time
  const siteEngagementMs = getSiteEngagementTime();
  const needsArmingDelay = siteEngagementMs < CONFIG.armAfterMs;

  if (needsArmingDelay) {
    const remainingArmTime = CONFIG.armAfterMs - siteEngagementMs;
    setTimeout(() => { 
      armed = true; 
      updateFabText(); // Update FAB when armed
      if (CONFIG.debug) console.log('[exit-survey] armed after site engagement reached 10s'); 
    }, remainingArmTime);
  } else {
    armed = true;
    if (CONFIG.debug) console.log('[exit-survey] armed immediately (user already engaged for', Math.round(siteEngagementMs/1000) + 's)');
  }
  
  // Initial FAB text update
  updateFabText();

  // exit-intent (desktop) – only when not suppressed by TTL
  const onMouseOut = (e) => {
    if (!armed || !canShow()) return;
    const threshold = (typeof CONFIG.topThresholdPx === 'number' ? CONFIG.topThresholdPx : 10);
    const nearTop = e.clientY <= threshold;
    const leavingDoc = e.relatedTarget === null;
    
    // Trigger on mouse movement toward browser chrome (nearTop)
    // OR when truly leaving the document (leavingDoc) but not to another element on the page
    if (nearTop || (leavingDoc && e.clientY <= threshold * 3)) {
      trigger('exit');
    }
  };

  if (!suppressAuto) {
    document.addEventListener('mouseout', onMouseOut);
    
    // Set up fallback timer based on device type
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    const fallbackDelay = isMobile ? CONFIG.fallbackAfterMs.mobile : CONFIG.fallbackAfterMs.desktop;
    
    if (fallbackDelay > 0) {
      fallbackTimer = setTimeout(() => { if (canShow()) trigger('fallback'); }, fallbackDelay);
    }
  }

  // FAB always opens (even within TTL), marked as re-submission if already submitted
  fab.addEventListener('click', () => trigger('fab', { force: true }));

  // Tiny API for manual testing
window.ExitSurvey = {
  open: () => trigger('manual', { force: true }),
  resetSession: () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch(_) {}
    fired = false; armed = false;
    if (CONFIG.debug) console.log('[exit-survey] session reset');
    // Re-arm exit intent
    if (!suppressAuto) {
      document.addEventListener('mouseout', onMouseOut);
      
      // Set up fallback timer based on device type
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                      (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
      const fallbackDelay = isMobile ? CONFIG.fallbackAfterMs.mobile : CONFIG.fallbackAfterMs.desktop;
      
      if (fallbackDelay > 0) {
        fallbackTimer = setTimeout(() => { if (canShow()) trigger('fallback'); }, fallbackDelay);
      }
    }
  }
};

  function submitOnExit() {
    // Determine which step is currently visible
    let step = 1;
    if (!modal) return;
    if (!modal.querySelector('[data-step="1"]').classList.contains('es-hidden')) step = 1;
    else if (!modal.querySelector('[data-step="2"]').classList.contains('es-hidden')) step = 2;
    else if (!modal.querySelector('[data-step="3"]').classList.contains('es-hidden')) step = 3;

    // Compose payload
    const prev = state || { count: 0 };
    const isResubmission = prev.count > 0;
    const userFingerprint = createUserFingerprint();
    const sessionId = prev.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    
    const p = {
      surveyId: CONFIG.surveyId,
      submissionStage: step,
      trigger: window.__ES_triggerSource || 'unknown',
      path: location.pathname + location.search,
      timestamp: new Date().toISOString(), // UTC timestamp
      ua: navigator.userAgent,
      resubmission: isResubmission,
      resubmissionCount: prev.count || 0,
      exited: true, // flag for exit
      userFingerprint: userFingerprint,
      sessionId: sessionId,
      ...collectStep1()
    };
    if (step >= 2) Object.assign(p, collectStep2());
    if (step >= 3) Object.assign(p, collectStep3());

    try { submitSurvey(p); } catch (e) { console.error(e); }

    // Persist state for TTL + re-submissions (include sessionId for consistency)
    state = { 
      count: (prev.count||0) + 1, 
      lastTs: Date.now(),
      sessionId: sessionId
    };
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch(_) {}
  }
})();