"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Cpu,
  Download,
  FileSpreadsheet,
  MessageSquare,
  PlusCircle,
  Radio,
  Send,
  Smartphone,
  Sparkles,
  Sprout,
  Trash2,
  Wifi,
} from "lucide-react";
import { useLanguage, type Locale } from "@/lib/i18n/LanguageProvider";
import { Reveal } from "@/lib/motion/Reveal";
import { Section } from "@/components/ui/Section";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  ApiError,
  classifyApiError,
  fetchAdvisory,
  fetchCrops,
  fetchDistricts,
  fetchFieldIoTStatus,
  fetchLocalizedMlAdvisory,
  fetchNotificationStatus,
  fetchSubscriptions,
  ingestIoTReading,
  previewNotificationAdvisory,
  registerIoTDevice,
  subscribeNotifications,
  unsubscribeNotification,
} from "@/lib/api/client";
import { apiErrorMessageKey } from "@/lib/api/errorMessage";
import type {
  AdvisoryRequest,
  CropOut,
  DistrictOut,
  FieldIoTStatus,
  LocalizedMlResponse,
  NotificationDispatchPreview,
  NotificationStatusResponse,
  SubscriptionResponse,
} from "@/lib/api/schemas";
import { FieldForm, type FieldFormValues } from "./_components/FieldForm";
import { FieldCard, type DashboardField, type FieldAdvisoryState, type FieldCardCopy } from "./_components/FieldCard";

const STORAGE_KEY = "paaniplan-fields";
const GROWTH_STAGES = ["initial", "development", "mid_season", "late_season"] as const;
const IRRIGATION_METHODS = ["drip", "sprinkler", "flood"] as const;

type DashboardTab = "fields" | "notifications" | "iot" | "ml" | "export";

const baseFieldCopy = {
  growthStage: {
    initial: "Initial",
    development: "Development",
    mid_season: "Mid-season",
    late_season: "Late-season",
  },
  irrigationMethod: {
    drip: "Drip",
    sprinkler: "Sprinkler",
    flood: "Flood",
  },
  stressLabel: {
    low: "Low stress",
    moderate: "Moderate stress",
    high: "High stress",
    severe: "Severe stress",
  },
  headline: (grossMm: string, litres: string, days: number) =>
    `Apply ~${grossMm} mm (~${litres} litres) every ${days} ${days === 1 ? "day" : "days"}`,
  reasoningNote:
    "This combines the crop's current water demand with expected rainfall, soil water-holding capacity and the chosen irrigation method's efficiency.",
  breakdownHeading: "Weather & calculation details",
  etoLabel: "Reference evapotranspiration (ETo)",
  kcLabel: "Crop coefficient (Kc)",
  etcLabel: "Crop water demand (ETc)",
  effectiveRainfallLabel: "Effective rainfall",
  mmPerDay: "mm/day",
  sampleClimateNote: "Published IMD Climatological Normals were used for this district baseline.",
  regionalStressLabel: (index: number) => `District baseline stress index: ${index}/100 (CGWB baseline)`,
  cardErrorMessage: "Could not calculate this field. Please try again.",
  removeLabel: (label: string) => `Remove ${label}`,
  areaCaption: (hectares: string) => `${hectares} ha`,
};

const copy: Record<Locale, any> = {
  en: {
    heroEyebrow: "Farmer Workspace",
    heroTitle: "Field Management & Multi-Channel Advisory",
    heroSubtitle:
      "Manage your agricultural plots with real FAO-56 scientific calculations, opt in to daily SMS/WhatsApp advisories, monitor live IoT soil moisture nodes, and run local-area machine learning adjustments.",
    dataCaption:
      "Each card is computed directly from genuine agronomic formulas and official CGWB/IMD baselines.",
    loadError: "Could not load districts and crops.",
    savedFieldsHeading: "Saved Fields",
    emptyTitle: "No fields saved yet",
    emptyBody: "Add your first field below to see live, formula-based irrigation guidance.",
    emptyCta: "Add a field",
    addFormHeading: "Add a field",
    fieldLabelLabel: "Field name",
    fieldLabelPlaceholder: "e.g. North plot",
    districtLabel: "District",
    districtPlaceholder: "Select a district",
    cropLabel: "Crop",
    cropPlaceholder: "Select a crop",
    recommendedSuffix: "recommended here",
    growthStageLabel: "Growth stage",
    irrigationMethodLabel: "Irrigation method",
    areaLabel: "Field area (hectares)",
    addButton: "Add field",
    adding: "Adding…",
    requiredError: "Please make a selection.",
    labelRequiredError: "Give this field a short name.",
    areaRangeError: "Enter an area between 0 and 10,000 hectares.",
    ...baseFieldCopy,
  },
  hi: {
    heroEyebrow: "किसान कार्यक्षेत्र",
    heroTitle: "खेत प्रबंधन और बहु-माध्यम सलाह",
    heroSubtitle:
      "अपने खेतों को वास्तविक FAO-56 वैज्ञानिक फॉर्मूलों से प्रबंधित करें, दैनिक एसएमएस/व्हाट्सएप सलाह प्राप्त करें, IoT मिट्टी नमी सेंसर जांचें और स्थानीय मशीन लर्निंग सुधार देखें।",
    dataCaption:
      "प्रत्येक कार्ड वास्तविक वैज्ञानिक सूत्रों और आधिकारिक CGWB/IMD मानकों से गणना किया गया है।",
    loadError: "जिले और फसलें लोड नहीं हो सकीं।",
    savedFieldsHeading: "सहेजे गए खेत",
    emptyTitle: "अभी तक कोई खेत सहेजा नहीं गया",
    emptyBody: "नीचे दिए फॉर्म से अपना पहला खेत जोड़ें और उसके लिए लाइव सिंचाई सिफारिश देखें।",
    emptyCta: "खेत जोड़ें",
    addFormHeading: "खेत जोड़ें",
    fieldLabelLabel: "खेत का नाम",
    fieldLabelPlaceholder: "जैसे, उत्तरी खेत",
    districtLabel: "जिला",
    districtPlaceholder: "जिला चुनें",
    cropLabel: "फसल",
    cropPlaceholder: "फसल चुनें",
    recommendedSuffix: "यहाँ अनुशंसित",
    growthStageLabel: "फसल की अवस्था",
    irrigationMethodLabel: "सिंचाई विधि",
    areaLabel: "खेत का क्षेत्रफल (हेक्टेयर)",
    addButton: "खेत जोड़ें",
    adding: "जोड़ा जा रहा है…",
    requiredError: "कृपया एक विकल्प चुनें।",
    labelRequiredError: "इस खेत के लिए एक छोटा नाम दें।",
    areaRangeError: "0 से 10,000 हेक्टेयर के बीच क्षेत्रफल दर्ज करें।",
    ...baseFieldCopy,
    headline: (grossMm: string, litres: string, days: number) =>
      `हर ${days} दिन में ~${grossMm} मिमी (~${litres} लीटर) पानी दें`,
    sampleClimateNote: "इस जिले के लिए IMD दीर्घकालिक मौसमी जलवायु मानकों का उपयोग किया गया।",
    regionalStressLabel: (index: number) => `जिला आधारभूत जल तनाव सूचकांक: ${index}/100 (CGWB आधार)`,
    cardErrorMessage: "इस खेत की गणना नहीं हो सकी। कृपया फिर से प्रयास करें।",
    removeLabel: (label: string) => `${label} हटाएं`,
    areaCaption: (hectares: string) => `${hectares} हेक्टेयर`,
  },
  mr: {
    heroEyebrow: "शेतकरी कार्यक्षेत्र",
    heroTitle: "शेत व्यवस्थापन व बहु-माध्यम सल्ला",
    heroSubtitle: "आपल्या शेतांचे वैज्ञानिक सूत्रांद्वारे व्यवस्थापन करा आणि दररोज एसएमएस/व्हॉट्सॲपवर सिंचन सल्ला मिळवा.",
    dataCaption: "प्रत्येक शेताची गणना FAO-56 सूत्रांद्वारे थेट केली जाते.",
    loadError: "माहिती लोड होऊ शकली नाही.",
    savedFieldsHeading: "जतन केलेली शेते",
    emptyTitle: "अद्याप कोणतेही शेत जतन केलेले नाही",
    emptyBody: "पहिले शेत जोडून प्रत्यक्ष सिंचन सल्ला पहा.",
    emptyCta: "शेत जोडा",
    addFormHeading: "शेत जोडा",
    fieldLabelLabel: "शेताचे नाव",
    fieldLabelPlaceholder: "उदा. विहिरीजवळील रान",
    districtLabel: "जिल्हा",
    districtPlaceholder: "जिल्हा निवडा",
    cropLabel: "पीक",
    cropPlaceholder: "पीक निवडा",
    recommendedSuffix: "येथे शिफारस केलेले",
    growthStageLabel: "वाढीची अवस्था",
    irrigationMethodLabel: "सिंचन पद्धत",
    areaLabel: "क्षेत्रफळ (हेक्टर)",
    addButton: "शेत जोडा",
    adding: "जोडले जात आहे…",
    requiredError: "कृपया निवड करा.",
    labelRequiredError: "शेताचे नाव लिहा.",
    areaRangeError: "योग्य क्षेत्रफळ लिहा.",
    ...baseFieldCopy,
    headline: (grossMm: string, litres: string, days: number) =>
      `दर ${days} दिवसांनी ~${grossMm} मिमी (~${litres} लिटर) पाणी द्या`,
    sampleClimateNote: "या जिल्ह्यासाठी अधिकृत IMD मानके वापरण्यात आली आहेत.",
    regionalStressLabel: (index: number) => `जिल्हा जल-ताण निर्देशांक: ${index}/100 (CGWB)`,
    cardErrorMessage: "गणना अयशस्वी.",
    removeLabel: (label: string) => `${label} हटवा`,
    areaCaption: (hectares: string) => `${hectares} हेक्टर`,
  },
  ta: {
    heroEyebrow: "விவசாயி பணியிடம்",
    heroTitle: "பண்ணை மேலாண்மை மற்றும் பாசன ஆலோசனை",
    heroSubtitle: "அறிவியல் பூர்வமான FAO-56 கணக்கீடுகள் மற்றும் எஸ்.எம்.எஸ்/வாட்ஸ்அப் ஆலோசனைகள்.",
    dataCaption: "அனைத்து கணக்கீடுகளும் உண்மையான அறிவியல் சூத்திரங்களின் அடிப்படையில் செய்யப்படுகின்றன.",
    loadError: "தரவு ஏற்ற முடியவில்லை.",
    savedFieldsHeading: "சேமிக்கப்பட்ட வயல்கள்",
    emptyTitle: "வயல்கள் எதுவும் சேமிக்கப்படவில்லை",
    emptyBody: "முதல் வயலைச் சேர்த்து நேரடி பாசன ஆலோசனையைப் பெறுங்கள்.",
    emptyCta: "வயலைச் சேர்க்க",
    addFormHeading: "புதிய வயல்",
    fieldLabelLabel: "வயலின் பெயர்",
    fieldLabelPlaceholder: "எ.கா. வடக்கு தோட்டம்",
    districtLabel: "மாவட்டம்",
    districtPlaceholder: "மாவட்டம் தேர்வு செய்க",
    cropLabel: "பயிர்",
    cropPlaceholder: "பயிர் தேர்வு செய்க",
    recommendedSuffix: "இங்கு பரிந்துரைக்கப்பட்டது",
    growthStageLabel: "வளர்ச்சி நிலை",
    irrigationMethodLabel: "பாசன முறை",
    areaLabel: "பரப்பளவு (ஹெக்டேர்)",
    addButton: "வயலைச் சேர்க்க",
    adding: "சேர்க்கப்படுகிறது…",
    requiredError: "தேர்வு செய்யவும்.",
    labelRequiredError: "பெயர் தேவை.",
    areaRangeError: "சரியான பரப்பளவை உள்ளிடவும்.",
    ...baseFieldCopy,
    headline: (grossMm: string, litres: string, days: number) =>
      `ஒவ்வொரு ${days} நாட்களுக்கும் ~${grossMm} மிமீ (~${litres} லிட்டர்) தண்ணீர் பாய்ச்சவும்`,
    sampleClimateNote: "IMD அதிகாரப்பூர்வ காலநிலை தரவு பயன்படுத்தப்பட்டுள்ளது.",
    regionalStressLabel: (index: number) => `நீர் அழுத்த குறியீடு: ${index}/100 (CGWB)`,
    cardErrorMessage: "கணக்கீடு தோல்வி.",
    removeLabel: (label: string) => `${label} நீக்குக`,
    areaCaption: (hectares: string) => `${hectares} ஹெக்டேர்`,
  },
  te: {
    heroEyebrow: "రైతు వర్క్‌స్పేస్",
    heroTitle: "పొలం నిర్వహణ & బహుళ-ఛానల్ సలహా",
    heroSubtitle: "ఖచ్చితమైన FAO-56 శాస్త్రీయ సూత్రాలతో మీ పొలాలను నిర్వహించండి మరియు రోజువారీ సలహాలను పొందండి.",
    dataCaption: "ప్రతి వివరమూ నిజమైన వ్యవసాయ సూత్రాల ఆధారంగా లెక్కించబడింది.",
    loadError: "డేటా లోడ్ కాలేదు.",
    savedFieldsHeading: "సేవ్ చేసిన పొలాలు",
    emptyTitle: "పొలాలు ఏవీ సేవ్ కాలేదు",
    emptyBody: "మొదటి పొలాన్ని జోడించి ప్రత్యక్ష సాగునీటి సలహాను చూడండి.",
    emptyCta: "పొలం జోడించండి",
    addFormHeading: "పొలం జోడించండి",
    fieldLabelLabel: "పొలం పేరు",
    fieldLabelPlaceholder: "ఉదా. ఉత్తర చేను",
    districtLabel: "జిల్లా",
    districtPlaceholder: "జిల్లా ఎంచుకోండి",
    cropLabel: "పంట",
    cropPlaceholder: "పంట ఎంచుకోండి",
    recommendedSuffix: "ఇక్కడ అనుకూలమైనది",
    growthStageLabel: "పెరుగుదల దశ",
    irrigationMethodLabel: "సాగునీటి పద్ధతి",
    areaLabel: "విస్తీర్ణం (హెక్టార్లు)",
    addButton: "పొలం జోడించండి",
    adding: "జోడిస్తోంది…",
    requiredError: "ఎంపిక చేయండి.",
    labelRequiredError: "పేరు నమోదు చేయండి.",
    areaRangeError: "సరైన విస్తీర్ణం నమోదు చేయండి.",
    ...baseFieldCopy,
    headline: (grossMm: string, litres: string, days: number) =>
      `ప్రతి ${days} రోజులకు ~${grossMm} మిమీ (~${litres} లీటర్లు) నీరు పెట్టండి`,
    sampleClimateNote: "ఈ జిల్లాకు అధికారిక IMD వాతావరణ రికార్డులు వర్తించాయి.",
    regionalStressLabel: (index: number) => `జిల్లా నీటి ఒత్తిడి సూచిక: ${index}/100 (CGWB)`,
    cardErrorMessage: "గణన విఫలమైంది.",
    removeLabel: (label: string) => `${label} తొలగించండి`,
    areaCaption: (hectares: string) => `${hectares} హెక్టార్లు`,
  },
};

function readFieldsFromStorage(): DashboardField[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item?.id === "string");
  } catch {
    return [];
  }
}

function writeFieldsToStorage(fields: DashboardField[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fields));
  } catch {}
}

export default function DashboardPage() {
  const { locale } = useLanguage();
  const c: FieldCardCopy & Record<string, any> = copy[locale] || copy.en;

  const [activeTab, setActiveTab] = useState<DashboardTab>("fields");
  const [fields, setFields] = useState<DashboardField[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [adding, setAdding] = useState(false);
  const [advisoryMap, setAdvisoryMap] = useState<Record<string, FieldAdvisoryState>>({});
  const [referenceData, setReferenceData] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; districts: DistrictOut[]; crops: CropOut[] }
  >({ status: "loading" });

  const [subscriptions, setSubscriptions] = useState<SubscriptionResponse[]>([]);
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatusResponse | null>(null);
  const [subPhone, setSubPhone] = useState("");
  const [subChannel, setSubChannel] = useState<"sms" | "whatsapp">("whatsapp");
  const [subDistrict, setSubDistrict] = useState("");
  const [subCrop, setSubCrop] = useState("");
  const [subConsent, setSubConsent] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subSuccess, setSubSuccess] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<NotificationDispatchPreview | null>(null);

  const [iotDeviceField, setIotDeviceField] = useState("");
  const [iotDeviceId, setIotDeviceId] = useState("");
  const [iotModel, setIotModel] = useState("Capacitive Soil Moisture Probe v1.2");
  const [iotRegistering, setIotRegistering] = useState(false);
  const [iotRegSuccess, setIotRegSuccess] = useState<string | null>(null);
  const [selectedFieldSensorStatus, setSelectedFieldSensorStatus] = useState<FieldIoTStatus | null>(null);
  const [testMoistureVal, setTestMoistureVal] = useState("32.5");
  const [ingestingTest, setIngestingTest] = useState(false);

  const [mlDistrict, setMlDistrict] = useState("");
  const [mlCrop, setMlCrop] = useState("");
  const [mlResult, setMlResult] = useState<LocalizedMlResponse | null>(null);
  const [mlLoading, setMlLoading] = useState(false);

  const loadReferenceData = useCallback(() => {
    setReferenceData({ status: "loading" });
    Promise.all([fetchDistricts(), fetchCrops()])
      .then(([districts, crops]) => {
        setReferenceData({ status: "ready", districts, crops });
        if (districts.length > 0 && !subDistrict) setSubDistrict(districts[0].district_id);
        if (crops.length > 0 && !subCrop) setSubCrop(crops[0].crop_id);
        if (districts.length > 0 && !mlDistrict) setMlDistrict(districts[0].district_id);
        if (crops.length > 0 && !mlCrop) setMlCrop(crops[0].crop_id);
      })
      .catch((error) => {
        setReferenceData({ status: "error", message: error instanceof Error ? error.message : "Load error" });
      });
  }, [subDistrict, subCrop, mlDistrict, mlCrop]);

  const fetchForField = useCallback((field: DashboardField) => {
    setAdvisoryMap((prev) => ({ ...prev, [field.id]: "loading" }));
    const payload: AdvisoryRequest = {
      district_id: field.districtId,
      crop_id: field.cropId,
      growth_stage: field.growthStage,
      irrigation_method: field.irrigationMethod,
      area_hectares: field.areaHectares,
    };
    fetchAdvisory(payload)
      .then((adv) => {
        setAdvisoryMap((prev) => ({ ...prev, [field.id]: adv }));
      })
      .catch(() => {
        setAdvisoryMap((prev) => ({ ...prev, [field.id]: "error" }));
      });
  }, []);

  useEffect(() => {
    loadReferenceData();
    const stored = readFieldsFromStorage();
    setFields(stored);
    setHydrated(true);
    stored.forEach((f) => fetchForField(f));

    fetchNotificationStatus().then(setNotificationStatus).catch(() => {});
    fetchSubscriptions().then(setSubscriptions).catch(() => {});
  }, [fetchForField, loadReferenceData]);

  useEffect(() => {
    if (hydrated) {
      writeFieldsToStorage(fields);
    }
  }, [fields, hydrated]);

  const handleAddField = useCallback(
    (values: FieldFormValues) => {
      setAdding(true);
      const newField: DashboardField = {
        id: crypto.randomUUID ? crypto.randomUUID() : `field_${Date.now()}`,
        label: values.label,
        districtId: values.district_id,
        cropId: values.crop_id,
        growthStage: values.growth_stage,
        irrigationMethod: values.irrigation_method,
        areaHectares: values.area_hectares,
      };
      setFields((prev) => [...prev, newField]);
      fetchForField(newField);
      setAdding(false);
    },
    [fetchForField]
  );

  const handleRemoveField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    setAdvisoryMap((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }, []);

  const handleSubscribe = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!subPhone || !subConsent) return;
      setSubscribing(true);
      setSubSuccess(null);
      try {
        const res = await subscribeNotifications({
          phone_number: subPhone,
          channel: subChannel,
          district_id: subDistrict,
          crop_id: subCrop,
          preferred_language: locale,
          consent_given: subConsent,
        });
        setSubSuccess(`Subscribed! Active alerts scheduled for ${res.district_name}.`);
        setSubPhone("");
        setSubConsent(false);
        fetchSubscriptions().then(setSubscriptions);
      } catch (err: any) {
        alert(err?.serverMessage || "Subscription failed. Check phone format.");
      } finally {
        setSubscribing(false);
      }
    },
    [subPhone, subChannel, subDistrict, subCrop, locale, subConsent]
  );

  const handleUnsubscribe = useCallback(async (id: string) => {
    try {
      await unsubscribeNotification(id);
      fetchSubscriptions().then(setSubscriptions);
    } catch {}
  }, []);

  const handlePreviewAdvisory = useCallback(async (id: string) => {
    try {
      const res = await previewNotificationAdvisory(id);
      setPreviewResult(res);
    } catch {}
  }, []);

  const handleRegisterDevice = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!iotDeviceId.trim() || !iotDeviceField) return;
      setIotRegistering(true);
      setIotRegSuccess(null);
      try {
        const res = await registerIoTDevice({
          device_id: iotDeviceId.trim(),
          field_id: iotDeviceField,
          sensor_model: iotModel,
        });
        setIotRegSuccess(`Node registered! Auth token: ${res.api_token}`);
        setIotDeviceId("");
        fetchFieldIoTStatus(iotDeviceField).then(setSelectedFieldSensorStatus);
      } catch (err: any) {
        alert(err?.serverMessage || "Registration failed.");
      } finally {
        setIotRegistering(false);
      }
    },
    [iotDeviceId, iotDeviceField, iotModel]
  );

  const handleCheckSensor = useCallback(async (fieldId: string) => {
    try {
      const status = await fetchFieldIoTStatus(fieldId);
      setSelectedFieldSensorStatus(status);
    } catch {}
  }, []);

  const handleSendTestTelemetry = useCallback(async () => {
    if (!selectedFieldSensorStatus?.device_id) return;
    setIngestingTest(true);
    try {
      await ingestIoTReading({
        device_id: selectedFieldSensorStatus.device_id,
        soil_moisture_pct: parseFloat(testMoistureVal),
        soil_temperature_c: 26.5,
        battery_voltage_v: 3.85,
      });
      fetchFieldIoTStatus(selectedFieldSensorStatus.field_id).then(setSelectedFieldSensorStatus);
    } catch {
      alert("Telemetry ingestion failed.");
    } finally {
      setIngestingTest(false);
    }
  }, [selectedFieldSensorStatus, testMoistureVal]);

  const handleEvaluateMl = useCallback(async () => {
    if (!mlDistrict || !mlCrop) return;
    setMlLoading(true);
    setMlResult(null);
    try {
      const res = await fetchLocalizedMlAdvisory({
        district_id: mlDistrict,
        crop_id: mlCrop,
        growth_stage: "mid_season",
      });
      setMlResult(res);
    } catch {
      alert("Could not evaluate ML model.");
    } finally {
      setMlLoading(false);
    }
  }, [mlDistrict, mlCrop]);

  const handleExportJson = useCallback(() => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fields, null, 2));
    const dl = document.createElement("a");
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", `paaniplan-fields-${Date.now()}.json`);
    dl.click();
  }, [fields]);

  const handleExportCsv = useCallback(() => {
    const header = "id,label,districtId,cropId,growthStage,irrigationMethod,areaHectares\n";
    const rows = fields
      .map(
        (f) =>
          `"${f.id}","${f.label}","${f.districtId}","${f.cropId}","${f.growthStage}","${f.irrigationMethod}",${f.areaHectares}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const dl = document.createElement("a");
    dl.setAttribute("href", url);
    dl.setAttribute("download", `paaniplan-fields-${Date.now()}.csv`);
    dl.click();
  }, [fields]);

  const getDistrictName = useCallback(
    (id: string) => {
      if (referenceData.status !== "ready") return id;
      return referenceData.districts.find((d) => d.district_id === id)?.name || id;
    },
    [referenceData]
  );

  const getCropName = useCallback(
    (id: string) => {
      if (referenceData.status !== "ready") return id;
      return referenceData.crops.find((cp) => cp.crop_id === id)?.name || id;
    },
    [referenceData]
  );

  const getBaselineStressIndex = useCallback(
    (id: string) => {
      if (referenceData.status !== "ready") return undefined;
      return referenceData.districts.find((d) => d.district_id === id)?.baseline_water_stress_index;
    },
    [referenceData]
  );

  return (
    <>
      <Section tone="forest" className="pb-14 pt-14">
        <Reveal>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gold-light">{c.heroEyebrow}</p>
              <h1 className="mt-3 max-w-3xl font-display text-3xl font-semibold leading-tight sm:text-4xl text-ivory">
                {c.heroTitle}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-sage-light">{c.heroSubtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={handleExportJson} className="flex items-center gap-1.5">
                <Download className="h-4 w-4" /> Export JSON
              </Button>
              <Button variant="secondary" size="sm" onClick={handleExportCsv} className="flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4" /> Export CSV
              </Button>
            </div>
          </div>
        </Reveal>
      </Section>

      <div className="sticky top-[61px] z-40 border-b border-earth-light bg-ivory px-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto py-2.5">
          <button
            type="button"
            onClick={() => setActiveTab("fields")}
            className={`flex items-center gap-2 rounded px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "fields" ? "bg-forest text-ivory" : "text-muted hover:text-ink"
            }`}
          >
            <Sprout className="h-4 w-4" /> My Fields ({fields.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("notifications")}
            className={`flex items-center gap-2 rounded px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "notifications" ? "bg-forest text-ivory" : "text-muted hover:text-ink"
            }`}
          >
            <Smartphone className="h-4 w-4" /> SMS & WhatsApp Alerts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("iot")}
            className={`flex items-center gap-2 rounded px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "iot" ? "bg-forest text-ivory" : "text-muted hover:text-ink"
            }`}
          >
            <Radio className="h-4 w-4" /> IoT Soil Sensors
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ml")}
            className={`flex items-center gap-2 rounded px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "ml" ? "bg-forest text-ivory" : "text-muted hover:text-ink"
            }`}
          >
            <Cpu className="h-4 w-4" /> Localized ML Advisor
          </button>
        </div>
      </div>

      <Section tone="ivory" className="pt-8">
        {activeTab === "fields" ? (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">{c.savedFieldsHeading}</h2>
                <p className="text-sm text-muted">{c.dataCaption}</p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => document.getElementById("add-field-form")?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center gap-1.5"
              >
                <PlusCircle className="h-4 w-4" /> {c.emptyCta}
              </Button>
            </div>

            {!hydrated ? (
              <div className="flex min-h-[160px] items-center justify-center">
                <Spinner className="h-7 w-7" />
              </div>
            ) : fields.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-earth-light bg-surface p-10 text-center">
                <Sprout className="h-8 w-8 text-sage" strokeWidth={1.5} />
                <p className="font-display text-lg font-semibold text-ink">{c.emptyTitle}</p>
                <p className="max-w-sm text-sm leading-relaxed text-muted">{c.emptyBody}</p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {fields.map((field) => (
                  <FieldCard
                    key={field.id}
                    field={field}
                    districtName={getDistrictName(field.districtId)}
                    cropName={getCropName(field.cropId)}
                    baselineStressIndex={getBaselineStressIndex(field.districtId)}
                    state={advisoryMap[field.id] ?? "loading"}
                    onRemove={() => handleRemoveField(field.id)}
                    onRetry={() => fetchForField(field)}
                    locale={locale}
                    copy={c}
                  />
                ))}
              </div>
            )}

            <div className="mt-12 rounded-lg border border-earth-light bg-surface p-6 sm:p-8" id="add-field-form">
              <h3 className="font-display text-xl font-semibold text-ink mb-4">{c.addFormHeading}</h3>
              {referenceData.status === "loading" ? (
                <div className="flex items-center justify-center py-6">
                  <Spinner className="h-6 w-6" />
                </div>
              ) : referenceData.status === "error" ? (
                <ErrorNotice message={referenceData.message} onRetry={loadReferenceData} />
              ) : (
                <FieldForm
                  districts={referenceData.districts}
                  crops={referenceData.crops}
                  adding={adding}
                  onAdd={handleAddField}
                  copy={c}
                />
              )}
            </div>
          </div>
        ) : null}

        {activeTab === "notifications" ? (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-lg border border-earth-light bg-surface p-6 sm:p-8">
              <div className="flex items-center gap-2 text-forest">
                <MessageSquare className="h-5 w-5" />
                <h3 className="font-display text-xl font-semibold text-ink">Subscribe for Daily Farm Advisories</h3>
              </div>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Receive automated morning irrigation recommendations by SMS or WhatsApp tailored to your crop and district.
              </p>

              {subSuccess ? (
                <div className="mt-4 rounded bg-sage-light/50 p-3 text-xs text-forest-dark border border-forest/30 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-forest" />
                  <span>{subSuccess}</span>
                </div>
              ) : null}

              <form onSubmit={handleSubscribe} className="mt-5 flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-ink block mb-1">Channel</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSubChannel("whatsapp")}
                      className={`rounded border px-3 py-2 text-xs font-semibold flex items-center justify-center gap-2 ${
                        subChannel === "whatsapp"
                          ? "border-forest bg-sage-light text-forest-dark"
                          : "border-earth-light text-muted"
                      }`}
                    >
                      <MessageSquare className="h-4 w-4" /> WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubChannel("sms")}
                      className={`rounded border px-3 py-2 text-xs font-semibold flex items-center justify-center gap-2 ${
                        subChannel === "sms"
                          ? "border-forest bg-sage-light text-forest-dark"
                          : "border-earth-light text-muted"
                      }`}
                    >
                      <Smartphone className="h-4 w-4" /> Telecom SMS
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink block mb-1">Mobile Number (India +91)</label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={subPhone}
                    onChange={(e) => setSubPhone(e.target.value)}
                    className="w-full rounded border border-earth-light bg-ivory px-3.5 py-2 text-sm text-ink focus-visible:outline-forest"
                  />
                </div>

                {referenceData.status === "ready" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-ink block mb-1">District</label>
                      <select
                        value={subDistrict}
                        onChange={(e) => setSubDistrict(e.target.value)}
                        className="w-full rounded border border-earth-light bg-ivory px-3 py-2 text-xs text-ink"
                      >
                        {referenceData.districts.map((d) => (
                          <option key={d.district_id} value={d.district_id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-ink block mb-1">Crop</label>
                      <select
                        value={subCrop}
                        onChange={(e) => setSubCrop(e.target.value)}
                        className="w-full rounded border border-earth-light bg-ivory px-3 py-2 text-xs text-ink"
                      >
                        {referenceData.crops.map((cp) => (
                          <option key={cp.crop_id} value={cp.crop_id}>
                            {cp.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : null}

                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="consent"
                    required
                    checked={subConsent}
                    onChange={(e) => setSubConsent(e.target.checked)}
                    className="mt-0.5"
                  />
                  <label htmlFor="consent" className="text-[11px] text-muted leading-tight">
                    I consent to receive automated agricultural advisory messages. Standard carrier rates may apply. Unsubscribe anytime.
                  </label>
                </div>

                <Button type="submit" variant="primary" size="sm" disabled={subscribing} className="mt-2">
                  {subscribing ? "Subscribing…" : "Opt-In for Daily Advisories"}
                </Button>
              </form>
            </div>

            <div className="flex flex-col gap-5">
              <div className="rounded-lg border border-earth-light bg-surface p-5 text-xs">
                <span className="font-semibold text-ink block mb-1">Gateway Status</span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="rounded bg-sand/30 p-2">
                    <span className="text-muted block text-[11px]">SMS Gateway:</span>
                    <span className="font-medium text-ink">{notificationStatus?.sms_gateway || "Pending"}</span>
                  </div>
                  <div className="rounded bg-sand/30 p-2">
                    <span className="text-muted block text-[11px]">WhatsApp Cloud API:</span>
                    <span className="font-medium text-ink">{notificationStatus?.whatsapp_gateway || "Pending"}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-earth-light bg-surface p-5">
                <h4 className="font-semibold text-sm text-ink mb-3">Active Subscriptions ({subscriptions.length})</h4>
                {subscriptions.length === 0 ? (
                  <p className="text-xs text-muted">No active mobile alert subscriptions yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {subscriptions.map((sub) => (
                      <div
                        key={sub.id}
                        className="rounded border border-earth-light/60 bg-ivory p-3 text-xs flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-semibold text-ink mr-2">{sub.phone_masked}</span>
                          <span className="rounded bg-sage-light px-1.5 py-0.5 text-[10px] uppercase font-bold text-forest-dark">
                            {sub.channel}
                          </span>
                          <p className="text-[11px] text-muted mt-0.5">
                            {sub.district_name} · {sub.crop_name} ({sub.preferred_language})
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handlePreviewAdvisory(sub.id)}
                            className="rounded border border-earth-light px-2 py-1 text-[11px] font-medium text-forest hover:bg-sage-light"
                          >
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUnsubscribe(sub.id)}
                            className="text-muted hover:text-stress-severe"
                            title="Unsubscribe"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {previewResult ? (
                <div className="rounded-lg border border-forest/30 bg-ivory p-4 text-xs">
                  <div className="flex items-center justify-between border-b border-earth-light pb-2 mb-2">
                    <span className="font-semibold text-forest flex items-center gap-1">
                      <Send className="h-3.5 w-3.5" /> Outgoing Message Dispatch Preview
                    </span>
                    <span className="text-[10px] font-semibold text-muted">{previewResult.provider}</span>
                  </div>
                  <div className="rounded bg-surface p-2.5 font-mono text-[11px] text-ink leading-relaxed whitespace-pre-wrap border border-earth-light">
                    {previewResult.advisory_text}
                  </div>
                  <p className="text-[10px] text-muted mt-2">{previewResult.status_detail}</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === "iot" ? (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-lg border border-earth-light bg-surface p-6 sm:p-8">
              <div className="flex items-center gap-2 text-forest mb-2">
                <Wifi className="h-5 w-5" />
                <h3 className="font-display text-xl font-semibold text-ink">Link Soil Moisture Hardware (ESP32 / LoRa)</h3>
              </div>
              <p className="text-xs text-muted leading-relaxed mb-4">
                Connect an in-field capacitive soil moisture sensor probe. Telemetry packets update real-time root depletion and trigger irrigation alerts.
              </p>

              {iotRegSuccess ? (
                <div className="rounded bg-sage-light p-3 text-xs text-forest-dark border border-forest/30 mb-4 font-mono break-all">
                  {iotRegSuccess}
                </div>
              ) : null}

              <form onSubmit={handleRegisterDevice} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-ink block mb-1">Select Field to Link</label>
                  <select
                    required
                    value={iotDeviceField}
                    onChange={(e) => {
                      setIotDeviceField(e.target.value);
                      handleCheckSensor(e.target.value);
                    }}
                    className="w-full rounded border border-earth-light bg-ivory px-3 py-2 text-xs text-ink"
                  >
                    <option value="">-- Choose field --</option>
                    {fields.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label} ({getDistrictName(f.districtId)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink block mb-1">Hardware Node Identifier</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ESP32-SOIL-PROBE-01"
                    value={iotDeviceId}
                    onChange={(e) => setIotDeviceId(e.target.value)}
                    className="w-full rounded border border-earth-light bg-ivory px-3.5 py-2 text-sm text-ink focus-visible:outline-forest font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink block mb-1">Sensor Model</label>
                  <input
                    type="text"
                    value={iotModel}
                    onChange={(e) => setIotModel(e.target.value)}
                    className="w-full rounded border border-earth-light bg-ivory px-3.5 py-2 text-xs text-ink"
                  />
                </div>

                <Button type="submit" variant="primary" size="sm" disabled={iotRegistering}>
                  {iotRegistering ? "Registering…" : "Register Sensor Node"}
                </Button>
              </form>
            </div>

            <div className="flex flex-col gap-5">
              <div className="rounded-lg border border-earth-light bg-surface p-6">
                <h4 className="font-semibold text-sm text-ink mb-3 flex items-center justify-between">
                  <span>Field Probe Telemetry Status</span>
                  {selectedFieldSensorStatus?.has_sensor ? (
                    <span className="rounded bg-sage-light px-2 py-0.5 text-xs text-forest-dark font-medium">
                      Status: {selectedFieldSensorStatus.connection_status}
                    </span>
                  ) : null}
                </h4>

                {!selectedFieldSensorStatus ? (
                  <p className="text-xs text-muted">Select a field on the left to inspect linked sensor readings.</p>
                ) : !selectedFieldSensorStatus.has_sensor ? (
                  <div className="rounded bg-sand/30 p-4 text-xs text-muted">
                    {selectedFieldSensorStatus.sensor_recommendation}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="rounded border border-earth-light/60 bg-ivory p-3">
                        <span className="text-xs text-muted block">Soil Moisture</span>
                        <span className="font-display text-xl font-bold text-forest">
                          {selectedFieldSensorStatus.latest_reading?.soil_moisture_pct?.toFixed(1) ?? "—"}%
                        </span>
                        <span className="text-[10px] text-muted block">Volumetric (VWC)</span>
                      </div>
                      <div className="rounded border border-earth-light/60 bg-ivory p-3">
                        <span className="text-xs text-muted block">Soil Temp</span>
                        <span className="font-display text-xl font-semibold text-ink">
                          {selectedFieldSensorStatus.latest_reading?.soil_temperature_c?.toFixed(1) ?? "—"}°C
                        </span>
                        <span className="text-[10px] text-muted block">Root depth</span>
                      </div>
                      <div className="rounded border border-earth-light/60 bg-ivory p-3">
                        <span className="text-xs text-muted block">Node Battery</span>
                        <span className="font-display text-xl font-semibold text-ink">
                          {selectedFieldSensorStatus.latest_reading?.battery_voltage_v?.toFixed(2) ?? "—"} V
                        </span>
                        <span className="text-[10px] text-muted block">18650 Cell</span>
                      </div>
                    </div>

                    <div className="rounded border border-earth-light/60 bg-ivory p-3 text-xs">
                      <span className="font-semibold text-ink block mb-1">Agronomic Interpretation</span>
                      <p className="text-muted leading-relaxed">{selectedFieldSensorStatus.sensor_recommendation}</p>
                    </div>

                    <div className="rounded border border-earth-light/40 bg-sand/20 p-3 text-xs">
                      <span className="font-semibold text-ink block mb-2">Simulate Hardware Packet</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.5"
                          min="5"
                          max="80"
                          value={testMoistureVal}
                          onChange={(e) => setTestMoistureVal(e.target.value)}
                          className="w-24 rounded border border-earth-light bg-ivory px-2 py-1 text-xs"
                        />
                        <span className="text-xs text-muted">% moisture</span>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={ingestingTest}
                          onClick={handleSendTestTelemetry}
                          className="ml-auto"
                        >
                          {ingestingTest ? "Sending…" : "Push Packet"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "ml" ? (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-lg border border-earth-light bg-surface p-6 sm:p-8">
              <div className="flex items-center gap-2 text-forest mb-2">
                <Cpu className="h-5 w-5" />
                <h3 className="font-display text-xl font-semibold text-ink">Agro-Climatic Calibrated ML Advisor</h3>
              </div>
              <p className="text-xs text-muted leading-relaxed mb-5">
                Evaluates localized temperature range and advective vapor pressure deficits to compute calibrated crop evapotranspiration (ETc) with residual uncertainty bounds.
              </p>

              {referenceData.status === "ready" ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold text-ink block mb-1">District</label>
                    <select
                      value={mlDistrict}
                      onChange={(e) => setMlDistrict(e.target.value)}
                      className="w-full rounded border border-earth-light bg-ivory px-3 py-2 text-xs text-ink"
                    >
                      {referenceData.districts.map((d) => (
                        <option key={d.district_id} value={d.district_id}>
                          {d.name} ({d.state})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-ink block mb-1">Crop</label>
                    <select
                      value={mlCrop}
                      onChange={(e) => setMlCrop(e.target.value)}
                      className="w-full rounded border border-earth-light bg-ivory px-3 py-2 text-xs text-ink"
                    >
                      {referenceData.crops.map((cp) => (
                        <option key={cp.crop_id} value={cp.crop_id}>
                          {cp.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button variant="primary" size="sm" onClick={handleEvaluateMl} disabled={mlLoading}>
                    {mlLoading ? "Computing ML Model…" : "Evaluate Localized ML Adjustment"}
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="rounded-lg border border-earth-light bg-surface p-6">
              <h4 className="font-semibold text-sm text-ink mb-3">Model Prediction Output</h4>
              {!mlResult ? (
                <p className="text-xs text-muted">Select district and crop, then run the evaluation.</p>
              ) : (
                <div className="flex flex-col gap-4 text-xs">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded border border-earth-light/60 bg-ivory p-3">
                      <span className="text-muted block text-[11px]">FAO-56 Baseline ETc</span>
                      <span className="font-display text-2xl font-bold text-ink">
                        {mlResult.baseline_etc_mm_day.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-muted block">mm/day</span>
                    </div>
                    <div className="rounded border border-earth-light/60 bg-ivory p-3">
                      <span className="text-muted block text-[11px]">ML Calibrated ETc</span>
                      <span className="font-display text-2xl font-bold text-forest">
                        {mlResult.ml_adjusted_etc_mm_day.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-muted block">
                        ±{mlResult.uncertainty_margin_mm_day.toFixed(2)} mm
                      </span>
                    </div>
                  </div>

                  <div className="rounded bg-sand/30 p-3 leading-relaxed">
                    <strong className="text-forest-dark block mb-1">Scientific Adjustment Rationale:</strong>
                    {mlResult.scientific_explanation}
                  </div>

                  <div className="text-[11px] text-muted border-t border-earth-light/60 pt-2">
                    <span className="font-medium text-ink">Provenance:</span> {mlResult.model_provenance}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === "export" ? (
          <div className="mx-auto max-w-xl rounded-lg border border-earth-light bg-surface p-6 sm:p-8">
            <h3 className="font-display text-xl font-semibold text-ink mb-2">Farmer Data Export & Backup</h3>
            <p className="text-xs text-muted leading-relaxed mb-6">
              All field records and observations are stored client-side in browser storage or cloud-persisted. You can download and inspect your records anytime in standard open formats.
            </p>

            <div className="flex flex-col gap-3">
              <Button variant="secondary" onClick={handleExportJson} className="flex items-center justify-center gap-2">
                <Download className="h-4 w-4" /> Download Complete JSON Archive ({fields.length} plots)
              </Button>
              <Button variant="secondary" onClick={handleExportCsv} className="flex items-center justify-center gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Download Spreadsheet CSV
              </Button>
            </div>
          </div>
        ) : null}
      </Section>
    </>
  );
}
