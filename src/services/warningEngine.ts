import { DetectedItem, SpatialPosition } from '../types';
import { WarningPriority } from './speechService';

export interface GeneratedWarning {
  text: string;
  priority: WarningPriority;
  targetObject: string;
  position: SpatialPosition;
  isClose: boolean;
}

/**
 * Evaluates the current frame detections and determines the most critical warning
 * for a visually impaired user based on spatial orientation and proximity.
 */
export function evaluateDetectionsForVoiceWarning(
  detections: DetectedItem[]
): GeneratedWarning | null {
  if (!detections || detections.length === 0) {
    return null;
  }

  // 1. High Priority: Any object that is very close (large approximate bounding area)
  const veryCloseObstacle = detections.find((item) => item.proximity === 'Close');
  if (veryCloseObstacle) {
    return {
      text: 'Obstacle very close.',
      priority: 'high',
      targetObject: veryCloseObstacle.label,
      position: veryCloseObstacle.position,
      isClose: true,
    };
  }

  // 2. Check for Person in field of view (Persons are primary safety/social awareness targets)
  // Priority: Center/Ahead > Left > Right
  const persons = detections.filter((d) => d.label.toLowerCase() === 'person');
  if (persons.length > 0) {
    const centerPerson = persons.find((p) => p.position === 'Center');
    if (centerPerson) {
      return {
        text: 'Person ahead.',
        priority: 'normal',
        targetObject: 'Person',
        position: 'Center',
        isClose: false,
      };
    }

    const leftPerson = persons.find((p) => p.position === 'Left');
    if (leftPerson) {
      return {
        text: 'Person on the left.',
        priority: 'normal',
        targetObject: 'Person',
        position: 'Left',
        isClose: false,
      };
    }

    const rightPerson = persons.find((p) => p.position === 'Right');
    if (rightPerson) {
      return {
        text: 'Person on the right.',
        priority: 'normal',
        targetObject: 'Person',
        position: 'Right',
        isClose: false,
      };
    }
  }

  // 3. Check for other potential obstacles (furniture, objects, vehicles, items)
  // Sort by visual area / significance
  const obstacles = detections
    .filter((d) => d.label.toLowerCase() !== 'person')
    .sort((a, b) => b.relativeArea - a.relativeArea);

  if (obstacles.length > 0) {
    const primaryObstacle = obstacles[0];

    if (primaryObstacle.position === 'Center') {
      return {
        text: 'Obstacle ahead.',
        priority: 'normal',
        targetObject: primaryObstacle.label,
        position: 'Center',
        isClose: false,
      };
    } else if (primaryObstacle.position === 'Left') {
      return {
        text: 'Obstacle on the left.',
        priority: 'normal',
        targetObject: primaryObstacle.label,
        position: 'Left',
        isClose: false,
      };
    } else if (primaryObstacle.position === 'Right') {
      return {
        text: 'Obstacle on the right.',
        priority: 'normal',
        targetObject: primaryObstacle.label,
        position: 'Right',
        isClose: false,
      };
    }
  }

  return null;
}
