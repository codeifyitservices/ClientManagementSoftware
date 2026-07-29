import { z } from "zod";

export const clientSchema = z.object({
  companyName: z.string().min(2, "Company name is required."),
  clientName: z.string().min(2, "Client name is required."),
  email: z.string().trim().optional().or(z.literal("")).refine((val) => !val || z.string().email().safeParse(val).success, "Please enter a valid email address."),
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
  isForeign: z.boolean().default(false),
}).refine((data) => {
  if (data.isForeign) {
    return true; // No GST needed for foreign clients
  }
  if (data.gstRegistered) {
    return !!data.gstNumber && data.gstNumber.trim().length === 15;
  }
  return true;
}, {
  message: "GSTIN is required and must be exactly 15 alphanumeric characters.",
  path: ["gstNumber"],
});
