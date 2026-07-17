import fs from 'fs';
import https from 'https';
const url = 'https://api.alquran.cloud/v1/quran/quran-uthmani';
console.log('جاري الاتصال بخوادم القرآن الكريم، يرجى الانتظار...');
https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const json = JSON.parse(data);
    const formattedQuran = json.data.surahs.map(surah => {
      return {
        id: surah.number,
        name: surah.name.replace('سُورَةُ ', '').replace('سورة ', ''),
        total_ayahs: surah.ayahs.length,
        ayahs: surah.ayahs.map(ayah => {
          let text = ayah.text;
          
          // هندسة حسابية: إزالة البسملة غير المرقمة من بداية الآية الأولى في السور (عدا الفاتحة) لضمان دقة الإعجاز العددي
          if (surah.number !== 1 && ayah.numberInSurah === 1) {
             text = text.replace(/^بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\s*/, '');
          }
          
          return {
            id: ayah.numberInSurah,
            number: ayah.numberInSurah,
            text: text
          };
        })
      };
    });
    fs.writeFileSync('./src/data/quran.json', JSON.stringify(formattedQuran, null, 2), 'utf-8');
    console.log('✅ تم بنجاح! تم تحميل 114 سورة وحفظها في src/data/quran.json');
  });
}).on('error', (err) => {
  console.log('❌ حدث خطأ: ' + err.message);
});
