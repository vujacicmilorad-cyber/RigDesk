export type AppRole = "owner" | "sales" | "mechanic" | "office";

export type TruckType = "sleeper" | "day_cab" | "box_truck" | "trailer";

export type TruckStatus =
  | "incoming"
  | "in_prep"
  | "available"
  | "on_hold"
  | "sold"
  | "delivered";

export type TruckSource =
  | "auction"
  | "fleet"
  | "trade_in"
  | "consignment"
  | "private";

export type PhotoSlot =
  | "front"
  | "driver_side"
  | "passenger_side"
  | "rear"
  | "cab_interior"
  | "sleeper"
  | "dash"
  | "engine"
  | "tires"
  | "fifth_wheel";

export type PrepStepKind =
  | "mechanical_inspection"
  | "service_records"
  | "dot_inspection"
  | "detailing"
  | "clean_title";

export type DocumentType =
  | "inspection_report"
  | "spec_sheet"
  | "dot_certificate"
  | "title"
  | "deposit_receipt"
  | "buyer_order"
  | "bill_of_sale"
  | "odometer_statement"
  | "delivery_checklist";

export type DocumentStatus =
  | "not_yet"
  | "waiting_for_signature"
  | "signed"
  | "in_hand";

export type CustomerType = "owner_operator" | "fleet";

export type LeadSource =
  | "website"
  | "phone"
  | "walk_in"
  | "truck_paper"
  | "instagram"
  | "tiktok"
  | "referral";

export type LeadStatus = "new" | "contacted" | "viewing" | "won" | "lost";

export type DealStage =
  | "inquiry"
  | "viewing"
  | "credit_app"
  | "deposit"
  | "sold";

export type LenderStatus = "reviewing" | "approved" | "declined";

export type Profile = {
  id: string;
  created_at: string;
  created_by: string | null;
  name: string;
  role: AppRole;
  active: boolean;
};

export type Truck = {
  id: string;
  created_at: string;
  created_by: string | null;
  stock_no: number;
  vin: string;
  year: number;
  make: string;
  model: string;
  type: TruckType;
  miles: number;
  engine: string | null;
  hp: number | null;
  transmission: string | null;
  ratio: string | null;
  axles: number | null;
  apu: boolean;
  color: string | null;
  lot_location: string | null;
  status: TruckStatus;
  purchase_price: number | string | null;
  purchase_date: string | null;
  source: TruckSource | null;
  asking_price: number | string | null;
  min_price: number | string | null;
  sales_rep_id: string | null;
  notes: string | null;
  hold_expires_at: string | null;
  available_at?: string | null;
};

export type TruckPhoto = {
  id: string;
  created_at: string;
  created_by: string | null;
  truck_id: string;
  slot: PhotoSlot;
  file_path: string;
  sort: number;
};

export type PrepStep = {
  id: string;
  created_at: string;
  created_by: string | null;
  truck_id: string;
  step: PrepStepKind;
  assigned_role: AppRole;
  done: boolean;
  done_by: string | null;
  done_at: string | null;
  photo_path: string | null;
};

export type Cost = {
  id: string;
  created_at: string;
  created_by: string | null;
  truck_id: string | null;
  category: string;
  vendor: string | null;
  amount: number | string | null;
  date: string;
  receipt_path: string | null;
};

export type DocumentRow = {
  id: string;
  created_at: string;
  created_by: string | null;
  truck_id: string | null;
  deal_id: string | null;
  type: DocumentType;
  status: DocumentStatus;
  file_path: string | null;
};

export type ActivityLog = {
  id: string;
  created_at: string;
  created_by: string | null;
  user_id: string;
  truck_id: string | null;
  action: string;
  profiles?: Pick<Profile, "name" | "role"> | null;
};

export type Customer = {
  id: string;
  created_at: string;
  created_by: string | null;
  name: string;
  type: CustomerType;
  fleet_size: number | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  dot_number: string | null;
  looking_for: string | null;
  sales_rep_id: string | null;
};

export type Lead = {
  id: string;
  created_at: string;
  created_by: string | null;
  customer_id: string;
  truck_id: string | null;
  source: LeadSource;
  status: LeadStatus;
  lost_reason: string | null;
  sales_rep_id: string | null;
  customers?: Pick<Customer, "name" | "type" | "fleet_size"> | null;
  trucks?: Pick<Truck, "stock_no" | "year" | "make" | "model"> | null;
  profiles?: Pick<Profile, "name"> | null;
};

export type Deal = {
  id: string;
  created_at: string;
  created_by: string | null;
  customer_id: string;
  truck_id: string;
  sales_rep_id: string | null;
  stage: DealStage;
  price: number | string;
  warranty_price: number | string;
  down_payment: number | string;
  deposit_amount: number | string | null;
  deposit_expires_at: string | null;
  sold_at: string | null;
  notes: string | null;
  customers?: Pick<Customer, "name" | "type"> | null;
  trucks?: Pick<
    Truck,
    | "stock_no"
    | "year"
    | "make"
    | "model"
    | "asking_price"
    | "purchase_price"
    | "status"
    | "min_price"
  > | null;
  profiles?: Pick<Profile, "name"> | null;
  lender_applications?: LenderApplication[];
};

export type LenderApplication = {
  id: string;
  created_at: string;
  created_by: string | null;
  deal_id: string;
  lender_name: string;
  status: LenderStatus;
};

export type PriceChange = {
  id: string;
  created_at: string;
  created_by: string | null;
  truck_id: string;
  old_price: number | string;
  new_price: number | string;
};

export const TRUCK_STATUS_LABEL: Record<TruckStatus, string> = {
  incoming: "Incoming",
  in_prep: "In prep",
  available: "Available",
  on_hold: "On hold",
  sold: "Sold",
  delivered: "Delivered",
};

export const PHOTO_SLOTS: { slot: PhotoSlot; label: string; sort: number }[] = [
  { slot: "front", label: "Front", sort: 1 },
  { slot: "driver_side", label: "Driver side", sort: 2 },
  { slot: "passenger_side", label: "Passenger side", sort: 3 },
  { slot: "rear", label: "Rear", sort: 4 },
  { slot: "cab_interior", label: "Cab interior", sort: 5 },
  { slot: "sleeper", label: "Sleeper", sort: 6 },
  { slot: "dash", label: "Dash and odometer", sort: 7 },
  { slot: "engine", label: "Engine", sort: 8 },
  { slot: "tires", label: "Tires", sort: 9 },
  { slot: "fifth_wheel", label: "Fifth wheel", sort: 10 },
];

export const PREP_STEP_LABEL: Record<PrepStepKind, string> = {
  mechanical_inspection: "Mechanical inspection",
  service_records: "Service records verified",
  dot_inspection: "DOT inspection",
  detailing: "Detailing, inside and out",
  clean_title: "Clean title in hand",
};

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  inspection_report: "Inspection report",
  spec_sheet: "Spec sheet",
  dot_certificate: "DOT certificate",
  title: "Title",
  deposit_receipt: "Deposit receipt",
  buyer_order: "Buyer order",
  bill_of_sale: "Bill of sale",
  odometer_statement: "Odometer statement",
  delivery_checklist: "Delivery checklist",
};

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  not_yet: "Not yet",
  waiting_for_signature: "Waiting for signature",
  signed: "Signed",
  in_hand: "In hand",
};

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  viewing: "Viewing",
  won: "Won",
  lost: "Lost",
};

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "new",
  "contacted",
  "viewing",
  "won",
  "lost",
];

export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = {
  website: "Website",
  phone: "Phone",
  walk_in: "Walk-in",
  truck_paper: "Truck Paper",
  instagram: "Instagram",
  tiktok: "TikTok",
  referral: "Referral",
};

export const DEAL_STAGE_LABEL: Record<DealStage, string> = {
  inquiry: "Inquiry",
  viewing: "Viewing",
  credit_app: "Credit app",
  deposit: "Deposit",
  sold: "Sold",
};

export const DEAL_STAGE_ORDER: DealStage[] = [
  "inquiry",
  "viewing",
  "credit_app",
  "deposit",
  "sold",
];

export const LENDER_STATUS_LABEL: Record<LenderStatus, string> = {
  reviewing: "Reviewing",
  approved: "Approved",
  declined: "Declined",
};

export const CUSTOMER_TYPE_LABEL: Record<CustomerType, string> = {
  owner_operator: "Owner-operator",
  fleet: "Fleet",
};

export type ConsignmentFeeType = "flat" | "percent" | "over_net";
export type PayoutStatus = "pending" | "partial" | "paid";
export type AppraisalCondition = "excellent" | "good" | "fair" | "rough";

export type RepGoal = {
  id: string;
  created_at: string;
  created_by: string | null;
  sales_rep_id: string;
  month: string;
  target_units: number;
  target_profit: number | string;
};

export type FloorPlan = {
  id: string;
  created_at: string;
  created_by: string | null;
  truck_id: string;
  lender_name: string;
  financed_amount: number | string;
  daily_interest_rate: number | string;
  start_date: string;
  next_curtailment_date: string | null;
  trucks?: Pick<Truck, "stock_no" | "year" | "make" | "model" | "status"> | null;
};

export type EcmReport = {
  id: string;
  created_at: string;
  created_by: string | null;
  truck_id: string;
  engine_hours: number | string;
  idle_hours: number | string;
  fault_codes: string | null;
  file_path: string | null;
  trucks?: Pick<Truck, "stock_no" | "year" | "make" | "model"> | null;
};

export type Appraisal = {
  id: string;
  created_at: string;
  created_by: string | null;
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  miles: number;
  condition: AppraisalCondition;
  expected_sale_price: number | string;
  planned_prep: number | string;
  target_profit: number | string;
  notes: string | null;
};

export type KeyLogEntry = {
  id: string;
  created_at: string;
  created_by: string | null;
  truck_id: string;
  taken_by_id: string | null;
  taken_by_name: string;
  taken_at: string;
  returned_at: string | null;
  notes: string | null;
  trucks?: Pick<Truck, "stock_no" | "year" | "make" | "model"> | null;
};

export type Consignment = {
  id: string;
  created_at: string;
  created_by: string | null;
  truck_id: string;
  owner_name: string;
  agreed_net: number | string;
  fee_type: ConsignmentFeeType;
  fee_value: number | string;
  end_date: string | null;
  payout_status: PayoutStatus;
  notes: string | null;
  trucks?: Pick<Truck, "stock_no" | "year" | "make" | "model"> | null;
};

export type TitleRecord = {
  id: string;
  created_at: string;
  created_by: string | null;
  truck_id: string;
  location: string;
  due_date: string | null;
  in_hand: boolean;
  notes: string | null;
  trucks?: Pick<Truck, "stock_no" | "year" | "make" | "model" | "status" | "vin"> | null;
};

export type AuditSession = {
  id: string;
  created_at: string;
  created_by: string | null;
  completed_at: string | null;
  notes: string | null;
};

export type AuditScan = {
  id: string;
  created_at: string;
  created_by: string | null;
  session_id: string;
  vin: string;
  matched_truck_id: string | null;
};

export const FEE_TYPE_LABEL: Record<ConsignmentFeeType, string> = {
  flat: "Flat fee",
  percent: "Percent of sale",
  over_net: "Amount over net",
};

export const PAYOUT_STATUS_LABEL: Record<PayoutStatus, string> = {
  pending: "Pending",
  partial: "Partial",
  paid: "Paid",
};

export const CONDITION_LABEL: Record<AppraisalCondition, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  rough: "Rough",
};

export function maxBuyPrice(
  expectedSale: number,
  plannedPrep: number,
  targetProfit: number,
): number {
  return expectedSale - plannedPrep - targetProfit;
}

export function idlePercent(engineHours: number, idleHours: number): number {
  if (engineHours <= 0) return 0;
  return (idleHours / engineHours) * 100;
}

export function interestToDate(
  financed: number,
  dailyRate: number,
  startDate: string,
): number {
  const start = new Date(startDate);
  const days = Math.max(
    0,
    Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );
  return financed * dailyRate * days;
}
