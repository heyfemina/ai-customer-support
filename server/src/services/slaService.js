const priorityMinutes = {
  URGENT: 15,
  HIGH: 60,
  MEDIUM: 240,
  LOW: 1440,
};

export function minutesBetween(start, end = new Date()) {
  if (!start || !end) return null;
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

export function slaLimitMinutes(priority = "MEDIUM") {
  return priorityMinutes[priority] || priorityMinutes.MEDIUM;
}

export function calculateFirstResponse(ticket, responseAt = new Date()) {
  const firstResponseMinutes = minutesBetween(ticket.createdAt, responseAt);
  return {
    firstResponseAt: responseAt,
    firstResponseMinutes,
    slaBreached: firstResponseMinutes > slaLimitMinutes(ticket.priority),
  };
}

export function calculateResolution(ticket, resolvedAt = new Date()) {
  return {
    resolvedAt,
    resolutionMinutes: minutesBetween(ticket.createdAt, resolvedAt),
  };
}
