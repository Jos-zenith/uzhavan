/**
 * My Farm Guide Screen Component
 * Service #13: Sowing-to-Harvest Cultivation Guide
 *
 * Data Source: Agri Engineering & Horticulture Guides (Tamil Nadu)
 * Offline Capability: Entirely Offline
 *
 * Covers:
 * - Land preparation
 * - Sowing details and seed treatment
 * - Fertilizer schedule (basal + top dressing)
 * - Irrigation schedule
 * - Integrated Pest & Disease Management
 * - Harvest indicators and post-harvest guidance
 */

import React, { useState } from 'react';
import { getServiceCachePayload } from '../sqlite';

// ============================================================
// STATIC CULTIVATION DATA (TN Agri Engineering & Horticulture)
// ============================================================

type FertilizerStage = {
  stage: string;
  dap: string;
  nitrogen: string;
  phosphorus: string;
  potassium: string;
  notes?: string;
};

type IrrigationStage = {
  stage: string;
  dayRange: string;
  intervalDays: string;
  notes: string;
};

type PestEntry = {
  name: string;
  symptom: string;
  management: string;
};

type CropGuide = {
  cropId: string;
  cropName: string;
  seasons: string[];
  duration: string;
  waterRequirement: string;
  soilType: string;
  seedRate: string;
  spacing: string;
  seedTreatment: string;
  landPreparation: string;
  fertilizer: FertilizerStage[];
  irrigation: IrrigationStage[];
  pests: PestEntry[];
  harvestIndicator: string;
  expectedYield: string;
  postHarvest: string;
};

const CROP_GUIDES: CropGuide[] = [
  {
    cropId: 'paddy',
    cropName: 'Paddy (Rice)',
    seasons: ['Kharif (Kuruvai)', 'Rabi (Samba)', 'Summer (Navarai)'],
    duration: '105–145 days depending on variety',
    waterRequirement: '1200–1400 mm',
    soilType: 'Clay loam, Clayey soils with good water retention',
    seedRate: '60–80 kg/ha (transplanted); 100 kg/ha (direct seeded)',
    spacing: '20 cm × 15 cm (transplanted)',
    seedTreatment: 'Soak seeds in water for 24 hrs; Treat with Carbendazim 2g/kg seed; Dry for 6–8 hrs before sowing',
    landPreparation: 'Plough 2–3 times; Flood the field; Puddle twice for fine tilth; Level with a board',
    fertilizer: [
      {
        stage: 'Basal (before transplanting)',
        dap: '50 kg/ha',
        nitrogen: '40 kg N/ha',
        phosphorus: '50 kg P₂O₅/ha',
        potassium: '50 kg K₂O/ha',
        notes: 'Apply FYM 12.5 t/ha for organic enrichment before puddling',
      },
      {
        stage: '1st Top Dressing (25–30 DAT)',
        dap: '-',
        nitrogen: '40 kg N/ha',
        phosphorus: '-',
        potassium: '-',
        notes: 'Apply in standing water of 2–3 cm',
      },
      {
        stage: '2nd Top Dressing (50–55 DAT)',
        dap: '-',
        nitrogen: '40 kg N/ha',
        phosphorus: '-',
        potassium: '25 kg K₂O/ha',
        notes: 'Apply at panicle initiation stage',
      },
    ],
    irrigation: [
      { stage: 'Nursery', dayRange: '0–25', intervalDays: '1–2', notes: 'Keep nursery moist; flood briefly once a week' },
      { stage: 'After transplanting', dayRange: '1–10 DAT', intervalDays: '2', notes: 'Maintain 2–5 cm standing water' },
      { stage: 'Active tillering', dayRange: '11–40 DAT', intervalDays: '3–4', notes: 'Drain field for 3 days at 20 DAT to promote tillering' },
      { stage: 'Panicle initiation to flowering', dayRange: '41–75 DAT', intervalDays: '2–3', notes: 'Critical stage — do not allow moisture stress' },
      { stage: 'Grain filling to maturity', dayRange: '76–105 DAT', intervalDays: '5–7', notes: 'Drain field 10–15 days before harvest' },
    ],
    pests: [
      {
        name: 'Stem Borer (Scirpophaga incertulas)',
        symptom: 'Dead heart in vegetative stage; White ear in reproductive stage',
        management: 'Remove and destroy egg masses; Apply Cartap Hydrochloride 4G @ 25 kg/ha; Release Trichogramma @ 50,000/ha',
      },
      {
        name: 'Brown Plant Hopper (Nilaparvata lugens)',
        symptom: 'Hopper burn — circular patches of drying plants; Honey dew deposits',
        management: 'Drain field; Avoid excessive N; Apply Imidacloprid 0.5 ml/L; Avoid broad-spectrum sprays',
      },
      {
        name: 'Leaf Folder (Cnaphalocrocis medinalis)',
        symptom: 'Longitudinally folded leaves with white streaks',
        management: 'Clip folded leaves; Apply Chlorpyriphos 2.5 ml/L at early infestation',
      },
      {
        name: 'Blast (Pyricularia oryzae)',
        symptom: 'Diamond-shaped lesions with grey centre and brown border on leaves and neck',
        management: 'Use resistant varieties (ADT 43, CO 51); Seed treatment with Trichoderma; Spray Tricyclazole 0.6g/L',
      },
    ],
    harvestIndicator: '75–80% of panicles golden yellow; 80–85% grain moisture at 20–22%',
    expectedYield: '5–7 t/ha (HYV); 3–4 t/ha (local/traditional)',
    postHarvest: 'Thresh within 24 hrs of harvest; Dry to 14% moisture for storage; Store in moisture-proof bags',
  },
  {
    cropId: 'groundnut',
    cropName: 'Groundnut',
    seasons: ['Kharif (June–July)', 'Rabi (November–December)', 'Summer (January–February)'],
    duration: '100–135 days',
    waterRequirement: '500–600 mm',
    soilType: 'Well-drained sandy loam, red loamy soils with good aeration',
    seedRate: '100–120 kg/ha (shelled); 80–90 kg/ha (bold seeded varieties)',
    spacing: '30 cm × 10 cm',
    seedTreatment: 'Shell pods 2–3 days before sowing; Treat with Thiram 4g/kg + Rhizobium culture 600g/30 kg seed',
    landPreparation: 'Deep plough 30 cm; 2–3 harrowing operations; Apply 12.5 t/ha FYM and incorporate; Form ridges at 30 cm',
    fertilizer: [
      {
        stage: 'Basal',
        dap: '20 kg/ha',
        nitrogen: '25 kg N/ha',
        phosphorus: '50 kg P₂O₅/ha',
        potassium: '75 kg K₂O/ha',
        notes: 'Apply gypsum 500 kg/ha at pegging stage for calcium supply to pods',
      },
      {
        stage: 'Top Dressing (30 DAS)',
        dap: '-',
        nitrogen: '25 kg N/ha',
        phosphorus: '-',
        potassium: '-',
        notes: 'Apply in moist soil conditions',
      },
    ],
    irrigation: [
      { stage: 'Pre-sowing', dayRange: '0', intervalDays: '-', notes: 'One pre-sowing irrigation if soil moisture insufficient' },
      { stage: 'Germination to branching', dayRange: '1–25', intervalDays: '6–8', notes: 'Avoid waterlogging; ensure good soil-seed contact' },
      { stage: 'Flowering and pegging', dayRange: '26–55', intervalDays: '5–7', notes: 'Critical stages — maintain optimum moisture' },
      { stage: 'Pod development', dayRange: '56–90', intervalDays: '7–10', notes: 'Reduce irrigation frequency; avoid waterlogging' },
      { stage: 'Maturity', dayRange: '91–120', intervalDays: '-', notes: 'Stop irrigation 2 weeks before harvest' },
    ],
    pests: [
      {
        name: 'Leaf Miner (Aproaerema modicella)',
        symptom: 'Mining of leaf tissue; blotch mines causing drying of leaves',
        management: 'Remove and destroy infested plants; Apply Acephate 1.5g/L; Erect light traps',
      },
      {
        name: 'Tikka Disease / Early + Late Leaf Spot',
        symptom: 'Circular brown spots with yellow halo on leaves; premature defoliation',
        management: 'Use resistant variety CO 7, VRI 2; Apply Chlorothalonil 2g/L at 30, 45, 60 DAS',
      },
      {
        name: 'Collar Rot (Sclerotium rolfsii)',
        symptom: 'White mycelium at collar region; plant collapse and death',
        management: 'Treat seed with Trichoderma; Drench with Copper Oxychloride 3g/L at base of plant',
      },
    ],
    harvestIndicator: 'Pod tapping sound; inner wall of pod changes from white to dark; 75% pods mature with reticulated veins',
    expectedYield: '2–3 t/ha pods; 1.2–1.8 t/ha oil seeds',
    postHarvest: 'Harvest when top leaves turn yellow; Stack plants for 3–4 days; Thresh and dry pods to 8–9% moisture',
  },
  {
    cropId: 'sugarcane',
    cropName: 'Sugarcane',
    seasons: ['Early (Jan–Feb planting)', 'Late (Jul–Aug planting)'],
    duration: '10–12 months (plant crop); 14–16 months (ratoon)',
    waterRequirement: '2000–2500 mm',
    soilType: 'Well-drained loamy to clay loam soils; avoid saline/waterlogged areas',
    seedRate: '40,000–45,000 setts/ha (two-budded); 25,000 – 30,000 setts/ha (single)',
    spacing: '90 cm × 60 cm (2-row paired); 120 cm (single row)',
    seedTreatment: 'Treat setts in Mancozeb 3g/L + Chlorpyriphos 5 ml/L for 15 minutes; air dry before planting',
    landPreparation: 'Deep plough 45 cm; Sub-soil ploughing once in 3 years; 2 harrowing; Form furrows 25 cm deep',
    fertilizer: [
      {
        stage: 'Basal (at planting)',
        dap: '60 kg/ha',
        nitrogen: '60 kg N/ha',
        phosphorus: '60 kg P₂O₅/ha',
        potassium: '60 kg K₂O/ha',
        notes: 'Mix FYM/Press mud 50 t/ha in furrow before planting',
      },
      {
        stage: '1st Top Dressing (45 DAP)',
        dap: '-',
        nitrogen: '120 kg N/ha',
        phosphorus: '-',
        potassium: '60 kg K₂O/ha',
        notes: 'Earth up after application; apply 25 kg Sulphur/ha',
      },
      {
        stage: '2nd Top Dressing (90 DAP)',
        dap: '-',
        nitrogen: '120 kg N/ha',
        phosphorus: '-',
        potassium: '-',
        notes: 'Apply with earthing up to cover the stool',
      },
    ],
    irrigation: [
      { stage: 'Germination', dayRange: '0–30', intervalDays: '7', notes: 'Critical for uniform germination' },
      { stage: 'Tillering', dayRange: '31–90', intervalDays: '10–14', notes: 'Adequate moisture; avoid waterlogging' },
      { stage: 'Grand growth phase', dayRange: '91–240', intervalDays: '7–10', notes: 'Maximum water demand; use drip 8–10 L/plant/day if available' },
      { stage: 'Maturity', dayRange: '241–300', intervalDays: '20–25', notes: 'Reduce irrigation; helps sugar accumulation' },
    ],
    pests: [
      {
        name: 'Early Shoot Borer (Chilo infuscatellus)',
        symptom: 'Dead heart in young shoots 1–3 months old',
        management: 'Sett treatment with Chlorpyriphos; Earthing up; Apply Carbofuran 3G in soil',
      },
      {
        name: 'Top Shoot Borer (Scirpophaga excerptalis)',
        symptom: 'Dead heart in mature stalks; frass inside the shoot',
        management: 'Remove and destroy affected shoots; Release Trichogramma @ 50,000/ha; Apply Monocrotophos spray',
      },
      {
        name: 'Red Rot (Colletotrichum falcatum)',
        symptom: 'Red discolouration with white patches inside stalk; sour smell',
        management: 'Use disease-free setts; Hot water treatment 52°C for 30 min; Avoid ratoon of infected fields',
      },
    ],
    harvestIndicator: 'Brix refractometer reading 18–22%; Yellowish leaves; Stalks turn lighter in colour',
    expectedYield: '80–120 t/ha (plant crop); 70–100 t/ha (ratoon)',
    postHarvest: 'Harvest early morning; Remove trash; Transport to mill within 24 hours to prevent sugar inversion',
  },
  {
    cropId: 'cotton',
    cropName: 'Cotton',
    seasons: ['Kharif (June–July sowing)'],
    duration: '150–180 days (Bt hybrids: 160 days)',
    waterRequirement: '700–1200 mm',
    soilType: 'Deep black cotton soil (Vertisols) or red loamy; pH 6.5–8.0',
    seedRate: '1.5–2.5 kg/ha (Bt hybrid); 10–15 kg/ha (desi)',
    spacing: '60 cm × 30 cm (irrigated); 90 cm × 60 cm (rainfed)',
    seedTreatment: 'Treat with Imidacloprid 70 WS @ 7g/kg seed; then coat with Azospirillum 600g + Phosphobacterium 600g per 15 kg seed',
    landPreparation: 'Deep plough 30–45 cm; Level; Form ridges and furrows; Apply FYM 25 t/ha',
    fertilizer: [
      {
        stage: 'Basal',
        dap: '50 kg/ha',
        nitrogen: '25 kg N/ha',
        phosphorus: '50 kg P₂O₅/ha',
        potassium: '40 kg K₂O/ha',
        notes: 'Apply 1 kg Boron/ha as borax basally in boron-deficient soils',
      },
      {
        stage: '1st Top Dressing (30 DAS)',
        dap: '-',
        nitrogen: '50 kg N/ha',
        phosphorus: '-',
        potassium: '20 kg K₂O/ha',
        notes: '',
      },
      {
        stage: '2nd Top Dressing (60 DAS)',
        dap: '-',
        nitrogen: '50 kg N/ha',
        phosphorus: '-',
        potassium: '20 kg K₂O/ha',
        notes: 'Spray 2% DAP foliar at bud initiation',
      },
    ],
    irrigation: [
      { stage: 'Germination', dayRange: '0–15', intervalDays: '5–7', notes: 'Avoid excess moisture; one irrigation before sowing' },
      { stage: 'Vegetative growth', dayRange: '16–60', intervalDays: '10–15', notes: 'Avoid stress; inter-cultivation at 30 DAS' },
      { stage: 'Squaring and bud formation', dayRange: '61–90', intervalDays: '8–10', notes: 'Critical period — maintain adequate moisture' },
      { stage: 'Boll development', dayRange: '91–130', intervalDays: '10–12', notes: 'Reduce frequency; support boll filling' },
      { stage: 'Boll opening', dayRange: '131–160', intervalDays: '-', notes: 'Withhold irrigation for dry boll opening' },
    ],
    pests: [
      {
        name: 'Pink Bollworm (Pectinophora gossypiella)',
        symptom: 'Flower buds fail to open; seeds eaten inside bolls; rosette flowers',
        management: 'Use pheromone traps; Spray Emamectin Benzoate 0.5g/L at first fruiting body stage',
      },
      {
        name: 'Whitefly (Bemisia tabaci)',
        symptom: 'Leaf curling, yellowing; honeydew; transmits cotton leaf curl virus',
        management: 'Yellow sticky traps; Spray Imidacloprid 0.3 ml/L alternated with Spiromesifen 0.5 ml/L',
      },
      {
        name: 'Grey Mildew (Ramularia areola)',
        symptom: 'White powdery spots on underside of leaves; premature leaf drop',
        management: 'Spray Carbendazim 1g/L or Thiophanate methyl 1g/L at first sign',
      },
    ],
    harvestIndicator: '60–65% bolls open; White fluffy locks visible',
    expectedYield: '2–2.5 t/ha seed cotton (Bt irrigated); 1.2–1.5 t/ha (rainfed)',
    postHarvest: 'Pick bolls in 3–5 rounds; Dry to 8–10% moisture; Grade before ginning',
  },
  {
    cropId: 'maize',
    cropName: 'Maize (Corn)',
    seasons: ['Kharif (June–July)', 'Rabi (October–November)', 'Summer (January–February)'],
    duration: '90–115 days',
    waterRequirement: '600–900 mm',
    soilType: 'Well-drained loamy to sandy loam; pH 6.0–7.5',
    seedRate: '20–25 kg/ha (hybrid); 15–20 kg/ha (composite)',
    spacing: '60 cm × 25 cm',
    seedTreatment: 'Treat with Captan 3g/kg seed; Coat with Azospirillum 600g + Phosphobacterium 600g per 15 kg seed',
    landPreparation: 'One deep ploughing; 2 harrowing operations; FYM 10 t/ha incorporated before sowing',
    fertilizer: [
      {
        stage: 'Basal',
        dap: '50 kg/ha',
        nitrogen: '60 kg N/ha',
        phosphorus: '60 kg P₂O₅/ha',
        potassium: '60 kg K₂O/ha',
        notes: 'Apply Zinc Sulphate 25 kg/ha in deficient soils',
      },
      {
        stage: '1st Top Dressing (V4 stage, ~25 DAS)',
        dap: '-',
        nitrogen: '60 kg N/ha',
        phosphorus: '-',
        potassium: '-',
        notes: 'Apply beside the rows in moist soil',
      },
      {
        stage: '2nd Top Dressing (V8 stage, ~45 DAS)',
        dap: '-',
        nitrogen: '60 kg N/ha',
        phosphorus: '-',
        potassium: '-',
        notes: 'Coincide with knee-high earthing up',
      },
    ],
    irrigation: [
      { stage: 'Germination', dayRange: '0–10', intervalDays: '4–5', notes: 'Light irrigation to ensure uniform germination' },
      { stage: 'Vegetative (V1–V8)', dayRange: '11–50', intervalDays: '8–10', notes: 'Avoid water stress during critical tillering stages' },
      { stage: 'Tasseling and silking', dayRange: '51–70', intervalDays: '6–8', notes: 'Most critical stage for yield; do not allow moisture stress' },
      { stage: 'Grain filling', dayRange: '71–90', intervalDays: '8–10', notes: 'Maintain adequate moisture for cob development' },
      { stage: 'Maturity', dayRange: '91–110', intervalDays: '-', notes: 'Reduce; stop irrigation before harvest' },
    ],
    pests: [
      {
        name: 'Fall Armyworm (Spodoptera frugiperda)',
        symptom: 'Window-pane feeding; frass and pin-hole damage in whorl; ragged leaf appearance',
        management: 'Apply Emamectin Benzoate 0.4g/L in whorl at first infestation; Use pheromone traps; Spray in early morning or late evening',
      },
      {
        name: 'Stem Borer (Chilo partellus)',
        symptom: 'Dead heart in early stage; shot holes on leaves; stalk boring in later stage',
        management: 'Apply Carbofuran 3G 15 kg/ha in whorl; Release Trichogramma egg cards',
      },
      {
        name: 'Downy Mildew (Peronosclerospora sorghi)',
        symptom: 'White downy growth on lower leaf surface; systemic infection causes stunting',
        management: 'Use resistant hybrids (COHM 5, COHM 6); Treat seed with Metalaxyl 6g/kg',
      },
    ],
    harvestIndicator: 'Husks dry and brown; kernels hard; black layer visible at the tip of kernel',
    expectedYield: '5–8 t/ha grain (hybrid irrigated); 2.5–4 t/ha (rainfed)',
    postHarvest: 'Harvest when grain moisture is 25–28%; Dry to 12–14% before shelling; Store in airtight containers',
  },
  {
    cropId: 'blackgram',
    cropName: 'Black Gram (Urad)',
    seasons: ['Kharif (June–July)', 'Rabi (October–November)', 'Summer (February–March)'],
    duration: '65–80 days',
    waterRequirement: '350–450 mm',
    soilType: 'Loamy to clay loam; pH 6.5–7.5; avoid waterlogging',
    seedRate: '15–20 kg/ha',
    spacing: '30 cm × 10 cm',
    seedTreatment: 'Treat with Thiram 3g/kg + Rhizobium culture 600g + Phosphobacterium 200g per 15 kg seed',
    landPreparation: '2–3 ploughings; apply FYM 12.5 t/ha; form ridges and furrows or flat beds',
    fertilizer: [
      {
        stage: 'Basal',
        dap: '25 kg/ha',
        nitrogen: '25 kg N/ha',
        phosphorus: '50 kg P₂O₅/ha',
        potassium: '25 kg K₂O/ha',
        notes: 'Rhizobium inoculation reduces N requirement; apply 250 kg/ha Gypsum as S source',
      },
    ],
    irrigation: [
      { stage: 'Germination', dayRange: '0–7', intervalDays: '3', notes: 'Light irrigation; avoid runoff' },
      { stage: 'Vegetative growth', dayRange: '8–30', intervalDays: '8–10', notes: 'One irrigation at branching stage is critical' },
      { stage: 'Flowering and pod formation', dayRange: '31–55', intervalDays: '7–8', notes: 'Critical stage; avoid both drought and waterlogging' },
      { stage: 'Maturity', dayRange: '56–75', intervalDays: '-', notes: 'Withhold irrigation for even maturity' },
    ],
    pests: [
      {
        name: 'Yellow Mosaic Virus (YMV)',
        symptom: 'Yellow and green patches on leaves; mosaic pattern; plant stunting',
        management: 'Use resistant variety VBN 6, CO 6; Control vector whitefly with Imidacloprid 0.3 ml/L; Remove and destroy infected plants',
      },
      {
        name: 'Pod Borer (Maruca vitrata)',
        symptom: 'Webbing of flowers and pods; frass inside pods',
        management: 'Spray Quinalphos 2 ml/L at 10% flowering and 10 days after',
      },
      {
        name: 'Cercospora Leaf Spot',
        symptom: 'Circular brown spots with grey centre on older leaves',
        management: 'Spray Mancozeb 2.5g/L at first appearance; repeat after 10 days',
      },
    ],
    harvestIndicator: '75–80% pods turn black; pull test — seeds separate easily',
    expectedYield: '0.8–1.2 t/ha',
    postHarvest: 'Harvest when 75% pods are mature; dry for 2–3 days; thresh and clean; dry to 10% moisture',
  },
];

// ============================================================
// COMPONENT
// ============================================================

export function MyFarmGuideScreen() {
  const [selectedCropId, setSelectedCropId] = useState<string>(CROP_GUIDES[0].cropId);
  const [activeTab, setActiveTab] = useState<'overview' | 'fertilizer' | 'irrigation' | 'pests' | 'harvest'>('overview');
  const [cachePayload, setCachePayload] = useState<Record<string, unknown> | null>(null);

  React.useEffect(() => {
    const load = async () => {
      const payload = await getServiceCachePayload(13);
      setCachePayload(payload);
    };
    void load();
  }, []);

  const guide = CROP_GUIDES.find((g) => g.cropId === selectedCropId) ?? CROP_GUIDES[0];

  return (
    <section style={{ padding: 16, maxWidth: 800 }}>
      <h2>My Farm Guide (#13)</h2>
      <p>Complete sowing-to-harvest cultivation guide. Entirely offline.</p>
      <p>
        Guide cache: <strong>{cachePayload ? 'Loaded' : 'Unavailable'}</strong>
      </p>

      <div style={{ marginBottom: 16 }}>
        <label htmlFor="cropSelect" style={{ fontWeight: 600, marginRight: 8 }}>
          Select Crop:
        </label>
        <select
          id="cropSelect"
          value={selectedCropId}
          onChange={(e) => {
            setSelectedCropId(e.target.value);
            setActiveTab('overview');
          }}
          style={{ padding: '6px 12px', fontSize: 14 }}
        >
          {CROP_GUIDES.map((g) => (
            <option key={g.cropId} value={g.cropId}>
              {g.cropName}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['overview', 'fertilizer', 'irrigation', 'pests', 'harvest'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '6px 14px',
              fontWeight: activeTab === tab ? 700 : 400,
              border: activeTab === tab ? '2px solid #2e7d32' : '1px solid #ccc',
              borderRadius: 4,
              background: activeTab === tab ? '#e8f5e9' : '#fff',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {tab === 'overview' ? 'Overview & Land Prep' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          <h3>{guide.cropName} — Overview</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <tbody>
              {[
                ['Seasons', guide.seasons.join('; ')],
                ['Duration', guide.duration],
                ['Water Requirement', guide.waterRequirement],
                ['Suitable Soil', guide.soilType],
                ['Seed Rate', guide.seedRate],
                ['Spacing', guide.spacing],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px 4px', fontWeight: 600, width: '38%' }}>{label}</td>
                  <td style={{ padding: '8px 4px' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4 style={{ marginTop: 20 }}>Seed Treatment</h4>
          <p style={{ lineHeight: 1.6 }}>{guide.seedTreatment}</p>

          <h4 style={{ marginTop: 16 }}>Land Preparation</h4>
          <p style={{ lineHeight: 1.6 }}>{guide.landPreparation}</p>
        </div>
      )}

      {activeTab === 'fertilizer' && (
        <div>
          <h3>{guide.cropName} — Fertilizer Schedule</h3>
          {guide.fertilizer.map((stage) => (
            <div
              key={stage.stage}
              style={{
                border: '1px solid #c8e6c9',
                borderRadius: 6,
                padding: 12,
                marginBottom: 12,
                background: '#f9fbe7',
              }}
            >
              <strong style={{ color: '#2e7d32' }}>{stage.stage}</strong>
              <table style={{ width: '100%', marginTop: 8, fontSize: 13 }}>
                <tbody>
                  {stage.nitrogen !== '-' && (
                    <tr>
                      <td style={{ width: '40%', color: '#555' }}>Nitrogen (N)</td>
                      <td>{stage.nitrogen}</td>
                    </tr>
                  )}
                  {stage.phosphorus !== '-' && (
                    <tr>
                      <td style={{ color: '#555' }}>Phosphorus (P₂O₅)</td>
                      <td>{stage.phosphorus}</td>
                    </tr>
                  )}
                  {stage.potassium !== '-' && (
                    <tr>
                      <td style={{ color: '#555' }}>Potassium (K₂O)</td>
                      <td>{stage.potassium}</td>
                    </tr>
                  )}
                  {stage.dap !== '-' && (
                    <tr>
                      <td style={{ color: '#555' }}>DAP</td>
                      <td>{stage.dap}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              {stage.notes ? (
                <p style={{ marginTop: 6, color: '#555', fontSize: 12 }}>
                  <em>Notes: {stage.notes}</em>
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'irrigation' && (
        <div>
          <h3>{guide.cropName} — Irrigation Schedule</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#e8f5e9' }}>
                <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #c8e6c9' }}>Stage</th>
                <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #c8e6c9' }}>Days</th>
                <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #c8e6c9' }}>Interval</th>
                <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #c8e6c9' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {guide.irrigation.map((stage) => (
                <tr key={stage.stage} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', border: '1px solid #eee' }}>{stage.stage}</td>
                  <td style={{ padding: '8px', border: '1px solid #eee' }}>{stage.dayRange}</td>
                  <td style={{ padding: '8px', border: '1px solid #eee' }}>{stage.intervalDays} days</td>
                  <td style={{ padding: '8px', border: '1px solid #eee', color: '#555' }}>{stage.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'pests' && (
        <div>
          <h3>{guide.cropName} — Pest & Disease Management</h3>
          {guide.pests.map((pest) => (
            <div
              key={pest.name}
              style={{
                border: '1px solid #ffccbc',
                borderRadius: 6,
                padding: 12,
                marginBottom: 12,
                background: '#fff8f6',
              }}
            >
              <strong style={{ color: '#bf360c' }}>{pest.name}</strong>
              <p style={{ margin: '6px 0 4px', fontSize: 13 }}>
                <strong>Symptom:</strong> {pest.symptom}
              </p>
              <p style={{ margin: 0, fontSize: 13 }}>
                <strong>Management:</strong> {pest.management}
              </p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'harvest' && (
        <div>
          <h3>{guide.cropName} — Harvest & Post-Harvest</h3>
          <div
            style={{
              border: '1px solid #c8e6c9',
              borderRadius: 6,
              padding: 14,
              marginBottom: 12,
              background: '#f1f8e9',
            }}
          >
            <strong>Harvest Indicators</strong>
            <p style={{ marginTop: 8, lineHeight: 1.6 }}>{guide.harvestIndicator}</p>
          </div>
          <div
            style={{
              border: '1px solid #c8e6c9',
              borderRadius: 6,
              padding: 14,
              marginBottom: 12,
              background: '#f1f8e9',
            }}
          >
            <strong>Expected Yield</strong>
            <p style={{ marginTop: 8, lineHeight: 1.6 }}>{guide.expectedYield}</p>
          </div>
          <div
            style={{
              border: '1px solid #c8e6c9',
              borderRadius: 6,
              padding: 14,
              background: '#f1f8e9',
            }}
          >
            <strong>Post-Harvest Handling</strong>
            <p style={{ marginTop: 8, lineHeight: 1.6 }}>{guide.postHarvest}</p>
          </div>
        </div>
      )}
    </section>
  );
}
