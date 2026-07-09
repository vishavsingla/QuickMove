import { prisma } from "../lib/prisma";
import { payableAmount } from "./coupons";

const invoiceNumber = () =>
  `QMV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export const renderInvoiceHtml = (invoice: {
  invoiceNumber: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  issuedAt: Date;
  booking: {
    id: string;
    pickupLocation: string;
    dropoffLocation: string;
    vehicleType: string;
    paymentMethod: string | null;
    user: { name: string | null; email: string };
    driver?: { name: string; licensePlate: string } | null;
  };
}) => {
  const b = invoice.booking;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${invoice.invoiceNumber}</title>
<style>
body{font-family:system-ui,sans-serif;max-width:640px;margin:2rem auto;color:#111}
h1{font-size:1.25rem}table{width:100%;border-collapse:collapse;margin:1rem 0}
td,th{padding:.5rem;border-bottom:1px solid #e5e7eb;text-align:left}
.total{font-weight:700;font-size:1.1rem}
.muted{color:#6b7280;font-size:.875rem}
</style></head><body>
<h1>QuickMove Tax Invoice</h1>
<p class="muted">Invoice ${invoice.invoiceNumber} · ${invoice.issuedAt.toISOString().slice(0, 10)}</p>
<p><strong>Customer:</strong> ${b.user.name ?? b.user.email}<br>
<strong>Booking:</strong> ${b.id}</p>
<p><strong>Route:</strong> ${b.pickupLocation} → ${b.dropoffLocation}<br>
<strong>Vehicle:</strong> ${b.vehicleType}${b.driver ? `<br><strong>Driver:</strong> ${b.driver.name} (${b.driver.licensePlate})` : ""}</p>
<table>
<tr><th>Description</th><th style="text-align:right">Amount (INR)</th></tr>
<tr><td>Move fare</td><td style="text-align:right">₹${invoice.subtotal.toFixed(2)}</td></tr>
${invoice.discount > 0 ? `<tr><td>Coupon discount</td><td style="text-align:right">-₹${invoice.discount.toFixed(2)}</td></tr>` : ""}
${invoice.tax > 0 ? `<tr><td>Tax</td><td style="text-align:right">₹${invoice.tax.toFixed(2)}</td></tr>` : ""}
<tr class="total"><td>Total paid</td><td style="text-align:right">₹${invoice.total.toFixed(2)}</td></tr>
</table>
<p class="muted">Payment method: ${b.paymentMethod ?? "—"} · Thank you for using QuickMove.</p>
</body></html>`;
};

export const ensureInvoice = async (bookingId: string) => {
  const existing = await prisma.invoice.findUnique({
    where: { bookingId },
    include: {
      booking: {
        include: {
          user: { select: { name: true, email: true } },
          driver: { select: { name: true, licensePlate: true } },
        },
      },
    },
  });
  if (existing) return existing;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: { select: { name: true, email: true } },
      driver: { select: { name: true, licensePlate: true } },
    },
  });
  if (!booking) throw new Error("Booking not found");
  if (booking.paymentStatus !== "PAID") throw new Error("Invoice available after payment");

  const total = payableAmount(booking.estimatedCost, booking.discountAmount);
  return prisma.invoice.create({
    data: {
      invoiceNumber: invoiceNumber(),
      bookingId,
      subtotal: booking.estimatedCost,
      discount: booking.discountAmount,
      tax: 0,
      total,
    },
    include: {
      booking: {
        include: {
          user: { select: { name: true, email: true } },
          driver: { select: { name: true, licensePlate: true } },
        },
      },
    },
  });
};
