(() => {
  const root = window;
  const sections = Array.from(document.querySelectorAll(".section"));
  const header = document.querySelector(".site-header");
  const firstContent = document.querySelector(".section.first-content");

  if (!root || sections.length === 0) return;

  const setActiveSection = (section) => {
    if (!section) return;
    sections.forEach((item) => item.classList.toggle("is-active", item === section));
    if (section.dataset.bg) {
      document.documentElement.style.setProperty("--bg", section.dataset.bg);
    }
  };

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      let best = null;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (!best || entry.intersectionRatio > best.intersectionRatio) {
          best = entry;
        }
      }
      if (best) setActiveSection(best.target);
    },
    {
      threshold: [0.2, 0.4, 0.6, 0.8],
    }
  );

  sections.forEach((section) => sectionObserver.observe(section));
  setActiveSection(sections[0]);

  if (header) {
    const heroSection = document.querySelector(".section--hero");
    let heroStart = 0;
    let heroEnd = 0;

    const updateHeroRange = () => {
      if (!heroSection) return;
      heroStart = heroSection.offsetTop;
      heroEnd = heroSection.offsetTop + heroSection.offsetHeight;
    };

    const updateHeaderVisibility = () => {
      const scrollTop = window.scrollY;
      const onHero = scrollTop >= heroStart && scrollTop < heroEnd;
      document.body.classList.toggle("header-hero", onHero);
      document.body.classList.toggle("header-visible", scrollTop >= heroEnd);
    };

    updateHeroRange();
    updateHeaderVisibility();
    window.addEventListener("scroll", updateHeaderVisibility, { passive: true });
    window.addEventListener("resize", () => {
      updateHeroRange();
      updateHeaderVisibility();
    });
  }
})();
