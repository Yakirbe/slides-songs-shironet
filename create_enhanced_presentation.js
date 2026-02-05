const pptxgen = require('pptxgenjs');

// Create presentation
const pptx = new pptxgen();
pptx.layout = 'LAYOUT_16x9';
pptx.author = 'Tu B\'Shevat Sing-Along';
pptx.title = 'Tu B\'Shevat Song Lyrics';

// Song list with titles and colors
const songs = [
  { title: 'I Can See It In Your Eyes - Men At Work', color: '2C5F2D', textColor: 'FFFFFF' },
  { title: 'Torn - Natalie Imbruglia', color: '97BC62', textColor: '2C5F2D' },
  { title: 'חלומו של כל גבר - נסרין קדרי', color: 'B5BD89', textColor: '2C5F2D' },
  { title: 'Don\'t Speak - No Doubt', color: '2C5F2D', textColor: 'FFFFFF' },
  { title: 'Baby When You\'re Gone', color: '97BC62', textColor: '2C5F2D' },
  { title: 'I Want It That Way - Backstreet Boys', color: 'B5BD89', textColor: '2C5F2D' },
  { title: 'למה יפו ישנה', color: '2C5F2D', textColor: 'FFFFFF' },
  { title: 'זאת שמעל לכל המצופה', color: '97BC62', textColor: '2C5F2D' },
  { title: 'בדרך הביתה - רונה קינן', color: 'B5BD89', textColor: '2C5F2D' },
  { title: 'גבר רומנטי - טיפקס', color: '2C5F2D', textColor: 'FFFFFF' },
  { title: 'מכה אפורה - מוניקה סקס', color: '97BC62', textColor: '2C5F2D' },
  { title: 'לאט לאט - שלום חנוך', color: 'B5BD89', textColor: '2C5F2D' },
  { title: 'אהבתיה - שלמה ארצי', color: '2C5F2D', textColor: 'FFFFFF' },
  { title: 'ניצוצות - ברי סחרוף', color: '97BC62', textColor: '2C5F2D' },
  { title: 'רודף אחר חוקיך', color: 'B5BD89', textColor: '2C5F2D' },
  { title: 'ציפור תלויה על חוט', color: '2C5F2D', textColor: 'FFFFFF' },
  { title: 'נאחז באוויר - גידי גוב', color: '97BC62', textColor: '2C5F2D' },
  { title: 'קח אותו לאט את הזמן', color: 'B5BD89', textColor: '2C5F2D' },
  { title: 'Fix You - Coldplay', color: '2C5F2D', textColor: 'FFFFFF' },
  { title: 'היה כבר - סתום תתחת', color: '97BC62', textColor: '2C5F2D' },
  { title: 'אור גדול - אמיר דדון', color: 'B5BD89', textColor: '2C5F2D' },
  { title: 'לשיר איתך', color: '2C5F2D', textColor: 'FFFFFF' },
  { title: 'סתיו ישראלי - גלי עטרי', color: '97BC62', textColor: '2C5F2D' },
  { title: 'שיר של חנן בן ארי', color: 'B5BD89', textColor: '2C5F2D' },
  { title: 'שיר ללא שם - יהודית רביץ', color: '2C5F2D', textColor: 'FFFFFF' },
  { title: 'עד אחרי הנצח - פאר טסי', color: '97BC62', textColor: '2C5F2D' },
  { title: 'Bohemian Rhapsody - Queen', color: 'B5BD89', textColor: '2C5F2D' },
  { title: 'Dancing Queen - ABBA', color: '2C5F2D', textColor: 'FFFFFF' },
  { title: 'אבינועם בחור כארז', color: '97BC62', textColor: '2C5F2D' },
  { title: 'ספרי לי מה כבד עלייך', color: 'B5BD89', textColor: '2C5F2D' }
];

// Create a slide for each song
songs.forEach((song, index) => {
  const slide = pptx.addSlide();

  // Add colored background (nature-themed green shades for Tu B'Shevat)
  slide.background = { fill: song.color };

  // Add decorative tree/nature element on the side
  slide.addShape(pptx.shapes.OVAL, {
    x: -0.5,
    y: 2,
    w: 1.5,
    h: 1.5,
    fill: { color: 'FFFFFF', transparency: 80 }
  });

  slide.addShape(pptx.shapes.OVAL, {
    x: 9.2,
    y: 3.5,
    w: 1.2,
    h: 1.2,
    fill: { color: 'FFFFFF', transparency: 85 }
  });

  // Add top decorative bar
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.9,
    fill: { color: '000000', transparency: 20 }
  });

  // Add song title
  slide.addText(song.title, {
    x: 0.5,
    y: 0.15,
    w: 8.5,
    h: 0.6,
    fontSize: 28,
    bold: true,
    color: song.textColor,
    align: 'center',
    valign: 'middle'
  });

  // Add slide number
  slide.addText(`${index + 1}`, {
    x: 9.3,
    y: 0.2,
    w: 0.5,
    h: 0.5,
    fontSize: 22,
    bold: true,
    color: song.textColor,
    align: 'center',
    valign: 'middle'
  });

  // Add multi-column text area with placeholder
  // Left column
  slide.addText([
    { text: 'הדבק כאן את המילים\n', options: { fontSize: 14, bold: true } },
    { text: 'PASTE LYRICS HERE\n\n', options: { fontSize: 12, bold: true } },
    { text: 'העתק מהקישור ב- shironet_urls.md', options: { fontSize: 11, italic: true } }
  ], {
    x: 0.4,
    y: 1.1,
    w: 4.6,
    h: 4.5,
    fontSize: 16,
    color: '2C5F2D',
    valign: 'top',
    fill: { color: 'FFFFFF' },
    line: { color: '2C5F2D', width: 2 },
    align: 'right'
  });

  // Right column
  slide.addText([
    { text: 'הדבק כאן את המילים\n', options: { fontSize: 14, bold: true } },
    { text: 'PASTE LYRICS HERE\n\n', options: { fontSize: 12, bold: true } },
    { text: '(המשך מהעמודה השמאלית)', options: { fontSize: 11, italic: true } }
  ], {
    x: 5.2,
    y: 1.1,
    w: 4.6,
    h: 4.5,
    fontSize: 16,
    color: '2C5F2D',
    valign: 'top',
    fill: { color: 'FFFFFF' },
    line: { color: '2C5F2D', width: 2 },
    align: 'right'
  });

  // Add footer with Tu B'Shevat symbol
  slide.addText('🌳 ט״ו בשבט שמח 🌳', {
    x: 0.5,
    y: 5.8,
    w: 9,
    h: 0.3,
    fontSize: 14,
    color: song.textColor,
    align: 'center',
    bold: true
  });
});

// Save presentation
pptx.writeFile({ fileName: 'tu_bshevat_sing_along_enhanced.pptx' }).then(() => {
  console.log('✅ Enhanced presentation created successfully!');
  console.log('📄 File: tu_bshevat_sing_along_enhanced.pptx');
  console.log('');
  console.log('🎨 Features:');
  console.log('   - Nature-themed green backgrounds (Tu B\'Shevat colors)');
  console.log('   - Alternating color scheme for visual variety');
  console.log('   - Hebrew and English placeholder text');
  console.log('   - Two-column layout for lyrics');
  console.log('   - Decorative elements');
  console.log('');
  console.log('📝 Next steps:');
  console.log('   1. Open shironet_urls.md');
  console.log('   2. Copy lyrics from each URL');
  console.log('   3. Paste into corresponding slides');
  console.log('   4. Enjoy your sing-along party! 🎉');
});
