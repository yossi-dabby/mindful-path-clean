export function getJourneyProgressPercentage(progress, journeyStepCount = 0) {
  const completedSteps = Array.isArray(progress?.completed_steps)
    ? progress.completed_steps
    : [];
  const uniqueCompletedSteps = new Set(
    completedSteps
      .map((step) => Number(step?.step_index))
      .filter((stepIndex) => Number.isInteger(stepIndex) && stepIndex >= 0)
  );
  const savedTotal = Number(progress?.total_steps);
  const fallbackTotal = Number(journeyStepCount);
  const totalSteps = savedTotal > 0 ? savedTotal : (fallbackTotal > 0 ? fallbackTotal : 0);

  if (totalSteps === 0) return 0;

  return Math.min(100, Math.max(0, Math.round((uniqueCompletedSteps.size / totalSteps) * 100)));
}

function progressTimestamp(progress) {
  const value = progress?.updated_date || progress?.created_date || progress?.started_date;
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function buildJourneyProgressMap(progressList = []) {
  return progressList.reduce((map, progress) => {
    if (!progress?.journey_id) return map;

    const existing = map[progress.journey_id];
    if (!existing || progressTimestamp(progress) >= progressTimestamp(existing)) {
      map[progress.journey_id] = progress;
    }

    return map;
  }, {});
}

export function groupJourneysByProgress(journeys = [], progressList = []) {
  const progressMap = buildJourneyProgressMap(progressList);
  const available = [];
  const inProgress = [];
  const completed = [];

  journeys.forEach((journey) => {
    const progress = progressMap[journey.id];

    if (!progress) {
      available.push(journey);
    } else if (progress.status === 'completed') {
      completed.push(journey);
    } else {
      inProgress.push(journey);
    }
  });

  return { available, inProgress, completed, progressMap };
}
