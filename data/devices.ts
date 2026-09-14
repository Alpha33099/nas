export type Device = {
  id: string;
  brand: string;
  model: string;
  esimSupported: boolean;
  nonPtaNote: string;
  regionNotes: string;
  status: "compatible" | "not-compatible" | "unknown";
};

const nonPtaNoteCompatible =
  "This device supports eSIM. If factory-unlocked, it generally works with Simwaya. Confirm with Simwaya on Instagram if using a non-PTA unit.";

export const devices: Device[] = [
  // iPhone
  { id: "iphone-17-pro-max", brand: "Apple", model: "iPhone 17 Pro Max", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "US models are eSIM-only (no physical SIM tray).", status: "compatible" },
  { id: "iphone-17-pro", brand: "Apple", model: "iPhone 17 Pro", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "US models are eSIM-only (no physical SIM tray).", status: "compatible" },
  { id: "iphone-17", brand: "Apple", model: "iPhone 17", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "US models are eSIM-only (no physical SIM tray).", status: "compatible" },
  { id: "iphone-16-pro-max", brand: "Apple", model: "iPhone 16 Pro Max", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "US models are eSIM-only (no physical SIM tray).", status: "compatible" },
  { id: "iphone-16-pro", brand: "Apple", model: "iPhone 16 Pro", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "US models are eSIM-only (no physical SIM tray).", status: "compatible" },
  { id: "iphone-16", brand: "Apple", model: "iPhone 16", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "US models are eSIM-only (no physical SIM tray).", status: "compatible" },
  { id: "iphone-16-plus", brand: "Apple", model: "iPhone 16 Plus", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "US models are eSIM-only (no physical SIM tray).", status: "compatible" },
  { id: "iphone-15-pro-max", brand: "Apple", model: "iPhone 15 Pro Max", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "US models are eSIM-only (no physical SIM tray).", status: "compatible" },
  { id: "iphone-15-pro", brand: "Apple", model: "iPhone 15 Pro", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "US models are eSIM-only (no physical SIM tray).", status: "compatible" },
  { id: "iphone-15", brand: "Apple", model: "iPhone 15", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "US models are eSIM-only (no physical SIM tray).", status: "compatible" },
  { id: "iphone-14-pro-max", brand: "Apple", model: "iPhone 14 Pro Max", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "US models are eSIM-only (no physical SIM tray).", status: "compatible" },
  { id: "iphone-14-pro", brand: "Apple", model: "iPhone 14 Pro", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "US models are eSIM-only (no physical SIM tray).", status: "compatible" },
  { id: "iphone-14", brand: "Apple", model: "iPhone 14", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "US models are eSIM-only (no physical SIM tray).", status: "compatible" },
  { id: "iphone-13-pro-max", brand: "Apple", model: "iPhone 13 Pro Max", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },
  { id: "iphone-13-pro", brand: "Apple", model: "iPhone 13 Pro", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },
  { id: "iphone-13", brand: "Apple", model: "iPhone 13", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },
  { id: "iphone-13-mini", brand: "Apple", model: "iPhone 13 mini", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },
  { id: "iphone-12-pro-max", brand: "Apple", model: "iPhone 12 Pro Max", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },
  { id: "iphone-12-pro", brand: "Apple", model: "iPhone 12 Pro", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },
  { id: "iphone-12", brand: "Apple", model: "iPhone 12", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },
  { id: "iphone-12-mini", brand: "Apple", model: "iPhone 12 mini", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },
  { id: "iphone-11-pro-max", brand: "Apple", model: "iPhone 11 Pro Max", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },
  { id: "iphone-11-pro", brand: "Apple", model: "iPhone 11 Pro", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },
  { id: "iphone-11", brand: "Apple", model: "iPhone 11", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },
  { id: "iphone-xs", brand: "Apple", model: "iPhone XS", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },
  { id: "iphone-xs-max", brand: "Apple", model: "iPhone XS Max", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },
  { id: "iphone-xr", brand: "Apple", model: "iPhone XR", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },
  { id: "iphone-se-2022", brand: "Apple", model: "iPhone SE (2022)", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },
  { id: "iphone-se-2020", brand: "Apple", model: "iPhone SE (2020)", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },

  // Samsung
  { id: "galaxy-s25-ultra", brand: "Samsung", model: "Galaxy S25 Ultra", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "Some region variants (e.g. certain Exynos models) may have limited eSIM support - check your exact model.", status: "compatible" },
  { id: "galaxy-s25-plus", brand: "Samsung", model: "Galaxy S25+", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "Some region variants may have limited eSIM support - check your exact model.", status: "compatible" },
  { id: "galaxy-s25", brand: "Samsung", model: "Galaxy S25", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "Some region variants may have limited eSIM support - check your exact model.", status: "compatible" },
  { id: "galaxy-s24-ultra", brand: "Samsung", model: "Galaxy S24 Ultra", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "Some region variants may have limited eSIM support - check your exact model.", status: "compatible" },
  { id: "galaxy-s24-plus", brand: "Samsung", model: "Galaxy S24+", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "Some region variants may have limited eSIM support - check your exact model.", status: "compatible" },
  { id: "galaxy-s24", brand: "Samsung", model: "Galaxy S24", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "Some region variants may have limited eSIM support - check your exact model.", status: "compatible" },
  { id: "galaxy-s23-ultra", brand: "Samsung", model: "Galaxy S23 Ultra", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "Some region variants may have limited eSIM support - check your exact model.", status: "compatible" },
  { id: "galaxy-s23-plus", brand: "Samsung", model: "Galaxy S23+", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "Some region variants may have limited eSIM support - check your exact model.", status: "compatible" },
  { id: "galaxy-s23", brand: "Samsung", model: "Galaxy S23", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "Some region variants may have limited eSIM support - check your exact model.", status: "compatible" },
  { id: "galaxy-s22-ultra", brand: "Samsung", model: "Galaxy S22 Ultra", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "Some region variants may have limited eSIM support - check your exact model.", status: "compatible" },
  { id: "galaxy-s22-plus", brand: "Samsung", model: "Galaxy S22+", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "Some region variants may have limited eSIM support - check your exact model.", status: "compatible" },
  { id: "galaxy-s22", brand: "Samsung", model: "Galaxy S22", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "Some region variants may have limited eSIM support - check your exact model.", status: "compatible" },
  { id: "galaxy-z-fold-6", brand: "Samsung", model: "Galaxy Z Fold 6", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },
  { id: "galaxy-z-flip-6", brand: "Samsung", model: "Galaxy Z Flip 6", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },
  { id: "galaxy-note-20-ultra", brand: "Samsung", model: "Galaxy Note 20 Ultra", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },

  // Google Pixel
  { id: "pixel-9-pro", brand: "Google", model: "Pixel 9 Pro", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },
  { id: "pixel-9", brand: "Google", model: "Pixel 9", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },
  { id: "pixel-8-pro", brand: "Google", model: "Pixel 8 Pro", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },
  { id: "pixel-8", brand: "Google", model: "Pixel 8", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },
  { id: "pixel-7-pro", brand: "Google", model: "Pixel 7 Pro", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },
  { id: "pixel-7", brand: "Google", model: "Pixel 7", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },
  { id: "pixel-6-pro", brand: "Google", model: "Pixel 6 Pro", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },
  { id: "pixel-6", brand: "Google", model: "Pixel 6", esimSupported: true, nonPtaNote: nonPtaNoteCompatible, regionNotes: "", status: "compatible" },

  // Known non-compatible / budget models without eSIM
  { id: "galaxy-a-series-budget", brand: "Samsung", model: "Galaxy A-series (most budget models)", esimSupported: false, nonPtaNote: "Most budget Galaxy A-series phones do not support eSIM.", regionNotes: "Check your exact model number to confirm.", status: "not-compatible" },
  { id: "iphone-8-and-older", brand: "Apple", model: "iPhone 8 and older", esimSupported: false, nonPtaNote: "eSIM was introduced with the iPhone XS/XR generation. Older iPhones do not support eSIM.", regionNotes: "", status: "not-compatible" },
];
