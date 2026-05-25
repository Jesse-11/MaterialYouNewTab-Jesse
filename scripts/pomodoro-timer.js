/*
 * Material You NewTab
 * Copyright (c) 2024-2026 Prem, 2023-2025 XengShi
 * Licensed under the GNU General Public License v3.0 (GPL-3.0)
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

// ------------------------ Pomodoro Timer ------------------------
const pomodoroCont = document.getElementById("pomodoroCont");
const pomodoroContainer = document.getElementById("pomodoroContainer");
const pomodoroTime = document.getElementById("pomodoroTime");
const pomodoroDial = document.getElementById("pomodoroDial");
const pomodoroSessionLabel = document.getElementById("pomodoroSessionLabel");
const pomodoroDurationLabel = document.getElementById("pomodoroDurationLabel");
const pomodoroStartPause = document.getElementById("pomodoroStartPause");
const pomodoroReset = document.getElementById("pomodoroReset");
const pomodoroSkipBreak = document.getElementById("pomodoroSkipBreak");
const pomodoroFocusMinutes = document.getElementById("pomodoroFocusMinutes");
const pomodoroBreakMinutes = document.getElementById("pomodoroBreakMinutes");

const POMODORO_DEFAULT_DURATIONS = {
    work: 25 * 60,
    break: 5 * 60
};
const POMODORO_MIN_SECONDS = 60;
const POMODORO_MAX_SECONDS = 120 * 60;
const POMODORO_STORAGE_KEY = "pomodoroTimerState";
const hasPomodoroTimerElements = [
    pomodoroCont,
    pomodoroContainer,
    pomodoroTime,
    pomodoroDial,
    pomodoroSessionLabel,
    pomodoroDurationLabel,
    pomodoroStartPause,
    pomodoroReset,
    pomodoroSkipBreak,
    pomodoroFocusMinutes,
    pomodoroBreakMinutes
].every(Boolean);

let pomodoroInterval = null;
let pomodoroState = getDefaultPomodoroState();

function getPomodoroTranslations() {
    const selectedLanguage = localStorage.getItem("selectedLanguage") || "en";
    const fallbackTranslations = (typeof en !== "undefined") ? en : {};
    const activeTranslations = (typeof translations !== "undefined" && translations[selectedLanguage]) ? translations[selectedLanguage] : fallbackTranslations;

    return {
        focus: activeTranslations.pomodoroFocus || fallbackTranslations.pomodoroFocus || "Focus",
        break: activeTranslations.pomodoroBreak || fallbackTranslations.pomodoroBreak || "Break",
        start: activeTranslations.pomodoroStart || fallbackTranslations.pomodoroStart || "Start",
        pause: activeTranslations.pomodoroPause || fallbackTranslations.pomodoroPause || "Pause",
        minutesSuffix: activeTranslations.pomodoroMinutesSuffix || fallbackTranslations.pomodoroMinutesSuffix || "min"
    };
}

function getDefaultPomodoroState() {
    return {
        mode: "work",
        durations: {
            work: POMODORO_DEFAULT_DURATIONS.work,
            break: POMODORO_DEFAULT_DURATIONS.break
        },
        remaining: POMODORO_DEFAULT_DURATIONS.work,
        running: false,
        updatedAt: null
    };
}

function clampPomodoroSeconds(seconds, fallback) {
    const normalizedSeconds = Number(seconds);
    if (!Number.isFinite(normalizedSeconds)) return fallback;

    return Math.min(Math.max(Math.round(normalizedSeconds), POMODORO_MIN_SECONDS), POMODORO_MAX_SECONDS);
}

function clampPomodoroMinutes(minutes, fallbackSeconds) {
    const normalizedMinutes = Number(minutes);
    const fallbackMinutes = Math.round(fallbackSeconds / 60);

    if (!Number.isFinite(normalizedMinutes)) return fallbackMinutes;
    return Math.min(Math.max(Math.round(normalizedMinutes), POMODORO_MIN_SECONDS / 60), POMODORO_MAX_SECONDS / 60);
}

function getPomodoroDuration(mode) {
    return pomodoroState.durations[mode === "break" ? "break" : "work"];
}

function getPomodoroDurations(savedState) {
    const savedDurations = savedState.durations || {};

    return {
        work: clampPomodoroSeconds(savedDurations.work, POMODORO_DEFAULT_DURATIONS.work),
        break: clampPomodoroSeconds(savedDurations.break, POMODORO_DEFAULT_DURATIONS.break)
    };
}

function switchPomodoroSession() {
    pomodoroState.mode = pomodoroState.mode === "work" ? "break" : "work";
}

function normalizePomodoroState(savedState) {
    const normalizedMode = savedState.mode === "break" ? "break" : "work";
    const durations = getPomodoroDurations(savedState);
    pomodoroState.durations = durations;
    const duration = getPomodoroDuration(normalizedMode);
    const remaining = Number(savedState.remaining);

    return {
        mode: normalizedMode,
        durations: durations,
        remaining: Number.isFinite(remaining) && remaining > 0 ? Math.min(remaining, duration) : duration,
        running: savedState.running === true,
        updatedAt: Number(savedState.updatedAt) || null
    };
}

function applyPomodoroElapsedTime() {
    if (!pomodoroState.running || !pomodoroState.updatedAt) return;

    const now = Date.now();
    const elapsed = Math.floor((now - pomodoroState.updatedAt) / 1000);
    if (elapsed < 1) return;

    let elapsedSeconds = elapsed;
    const cycleDuration = getPomodoroDuration("work") + getPomodoroDuration("break");

    if (elapsedSeconds < pomodoroState.remaining) {
        pomodoroState.remaining -= elapsedSeconds;
        pomodoroState.updatedAt = now;
        return;
    }

    elapsedSeconds -= pomodoroState.remaining;
    switchPomodoroSession();
    elapsedSeconds = elapsedSeconds % cycleDuration;

    while (elapsedSeconds >= getPomodoroDuration(pomodoroState.mode)) {
        elapsedSeconds -= getPomodoroDuration(pomodoroState.mode);
        switchPomodoroSession();
    }

    pomodoroState.remaining = getPomodoroDuration(pomodoroState.mode) - elapsedSeconds;
    pomodoroState.updatedAt = now;
}

function loadPomodoroState() {
    try {
        const savedState = JSON.parse(localStorage.getItem(POMODORO_STORAGE_KEY)) || {};
        pomodoroState = normalizePomodoroState(savedState);
        applyPomodoroElapsedTime();
    } catch (error) {
        console.error("Error loading Pomodoro state:", error);
        localStorage.removeItem(POMODORO_STORAGE_KEY);
    }
}

function savePomodoroState() {
    localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(pomodoroState));
}

function formatPomodoroMinutes(seconds) {
    const text = getPomodoroTranslations();
    return `${Math.round(seconds / 60)} ${text.minutesSuffix}`;
}

function formatPomodoroTime(seconds) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainingSeconds}`;
}

function renderPomodoroTimer() {
    const text = getPomodoroTranslations();
    const duration = getPomodoroDuration(pomodoroState.mode);
    const elapsedPercent = Math.min(Math.max(((duration - pomodoroState.remaining) / duration) * 100, 0), 100);

    pomodoroTime.textContent = formatPomodoroTime(pomodoroState.remaining);
    pomodoroSessionLabel.textContent = pomodoroState.mode === "break" ? text.break : text.focus;
    pomodoroDurationLabel.textContent = formatPomodoroMinutes(duration);
    pomodoroStartPause.textContent = pomodoroState.running ? text.pause : text.start;
    pomodoroSkipBreak.disabled = pomodoroState.mode !== "break";
    pomodoroDial.style.setProperty("--pomodoro-progress", `${elapsedPercent}%`);
    pomodoroFocusMinutes.value = Math.round(getPomodoroDuration("work") / 60);
    pomodoroBreakMinutes.value = Math.round(getPomodoroDuration("break") / 60);
}

function startPomodoroInterval() {
    clearInterval(pomodoroInterval);

    if (pomodoroState.running) {
        pomodoroInterval = setInterval(() => {
            applyPomodoroElapsedTime();
            savePomodoroState();
            renderPomodoroTimer();
        }, 1000);
    }
}

function setPomodoroRunning(isRunning) {
    applyPomodoroElapsedTime();
    pomodoroState.running = isRunning;
    pomodoroState.updatedAt = isRunning ? Date.now() : null;
    savePomodoroState();
    renderPomodoroTimer();
    startPomodoroInterval();
}

function updatePomodoroDuration(mode, input) {
    applyPomodoroElapsedTime();

    const oldDuration = getPomodoroDuration(mode);
    const minutes = clampPomodoroMinutes(input.value, oldDuration);
    const newDuration = minutes * 60;

    input.value = minutes;
    pomodoroState.durations[mode] = newDuration;

    if (pomodoroState.mode === mode) {
        pomodoroState.remaining = Math.min(pomodoroState.remaining, newDuration);
        if (!pomodoroState.running || pomodoroState.remaining <= 0) {
            pomodoroState.remaining = newDuration;
        }
        pomodoroState.updatedAt = pomodoroState.running ? Date.now() : null;
    }

    savePomodoroState();
    renderPomodoroTimer();
    startPomodoroInterval();
}

if (hasPomodoroTimerElements) {
    pomodoroStartPause.addEventListener("click", function () {
        setPomodoroRunning(!pomodoroState.running);
    });

    pomodoroReset.addEventListener("click", function () {
        pomodoroState.running = false;
        pomodoroState.updatedAt = null;
        pomodoroState.remaining = getPomodoroDuration(pomodoroState.mode);
        savePomodoroState();
        renderPomodoroTimer();
        startPomodoroInterval();
    });

    pomodoroSkipBreak.addEventListener("click", function () {
        if (pomodoroState.mode !== "break") return;

        pomodoroState.mode = "work";
        pomodoroState.remaining = getPomodoroDuration("work");
        pomodoroState.updatedAt = pomodoroState.running ? Date.now() : null;
        savePomodoroState();
        renderPomodoroTimer();
    });

    pomodoroFocusMinutes.addEventListener("change", function () {
        updatePomodoroDuration("work", pomodoroFocusMinutes);
    });

    pomodoroBreakMinutes.addEventListener("change", function () {
        updatePomodoroDuration("break", pomodoroBreakMinutes);
    });

    pomodoroCont.addEventListener("click", function (event) {
        const isMenuVisible = pomodoroContainer.style.display === "grid";

        pomodoroContainer.style.display = isMenuVisible ? "none" : "grid";

        if (!isMenuVisible) {
            pomodoroContainer.style.animation = "panelScaleIn 200ms cubic-bezier(0.4, 0, 0.2, 1) forwards";
            pomodoroCont.classList.add("menu-open");
        } else {
            pomodoroCont.classList.remove("menu-open");
        }

        event.stopPropagation();
    });

    document.addEventListener("click", function (event) {
        const isClickInside = pomodoroContainer.contains(event.target) || pomodoroCont.contains(event.target);

        if (!isClickInside && pomodoroContainer.style.display === "grid") {
            pomodoroContainer.style.display = "none";
            pomodoroCont.classList.remove("menu-open");
        }
    });

    document.addEventListener("visibilitychange", function () {
        if (!pomodoroState.running) return;

        applyPomodoroElapsedTime();
        savePomodoroState();
        renderPomodoroTimer();
    });

    document.addEventListener("DOMContentLoaded", function () {
        const pomodoroTimerCheckbox = document.getElementById("pomodoroTimerCheckbox");

        loadPomodoroState();
        renderPomodoroTimer();
        startPomodoroInterval();

        if (!pomodoroTimerCheckbox) return;

        pomodoroTimerCheckbox.addEventListener("change", function () {
            saveCheckboxState("pomodoroTimerCheckboxState", pomodoroTimerCheckbox);
            if (pomodoroTimerCheckbox.checked) {
                pomodoroCont.style.display = "flex";
                saveDisplayStatus("pomodoroTimerDisplayStatus", "flex");
            } else {
                pomodoroCont.style.display = "none";
                pomodoroContainer.style.display = "none";
                pomodoroCont.classList.remove("menu-open");
                saveDisplayStatus("pomodoroTimerDisplayStatus", "none");
            }
        });

        loadCheckboxState("pomodoroTimerCheckboxState", pomodoroTimerCheckbox);
        loadDisplayStatus("pomodoroTimerDisplayStatus", pomodoroCont);
    });
}
