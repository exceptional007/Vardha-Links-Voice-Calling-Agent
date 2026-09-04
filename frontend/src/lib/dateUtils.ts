export function formatISTDate(timestamp: string | number | null | undefined): string {
  if (!timestamp) return "N/A";

  try {
    let dateInput: string | number = timestamp;

    if (typeof timestamp === "string") {
      const trimmed = timestamp.trim();
      // If naive timestamp (lacks 'Z' or timezone offset +/-HH:MM)
      if (!trimmed.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(trimmed)) {
        dateInput = trimmed.replace(" ", "T") + "Z";
      } else {
        dateInput = trimmed;
      }
    }

    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "Invalid Date";

    const formatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return `${formatter.format(date)} IST`;
  } catch (error) {
    console.error("Error formatting IST date:", error);
    return String(timestamp);
  }
}
