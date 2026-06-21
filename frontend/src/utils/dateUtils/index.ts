import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

export const formatDate = (value?: string | Date | null, pattern = "dd MMM yyyy") => {
  if (!value) return "Not set";
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, pattern);
};

export const formatDateTime = (value?: string | Date | null) =>
  formatDate(value, "dd MMM yyyy, h:mm a");

export const timeAgo = (value?: string | Date | null) => {
  if (!value) return "Not available";
  const date = typeof value === "string" ? parseISO(value) : value;
  return `${formatDistanceToNowStrict(date)} ago`;
};
