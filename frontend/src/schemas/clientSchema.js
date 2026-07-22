import { z } from "zod";

export const clientSchema = z.object({
  companyName: z.string().min(2, "Client name is required."),
  clientName: z.string().min(2, "Contact person is required."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().min(8, "Phone number is required."),
  gstRegistered: z.boolean().default(true),
  gstNumber: z.string().trim().optional().or(z.literal("")),
  address: z.string().min(5, "Billing address is required."),
  city: z.string().min(2, "City is required."),
  pincode: z.string().min(5, "Pincode is required."),
  status: z.enum(["Active", "Inactive"]).default("Active"),
  website: z.string().trim().optional().or(z.literal("")),
  industry: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
}).refine((data) => {
  if (data.gstRegistered) {
    return !!data.gstNumber && data.gstNumber.trim().length === 15;
  }
  return true;
}, {
  message: "GSTIN is required and must be exactly 15 alphanumeric characters.",
  path: ["gstNumber"],
});
