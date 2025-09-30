import * as React from 'react';

interface InvoiceEmailTemplateProps {
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amount: string;
  currency: string;
  paymentLink: string;
  items: Array<{
    description: string;
    quantity: number;
    price: string;
    total: string;
  }>;
  businessName?: string;
  businessEmail?: string;
  businessAddress?: string;
  customerEmail?: string;
  notes?: string;
  subtotal: string;
  tax?: string;
  total: string;
}

export const InvoiceEmailTemplate: React.FC<InvoiceEmailTemplateProps> = ({
  customerName,
  invoiceNumber,
  invoiceDate,
  dueDate,
  amount,
  currency,
  paymentLink,
  items,
  businessName = 'Your Business',
  businessEmail,
  businessAddress,
  customerEmail,
  notes,
  subtotal,
  tax,
  total,
}) => {
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '';

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f9fafb', padding: '40px 0' }}>
      <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', maxWidth: '600px', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        {/* Header */}
        <tr>
          <td style={{ backgroundColor: '#0f172a', padding: '32px', textAlign: 'center' }}>
            <h1 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: '600' }}>{businessName}</h1>
          </td>
        </tr>

        {/* Main Content */}
        <tr>
          <td style={{ padding: '32px' }}>
            {/* Greeting */}
            <p style={{ fontSize: '16px', lineHeight: '24px', color: '#374151', marginBottom: '24px' }}>
              Hi {customerName},
            </p>
            
            <p style={{ fontSize: '16px', lineHeight: '24px', color: '#374151', marginBottom: '32px' }}>
              Thank you for your business. Please find your invoice details below.
            </p>

            {/* Invoice Summary Box */}
            <div style={{ backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '24px', marginBottom: '32px' }}>
              <table style={{ width: '100%' }}>
                <tr>
                  <td style={{ paddingBottom: '12px' }}>
                    <strong style={{ color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Invoice Number</strong>
                    <div style={{ color: '#111827', fontSize: '16px', marginTop: '4px' }}>{invoiceNumber}</div>
                  </td>
                  <td style={{ paddingBottom: '12px', textAlign: 'right' }}>
                    <strong style={{ color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Amount Due</strong>
                    <div style={{ color: '#111827', fontSize: '20px', fontWeight: '600', marginTop: '4px' }}>
                      {currencySymbol}{total}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong style={{ color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Invoice Date</strong>
                    <div style={{ color: '#111827', fontSize: '14px', marginTop: '4px' }}>{invoiceDate}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <strong style={{ color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Due Date</strong>
                    <div style={{ color: '#111827', fontSize: '14px', marginTop: '4px' }}>{dueDate}</div>
                  </td>
                </tr>
              </table>
            </div>

            {/* Items Table */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '16px', textTransform: 'uppercase' }}>Invoice Items</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: '8px 0', fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Description</th>
                    <th style={{ textAlign: 'center', padding: '8px 0', fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '8px 0', fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Price</th>
                    <th style={{ textAlign: 'right', padding: '8px 0', fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 0', fontSize: '14px', color: '#374151' }}>{item.description}</td>
                      <td style={{ padding: '12px 0', fontSize: '14px', color: '#374151', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '12px 0', fontSize: '14px', color: '#374151', textAlign: 'right' }}>{currencySymbol}{item.price}</td>
                      <td style={{ padding: '12px 0', fontSize: '14px', color: '#374151', textAlign: 'right' }}>{currencySymbol}{item.total}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} style={{ padding: '12px 0', fontSize: '14px', color: '#6b7280', textAlign: 'right' }}>Subtotal</td>
                    <td style={{ padding: '12px 0', fontSize: '14px', color: '#374151', textAlign: 'right' }}>{currencySymbol}{subtotal}</td>
                  </tr>
                  {tax && (
                    <tr>
                      <td colSpan={3} style={{ padding: '12px 0', fontSize: '14px', color: '#6b7280', textAlign: 'right' }}>Tax</td>
                      <td style={{ padding: '12px 0', fontSize: '14px', color: '#374151', textAlign: 'right' }}>{currencySymbol}{tax}</td>
                    </tr>
                  )}
                  <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                    <td colSpan={3} style={{ padding: '12px 0', fontSize: '16px', fontWeight: '600', color: '#111827', textAlign: 'right' }}>Total Due</td>
                    <td style={{ padding: '12px 0', fontSize: '16px', fontWeight: '600', color: '#111827', textAlign: 'right' }}>{currencySymbol}{total}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Notes */}
            {notes && (
              <div style={{ backgroundColor: '#fef3c7', borderRadius: '6px', padding: '16px', marginBottom: '32px' }}>
                <p style={{ fontSize: '14px', color: '#92400e', margin: 0 }}>
                  <strong>Notes:</strong> {notes}
                </p>
              </div>
            )}

            {/* Payment Button */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <a
                href={paymentLink}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '16px 32px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '16px',
                  fontWeight: '600',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                Pay Invoice Now
              </a>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '12px' }}>
                Secure payment powered by Stripe
              </p>
            </div>

            {/* Alternative Payment Link */}
            <div style={{ backgroundColor: '#f9fafb', borderRadius: '6px', padding: '16px', marginBottom: '24px' }}>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px 0' }}>
                Or copy this link to pay online:
              </p>
              <p style={{ fontSize: '12px', color: '#3b82f6', wordBreak: 'break-all', margin: 0 }}>
                {paymentLink}
              </p>
            </div>
          </td>
        </tr>

        {/* Footer */}
        <tr>
          <td style={{ backgroundColor: '#f9fafb', padding: '24px', borderTop: '1px solid #e5e7eb' }}>
            <table style={{ width: '100%' }}>
              <tr>
                <td>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>
                    <strong>{businessName}</strong>
                  </p>
                  {businessEmail && (
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>
                      {businessEmail}
                    </p>
                  )}
                  {businessAddress && (
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                      {businessAddress}
                    </p>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
                    Questions? Reply to this email
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  );
};