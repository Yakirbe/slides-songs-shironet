const pptxgen = require('pptxgenjs');

// Create presentation
const pptx = new pptxgen();
pptx.layout = 'LAYOUT_16x9';
pptx.author = 'Tu B\'Shevat Sing-Along';
pptx.title = 'Tu B\'Shevat Song Lyrics';

// Song list with titles
const songs = [
  'I Can See It In Your Eyes - Men At Work',
  'Torn - Natalie Imbruglia',
  'חלומו של כל גבר - נסרין קדרי',
  'Don\'t Speak - No Doubt',
  'Baby When You\'re Gone',
  'I Want It That Way - Backstreet Boys',
  'למה יפו ישנה',
  'זאת שמעל לכל המצופה',
  'בדרך הביתה - רונה קינן',
  'גבר רומנטי - טיפקס',
  'מכה אפורה - מוניקה סקס',
  'לאט לאט - שלום חנוך',
  'אהבתיה - שלמה ארצי',
  'ניצוצות - ברי סחרוף',
  'רודף אחר חוקיך',
  'ציפור תלויה על חוט',
  'נאחז באוויר - גידי גוב',
  'קח אותו לאט את הזמן',
  'Fix You - Coldplay',
  'היה כבר - סתום תתחת',
  'אור גדול - אמיר דדון',
  'לשיר איתך',
  'סתיו ישראלי - גלי עטרי',
  'שיר של חנן בן ארי',
  'שיר ללא שם - יהודית רביץ',
  'עד אחרי הנצח - פאר טסי',
  'Bohemian Rhapsody - Queen',
  'Dancing Queen - ABBA',
  'אבינועם בחור כארז',
  'ספרי לי מה כבד עלייך'
];

// Create a slide for each song
songs.forEach((songTitle, index) => {
  const slide = pptx.addSlide();

  // Add gradient background
  slide.background = { fill: "F8F9FA" };

  // Add decorative top bar
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.8,
    fill: { color: "4A90E2" }
  });

  // Add song title
  slide.addText(songTitle, {
    x: 0.5,
    y: 0.15,
    w: 9,
    h: 0.5,
    fontSize: 24,
    bold: true,
    color: "FFFFFF",
    align: "center",
    valign: "middle"
  });

  // Add slide number
  slide.addText(`${index + 1}`, {
    x: 9.3,
    y: 0.2,
    w: 0.4,
    h: 0.4,
    fontSize: 18,
    color: "FFFFFF",
    align: "center",
    valign: "middle"
  });

  // Add multi-column text area with placeholder
  // Left column
  slide.addText([
    { text: "PASTE LYRICS HERE\n", options: { fontSize: 12, bold: true, color: "999999" } },
    { text: "Copy lyrics from shironet_urls.md", options: { fontSize: 10, italic: true, color: "BBBBBB" } }
  ], {
    x: 0.5,
    y: 1.2,
    w: 4.5,
    h: 4.3,
    fontSize: 14,
    color: "333333",
    valign: "top",
    fill: { color: "FFFFFF" },
    line: { color: "DDDDDD", width: 1 }
  });

  // Right column
  slide.addText([
    { text: "PASTE LYRICS HERE\n", options: { fontSize: 12, bold: true, color: "999999" } },
    { text: "(Continue from left column)", options: { fontSize: 10, italic: true, color: "BBBBBB" } }
  ], {
    x: 5.2,
    y: 1.2,
    w: 4.5,
    h: 4.3,
    fontSize: 14,
    color: "333333",
    valign: "top",
    fill: { color: "FFFFFF" },
    line: { color: "DDDDDD", width: 1 }
  });

  // Add footer with instruction
  slide.addText("Visit shironet.mako.co.il to get lyrics", {
    x: 0.5,
    y: 5.8,
    w: 9,
    h: 0.3,
    fontSize: 10,
    color: "666666",
    align: "center",
    italic: true
  });
});

// Save presentation
pptx.writeFile({ fileName: 'tu_bshevat_sing_along.pptx' }).then(() => {
  console.log('Presentation created successfully!');
  console.log('File: tu_bshevat_sing_along.pptx');
  console.log('');
  console.log('Next steps:');
  console.log('1. Open shironet_urls.md for the list of Shironet URLs');
  console.log('2. Copy lyrics from each URL');
  console.log('3. Paste into the corresponding slide');
  console.log('4. Adjust text size if needed to fit all lyrics');
});
