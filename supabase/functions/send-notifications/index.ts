import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  bookingId: string;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
}

// Format date from YYYY-MM-DD to readable Lithuanian format
function formatDate(dateStr: string): string {
  const months = [
    'sausio', 'vasario', 'kovo', 'balandžio', 'gegužės', 'birželio',
    'liepos', 'rugpjūčio', 'rugsėjo', 'spalio', 'lapkričio', 'gruodžio'
  ];
  const days = ['Sekmadienis', 'Pirmadienis', 'Antradienis', 'Trečiadienis', 'Ketvirtadienis', 'Penktadienis', 'Šeštadienis'];
  
  const date = new Date(dateStr);
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  
  return `${dayName}, ${month} ${day} d.`;
}

// Send email using Resend
async function sendEmail(
  resend: InstanceType<typeof Resend>,
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await resend.emails.send({
      from: "SauTikSau <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    });
    console.log("Email sent:", result);
    return { success: true };
  } catch (error) {
    console.error("Email error:", error);
    return { success: false, error: String(error) };
  }
}

// Send SMS using ClickSend
async function sendSMS(
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const username = Deno.env.get("CLICKSEND_USERNAME");
  const apiKey = Deno.env.get("CLICKSEND_API_KEY");

  if (!username || !apiKey) {
    console.error("ClickSend credentials not configured");
    return { success: false, error: "SMS not configured" };
  }

  // Format phone number (ensure it starts with country code)
  let formattedPhone = phone.replace(/\s+/g, '').replace(/-/g, '');
  if (formattedPhone.startsWith('8')) {
    formattedPhone = '+370' + formattedPhone.substring(1);
  } else if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+370' + formattedPhone;
  }

  try {
    const response = await fetch("https://rest.clicksend.com/v3/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + btoa(`${username}:${apiKey}`),
      },
      body: JSON.stringify({
        messages: [
          {
            source: "sdk",
            from: "SAUTIKSAU",
            body: message,
            to: formattedPhone,
          },
        ],
      }),
    });

    const data = await response.json();
    console.log("SMS response:", data);

    if (data.response_code === "SUCCESS") {
      return { success: true };
    } else {
      return { success: false, error: data.response_msg || "SMS failed" };
    }
  } catch (error) {
    console.error("SMS error:", error);
    return { success: false, error: String(error) };
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);
    const data: NotificationRequest = await req.json();
    
    console.log("Sending notifications for booking:", data);

    const formattedDate = formatDate(data.date);
    const results: { adminEmail?: any; customerEmail?: any; customerSMS?: any } = {};

    // 1. Send email to admin
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">🎉 Nauja rezervacija!</h2>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #666;">Rezervacijos informacija</h3>
          <p><strong>Paslauga:</strong> ${data.serviceName}</p>
          <p><strong>Data:</strong> ${formattedDate}</p>
          <p><strong>Laikas:</strong> ${data.startTime} - ${data.endTime}</p>
        </div>
        
        <div style="background: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #666;">Kliento informacija</h3>
          <p><strong>Vardas:</strong> ${data.customerName}</p>
          <p><strong>Telefonas:</strong> <a href="tel:${data.customerPhone}">${data.customerPhone}</a></p>
          ${data.customerEmail ? `<p><strong>El. paštas:</strong> <a href="mailto:${data.customerEmail}">${data.customerEmail}</a></p>` : ''}
        </div>
        
        <p style="color: #999; font-size: 12px;">
          Rezervacijos ID: ${data.bookingId}
        </p>
      </div>
    `;

    results.adminEmail = await sendEmail(
      resend,
      "info@sautiksau.lt",
      `Nauja rezervacija: ${data.customerName} - ${formattedDate} ${data.startTime}`,
      adminHtml
    );

    // 2. Send email to customer (if email provided)
    if (data.customerEmail) {
      const customerHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Sveiki, ${data.customerName}! 👋</h2>
          
          <p>Jūsų rezervacija <strong>SauTikSau</strong> patvirtinta!</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #666;">Rezervacijos detalės</h3>
            <p><strong>Paslauga:</strong> ${data.serviceName}</p>
            <p><strong>Data:</strong> ${formattedDate}</p>
            <p><strong>Laikas:</strong> ${data.startTime} - ${data.endTime}</p>
          </div>
          
          <p><strong>Adresas:</strong> Vilnius (tikslus adresas bus atsiųstas prieš vizitą)</p>
          
          <p style="color: #666;">
            Jei reikia atšaukti ar pakeisti rezervaciją, susisiekite:<br>
            📧 <a href="mailto:info@sautiksau.lt">info@sautiksau.lt</a><br>
            📱 <a href="tel:+37060000000">+370 600 00000</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            SauTikSau masažai | <a href="https://sautiksau.lt">sautiksau.lt</a>
          </p>
        </div>
      `;

      results.customerEmail = await sendEmail(
        resend,
        data.customerEmail,
        `Rezervacija patvirtinta - ${formattedDate} ${data.startTime}`,
        customerHtml
      );
    }

    // 3. Send SMS to customer
    const smsMessage = `SauTikSau: Rezervacija patvirtinta! ${data.serviceName}, ${data.date} ${data.startTime}. Info: info@sautiksau.lt`;
    results.customerSMS = await sendSMS(data.customerPhone, smsMessage);

    console.log("Notification results:", results);

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error in send-notifications:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
