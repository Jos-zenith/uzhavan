/**
 * Pest Identification Service
 * Service #16: Automated Pest/Disease Identification with AI
 * 
 * Uses EfficientNetV2L model trained on agricultural pest images
 * Partial Offline: Basic remedies offline, AI analysis requires server
 * 
 * Data Source: data/archive (pest images)
 * Model: pest-detection-effectivenet.ipynb (EfficientNetV2L)
 */

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type PestCategory = 
  | 'ants'
  | 'bees'
  | 'beetle'
  | 'caterpillar'
  | 'earthworms'
  | 'earwig'
  | 'grasshopper'
  | 'moth'
  | 'slug'
  | 'snail'
  | 'wasp'
  | 'weevil';

export type SeverityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type PestInfo = {
  pestId: string;
  pestName: string;
  scientificName: string;
  category: PestCategory;
  description: string;
  symptoms: string[];
  affectedCrops: string[];
  severity: SeverityLevel;
  imageUrl?: string;
};

export type RemedialMeasure = {
  measureId: string;
  title: string;
  type: 'Chemical' | 'Organic' | 'Biological' | 'Cultural' | 'Mechanical';
  description: string;
  materials: string[];
  steps: string[];
  costEstimate?: string;
  effectivenessPeriod: string;
  precautions: string[];
  availability: 'Common' | 'Rare';
};

export type IdentificationResult = {
  resultId: string;
  timestamp: string;
  imageDataUrl?: string;
  imagePath?: string;
  
  // AI Detection (requires server)
  aiDetection?: {
    detectedPest: PestCategory;
    confidence: number;
    topPredictions: Array<{
      pest: PestCategory;
      confidence: number;
    }>;
    modelVersion: string;
  };
  
  // Manual/Offline Detection
  manualSelection?: PestCategory;
  
  // Results
  pestInfo: PestInfo;
  remedialMeasures: RemedialMeasure[];
  
  // Metadata
  cropType?: string;
  location?: {
    district?: string;
    block?: string;
    village?: string;
  };
  farmerContact?: string;
  notes?: string;
  
  // Status
  identificationMethod: 'AI' | 'Manual' | 'Hybrid';
  serverAvailable: boolean;
};

export type PestOutbreakAlert = {
  alertId: string;
  pestCategory: PestCategory;
  district: string;
  severity: SeverityLevel;
  reportedCases: number;
  dateReported: string;
  status: 'Active' | 'Contained' | 'Resolved';
};

export type IdentificationHistory = {
  totalIdentifications: number;
  aiIdentifications: number;
  manualIdentifications: number;
  pestDistribution: Record<PestCategory, number>;
  cropImpact: Record<string, number>;
  averageConfidence: number;
};

// ============================================================
// OFFLINE PEST DATABASE
// ============================================================

const PEST_DATABASE: Record<PestCategory, PestInfo> = {
  ants: {
    pestId: 'PEST001',
    pestName: 'Ants',
    scientificName: 'Formicidae',
    category: 'ants',
    description: 'Small social insects that can protect aphids and scale insects, leading to indirect crop damage. Some species also bite plant tissues.',
    symptoms: [
      'Presence of ant trails on plants and soil',
      'Honeydew deposits on leaves',
      'Associated aphid or scale insect infestation',
      'Soil mounds near plant roots',
      'Leaf curling in severe cases'
    ],
    affectedCrops: ['Cotton', 'Sugarcane', 'Vegetables', 'Fruit Trees', 'Paddy'],
    severity: 'Low',
  },
  bees: {
    pestId: 'PEST002',
    pestName: 'Bees',
    scientificName: 'Apis spp.',
    category: 'bees',
    description: 'Generally beneficial pollinators, but can cause minor damage to soft fruits. Not typically considered a pest.',
    symptoms: [
      'Holes in soft fruits',
      'Presence of bees around flowers',
      'Nectar theft from flowers',
      'Minimal actual crop damage'
    ],
    affectedCrops: ['Mango', 'Guava', 'Vegetables', 'Sunflower', 'Mustard'],
    severity: 'Low',
  },
  beetle: {
    pestId: 'PEST003',
    pestName: 'Beetles',
    scientificName: 'Coleoptera',
    category: 'beetle',
    description: 'Hard-bodied insects that feed on leaves, stems, roots, and fruits. Includes leaf beetles, scarab beetles, and weevils.',
    symptoms: [
      'Irregular holes in leaves',
      'Skeletonized leaves',
      'Damaged fruits with entry holes',
      'Wilting plants due to root damage',
      'Adult beetles visible on plants',
      'Larvae in soil or plant tissues'
    ],
    affectedCrops: ['Paddy', 'Cotton', 'Vegetables', 'Potato', 'Coconut', 'Brinjal'],
    severity: 'High',
  },
  caterpillar: {
    pestId: 'PEST004',
    pestName: 'Caterpillars',
    scientificName: 'Lepidoptera larvae',
    category: 'caterpillar',
    description: 'Larval stage of butterflies and moths. Major crop pests causing extensive defoliation and fruit damage.',
    symptoms: [
      'Large irregular holes in leaves',
      'Defoliation of entire branches',
      'Frass (droppings) on leaves',
      'Bore holes in fruits and stems',
      'Webbing on leaf surfaces',
      'Visible caterpillars on plants',
      'Stunted plant growth'
    ],
    affectedCrops: ['Cotton', 'Tomato', 'Cabbage', 'Chilli', 'Maize', 'Paddy', 'Groundnut'],
    severity: 'Critical',
  },
  earthworms: {
    pestId: 'PEST005',
    pestName: 'Earthworms',
    scientificName: 'Lumbricina',
    category: 'earthworms',
    description: 'Beneficial organisms that improve soil structure and fertility. Not considered pests; enhance soil aeration and nutrient cycling.',
    symptoms: [
      'Soil castings on surface',
      'Improved soil structure',
      'Better water infiltration',
      'No negative impact on crops'
    ],
    affectedCrops: ['All crops (beneficial)'],
    severity: 'Low',
  },
  earwig: {
    pestId: 'PEST006',
    pestName: 'Earwigs',
    scientificName: 'Dermaptera',
    category: 'earwig',
    description: 'Nocturnal insects with pincers. Feed on soft plant tissues, flowers, and fruits. Can also prey on other pests.',
    symptoms: [
      'Irregular holes in leaves and petals',
      'Damage to seedlings',
      'Scarred fruits',
      'Night-time feeding patterns',
      'Hiding in dark, moist areas during day'
    ],
    affectedCrops: ['Lettuce', 'Strawberry', 'Flowers', 'Corn', 'Vegetables'],
    severity: 'Medium',
  },
  grasshopper: {
    pestId: 'PEST007',
    pestName: 'Grasshoppers',
    scientificName: 'Caelifera',
    category: 'grasshopper',
    description: 'Large jumping insects that feed on leaves and stems. Can cause severe defoliation during outbreaks.',
    symptoms: [
      'Ragged edges on leaves',
      'Complete defoliation in severe cases',
      'Damage to stems and flowers',
      'Visible grasshoppers jumping in field',
      'Stripped crops in outbreak areas'
    ],
    affectedCrops: ['Paddy', 'Maize', 'Wheat', 'Vegetables', 'Cotton', 'Sugarcane'],
    severity: 'High',
  },
  moth: {
    pestId: 'PEST008',
    pestName: 'Moths (Adult)',
    scientificName: 'Lepidoptera',
    category: 'moth',
    description: 'Adult stage of lepidopteran insects. While adults feed on nectar, their larvae (caterpillars) are major pests.',
    symptoms: [
      'Adult moths flying around lights at night',
      'Eggs laid on leaves and stems',
      'Leading to caterpillar infestation',
      'Minimal direct damage by adults'
    ],
    affectedCrops: ['Cotton', 'Tomato', 'Paddy', 'Maize', 'Vegetables'],
    severity: 'Medium',
  },
  slug: {
    pestId: 'PEST009',
    pestName: 'Slugs',
    scientificName: 'Gastropoda (shell-less)',
    category: 'slug',
    description: 'Shell-less molluscs that feed on soft plant tissues. Active in moist conditions, leaving slime trails.',
    symptoms: [
      'Large irregular holes in leaves',
      'Silvery slime trails on plants',
      'Damage to seedlings and young plants',
      'Feeding on fruits touching ground',
      'Active during night and rainy periods'
    ],
    affectedCrops: ['Cabbage', 'Lettuce', 'Strawberry', 'Potato', 'Vegetables'],
    severity: 'Medium',
  },
  snail: {
    pestId: 'PEST010',
    pestName: 'Snails',
    scientificName: 'Gastropoda (shelled)',
    category: 'snail',
    description: 'Shelled molluscs that feed on leaves and soft plant parts. Particularly problematic in wet conditions and paddy fields.',
    symptoms: [
      'Irregular holes in leaves',
      'Slime trails on plants',
      'Damage to seedlings',
      'Visible snails on plants',
      'Active in wet/humid conditions',
      'Common in paddy fields'
    ],
    affectedCrops: ['Paddy', 'Vegetables', 'Strawberry', 'Ornamental plants'],
    severity: 'Medium',
  },
  wasp: {
    pestId: 'PEST011',
    pestName: 'Wasps',
    scientificName: 'Hymenoptera (non-bee)',
    category: 'wasp',
    description: 'Predatory insects that are generally beneficial as they prey on other pests. Some species can damage fruits.',
    symptoms: [
      'Holes in ripening fruits',
      'Presence of wasps around crops',
      'Mostly beneficial as pest predators',
      'Minimal crop damage'
    ],
    affectedCrops: ['Grapes', 'Mango', 'Guava', 'Fruit crops'],
    severity: 'Low',
  },
  weevil: {
    pestId: 'PEST012',
    pestName: 'Weevils',
    scientificName: 'Curculionoidea',
    category: 'weevil',
    description: 'Beetles with elongated snouts. Feed on crops in both larval and adult stages. Major stored grain pests.',
    symptoms: [
      'Holes in stems, buds, and grains',
      'Damaged growing points',
      'Stunted plant growth',
      'Grain damage in storage',
      'White grubs in infected tissues',
      'Characteristic snout marks'
    ],
    affectedCrops: ['Paddy', 'Coconut', 'Sugarcane', 'Cotton', 'Stored grains'],
    severity: 'High',
  },
};

// ============================================================
// REMEDIAL MEASURES DATABASE
// ============================================================

const REMEDIAL_MEASURES: Record<PestCategory, RemedialMeasure[]> = {
  ants: [
    {
      measureId: 'REM001A',
      title: 'Neem Oil Spray',
      type: 'Organic',
      description: 'Natural organic solution to repel ants and control associated pests like aphids',
      materials: ['Neem oil (50ml)', 'Water (1 liter)', 'Liquid soap (5ml)', 'Sprayer'],
      steps: [
        'Mix 50ml neem oil with 1 liter water',
        'Add 5ml liquid soap as emulsifier',
        'Shake well before use',
        'Spray on ant trails and affected plants',
        'Apply early morning or evening',
        'Repeat every 7 days'
      ],
      costEstimate: '₹50-100 per acre',
      effectivenessPeriod: '7-10 days',
      precautions: ['Avoid spraying during hot sun', 'Safe for beneficial insects'],
      availability: 'Common',
    },
    {
      measureId: 'REM001B',
      title: 'Barrier Treatment',
      type: 'Cultural',
      description: 'Physical barriers to prevent ant movement on plants',
      materials: ['Sticky bands', 'Petroleum jelly', 'Grease'],
      steps: [
        'Apply sticky bands around tree trunks',
        'Create grease barriers at base of plants',
        'Clear ant pathways regularly',
        'Remove ant colonies near crop area'
      ],
      costEstimate: '₹100-200',
      effectivenessPeriod: '2-3 weeks',
      precautions: ['Do not damage bark while applying', 'Replace barriers when dry'],
      availability: 'Common',
    },
  ],
  bees: [
    {
      measureId: 'REM002A',
      title: 'No Control Needed',
      type: 'Cultural',
      description: 'Bees are beneficial pollinators and should be protected',
      materials: ['None'],
      steps: [
        'Protect bee populations',
        'Install bee boxes for pollination',
        'Avoid pesticide spraying during flowering',
        'If fruit damage occurs, use protective netting'
      ],
      costEstimate: '₹0',
      effectivenessPeriod: 'Permanent',
      precautions: ['Never kill bees', 'Essential for crop pollination'],
      availability: 'Common',
    },
  ],
  beetle: [
    {
      measureId: 'REM003A',
      title: 'Chemical Control - Chlorpyrifos',
      type: 'Chemical',
      description: 'Systemic insecticide for severe beetle infestations',
      materials: ['Chlorpyrifos 20% EC (30ml)', 'Water (15 liters)', 'Knapsack sprayer'],
      steps: [
        'Mix 30ml Chlorpyrifos in 15 liters water',
        'Spray on affected plants thoroughly',
        'Cover both leaf surfaces',
        'Apply when beetles are active',
        'Maintain 15-day harvest interval'
      ],
      costEstimate: '₹200-300 per acre',
      effectivenessPeriod: '10-15 days',
      precautions: ['Wear protective gear', 'Follow PHI guidelines', 'Toxic to fish'],
      availability: 'Common',
    },
    {
      measureId: 'REM003B',
      title: 'Neem-Based Organic Solution',
      type: 'Organic',
      description: 'Biodegradable botanical insecticide for beetle control',
      materials: ['Neem seed kernel extract (NSKE) 5%', 'Water', 'Sprayer'],
      steps: [
        'Prepare 5% NSKE solution',
        'Add adjuvant for better spreading',
        'Spray on beetle-infested areas',
        'Focus on leaf undersides',
        'Apply twice weekly'
      ],
      costEstimate: '₹150-200 per acre',
      effectivenessPeriod: '5-7 days',
      precautions: ['Apply in evening hours', 'Safe for beneficial organisms'],
      availability: 'Common',
    },
    {
      measureId: 'REM003C',
      title: 'Hand Picking and Light Traps',
      type: 'Mechanical',
      description: 'Physical removal of beetles and attraction to light traps',
      materials: ['Light trap', 'Kerosene/soap water basin', 'Manual collection'],
      steps: [
        'Install light traps in evening (7-10 PM)',
        'Place basin with soap water under light',
        'Hand-pick visible beetles during day',
        'Destroy collected beetles',
        'Maintain traps throughout season'
      ],
      costEstimate: '₹500-1000 (one-time for traps)',
      effectivenessPeriod: 'Continuous',
      precautions: ['Empty trap basins daily', 'Safe and eco-friendly'],
      availability: 'Common',
    },
  ],
  caterpillar: [
    {
      measureId: 'REM004A',
      title: 'Bt (Bacillus thuringiensis) Spray',
      type: 'Biological',
      description: 'Microbial biocontrol agent specifically targeting caterpillars',
      materials: ['Bt formulation (1-2g/liter)', 'Water', 'Sprayer'],
      steps: [
        'Mix Bt formulation as per label instructions',
        'Spray in evening hours (Bt degrades in sunlight)',
        'Ensure thorough coverage of foliage',
        'Target young caterpillar stages',
        'Repeat every 5-7 days if needed',
        'Compatible with IPM programs'
      ],
      costEstimate: '₹100-150 per acre',
      effectivenessPeriod: '5-7 days',
      precautions: ['Apply in evening', 'Safe for humans and non-target organisms', 'Store in cool place'],
      availability: 'Common',
    },
    {
      measureId: 'REM004B',
      title: 'NPV (Nuclear Polyhedrosis Virus)',
      type: 'Biological',
      description: 'Virus-based biopesticide for caterpillar control',
      materials: ['NPV formulation (250 LE/acre)', 'Water', 'Jaggery or molasses'],
      steps: [
        'Mix NPV with water as recommended',
        'Add jaggery for better adhesion',
        'Apply during early caterpillar stage',
        'Spray in evening hours',
        'Repeat if new larvae appear'
      ],
      costEstimate: '₹80-120 per acre',
      effectivenessPeriod: '7-10 days',
      precautions: ['Highly specific to caterpillars', 'Environmentally safe'],
      availability: 'Common',
    },
    {
      measureId: 'REM004C',
      title: 'Chemical Control - Emamectin Benzoate',
      type: 'Chemical',
      description: 'Selective insecticide for severe caterpillar outbreaks',
      materials: ['Emamectin benzoate 5% SG (4g)', 'Water (15 liters)'],
      steps: [
        'Dissolve 4g in 15 liters water',
        'Spray on affected crop',
        'Ensure leaf coverage',
        'Apply when larvae are small',
        'Do not repeat within 10 days'
      ],
      costEstimate: '₹250-350 per acre',
      effectivenessPeriod: '12-15 days',
      precautions: ['Follow PHI strictly', 'Use only if infestation is severe', 'Rotate chemicals'],
      availability: 'Common',
    },
    {
      measureId: 'REM004D',
      title: 'Pheromone Traps',
      type: 'Biological',
      description: 'Attract and trap adult moths to prevent caterpillar infestation',
      materials: ['Pheromone lures (specific to pest)', 'Funnel traps', 'Sticky traps'],
      steps: [
        'Install 5-8 traps per acre',
        'Place traps at canopy height',
        'Replace lures every 3-4 weeks',
        'Monitor trap catches',
        'Destroy trapped moths'
      ],
      costEstimate: '₹800-1200 per acre (season)',
      effectivenessPeriod: '3-4 weeks per lure',
      precautions: ['Do not touch lures with bare hands', 'Distance traps 20-25m apart'],
      availability: 'Common',
    },
  ],
  earthworms: [
    {
      measureId: 'REM005A',
      title: 'No Control - Beneficial Organism',
      type: 'Cultural',
      description: 'Earthworms improve soil health and should be encouraged',
      materials: ['Organic matter', 'Compost'],
      steps: [
        'Add organic matter to soil',
        'Maintain soil moisture',
        'Avoid excessive pesticide use',
        'Promote earthworm population',
        'Practice vermicomposting'
      ],
      costEstimate: '₹0',
      effectivenessPeriod: 'Permanent benefit',
      precautions: ['Earthworms indicate healthy soil', 'Never attempt to control'],
      availability: 'Common',
    },
  ],
  earwig: [
    {
      measureId: 'REM006A',
      title: 'Trapping and Removal',
      type: 'Mechanical',
      description: 'Physical traps to capture earwigs',
      materials: ['Rolled newspaper', 'Bamboo tubes', 'Oil traps'],
      steps: [
        'Place rolled newspaper or bamboo traps in evening',
        'Earwigs will hide in traps overnight',
        'Collect and dispose in morning',
        'Use oil-filled traps near plants',
        'Repeat daily during peak season'
      ],
      costEstimate: '₹50-100',
      effectivenessPeriod: 'Daily maintenance',
      precautions: ['Empty traps regularly', 'Safe and chemical-free'],
      availability: 'Common',
    },
    {
      measureId: 'REM006B',
      title: 'Diatomaceous Earth',
      type: 'Organic',
      description: 'Natural powder that dehydrates earwigs',
      materials: ['Food-grade diatomaceous earth', 'Duster'],
      steps: [
        'Dust diatomaceous earth around plant base',
        'Apply in dry conditions',
        'Creates barrier for earwigs',
        'Reapply after rain',
        'Focus on hiding spots'
      ],
      costEstimate: '₹100-200',
      effectivenessPeriod: '7-10 days (dry conditions)',
      precautions: ['Avoid inhalation', 'Ineffective when wet'],
      availability: 'Common',
    },
  ],
  grasshopper: [
    {
      measureId: 'REM007A',
      title: 'Neem Extract Spray',
      type: 'Organic',
      description: 'Botanical repellent and growth regulator for grasshoppers',
      materials: ['Neem extract 5%', 'Water', 'Sprayer'],
      steps: [
        'Mix neem extract with water',
        'Spray on plants and surrounding vegetation',
        'Apply when grasshoppers are young',
        'Repeat every 7-10 days',
        'Cover entire plant area'
      ],
      costEstimate: '₹150-200 per acre',
      effectivenessPeriod: '7-10 days',
      precautions: ['More effective on young nymphs', 'Apply in evening'],
      availability: 'Common',
    },
    {
      measureId: 'REM007B',
      title: 'Chemical Control - Malathion',
      type: 'Chemical',
      description: 'Contact insecticide for severe grasshopper outbreaks',
      materials: ['Malathion 50% EC (30ml)', 'Water (15 liters)'],
      steps: [
        'Mix 30ml in 15 liters water',
        'Spray on affected vegetation',
        'Target grasshopper roosting sites',
        'Apply early morning when grasshoppers are sluggish',
        'Maintain harvest interval'
      ],
      costEstimate: '₹200-300 per acre',
      effectivenessPeriod: '10-14 days',
      precautions: ['Wear protective equipment', 'Follow PHI guidelines'],
      availability: 'Common',
    },
    {
      measureId: 'REM007C',
      title: 'Barrier Crops and Bird Perches',
      type: 'Cultural',
      description: 'Ecological management using border crops and natural predators',
      materials: ['Border crops (mustard, sorghum)', 'Bird perches', 'T-shaped sticks'],
      steps: [
        'Plant trap crops at field borders',
        'Install bird perches (50-60 per acre)',
        'Encourage insectivorous birds',
        'Maintain border vegetation',
        'Monitor and spot-spray if needed'
      ],
      costEstimate: '₹300-500 per acre',
      effectivenessPeriod: 'Season-long',
      precautions: ['Integrated approach', 'Environmentally friendly'],
      availability: 'Common',
    },
  ],
  moth: [
    {
      measureId: 'REM008A',
      title: 'Pheromone Traps for Moths',
      type: 'Biological',
      description: 'Sex pheromone-based monitoring and mass trapping',
      materials: ['Species-specific pheromone lures', 'Water traps or sticky traps'],
      steps: [
        'Install 5-8 traps per acre',
        'Place at crop canopy level',
        'Check traps regularly',
        'Replace lures every 3-4 weeks',
        'Use catch data for spray timing'
      ],
      costEstimate: '₹800-1200 per acre',
      effectivenessPeriod: '3-4 weeks per lure',
      precautions: ['Handle lures with gloves', 'Distance traps 20-25m'],
      availability: 'Common',
    },
    {
      measureId: 'REM008B',
      title: 'Light Traps',
      type: 'Mechanical',
      description: 'Attract and trap moths using light',
      materials: ['Light trap unit', 'Kerosene/soap water'],
      steps: [
        'Install 1 light trap per acre',
        'Operate from dusk to dawn',
        'Place basin with soap water under light',
        'Collect and destroy trapped moths',
        'Clean trap regularly'
      ],
      costEstimate: '₹500-800 per trap',
      effectivenessPeriod: 'Season-long',
      precautions: ['Kills beneficial insects too', 'Use in combination with other methods'],
      availability: 'Common',
    },
  ],
  slug: [
    {
      measureId: 'REM009A',
      title: 'Beer Traps',
      type: 'Mechanical',
      description: 'Attract slugs using fermented beer',
      materials: ['Shallow containers', 'Beer or yeast solution'],
      steps: [
        'Bury containers level with soil',
        'Fill with beer or yeast solution',
        'Place near affected plants',
        'Slugs are attracted and drown',
        'Empty and refill every 2-3 days'
      ],
      costEstimate: '₹50-100',
      effectivenessPeriod: '2-3 days per filling',
      precautions: ['Keep away from pets', 'Replace solution regularly'],
      availability: 'Common',
    },
    {
      measureId: 'REM009B',
      title: 'Copper Barriers',
      type: 'Mechanical',
      description: 'Physical barrier that slugs avoid',
      materials: ['Copper tape or wire', 'Crushed eggshells (alternative)'],
      steps: [
        'Place copper tape around plant containers or beds',
        'Create continuous barrier',
        'Slugs receive mild electric shock and retreat',
        'Alternative: use crushed eggshells or diatomaceous earth',
        'Maintain barrier integrity'
      ],
      costEstimate: '₹200-400',
      effectivenessPeriod: 'Permanent (with maintenance)',
      precautions: ['Ensure barrier has no gaps', 'Effective and eco-friendly'],
      availability: 'Common',
    },
    {
      measureId: 'REM009C',
      title: 'Metaldehyde Pellets',
      type: 'Chemical',
      description: 'Slug bait for severe infestations',
      materials: ['Metaldehyde pellets 5%'],
      steps: [
        'Scatter pellets around affected plants',
        'Apply in evening (slugs active at night)',
        'Place under leaves and mulch',
        'Reapply after rain',
        'Keep away from edible parts'
      ],
      costEstimate: '₹150-250',
      effectivenessPeriod: '7-10 days',
      precautions: ['Toxic to pets and wildlife', 'Use as last resort', 'Follow label instructions'],
      availability: 'Common',
    },
  ],
  snail: [
    {
      measureId: 'REM010A',
      title: 'Hand Picking',
      type: 'Mechanical',
      description: 'Manual removal of snails, especially in paddy fields',
      materials: ['Gloves', 'Collection bags'],
      steps: [
        'Inspect plants early morning or after rain',
        'Hand-pick visible snails',
        'Check under leaves and mulch',
        'Collect in bag',
        'Destroy collected snails',
        'Repeat every 2-3 days'
      ],
      costEstimate: '₹100-200 (labor)',
      effectivenessPeriod: 'Continuous',
      precautions: ['Effective for small areas', 'Labor-intensive'],
      availability: 'Common',
    },
    {
      measureId: 'REM010B',
      title: 'Lime/Ash Barriers',
      type: 'Cultural',
      description: 'Create barriers that dehydrate snails',
      materials: ['Lime powder', 'Wood ash', 'Salt'],
      steps: [
        'Sprinkle lime or ash around plant base',
        'Create continuous barrier',
        'Snails avoid crossing',
        'Reapply after rain',
        'Can use salt in non-crop areas'
      ],
      costEstimate: '₹50-100 per acre',
      effectivenessPeriod: '3-5 days (until rain)',
      precautions: ['Lime may affect soil pH', 'Avoid salt near plants'],
      availability: 'Common',
    },
    {
      measureId: 'REM010C',
      title: 'Duck Integration in Paddy',
      type: 'Biological',
      description: 'Use ducks to control snails in rice fields',
      materials: ['Ducks (10-15 per acre)', 'Fencing'],
      steps: [
        'Release ducks in paddy field after transplanting',
        'Ducks feed on snails and weeds',
        'Provide water area for ducks',
        'Remove ducks before harvest',
        'Integrated pest and weed management'
      ],
      costEstimate: '₹2000-3000 (ducks, recoverable)',
      effectivenessPeriod: 'Entire crop season',
      precautions: ['Traditional Tamil Nadu practice', 'Ducks also provide manure', 'Ensure ducks do not damage crops'],
      availability: 'Common',
    },
  ],
  wasp: [
    {
      measureId: 'REM011A',
      title: 'No Control - Beneficial Predator',
      type: 'Cultural',
      description: 'Wasps are natural enemies of many pests',
      materials: ['None'],
      steps: [
        'Protect wasp populations',
        'Avoid broad-spectrum insecticides',
        'Tolerate minor fruit damage',
        'Wasps control caterpillars and aphids',
        'Use netting on fruits if needed'
      ],
      costEstimate: '₹0',
      effectivenessPeriod: 'Permanent',
      precautions: ['Wasps are beneficial', 'Control other pests naturally'],
      availability: 'Common',
    },
  ],
  weevil: [
    {
      measureId: 'REM012A',
      title: 'Pheromone Traps (Weevil-specific)',
      type: 'Biological',
      description: 'Aggregation pheromone traps for weevil monitoring and control',
      materials: ['Weevil pheromone lures', 'Bucket traps'],
      steps: [
        'Install 8-10 traps per acre',
        'Place at 30cm above ground',
        'Monitor catch regularly',
        'Replace lures monthly',
        'Destroy trapped weevils'
      ],
      costEstimate: '₹1000-1500 per acre',
      effectivenessPeriod: '30 days per lure',
      precautions: ['Specific to red palm weevil in coconut', 'Part of IPM program'],
      availability: 'Common',
    },
    {
      measureId: 'REM012B',
      title: 'Stem Injection (Coconut)',
      type: 'Chemical',
      description: 'Systemic insecticide injection for coconut weevil',
      materials: ['Monocrotophos 36% SL (2ml per tree)', 'Injection equipment'],
      steps: [
        'Drill hole in trunk at 45° angle',
        'Inject 2ml insecticide + water',
        'Seal hole with mud',
        'Repeat quarterly',
        'Protects against stem borers'
      ],
      costEstimate: '₹10-15 per tree',
      effectivenessPeriod: '3 months',
      precautions: ['Only for severe infestation', 'Follow safety protocols'],
      availability: 'Common',
    },
    {
      measureId: 'REM012C',
      title: 'Organic Grain Storage',
      type: 'Cultural',
      description: 'Prevent weevil infestation in stored grains',
      materials: ['Neem leaves', 'Dried chilies', 'Airtight containers'],
      steps: [
        'Dry grains to 12% moisture',
        'Clean storage containers thoroughly',
        'Mix dried neem leaves with grain',
        'Add dried chilies (natural repellent)',
        'Store in airtight containers',
        'Inspect regularly'
      ],
      costEstimate: '₹50-100',
      effectivenessPeriod: '3-6 months',
      precautions: ['Ensure grain is completely dry', 'Traditional Tamil Nadu method'],
      availability: 'Common',
    },
  ],
};

// ============================================================
// PEST IDENTIFICATION SERVICE CLASS
// ============================================================

class PestIdentificationService {
  private historyKey = 'victori_pest_identification_history';
  private cameraPermissionGranted = false;

  /**
   * Request camera permission
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Prefer back camera
      });
      
      // Stop stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      this.cameraPermissionGranted = true;
      return true;
    } catch (error: any) {
      console.error('Camera permission denied:', error);
      this.cameraPermissionGranted = false;
      return false;
    }
  }

  /**
   * Check if camera permission is granted
   */
  isCameraPermissionGranted(): boolean {
    return this.cameraPermissionGranted;
  }

  /**
   * Get pest information from offline database
   */
  getPestInfo(category: PestCategory): PestInfo {
    return PEST_DATABASE[category];
  }

  /**
   * Get all available pest categories
   */
  getAllPestCategories(): PestCategory[] {
    return Object.keys(PEST_DATABASE) as PestCategory[];
  }

  /**
   * Get remedial measures for a pest
   */
  getRemedialMeasures(category: PestCategory): RemedialMeasure[] {
    return REMEDIAL_MEASURES[category] || [];
  }

  /**
   * Search pests by symptoms (offline)
   */
  searchPestBySymptoms(symptoms: string): PestCategory[] {
    const query = symptoms.toLowerCase();
    const matches: PestCategory[] = [];

    Object.entries(PEST_DATABASE).forEach(([category, info]) => {
      const symptomMatch = info.symptoms.some(s => 
        s.toLowerCase().includes(query)
      );
      const descMatch = info.description.toLowerCase().includes(query);
      
      if (symptomMatch || descMatch) {
        matches.push(category as PestCategory);
      }
    });

    return matches;
  }

  /**
   * Identify pest using AI (requires server)
   */
  async identifyPestWithAI(imageFile: File | Blob): Promise<IdentificationResult['aiDetection']> {
    // Check if server is available
    const serverAvailable = await this.checkServerAvailability();
    
    if (!serverAvailable) {
      throw new Error('Server not available. AI identification requires internet connection.');
    }

    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('image', imageFile);

      // Call AI API endpoint
      // NOTE: Replace with your actual API endpoint
      const response = await fetch('/api/pest-detection', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('AI detection failed');
      }

      const result = await response.json();

      // Parse AI response
      return {
        detectedPest: result.predicted_class as PestCategory,
        confidence: result.confidence,
        topPredictions: result.top_predictions?.map((p: any) => ({
          pest: p.class as PestCategory,
          confidence: p.confidence,
        })) || [],
        modelVersion: result.model_version || 'EfficientNetV2L',
      };
    } catch (error: any) {
      console.error('AI detection error:', error);
      throw new Error('Failed to identify pest with AI. Please try manual selection.');
    }
  }

  /**
   * Create identification result (manual or AI)
   */
  async createIdentification(params: {
    imageDataUrl?: string;
    imagePath?: string;
    aiDetection?: IdentificationResult['aiDetection'];
    manualSelection?: PestCategory;
    cropType?: string;
    location?: IdentificationResult['location'];
    farmerContact?: string;
    notes?: string;
  }): Promise<IdentificationResult> {
    const pestCategory = params.aiDetection?.detectedPest || params.manualSelection;
    
    if (!pestCategory) {
      throw new Error('No pest identified. Please select manually or use AI detection.');
    }

    const pestInfo = this.getPestInfo(pestCategory);
    const remedialMeasures = this.getRemedialMeasures(pestCategory);

    const result: IdentificationResult = {
      resultId: `PEST${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      imageDataUrl: params.imageDataUrl,
      imagePath: params.imagePath,
      aiDetection: params.aiDetection,
      manualSelection: params.manualSelection,
      pestInfo,
      remedialMeasures,
      cropType: params.cropType,
      location: params.location,
      farmerContact: params.farmerContact,
      notes: params.notes,
      identificationMethod: params.aiDetection ? 'AI' : 'Manual',
      serverAvailable: !!params.aiDetection,
    };

    // Save to history
    this.saveToHistory(result);

    return result;
  }

  /**
   * Get identification history
   */
  getIdentificationHistory(): IdentificationResult[] {
    const stored = localStorage.getItem(this.historyKey);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  /**
   * Get history statistics
   */
  getHistoryStatistics(): IdentificationHistory {
    const history = this.getIdentificationHistory();

    const stats: IdentificationHistory = {
      totalIdentifications: history.length,
      aiIdentifications: history.filter(h => h.identificationMethod === 'AI').length,
      manualIdentifications: history.filter(h => h.identificationMethod === 'Manual').length,
      pestDistribution: {} as any,
      cropImpact: {} as any,
      averageConfidence: 0,
    };

    let totalConfidence = 0;
    let confidenceCount = 0;

    history.forEach((h) => {
      // Pest distribution
      const pest = h.pestInfo.category;
      stats.pestDistribution[pest] = (stats.pestDistribution[pest] || 0) + 1;

      // Crop impact
      if (h.cropType) {
        stats.cropImpact[h.cropType] = (stats.cropImpact[h.cropType] || 0) + 1;
      }

      // Average confidence
      if (h.aiDetection) {
        totalConfidence += h.aiDetection.confidence;
        confidenceCount++;
      }
    });

    stats.averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

    return stats;
  }

  /**
   * Clear identification history
   */
  clearHistory(): void {
    localStorage.removeItem(this.historyKey);
  }

  /**
   * Check server availability
   */
  private async checkServerAvailability(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', { method: 'HEAD', signal: AbortSignal.timeout(3000) });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Save identification to history
   */
  private saveToHistory(result: IdentificationResult): void {
    const history = this.getIdentificationHistory();
    history.unshift(result); // Add to beginning
    
    // Keep last 100 records
    if (history.length > 100) {
      history.pop();
    }

    localStorage.setItem(this.historyKey, JSON.stringify(history));
  }
}

// ============================================================
// EXPORT SINGLETON
// ============================================================

export const pestIdentificationService = new PestIdentificationService();
