const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function backup() {
  const now = new Date();
  const tarih = now.toISOString().slice(0, 10);
  const zaman = now.toISOString();

  console.log(`Yedekleme başladı: ${zaman}`);

  const isletmelerSnap = await db.collection('isletmeler').get();
  const isletmeler = [];
  isletmelerSnap.forEach(doc => {
    isletmeler.push({ id: doc.id, ...doc.data() });
  });

  console.log(`${isletmeler.length} işletme bulundu`);

  await db.collection('yedekler').doc(tarih).set({
    tarih,
    olusturuldu: zaman,
    isletmeSayisi: isletmeler.length,
    isletmeler
  });

  console.log(`✓ Yedek kaydedildi: yedekler/${tarih}`);

  const otuzGunOnce = new Date(now);
  otuzGunOnce.setDate(otuzGunOnce.getDate() - 30);
  const eskiTarih = otuzGunOnce.toISOString().slice(0, 10);

  const eskiYedekler = await db.collection('yedekler')
    .where('tarih', '<', eskiTarih)
    .get();

  const silmeler = [];
  eskiYedekler.forEach(doc => silmeler.push(doc.ref.delete()));
  await Promise.all(silmeler);

  if (silmeler.length > 0) console.log(`${silmeler.length} eski yedek silindi`);

  console.log('Yedekleme tamamlandı!');
}

backup().catch(err => {
  console.error('Yedekleme hatası:', err);
  process.exit(1);
});
