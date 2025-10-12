/* tutorial-modal.js — SnipVault Guide modal + slider (3 slides)
   Smooth open/close (keyframes), body-lock, swipe, dots, keyboard nav
   Delegated trigger: #btnTutorial atau [data-open="guide"]
*/
(function () {
    "use strict";

    function $(s, c) {
        return (c || document).querySelector(s);
    }
    function $all(s, c) {
        return Array.prototype.slice.call((c || document).querySelectorAll(s));
    }

    function init() {
        const modal = $("#sv-guide-modal");
        if (!modal) return;

        const dialog = modal.querySelector(".sv-modal__dialog");
        const backdrop = modal.querySelector(".sv-modal__backdrop");
        const btnPrev = modal.querySelector("#svg-prev");
        const btnNext = modal.querySelector("#svg-next");
        const rail = modal.querySelector(".sv-slides");
        const dotsWrap = modal.querySelector(".sv-dots");
        const slides = $all(".sv-slide", modal);
        const total = slides.length;

        let index = 0;
        let lastFocus = null;
        let touchX = 0,
            touchY = 0;

        function setActive() {
            slides.forEach((s, i) => s.classList.toggle("is-active", i === index));
        }

        /* dots */
        function buildDots() {
            dotsWrap.innerHTML = "";
            for (let i = 0; i < total; i++) {
                const b = document.createElement("button");
                b.type = "button";
                b.setAttribute("aria-label", `Slide ${i + 1}`);
                if (i === index) b.setAttribute("aria-selected", "true");
                b.addEventListener("click", () => goTo(i));
                dotsWrap.appendChild(b);
            }
        }
        function updateDots() {
            $all("button", dotsWrap).forEach((b, i) => {
                if (i === index) b.setAttribute("aria-selected", "true");
                else b.removeAttribute("aria-selected");
            });
        }

        /* nav */
        function goTo(i) {
            index = Math.max(0, Math.min(total - 1, i));
            rail.style.transform = `translateX(${index * -100}%)`;
            setActive();
            updateDots();
        }

        function onKey(e) {
            if (modal.hasAttribute("hidden")) return;
            if (e.key === "Escape") close();
            else if (e.key === "ArrowRight") goTo(index + 1);
            else if (e.key === "ArrowLeft") goTo(index - 1);
        }

        /* open/close (animated via CSS keyframes) */
        function open(startAt = 0) {
            lastFocus = document.activeElement;
            index = Math.min(Math.max(0, startAt | 0), total - 1);
            goTo(index);

            modal.removeAttribute("hidden");
            modal.setAttribute("aria-hidden", "false");

            // force reflow lalu set state
            void modal.offsetWidth;
            modal.classList.add("is-open");
            document.body.classList.add("sv-modal-open");

            if (dialog) dialog.focus({ preventScroll: true });
            document.addEventListener("keydown", onKey);
        }

        function close() {
            if (modal.hasAttribute("hidden")) return;
            modal.classList.remove("is-open");
            modal.classList.add("is-closing");

            const finish = () => {
                modal.classList.remove("is-closing");
                modal.setAttribute("hidden", "");
                modal.setAttribute("aria-hidden", "true");
                document.removeEventListener("keydown", onKey);
                document.body.classList.remove("sv-modal-open");
                if (lastFocus && lastFocus.focus) lastFocus.focus();
            };

            // tunggu animasi keyframes selesai
            let done = false;
            const once = () => {
                if (done) return;
                done = true;
                finish();
            };
            modal.addEventListener("animationend", once, { once: true });
            setTimeout(once, 800); // fallback
        }

        /* clicks & swipe */
        if (btnPrev) btnPrev.addEventListener("click", () => goTo(index - 1));
        if (btnNext) btnNext.addEventListener("click", () => goTo(index + 1));
        if (backdrop) backdrop.addEventListener("click", close);
        if (dialog) {
            dialog.addEventListener("click", (e) => {
                const el = e.target.closest("[data-close]");
                if (el) close();
            });
        }

        // Delegated trigger (works even if button injected later)
        document.addEventListener("click", (e) => {
            const trg = e.target.closest("#btnTutorial,[data-open='guide']");
            if (trg) {
                open(0);
            }
            if (e.target.closest("#svg-close")) {
                close();
            }
        });

        // Swipe (mobile)
        rail.addEventListener(
            "touchstart",
            (e) => {
                const t = e.changedTouches[0];
                touchX = t.clientX;
                touchY = t.clientY;
            },
            { passive: true }
        );
        rail.addEventListener(
            "touchend",
            (e) => {
                const t = e.changedTouches[0];
                const dx = t.clientX - touchX,
                    dy = t.clientY - touchY;
                if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
                    if (dx < 0) goTo(index + 1);
                    else goTo(index - 1);
                }
            },
            { passive: true }
        );

        // init
        buildDots();
        goTo(0);

        // Deep-link auto open: ?guide=1 atau #guide
        try {
            const url = new URL(location.href);
            if (url.searchParams.has("guide") || location.hash === "#guide") open(0);
        } catch {}

        // expose (opsional)
        window.SVGuide = { open, close, goTo };
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
