export const LeadType = {
  BULK_ENQUIRY: "lead_bulk_enquiry",
  CONTACT_US: "lead_contact_us",
  FEEDBACK: "lead_feedback",
} as const;

export type LeadType = (typeof LeadType)[keyof typeof LeadType];
