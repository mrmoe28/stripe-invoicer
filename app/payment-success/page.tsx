"use client";

import { Suspense } from "react";
import { CheckCircle, Download, Mail, ArrowLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get('invoice');
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg mx-auto shadow-lg bg-gray-800 border-gray-700">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-400">
            Payment Successful!
          </CardTitle>
          <p className="text-gray-400">
            Thank you for your payment. Your transaction has been processed successfully.
            {invoiceId && (
              <span className="block mt-2 text-sm">
                Reference: Invoice {invoiceId.slice(-8).toUpperCase()}
              </span>
            )}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="border-t border-gray-600 pt-6">
            <h3 className="font-semibold text-gray-100 mb-3">What happens next?</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-100">Email Confirmation</p>
                  <p className="text-sm text-gray-400">
                    You will receive a payment confirmation email within 5 minutes.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Download className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-100">Receipt & Invoice</p>
                  <p className="text-sm text-gray-400">
                    Your receipt and updated invoice are available for download.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-600 pt-6">
            <h3 className="font-semibold text-gray-100 mb-3">Need help?</h3>
            <p className="text-sm text-gray-400 mb-4">
              If you have any questions about your payment or invoice, please contact us:
            </p>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Email:</span>{" "}
                <a href="mailto:support@ledgerflow.org" className="text-blue-600 hover:underline">
                  support@ledgerflow.org
                </a>
              </p>
              <p>
                <span className="font-medium">Website:</span>{" "}
                <a href="https://ledgerflow.org" className="text-blue-600 hover:underline">
                  ledgerflow.org
                </a>
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-600 pt-6">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.close()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Close Window
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}