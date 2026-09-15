import { DetectedItem, PathGuidanceResult, ZoneAnalysis } from '../types';

/**
 * Intelligent Path Guidance Engine
 * Analyzes visual field across Left, Center, and Right navigation zones
 * to suggest navigational direction: PATH CLEAR, MOVE LEFT, MOVE RIGHT, or STOP.
 */

function analyzeZone(items: DetectedItem[]): ZoneAnalysis {
  let obstructionScore = 0;
  let hasPerson = false;
  let hasCloseObstacle = false;

  for (const item of items) {
    if (item.label.toLowerCase() === 'person') {
      hasPerson = true;
      obstructionScore += 35;
    }

    if (item.proximity === 'Close') {
      hasCloseObstacle = true;
      obstructionScore += 45;
    } else if (item.proximity === 'Medium') {
      obstructionScore += 20;
    } else {
      obstructionScore += 10;
    }

    obstructionScore += Math.min(30, item.relativeArea * 1.2);
  }

  // A zone is obstructed if score >= 20, or contains a person, or has a close object
  const isObstructed = obstructionScore >= 20 || hasPerson || hasCloseObstacle;

  return {
    isObstructed,
    obstructionScore: Math.round(obstructionScore),
    items,
    hasPerson,
    hasCloseObstacle,
  };
}

export function evaluatePathGuidance(detections: DetectedItem[]): PathGuidanceResult {
  // Separate detections by zone
  const leftItems = detections.filter((d) => d.position === 'Left');
  const centerItems = detections.filter((d) => d.position === 'Center');
  const rightItems = detections.filter((d) => d.position === 'Right');

  const leftZone = analyzeZone(leftItems);
  const centerZone = analyzeZone(centerItems);
  const rightZone = analyzeZone(rightItems);

  // Condition 1: If CENTER path is clear
  if (!centerZone.isObstructed) {
    return {
      status: 'PATH CLEAR',
      voiceText: 'Path clear.',
      recommendedZone: 'Center',
      leftZone,
      centerZone,
      rightZone,
      uncertain: false,
      reason: 'No detected obstacles in the forward path.',
    };
  }

  // Condition 2: CENTER path is blocked.
  // Evaluate LEFT vs RIGHT zones to find the less obstructed path.

  const leftObstructed = leftZone.isObstructed;
  const rightObstructed = rightZone.isObstructed;

  // If both sides appear heavily obstructed
  if (leftObstructed && rightObstructed) {
    // Both sides have significant obstacles or people
    return {
      status: 'STOP',
      voiceText: 'Path blocked. Stop.',
      recommendedZone: 'None',
      leftZone,
      centerZone,
      rightZone,
      uncertain: false,
      reason: 'Center, left, and right zones all show detected obstacles.',
    };
  }

  // If left is clear while right is obstructed
  if (!leftObstructed && rightObstructed) {
    return {
      status: 'MOVE LEFT',
      voiceText: 'Path blocked. Move left.',
      recommendedZone: 'Left',
      leftZone,
      centerZone,
      rightZone,
      uncertain: false,
      reason: 'Center is blocked, but the left path appears less obstructed.',
    };
  }

  // If right is clear while left is obstructed
  if (leftObstructed && !rightObstructed) {
    return {
      status: 'MOVE RIGHT',
      voiceText: 'Path blocked. Move right.',
      recommendedZone: 'Right',
      leftZone,
      centerZone,
      rightZone,
      uncertain: false,
      reason: 'Center is blocked, but the right path appears less obstructed.',
    };
  }

  // Both left and right appear relatively clear, compare quantitative scores
  const scoreDiff = Math.abs(leftZone.obstructionScore - rightZone.obstructionScore);

  // If there's an ambiguity or close score difference with complex clutter
  if (scoreDiff < 5 && (leftItems.length > 1 || rightItems.length > 1)) {
    return {
      status: 'PROCEED CAREFULLY',
      voiceText: 'Please proceed carefully.',
      recommendedZone: 'Center',
      leftZone,
      centerZone,
      rightZone,
      uncertain: true,
      reason: 'Obstacles detected with similar density on both sides.',
    };
  }

  if (leftZone.obstructionScore <= rightZone.obstructionScore) {
    return {
      status: 'MOVE LEFT',
      voiceText: 'Path blocked. Move left.',
      recommendedZone: 'Left',
      leftZone,
      centerZone,
      rightZone,
      uncertain: false,
      reason: 'Left zone shows lower estimated obstruction than right zone.',
    };
  } else {
    return {
      status: 'MOVE RIGHT',
      voiceText: 'Path blocked. Move right.',
      recommendedZone: 'Right',
      leftZone,
      centerZone,
      rightZone,
      uncertain: false,
      reason: 'Right zone shows lower estimated obstruction than left zone.',
    };
  }
}
