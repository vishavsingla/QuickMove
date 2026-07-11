import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { ensureInvoice, renderInvoiceHtml, renderInvoicePdf } from "../services/invoices";

const canAccess = async (bookingId: string, auth: AuthRequest["auth"]) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return null;
  const allowed =
    auth?.role === "ADMIN" ||
    booking.userId === auth?.id ||
    (booking.driverId && booking.driverId === auth?.driverId);
  return allowed ? booking : null;
};

export const getInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await canAccess(req.params.id, req.auth);
    if (!booking) return res.status(403).json({ message: "Forbidden" });

    const invoice = await ensureInvoice(booking.id);
    const html = renderInvoiceHtml(invoice as any);
    const format = req.query.format as string | undefined;

    if (format === "html") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    }

    if (format === "pdf") {
      const pdf = await renderInvoicePdf(invoice as any);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${invoice.invoiceNumber}.pdf"`
      );
      return res.status(200).send(pdf);
    }

    return res.status(200).json({
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        subtotal: invoice.subtotal,
        discount: invoice.discount,
        tax: invoice.tax,
        total: invoice.total,
        issuedAt: invoice.issuedAt,
      },
      html,
    });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};
