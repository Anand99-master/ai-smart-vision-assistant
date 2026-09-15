import { DetectedItem, PathGuidanceResult } from '../types';
import { buildSceneUnderstanding, generateEnvironmentSummary, generateImportantSummary } from './environmentalIntelligenceEngine';

/**
 * Voice AI Assistant Context Engine
 * Answers visually impaired user's spoken queries based on live camera detections
 * and path navigation state.
 *
 * Safety Mandate:
 * Never state that an area is definitely safe. Always describe detected visual
 * context and advise cautious proceeding.
 */

function formatArticle(word: string): string {
  const firstLetter = word.trim().charAt(0).toLowerCase();
  return ['a', 'e', 'i', 'o', 'u'].includes(firstLetter) ? `an ${word}` : `a ${word}`;
}

export function answerVoiceQuery(
  rawQuery: string,
  detections: DetectedItem[],
  isCameraRunning: boolean,
  pathGuidance?: PathGuidanceResult | null,
  lastOcrResult?: { status: string; spokenText: string } | null,
  navigationInfo?: {
    isNavigating: boolean;
    destination: string | null;
    nextInstruction: string | null;
    totalDistanceMeters?: number;
  } | null
): string {
  if (!isCameraRunning) {
    return 'The camera is currently turned off. Please start the camera first.';
  }

  const query = rawQuery.toLowerCase().trim();

  // Re-build scene understanding for accurate summaries
  const people = detections.filter((d) => d.label.toLowerCase() === 'person');
  const trustedPeopleInView = people
    .map((p) => p.recognizedPerson)
    .filter((rp): rp is NonNullable<typeof rp> => !!rp && rp.isRegistered && !!rp.name);
    
  const scene = buildSceneUnderstanding(
    detections,
    trustedPeopleInView,
    navigationInfo?.isNavigating || false,
    null, // We don't have the full route here, just the instruction
    0
  );
  // Inject the string instruction into the scene object manually since we only have nextInstruction here
  if (navigationInfo?.isNavigating && navigationInfo.nextInstruction) {
    scene.relevantNavigation = navigationInfo.nextInstruction;
  }

  // PART 7: Full Environmental Intelligence Queries
  if (query.includes('what is important') || query.includes("what's important")) {
    return generateImportantSummary(scene);
  }

  if (
    query.includes('around me') ||
    query.includes('describe my surroundings') ||
    query.includes('describe surroundings') ||
    query.includes('describe the scene')
  ) {
    return generateEnvironmentSummary(scene);
  }

  // Query -1: Navigation specific queries
  if (
    query.includes('next instruction') ||
    query.includes('next turn') ||
    query.includes('where do i go') ||
    query.includes('which way')
  ) {
    if (navigationInfo && navigationInfo.isNavigating && navigationInfo.nextInstruction) {
      return navigationInfo.nextInstruction;
    }
    return 'Navigation is not currently active. Enter a destination to begin.';
  }

  if (query.includes('how far') || query.includes('distance to destination')) {
    if (navigationInfo && navigationInfo.isNavigating && navigationInfo.destination) {
      return `Destination is ${navigationInfo.destination}, approximately ${navigationInfo.totalDistanceMeters || 100} meters away.`;
    }
    return 'No active destination route.';
  }

  // Query 0: Text / Sign Reading via Voice Assistant
  if (
    query.includes('sign') ||
    query.includes('read text') ||
    query.includes('read the text') ||
    query.includes('what is written') ||
    query.includes('what does it say') ||
    query.includes('what text')
  ) {
    if (lastOcrResult && lastOcrResult.status === 'success') {
      return lastOcrResult.spokenText;
    }
    if (lastOcrResult && lastOcrResult.status === 'unclear') {
      return 'The text is unclear.';
    }
    return "I can't find readable text. Please hold the sign in front of the camera and tap Read Text.";
  }

  const centerItems = detections.filter((d) => d.position === 'Center');
  const leftItems = detections.filter((d) => d.position === 'Left');
  const rightItems = detections.filter((d) => d.position === 'Right');

  // Query 0.5: Who is here? / Who is in front of me? / Who do you see?
  if (
    query.includes('who is') ||
    query.includes('who do you see') ||
    query.includes('who are you seeing') ||
    query.includes('who is near') ||
    query.includes('who is here')
  ) {
    if (trustedPeopleInView.length > 0) {
      const descriptions = trustedPeopleInView.map((tp) => {
        if (tp.position === 'Center') return `${tp.name} is in front of you.`;
        return `${tp.name} is on your ${tp.position.toLowerCase()}.`;
      });
      return descriptions.join(' ');
    }
    if (people.length > 0) {
      const p = people[0];
      return `A person is detected on your ${p.position.toLowerCase()}. They are not a registered trusted person.`;
    }
    return 'No people are currently detected in view.';
  }

  // Check for specific named person queries (e.g., "Is Rahul here?", "Where is Sarah?")
  if (query.includes('is ') || query.includes('where is ')) {
    const matchedTrusted = trustedPeopleInView.find((tp) =>
      query.includes(tp.name!.toLowerCase())
    );
    if (matchedTrusted) {
      if (matchedTrusted.position === 'Center') {
        return `Yes, ${matchedTrusted.name} is in front of you.`;
      }
      return `Yes, ${matchedTrusted.name} is on your ${matchedTrusted.position.toLowerCase()}.`;
    }
  }

  // Query 1: "What is in front of me?" / "What's ahead?" / "What is ahead?" / "What's in front?"
  if (
    query.includes('in front') ||
    query.includes('ahead') ||
    query.includes('front of me') ||
    query.includes('center') ||
    query.includes('straight')
  ) {
    if (centerItems.length === 0) {
      return 'The center path appears clear of detected objects. Please proceed carefully.';
    }

    // Check if there is a person in center
    const centerPerson = centerItems.find((d) => d.label.toLowerCase() === 'person');
    if (centerPerson) {
      if (centerPerson.recognizedPerson?.isRegistered && centerPerson.recognizedPerson.name) {
        return `${centerPerson.recognizedPerson.name} is in front of you.`;
      }
      if (centerPerson.proximity === 'Close') {
        return 'There is a person very close in the center.';
      }
      return 'There is a person in the center.';
    }

    // Sort by largest/closest
    const primary = [...centerItems].sort((a, b) => b.relativeArea - a.relativeArea)[0];
    if (primary.proximity === 'Close') {
      return `There is ${formatArticle(primary.label)} very close in the center.`;
    }
    return `There is ${formatArticle(primary.label)} in the center.`;
  }

  // Query 2: "What is on my left?" / "What's on the left?" / "Left side"
  if (query.includes('left')) {
    if (leftItems.length === 0) {
      return 'No objects detected on your left. Please proceed carefully.';
    }
    const leftPerson = leftItems.find((d) => d.label.toLowerCase() === 'person');
    if (leftPerson) {
      if (leftPerson.recognizedPerson?.isRegistered && leftPerson.recognizedPerson.name) {
        return `${leftPerson.recognizedPerson.name} is on your left.`;
      }
      return 'There is a person on your left.';
    }
    const primary = [...leftItems].sort((a, b) => b.relativeArea - a.relativeArea)[0];
    return `There is ${formatArticle(primary.label)} on your left.`;
  }

  // Query 3: "What is on my right?" / "What's on the right?" / "Right side"
  if (query.includes('right')) {
    if (rightItems.length === 0) {
      return 'No objects detected on your right. Please proceed carefully.';
    }
    const rightPerson = rightItems.find((d) => d.label.toLowerCase() === 'person');
    if (rightPerson) {
      if (rightPerson.recognizedPerson?.isRegistered && rightPerson.recognizedPerson.name) {
        return `${rightPerson.recognizedPerson.name} is on your right.`;
      }
      return 'There is a person on your right.';
    }
    const primary = [...rightItems].sort((a, b) => b.relativeArea - a.relativeArea)[0];
    return `There is ${formatArticle(primary.label)} on your right.`;
  }

  // Query 4: "Is there a person nearby?" / "Anyone nearby?" / "Is someone there?"
  if (
    query.includes('person') ||
    query.includes('someone') ||
    query.includes('anyone') ||
    query.includes('human') ||
    query.includes('people')
  ) {
    if (people.length === 0) {
      return 'No person is currently detected nearby.';
    }
    if (people.length === 1) {
      const p = people[0];
      if (p.recognizedPerson?.isRegistered && p.recognizedPerson.name) {
        if (p.position === 'Center') {
          return `Yes, ${p.recognizedPerson.name} is in front of you.`;
        }
        return `Yes, ${p.recognizedPerson.name} is on your ${p.position.toLowerCase()}.`;
      }
      if (p.position === 'Center') {
        return p.proximity === 'Close'
          ? 'Yes, there is a person very close in front of you.'
          : 'Yes, there is a person in the center.';
      }
      return `Yes, there is a person on your ${p.position.toLowerCase()}.`;
    }
    return `Yes, ${people.length} people are detected nearby.`;
  }

  // Query 5: "Is the path blocked?" / "Can I walk?" / "Is the way clear?" / "Is path clear?"
  if (
    query.includes('path') ||
    query.includes('walk') ||
    query.includes('clear') ||
    query.includes('blocked') ||
    query.includes('move')
  ) {
    if (pathGuidance) {
      if (pathGuidance.status === 'PATH CLEAR') {
        return 'The center path appears clear of detected obstacles. Please proceed carefully.';
      }
      if (pathGuidance.status === 'MOVE LEFT') {
        return 'The center path is blocked. The left path appears less obstructed.';
      }
      if (pathGuidance.status === 'MOVE RIGHT') {
        return 'The center path is blocked. The right path appears less obstructed.';
      }
      if (pathGuidance.status === 'STOP') {
        return 'The path is blocked in all directions. Stop.';
      }
      return 'Please proceed carefully. Obstacles detected nearby.';
    }

    if (centerItems.length > 0) {
      return 'The center path appears blocked. Please proceed carefully.';
    }
    return 'The center path appears clear of detected obstacles. Please proceed carefully.';
  }

  // Query 6: "What is the obstacle?" / "What's blocking me?" / "What obstacle?"
  if (
    query.includes('obstacle') ||
    query.includes('blocking') ||
    query.includes('barrier') ||
    query.includes('blockage')
  ) {
    // Find closest obstacle in center or overall
    const closeItems = [...detections].sort((a, b) => b.relativeArea - a.relativeArea);
    if (closeItems.length === 0) {
      return 'No obstacles are currently detected. Please proceed carefully.';
    }
    const centerObstacle = centerItems.sort((a, b) => b.relativeArea - a.relativeArea)[0];
    if (centerObstacle) {
      return `The obstacle in front of you is ${formatArticle(centerObstacle.label)}.`;
    }
    const closest = closeItems[0];
    return `The closest obstacle is ${formatArticle(closest.label)} on your ${closest.position.toLowerCase()}.`;
  }

  // Query 7: "What objects are around me?" / "What is around me?" / "Describe scene" / "What do you see?"
  if (
    query.includes('around me') ||
    query.includes('objects') ||
    query.includes('what do you see') ||
    query.includes('describe') ||
    query.includes('surroundings')
  ) {
    if (detections.length === 0) {
      return 'No objects are currently detected. Please proceed carefully.';
    }

    // Build concise, scannable response (max 3 items)
    const sorted = [...detections].sort((a, b) => b.relativeArea - a.relativeArea);
    const summaryParts: string[] = [];

    for (const item of sorted.slice(0, 3)) {
      summaryParts.push(`${item.label} on the ${item.position.toLowerCase()}`);
    }

    if (summaryParts.length === 1) {
      return `Detected: ${summaryParts[0]}.`;
    }
    return `Detected: ${summaryParts.join(', and ')}.`;
  }

  // Requirement 10: If the system cannot confidently determine something
  return "I'm not sure. Please proceed carefully.";
}
