/** Supported UI languages. Thai is always the default. */
export type Lang = "th" | "en";

/**
 * Flat string dictionary for UI chrome (nav, footer, homepage, components).
 * Deep / user-generated content (manga titles, chapter text) is NOT translated.
 */
export const dict = {
  th: {
    // ── Navbar ────────────────────────────────────────────────────────────
    navAllContent: "เรื่องทั้งหมด",
    navCreator: "ครีเอเตอร์",
    navDownloadApp: "โหลดแอป",
    navSignIn: "เข้าสู่ระบบ",
    navSearchLabel: "ค้นหา",
    navOpenMenu: "เปิดเมนู",
    navCloseMenu: "ปิดเมนู",
    navTypeAll: "เรื่องทั้งหมด",
    navCreatorGuide: "สอนสร้างเนื้อหา",
    navApplyTranslator: "สมัครนักแปล",
    navApplyWriter: "สมัครนักเขียน",
    navMyProfile: "โปรไฟล์ของฉัน",
    navMySettings: "ตั้งค่าบัญชี",
    navOfflineLibrary: "คลังออฟไลน์",
    navDownloadAndroid: "โหลดแอป Android",
    navMyAccount: "บัญชีของฉัน",
    navDashboard: "แดชบอร์ด",
    navWriteNovel: "เขียนนิยาย",
    navUploadManga: "อัปโหลดมังงะ",
    navAdmin: "แอดมิน",
    // ── Footer ────────────────────────────────────────────────────────────
    footerTagline:
      "แพลตฟอร์มอ่านการ์ตูนออนไลน์ มังงะ มันฮวา มานฮวา ที่ใหญ่ที่สุดในไทย",
    footerSectionContent: "เนื้อหา",
    footerSectionAccount: "บัญชี",
    footerSectionInfo: "ข้อมูล",
    footerAllTitles: "เรื่องทั้งหมด",
    footerSearch: "ค้นหา",
    footerAndroidApp: "แอป Android",
    footerSignIn: "เข้าสู่ระบบ",
    footerSignUp: "สมัครสมาชิก",
    footerJoinCreators: "ลงงานกับเรา (รับ 80%)",
    footerServices: "รับพิสูจน์อักษร/จัดหน้า",
    footerAbout: "เกี่ยวกับเรา",
    footerTerms: "ข้อกำหนด",
    footerPrivacy: "นโยบายความเป็นส่วนตัว",
    // ── Homepage ──────────────────────────────────────────────────────────
    genreAll: "ทั้งหมด",
    latestUpdates: "อัปเดตล่าสุด",
    viewAll: "ดูทั้งหมด",
    weeklyTop: "ยอดนิยมสัปดาห์นี้",
    browseAll: "ดูมังงะทั้งหมด",
    featuredNovels: "นิยายน่าอ่าน",
    serviceBadge: "บริการโดย INKVERSE · สำหรับนักเขียน & นักแปล",
    serviceTitle: "พิสูจน์อักษร & จัดเรียงหน้า นิยายไทย",
    serviceDesc:
      "งานเขียนสะอาด อ่านลื่น เป็นมืออาชีพ — ลูกค้าใหม่ฟรี 2,500 คำแรก",
    serviceBtn: "ดูบริการ & ขอราคาฟรี",
    // ── FeaturedTitles ────────────────────────────────────────────────────
    featuredTitle: "เรื่องเด่น",
    readNow: "อ่านเลย",
    labelNovel: "นิยาย",
    labelRecommended: "แนะนำ",
    chaptersUnit: "ตอน",
    prevSlide: "ก่อนหน้า",
    nextSlide: "ถัดไป",
    slideLabel: "สไลด์",
    // ── ContinueReading ───────────────────────────────────────────────────
    continueReading: "อ่านต่อ",
    chapterPrefix: "ตอนที่",
    // ── TranslatorRanking ─────────────────────────────────────────────────
    creatorRanking: "อันดับครีเอเตอร์",
    worksUnit: "ผลงาน",
    // ── RankingPanel ──────────────────────────────────────────────────────
    rankingsTitle: "อันดับ",
    tabWeek: "สัปดาห์",
    tabMonth: "เดือน",
    tabAll: "ทั้งหมด",
    noData: "ยังไม่มีข้อมูล",
    // ── SearchBox ─────────────────────────────────────────────────────────
    searchPlaceholder: "ค้นหามังงะ...",
    searchNoResults: "ไม่พบเรื่องที่ตรงกับ",
    searchLatestChapter: "ตอนล่าสุด",
    searchViewAll: "ดูผลการค้นหาทั้งหมด",
  },
  en: {
    // ── Navbar ────────────────────────────────────────────────────────────
    navAllContent: "All Titles",
    navCreator: "Creators",
    navDownloadApp: "Get App",
    navSignIn: "Sign In",
    navSearchLabel: "Search",
    navOpenMenu: "Open menu",
    navCloseMenu: "Close menu",
    navTypeAll: "All Titles",
    navCreatorGuide: "Creator Guide",
    navApplyTranslator: "Apply as Translator",
    navApplyWriter: "Apply as Writer",
    navMyProfile: "My Profile",
    navMySettings: "Account Settings",
    navOfflineLibrary: "Offline Library",
    navDownloadAndroid: "Download Android App",
    navMyAccount: "My Account",
    navDashboard: "Dashboard",
    navWriteNovel: "Write Novel",
    navUploadManga: "Upload Manga",
    navAdmin: "Admin",
    // ── Footer ────────────────────────────────────────────────────────────
    footerTagline:
      "Thailand's leading online comics platform — manga, manhwa, manhua",
    footerSectionContent: "Content",
    footerSectionAccount: "Account",
    footerSectionInfo: "Info",
    footerAllTitles: "Browse All",
    footerSearch: "Search",
    footerAndroidApp: "Android App",
    footerSignIn: "Sign In",
    footerSignUp: "Sign Up",
    footerJoinCreators: "Publish With Us (80% Rev Share)",
    footerServices: "Proofreading & Typesetting",
    footerAbout: "About",
    footerTerms: "Terms",
    footerPrivacy: "Privacy Policy",
    // ── Homepage ──────────────────────────────────────────────────────────
    genreAll: "All",
    latestUpdates: "Latest Updates",
    viewAll: "View All",
    weeklyTop: "Top This Week",
    browseAll: "Browse All",
    featuredNovels: "Featured Novels",
    serviceBadge: "Service by INKVERSE · For Writers & Translators",
    serviceTitle: "Proofreading & Typesetting",
    serviceDesc:
      "Clean prose, professional layout — first 2,500 words free for new clients",
    serviceBtn: "View Services & Get a Quote",
    // ── FeaturedTitles ────────────────────────────────────────────────────
    featuredTitle: "Featured",
    readNow: "Read Now",
    labelNovel: "Novel",
    labelRecommended: "Recommended",
    chaptersUnit: "Ch.",
    prevSlide: "Previous",
    nextSlide: "Next",
    slideLabel: "Slide",
    // ── ContinueReading ───────────────────────────────────────────────────
    continueReading: "Continue Reading",
    chapterPrefix: "Ch.",
    // ── TranslatorRanking ─────────────────────────────────────────────────
    creatorRanking: "Top Creators",
    worksUnit: "works",
    // ── RankingPanel ──────────────────────────────────────────────────────
    rankingsTitle: "Rankings",
    tabWeek: "Week",
    tabMonth: "Month",
    tabAll: "All Time",
    noData: "No data yet",
    // ── SearchBox ─────────────────────────────────────────────────────────
    searchPlaceholder: "Search manga...",
    searchNoResults: "No results for",
    searchLatestChapter: "Latest Ch.",
    searchViewAll: "View all results for",
  },
} as const;

export type LangKey = keyof typeof dict.th;

// ── PromoCarousel slides ───────────────────────────────────────────────────
// Separated from the flat dict to keep typing clean. The icon field is
// resolved in the component (icons stay the same between languages).
export type PromoSlide = {
  tag: string;
  title: string;
  sub: string;
  cta: string;
  href: string;
  platforms?: boolean;
};

export const promoSlidesDict: Record<Lang, PromoSlide[]> = {
  th: [
    {
      tag: "อ่านออฟไลน์ได้แล้ววันนี้",
      title: "โหลดเก็บไว้อ่านออฟไลน์",
      sub: "ดาวน์โหลดตอนเก็บไว้อ่านตอนเน็ตไม่มี — ทั้ง iPhone และ Android ฟรี!",
      cta: "โหลดแอป",
      href: "/download",
      platforms: true,
    },
    {
      tag: "โปรโมชั่น",
      title: "เติมเหรียญ รับโบนัสทุกแพ็กเกจ",
      sub: "เลือกแพ็กเกจที่ใช่ รับเหรียญโบนัสเพิ่มทันที — ปลดล็อกตอนพรีเมียม + สนับสนุนนักเขียน/นักแปลที่คุณรักโดยตรง",
      cta: "เติมเหรียญ",
      href: "/topup",
    },
    {
      tag: "ใหม่! สำหรับนักเขียน",
      title: "เครื่องมือเขียนระดับโปร",
      sub: "WYSIWYG · ประวัติเวอร์ชัน · Story Bible · สถิติรายเรื่อง · ส่งออก .epub — ชุดเครื่องมือนักเขียนที่ครบกว่าทุกที่ เขียนลื่น เก็บงานปลอดภัย เริ่มฟรีวันนี้",
      cta: "ดูเครื่องมือทั้งหมด",
      href: "/creator-101",
    },
    {
      tag: "ใหม่! สำหรับนักแปล",
      title: "เครื่องมือนักแปลระดับโปร",
      sub: "ตัดภาพ manhwa อัตโนมัติ · คลังคำแปล/ชื่อ · พรีวิวก่อนเผยแพร่ · อัปหลายตอนรวด — ชุดเครื่องมือนักแปลที่ทัดเทียมนักเขียน อัปไว แปลเนียน เริ่มฟรีวันนี้",
      cta: "สมัครนักแปลเลย",
      href: "/apply?as=translator",
    },
    {
      tag: "ครีเอเตอร์",
      title: "เปิดรับนักเขียน & นักแปล รุ่นแรก",
      sub: "อนุมัติไว ลงผลงานได้เลย รับส่วนแบ่งรายได้ 80% — รู้ผลเร็ว เริ่มสร้างรายได้จากงานเขียนของคุณ",
      cta: "สมัครเลย",
      href: "/creator-101",
    },
  ],
  en: [
    {
      tag: "Available to Read Offline Today",
      title: "Download & Read Offline",
      sub: "Save chapters to read without internet — free on iPhone and Android!",
      cta: "Get the App",
      href: "/download",
      platforms: true,
    },
    {
      tag: "Promotion",
      title: "Top Up Coins & Get Bonus",
      sub: "Choose your package and get instant bonus coins — unlock premium chapters and directly support your favorite creators",
      cta: "Top Up",
      href: "/topup",
    },
    {
      tag: "New! For Writers",
      title: "Professional Writing Tools",
      sub: "WYSIWYG · Version history · Story Bible · Per-series stats · .epub export — the most complete writer toolkit anywhere. Write smoothly, save securely. Start free today.",
      cta: "View All Tools",
      href: "/creator-101",
    },
    {
      tag: "New! For Translators",
      title: "Professional Translation Tools",
      sub: "Auto manhwa panel crop · Translation glossary · Pre-publish preview · Batch chapter uploads — tools as powerful as writers get. Upload fast, translate clean. Start free today.",
      cta: "Apply as Translator",
      href: "/apply?as=translator",
    },
    {
      tag: "Creator",
      title: "Now Accepting Writers & Translators",
      sub: "Quick approval, publish immediately, earn 80% revenue share — find out fast and start monetizing your work",
      cta: "Apply Now",
      href: "/creator-101",
    },
  ],
};

/** Platform button labels (PromoCarousel). */
export const platformLabelsDict: Record<Lang, { iphone: string; android: string }> = {
  th: { iphone: "เพิ่มลงโฮม", android: "โหลด APK" },
  en: { iphone: "Add to Home", android: "Download APK" },
};
