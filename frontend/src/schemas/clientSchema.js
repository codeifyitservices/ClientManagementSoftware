import { z } from "zod";

export const clientSchema = z
  .object({
    companyName: z.string().min(2, "Company name is required."),
    clientName: z.string().min(2, "Client name is required."),
    email: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine(
        (val) => !val || z.string().email().safeParse(val).success,
        "Please enter a valid email address."
      ),
    phone: z.string().trim().optional().or(z.literal("")),
    gstRegistered: z.boolean().default(true),
    gstNumber: z.string().trim().optional().or(z.literal("")),
    address: z.string().trim().optional().or(z.literal("")),
    city: z.string().trim().optional().or(z.literal("")),
    pincode: z.string().trim().optional().or(z.literal("")),
    status: z.enum(["Active", "Inactive"]).default("Active"),
    website: z.string().trim().optional().or(z.literal("")),
    industry: z.string().trim().optional().or(z.literal("")),
    notes: z.string().trim().optional().or(z.literal("")),
    isForeign: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (!data.isForeign) {
      if (!data.phone || data.phone.trim().length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Phone number is required (min 8 characters).",
          path: ["phone"],
        });
      }
      if (!data.address || data.address.trim().length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Billing address is required.",
          path: ["address"],
        });
      }
      if (!data.city || data.city.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "City is required.",
          path: ["city"],
        });
      }
      if (!data.pincode || data.pincode.trim().length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pincode is required (min 5 characters).",
          path: ["pincode"],
        });
      }
      if (data.gstRegistered) {
        if (!data.gstNumber || data.gstNumber.trim().length !== 15) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "GSTIN is required and must be exactly 15 alphanumeric characters.",
            path: ["gstNumber"],
          });
        }
      }
    }
  });

