import { z } from 'zod';

// Load validation schema
export const loadSchema = z.object({
  load_provider_id: z.string().uuid({ message: "Invalid provider" }),
  loading_location: z.string().trim().min(1, { message: "Loading location is required" }).max(200, { message: "Loading location too long" }),
  unloading_location: z.string().trim().min(1, { message: "Unloading location is required" }).max(200, { message: "Unloading location too long" }),
  material_description: z.string().trim().min(1, { message: "Material description is required" }).max(500, { message: "Material description too long" }),
  material_weight: z.number().positive({ message: "Weight must be positive" }).max(100, { message: "Weight exceeds maximum (100 tons)" }),
  freight_amount: z.number().positive({ message: "Freight amount must be positive" }).max(10000000, { message: "Freight amount exceeds maximum" }),
  truck_freight_amount: z.number().positive({ message: "Truck freight must be positive" }).max(10000000, { message: "Truck freight exceeds maximum" }).nullable().optional(),
}).refine((data) => {
  if (data.truck_freight_amount && data.truck_freight_amount > data.freight_amount) {
    return false;
  }
  return true;
}, {
  message: "Truck freight cannot exceed provider freight",
  path: ["truck_freight_amount"],
});

// Transaction validation schema
export const transactionSchema = z.object({
  amount: z.number().positive({ message: "Amount must be positive" }).max(10000000, { message: "Amount exceeds maximum" }),
  payment_method: z.enum(['cash', 'upi', 'bank'], { errorMap: () => ({ message: "Invalid payment method" }) }),
  payment_details: z.string().max(500, { message: "Payment details too long" }).optional().nullable(),
  notes: z.string().max(1000, { message: "Notes too long" }).optional().nullable(),
  upi_id: z.string().max(100, { message: "UPI ID too long" }).optional().nullable(),
  bank_name: z.string().max(100, { message: "Bank name too long" }).optional().nullable(),
  account_number: z.string().max(50, { message: "Account number too long" }).optional().nullable(),
  ifsc_code: z.string().max(20, { message: "IFSC code too long" }).optional().nullable(),
  party_name: z.string().max(200, { message: "Party name too long" }).optional().nullable(),
}).refine((data) => {
  // Validate UPI ID format if method is UPI
  if (data.payment_method === 'upi' && data.upi_id) {
    return /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/.test(data.upi_id);
  }
  return true;
}, {
  message: "Invalid UPI ID format (should be username@bank)",
  path: ["upi_id"],
});

// Truck validation schema
export const truckSchema = z.object({
  truck_number: z.string().trim().min(1, { message: "Truck number is required" }).max(20, { message: "Truck number too long" }),
  truck_type: z.enum(['open', 'container'], { errorMap: () => ({ message: "Invalid truck type" }) }),
  driver_name: z.string().trim().min(1, { message: "Driver name is required" }).max(100, { message: "Driver name too long" }),
  driver_phone: z.string().regex(/^[0-9]{10}$/, { message: "Invalid phone number (10 digits required)" }),
  owner_name: z.string().trim().min(1, { message: "Owner name is required" }).max(100, { message: "Owner name too long" }),
  owner_phone: z.string().regex(/^[0-9]{10}$/, { message: "Invalid phone number (10 digits required)" }),
  contact_person: z.string().trim().max(100, { message: "Contact person name too long" }).optional().nullable(),
  contact_person_phone: z.string().regex(/^[0-9]{10}$/, { message: "Invalid phone number (10 digits required)" }).optional().nullable(),
  truck_length: z.number().positive({ message: "Truck length must be positive" }).max(100, { message: "Truck length exceeds maximum (100 feet)" }),
  carrying_capacity: z.number().positive({ message: "Carrying capacity must be positive" }).max(1000, { message: "Carrying capacity exceeds maximum (1000 tons)" }),
});

// Load provider validation schema
export const loadProviderSchema = z.object({
  company_name: z.string().trim().min(1, { message: "Company name is required" }).max(200, { message: "Company name too long" }),
  contact_person: z.string().trim().min(1, { message: "Contact person is required" }).max(100, { message: "Contact person name too long" }),
  contact_phone: z.string().regex(/^[0-9]{10}$/, { message: "Invalid phone number (10 digits required)" }),
  email: z.string().email({ message: "Invalid email address" }).max(255, { message: "Email too long" }).optional().nullable(),
  address: z.string().max(500, { message: "Address too long" }).optional().nullable(),
});
