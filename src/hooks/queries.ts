import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Booking,
  BookingCounts,
  BookingInput,
  BookingStatus,
  DashboardSummary,
  DateRange,
  Enquiry,
  EnquiryStatus,
  Invoice,
  InvoiceStatus,
  Paginated,
  Payment,
  PaymentInput,
  PaymentType,
  PricingPlan,
  RevenuePoint,
  User,
} from '@/lib/types';

const PAGE = 15;

/** Infinite list over the API's `{ data, meta }` pagination. */
function useInfiniteList<T>(key: unknown[], path: string, filters: Record<string, string | number | undefined>) {
  return useInfiniteQuery({
    queryKey: [...key, filters],
    queryFn: ({ pageParam }) => api<Paginated<T>>(path, { query: { ...filters, page: pageParam, limit: PAGE } }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
}

// ───────────── Dashboard ─────────────

export const useSummary = (range?: DateRange) =>
  useQuery({
    queryKey: ['dashboard', 'summary', range ?? 'all'],
    queryFn: () => api<DashboardSummary>('/dashboard/summary', { query: { range } }),
    placeholderData: keepPreviousData,
  });

export const useUpcoming = (limit = 5) =>
  useQuery({ queryKey: ['dashboard', 'upcoming', limit], queryFn: () => api<Booking[]>('/dashboard/upcoming', { query: { limit } }) });

export const useRevenue = (months = 6) =>
  useQuery({ queryKey: ['dashboard', 'revenue', months], queryFn: () => api<RevenuePoint[]>('/dashboard/revenue', { query: { months } }) });

// ───────────── Bookings ─────────────

export interface BookingFilters {
  status?: BookingStatus;
  range?: DateRange;
  q?: string;
  [k: string]: string | number | undefined;
}

export const useBookings = (filters: BookingFilters) => useInfiniteList<Booking>(['bookings', 'list'], '/bookings', filters);

export const useBookingCounts = (filters: { range?: DateRange; q?: string }) =>
  useQuery({
    queryKey: ['bookings', 'counts', filters],
    queryFn: () => api<BookingCounts>('/bookings/counts', { query: filters }),
    placeholderData: keepPreviousData,
  });

export const useBooking = (id: number) =>
  useQuery({ queryKey: ['bookings', 'detail', id], queryFn: () => api<Booking>(`/bookings/${id}`), enabled: Number.isFinite(id) });

export const usePricing = () =>
  useQuery({ queryKey: ['pricing'], queryFn: () => api<PricingPlan[]>('/public/pricing'), staleTime: 10 * 60_000 });

/** Booking changes ripple into dashboard numbers, invoices and payments. */
function useInvalidateAll() {
  const qc = useQueryClient();
  return (skipBookingId?: number) =>
    Promise.all(
      ['bookings', 'dashboard', 'invoices', 'payments'].map((key) =>
        qc.invalidateQueries({
          queryKey: [key],
          predicate: (q) => skipBookingId == null || !(q.queryKey[1] === 'detail' && q.queryKey[2] === skipBookingId),
        }),
      ),
    );
}

export function useSaveBooking() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: BookingInput }) =>
      api<Booking>(id ? `/bookings/${id}` : '/bookings', { method: id ? 'PATCH' : 'POST', body: input }),
    onSuccess: () => invalidate(),
  });
}

export function useCancelBooking() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: number) => api<Booking>(`/bookings/${id}/cancel`, { method: 'PATCH' }),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteBooking() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: number) => api(`/bookings/${id}`, { method: 'DELETE' }),
    onSuccess: (_d, id) => invalidate(id),
  });
}

export function useAddPayment() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ bookingId, input }: { bookingId: number; input: PaymentInput }) =>
      api<Booking>(`/bookings/${bookingId}/payments`, { method: 'POST', body: input }),
    onSuccess: () => invalidate(),
  });
}

// ───────────── Payments / invoices ─────────────

export const usePayments = (filters: { paymentType?: PaymentType; q?: string }) =>
  useInfiniteList<Payment>(['payments', 'list'], '/payments', filters);

export const useInvoices = (filters: { status?: InvoiceStatus; q?: string }) =>
  useInfiniteList<Invoice>(['invoices', 'list'], '/invoices', filters);

export const useInvoice = (id: number) =>
  useQuery({ queryKey: ['invoices', 'detail', id], queryFn: () => api<Invoice>(`/invoices/${id}`), enabled: Number.isFinite(id) });

// ───────────── Customers / enquiries / profile ─────────────

export const useCustomers = (q?: string) =>
  useInfiniteList<User>(['users', 'list'], '/users', { role: 'CUSTOMER', q });

export const useEnquiries = (status?: EnquiryStatus) =>
  useInfiniteList<Enquiry>(['enquiries', 'list'], '/enquiries', { status });

/** Number of enquiries still marked NEW — drives the badges on the More tab and menu. */
export const useNewEnquiryCount = () =>
  useQuery({
    queryKey: ['enquiries', 'new-count'],
    queryFn: async () => (await api<Paginated<Enquiry>>('/enquiries', { query: { status: 'NEW', limit: 1 } })).meta.total,
    refetchInterval: 60_000,
  });

export function useUpdateEnquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: EnquiryStatus }) =>
      api<Enquiry>(`/enquiries/${id}`, { method: 'PATCH', body: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enquiries'] }),
  });
}

export const useUpdateProfile = () =>
  useMutation({ mutationFn: (input: Partial<User>) => api<User>('/auth/me', { method: 'PATCH', body: input }) });

export const useChangePassword = () =>
  useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
      api('/auth/change-password', { method: 'PATCH', body: input }),
  });

// ───────────── Documents (PDF) ─────────────

export type DocumentType = 'invoice' | 'booking';

export interface DocumentLinks {
  pdfUrl: string;
  filename: string;
  whatsappUrl: string;
  email: string | null;
  whatsappAutomatic: boolean;
  emailTestInbox: boolean;
}

export interface SendResult {
  channel: 'email' | 'whatsapp';
  sent: boolean;
  to: string;
  pdfUrl: string;
  whatsappUrl?: string;
  previewUrl?: string;
}

export const fetchDocumentLinks = (type: DocumentType, bookingId: number) =>
  api<DocumentLinks>(`/documents/${type}/${bookingId}/links`);

export const useSendDocument = () =>
  useMutation({
    mutationFn: ({ type, bookingId, channel, to }: { type: DocumentType; bookingId: number; channel: 'email' | 'whatsapp'; to?: string }) =>
      api<SendResult>(`/documents/${type}/${bookingId}/send`, { method: 'POST', body: { channel, to } }),
  });
