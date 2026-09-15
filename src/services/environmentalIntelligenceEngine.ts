import { DetectedItem, PathGuidanceResult, RecognizedPerson, NavigationRoute, SmartAlert } from '../types';

export interface SceneUnderstanding {
  immediateObstacles: DetectedItem[];
  blockingPersons: DetectedItem[];
  relevantNavigation: string | null;
  nearbyTrustedPersons: RecognizedPerson[];
  importantEnvironment: DetectedItem[];
  generalObjects: DetectedItem[];
}

// A simple global state for cooldowns to avoid spam
const cooldowns = new Map<string, number>();

function checkCooldown(key: string, now: number, cooldownMs: number): boolean {
  const lastTime = cooldowns.get(key) || 0;
  if (now - lastTime > cooldownMs) {
    cooldowns.set(key, now);
    return true;
  }
  return false;
}

export function clearCooldowns() {
  cooldowns.clear();
}

export function buildSceneUnderstanding(
  detections: DetectedItem[],
  activeRecognizedPeople: RecognizedPerson[],
  isNavigating: boolean,
  navigationRoute: NavigationRoute | null,
  currentStepIndex: number
): SceneUnderstanding {
  const immediateObstacles: DetectedItem[] = [];
  const blockingPersons: DetectedItem[] = [];
  let relevantNavigation: string | null = null;
  const nearbyTrustedPersons: RecognizedPerson[] = [];
  const importantEnvironment: DetectedItem[] = [];
  const generalObjects: DetectedItem[] = [];

  // Navigation
  if (isNavigating && navigationRoute && navigationRoute.steps[currentStepIndex]) {
    relevantNavigation = navigationRoute.steps[currentStepIndex].instruction;
  }

  // Trusted Persons
  for (const person of activeRecognizedPeople) {
    if (person.isRegistered && person.name) {
      nearbyTrustedPersons.push(person);
    }
  }

  for (const item of detections) {
    const isPerson = item.label.toLowerCase() === 'person';
    const isCenter = item.position === 'Center';
    const isClose = item.proximity === 'Close';

    // Priority 1: Immediate obstacle (Close or blocking center)
    // Avoid double counting persons if they are handled in priority 2
    if (!isPerson && (isClose || isCenter)) {
      immediateObstacles.push(item);
    }
    // Priority 2: Person blocking apparent path (Center & Close/Medium)
    else if (isPerson && isCenter && (isClose || item.proximity === 'Medium')) {
      blockingPersons.push(item);
    }
    // Priority 5: Important environmental info (e.g. doors, stairs, chairs nearby but not blocking)
    else if (['person', 'door', 'stairs', 'chair', 'bench', 'table', 'car', 'vehicle'].includes(item.label.toLowerCase()) && item.proximity !== 'Far') {
      importantEnvironment.push(item);
    }
    // Priority 6: General objects
    else if (!isPerson) {
      generalObjects.push(item);
    }
  }

  return {
    immediateObstacles: immediateObstacles.sort((a, b) => b.relativeArea - a.relativeArea),
    blockingPersons: blockingPersons.sort((a, b) => b.relativeArea - a.relativeArea),
    relevantNavigation,
    nearbyTrustedPersons,
    importantEnvironment: importantEnvironment.sort((a, b) => b.relativeArea - a.relativeArea),
    generalObjects: generalObjects.sort((a, b) => b.relativeArea - a.relativeArea),
  };
}

export function determineProactiveAnnouncement(
  scene: SceneUnderstanding,
  pathGuidance: PathGuidanceResult | null,
  now: number
): SmartAlert | null {
  const hasObstacles = scene.immediateObstacles.length > 0;
  const hasPersons = scene.blockingPersons.length > 0;
  
  let moveCommand = '';
  if (pathGuidance?.status === 'STOP') moveCommand = 'Stop.';
  else if (pathGuidance?.status === 'MOVE LEFT') moveCommand = 'Move left.';
  else if (pathGuidance?.status === 'MOVE RIGHT') moveCommand = 'Move right.';

  // Priority 1 & 2 Combined (Obstacles & Immediate Movement)
  if (hasObstacles || hasPersons || moveCommand === 'Stop.') {
    const entities = [];
    if (hasObstacles) entities.push('obstacle');
    if (hasPersons) entities.push('person');
    
    let text = '';
    if (entities.length > 0) {
      text = `${entities.join(' and ')} ahead.`;
    } else {
      text = 'Obstacle very close.';
    }

    if (moveCommand) {
      text += ` ${moveCommand}`;
    }

    if (checkCooldown('p1_p2_critical', now, 5000)) {
      return {
        id: `alert-p1-${now}`,
        text: text.trim(),
        priorityLevel: 1,
        category: 'CRITICAL',
        timestamp: now
      };
    }
    // If we have an obstacle but it's on cooldown, we should suppress lower priorities to prevent them from speaking over the cooldown
    return null; 
  }

  // Priority 2 standalone: Just movement (if not caught by P1)
  if (moveCommand && checkCooldown('p2_movement', now, 5000)) {
    return {
      id: `alert-p2-${now}`,
      text: moveCommand,
      priorityLevel: 2,
      category: 'CRITICAL',
      timestamp: now
    };
  }

  // Priority 3: Navigation
  if (scene.relevantNavigation && checkCooldown(`p3_nav_${scene.relevantNavigation}`, now, 10000)) {
    return {
      id: `alert-p3-${now}`,
      text: scene.relevantNavigation,
      priorityLevel: 3,
      category: 'HIGH',
      timestamp: now
    };
  }

  // Priority 4: Trusted Person
  if (scene.nearbyTrustedPersons.length > 0) {
    const tp = scene.nearbyTrustedPersons[0];
    if (checkCooldown(`p4_tp_${tp.name}`, now, 15000)) {
      const posStr = tp.position === 'Center' ? 'in front of you' : `on your ${tp.position.toLowerCase()}`;
      return {
        id: `alert-p4-${now}`,
        text: `${tp.name} is ${posStr}.`,
        priorityLevel: 4,
        category: 'NORMAL',
        timestamp: now
      };
    }
  }

  // Priority 5: Important Environment
  if (scene.importantEnvironment.length > 0) {
    const item = scene.importantEnvironment[0];
    if (checkCooldown(`p5_env_${item.label}_${item.position}`, now, 20000)) {
      const posStr = item.position === 'Center' ? 'ahead' : `on your ${item.position.toLowerCase()}`;
      return {
        id: `alert-p5-${now}`,
        text: `${item.label} ${posStr}.`,
        priorityLevel: 5,
        category: 'INFORMATION',
        timestamp: now
      };
    }
  }

  // Priority 6: General Information
  if (scene.generalObjects.length > 0) {
    const item = scene.generalObjects[0];
    if (checkCooldown(`p6_gen_${item.label}_${item.position}`, now, 25000)) {
      const posStr = item.position === 'Center' ? 'ahead' : `on your ${item.position.toLowerCase()}`;
      return {
        id: `alert-p6-${now}`,
        text: `${item.label} ${posStr}.`,
        priorityLevel: 6,
        category: 'INFORMATION',
        timestamp: now
      };
    }
  }

  return null;
}

export function generateEnvironmentSummary(scene: SceneUnderstanding): string {
  const parts: string[] = [];

  if (scene.immediateObstacles.length > 0 || scene.blockingPersons.length > 0) {
    parts.push('There is an obstacle in your path');
  }

  if (scene.nearbyTrustedPersons.length > 0) {
    const names = scene.nearbyTrustedPersons.map(p => p.name).join(' and ');
    parts.push(`${names} is nearby`);
  } else if (scene.blockingPersons.length > 0 || scene.importantEnvironment.some(i => i.label.toLowerCase() === 'person')) {
    parts.push('there is a person nearby');
  }

  const notableObjects = scene.importantEnvironment.filter(i => i.label.toLowerCase() !== 'person').slice(0, 2);
  if (notableObjects.length > 0) {
    const objDescs = notableObjects.map(o => `a ${o.label.toLowerCase()} on your ${o.position.toLowerCase()}`);
    parts.push(objDescs.join(' and '));
  }

  if (parts.length === 0) {
    if (scene.generalObjects.length > 0) {
      return `Detected a ${scene.generalObjects[0].label.toLowerCase()}.`;
    }
    return "I'm not sure. Please proceed carefully.";
  }

  // Capitalize first letter
  const summary = parts.join(', ') + '.';
  return summary.charAt(0).toUpperCase() + summary.slice(1);
}

export function generateImportantSummary(scene: SceneUnderstanding): string {
  if (scene.immediateObstacles.length > 0 || scene.blockingPersons.length > 0) {
    const obstacle = scene.immediateObstacles[0] || scene.blockingPersons[0];
    return `Caution: The path is blocked by a ${obstacle.label.toLowerCase()} in front of you.`;
  }
  
  if (scene.nearbyTrustedPersons.length > 0) {
    return `${scene.nearbyTrustedPersons[0].name} is near you.`;
  }

  if (scene.relevantNavigation) {
    return `Navigation: ${scene.relevantNavigation}`;
  }

  return "No immediate hazards detected, but please proceed carefully.";
}
