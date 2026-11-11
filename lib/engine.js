const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'articles.json');
const PUBLIC_DATA_FILE = path.join(__dirname, '..', 'public', 'articles.json');

// Maximum allowed age for any news item: 20 days in milliseconds
const MAX_NEWS_AGE_MS = 20 * 24 * 60 * 60 * 1000;

// Current time in Kuwait (Asia/Kuwait, UTC+3)
function getKuwaitTimeInfo(dateObj = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kuwait',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(dateObj);
  const map = {};
  for (const p of parts) map[p.type] = p.value;

  const arabicDateFormatter = new Intl.DateTimeFormat('ar-KW', {
    timeZone: 'Asia/Kuwait',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const dateKey = `${map.year}-${map.month}-${map.day}`;
  const hour = parseInt(map.hour, 10);
  const minute = parseInt(map.minute, 10);
  const second = parseInt(map.second, 10);

  return {
    isoDate: dateKey,
    hour,
    minute,
    second,
    timeString: `${map.hour}:${map.minute}:${map.second}`,
    arabicDate: `${arabicDateFormatter.format(dateObj)} - 10:00 مساءً بتوقيت الكويت`
  };
}

/**
 * Returns the exact UTC Date object for the most recent 10:00 PM Kuwait Time (19:00:00 UTC)
 * that has already occurred at or before `now`.
 */
function getLatest10PmKuwaitMilestone(now = new Date()) {
  const milestone = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    19, 0, 0, 0
  ));
  if (now.getTime() < milestone.getTime()) {
    milestone.setUTCDate(milestone.getUTCDate() - 1);
  }
  return milestone;
}

function normalizeTo10PmMilestone(dateInput) {
  const d = new Date(dateInput);
  return getLatest10PmKuwaitMilestone(d);
}

// Safety & Geo Filter: Strictly blocks local Arab domestic sensitive politics & religious/sectarian topics
const BLOCKED_KEYWORDS = [
  'مذهب', 'طائفة', 'سنة', 'شيعة', 'تكفير', 'عقيدة', 'فتوى', 'الحج', 'العمرة',
  'الكويت', 'السعودية', 'الإمارات', 'قطر', 'البحرين', 'عمان', 'الخليج',
  'مصر', 'الأردن', 'المغرب', 'الجزائر', 'تونس', 'العراق', 'سوريا', 'لبنان', 'اليمن', 'السودان', 'فلسطين', 'غزة',
  'مجلس الأمة', 'وزير الداخلية', 'الحكومة المحلية'
];

function isHeadlineSafeAndGlobal(text) {
  if (!text) return false;
  for (const bad of BLOCKED_KEYWORDS) {
    if (text.includes(bad)) return false;
  }
  return true;
}

// Format a Date into short Arabic date like "10 نوفمبر 2026"
function formatShortArabicDate(dateObj) {
  try {
    return new Intl.DateTimeFormat('ar-KW', {
      timeZone: 'Asia/Kuwait',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(dateObj);
  } catch (_) {
    return dateObj.toISOString().slice(0, 10);
  }
}

// Pool of Upcoming Satirical Editions (Fallback if offline)
const UPCOMING_EDITIONS_POOL = [
  {
    title: "مزاد «البيت الأبيض».. وبطولات «الميكروفون» الإيراني!",
    subtitle: "الناتو على كفالة دافع الضرائب الأمريكي.. والبديل الروسي للمرسيدس يحتاج قراءة دعاء السفر ثلاث مرات!",
    tags: ["أمريكا وترامب", "طهران", "روسيا وأوكرانيا", "الأمم المتحدة"],
    paragraphs: [
      {
        id: "p1",
        topic: "واشنطن / الناتو والإيجار المتأخر",
        headline: "مؤجر البنايات في المكتب البيضاوي!",
        sourceNews: "واشنطن تطالب دول الناتو برفع مساهماتها الدفاعية فوراً وتلوح بعدم حماية الدول المتخلفة عن السداد.",
        text: "في واشنطن، لم تعد السياسة الخارجية تُدار من «غرفة العمليات» في البنتاغون، بل من «حاسبة الجيب» الخاصة بالرئيس دونالد ترامب الذي يتعامل مع الكرة الأرضية وكأنها «مجمع تجاري» معروض للتقبيل لعدم التفرغ! الرجل يخرج في كل مؤتمر صحفي ليخاطب قادة حلف «الناتو» بنفس اللهجة التي يخاطب بها «مؤجر البنايات» مستأجراً تأخر عن دفع إيجار الشقة ثلاثة أشهر، مهدداً إياهم بأنه إذا لم يدفعوا «الفاتورة» نقداً ومقدماً، فإنه سيترك الرئيس الروسي «فلاديمير بوتين» يتجول بالدبابات في شوارع باريس وبرلين بدون «فيزا شنغن»! والمضحك المبكي هو منظر زعماء أوروبا العظمى وهم يقفون في الطابور أمام المكتب البيضاوي، كل واحد منهم يحمل «دفتر شيكاته» تحت إبطه ويبتسم أمام الكاميرات ابتسامة التلميذ الذي نسي كتاب الرياضيات في البيت ويخشى أن يطلب منه المدير استدعاء ولي أمره.. لتكتشف أن القارة التي صدعت رؤوسنا طوال قرن كامل بمحاضرات «السيادة والكرامة الاستقلالية» كانت تعيش في الحقيقة (على كفالة) دافع الضرائب الأمريكي، وأن حلف الناتو العظيم بدون المظلة الأمريكية لا يستطيع حتى فض مشاجرة في سوق خضار مركزي!!"
      },
      {
        id: "p2",
        topic: "طهران / تقويم كوكب زحل",
        headline: "اسمع كلامك أصدقك.. أشوف «تومانك» أستعجب!",
        sourceNews: "تصريحات عسكرية إيرانية جديدة حول جاهزية الرد الاستراتيجي وسط تراجع قياسي جديد لقيمة العملة المحلية.",
        text: "على الضفة الأخرى، خرج متحدث عسكري في طهران ليعلن بكل فخر أن بلاده باتت تمتلك «بنك أهداف» يضم مئات المواقع الاستراتيجية حول العالم، وأن أصابعهم «على الزناد» للرد في الزمان والمكان المناسبين! هذه الجملة الشهيرة (الزمان والمكان المناسبين) دخلت موسوعة «غينيس» للأرقام القياسية كأطول نكتة سياسية عابرة للأجيال، إذ يبدو أن التقويم الذي يستخدمونه في طهران لتحديد «الزمان المناسب» يعتمد على تقويم «كوكب زحل» حيث تعادل السنة الواحدة ثلاثين عاماً أرضياً! فمنذ أربعين سنة ونحن نسمع خطباً رنانة تهتز لها شوارب المذيعين في التلفزيون الرسمي، وتهديدات بمسح قارات وإغراق أساطيل، بينما الواقع الاقتصادي على الأرض يقول إن العملة الوطنية الإيرانية فقدت من قيمتها ما يجعل المواطن يحتاج إلى «عربة يدوية» لنقل الأوراق النقدية اللازمة لشراء دجاجة مبردة من الجمعية التعاونية.. ليصدق فيهم المثل الشعبي القائل: (اسمع كلامك أصدقك.. أشوف «تومانك» أستعجب)!!"
      },
      {
        id: "p3",
        topic: "موسكو / العقوبات وسيارة لادا",
        headline: "البديل الروسي.. ودعاء السفر!",
        sourceNews: "الكرملين يؤكد نجاح سياسة إحلال الواردات وإنتاج سيارات محلية بديلة للشركات الغربية المنسحبة.",
        text: "في موسكو، أعلن الكرملين أن الاقتصاد الروسي حقق نمواً مذهلاً رغم آلاف العقوبات الغربية، وأن المواطن الروسي يعيش أزهى عصوره بعد أن غادرت الشركات الأمريكية والأوروبية وحلت محلها البدائل الوطنية! والحقيقة التي لا يذكرها البيان هي أن «البديل الوطني» الروسي للسيارات الألمانية الفارهة هو سيارة «لادا» مصنوعة بتكنولوجيا عام 1978 لا تحتوي على وسائد هوائية ولا نظام فرامل مانع للانزلاق، بحيث يحتاج السائق الروسي إلى قراءة «دعاء السفر» ثلاث مرات قبل أن يشغل المحرك! المشهد كله يشبه ذلك المريض الذي قرر الأطباء منع «الحلويات واللحوم» عنه بسبب ارتفاع الكوليسترول، فخرج يتباهى أمام جيرانه بأنه أصبح «نباتياً باختياره» وأنه يعشق طعم «ورق الخس المسلوق» بدون ملح.. بينما الغرب من جهته يفرض العقوبات على النفط الروسي في الصباح أمام عدسات الصحافة، ثم يشتريه في المساء من السوق السوداء عبر وسطاء في الهند والصين بأسعار مضاعفة، في أكبر مسرحية (استغفال متبادل) شهدها التاريخ الحديث!!"
      },
      {
        id: "p4",
        topic: "نيويورك / الأمم المتحدة",
        headline: "ديوانية متقاعدين على نهر الإيست ريفر!",
        sourceNews: "مجلس الأمن الدولي يعقد جلسة طارئة جديدة تنتهي ببيان يعرب عن القلق البالغ دون اتخاذ إجراءات ملزمة.",
        text: "الأمم المتحدة ومجلس الأمن الدولي عقدا هذا الأسبوع جلسة طارئة جديدة، انتهت كالعادة بإصدار بيان يعبر عن «القلق الشديد» إزاء التوترات العالمية! لو جمعنا كمية «القلق» الذي أنتجته قاعات الأمم المتحدة في نيويورك منذ تأسيسها عام 1945 وحتى الليلة، وقمنا بتحويله إلى طاقة كهربائية، لأضاءت قارة أفريقيا بالكامل لمدة خمسمئة سنة قادمة مجاناً! هذه المنظمة الدولية تحولت إلى ما يشبه «ديوانية متقاعدين» فاخرة على نهر الإيست ريفر، يجتمع فيها الدبلوماسيون لتبادل الابتسامات البروتوكولية وشرب القهوة منزوعة الكافيين، فإذا وقعت كارثة دولية كبرى، انقسموا إلى فريقين: فريق يرفع يده بـ «الفيتو» ليمنع أي قرار، وفريق يرفع يده ليطلب «تعديل صياغة الفقرة الثالثة» من بيان الإدانة اللغوي.. ليخرج العالم في النهاية بنتيجة واحدة ثابتة: القانون الدولي في عصرنا الحالي يشبه «بيت العنكبوت»، يصطاد الذباب الصغير فقط، أما الدبابير الكبيرة فتخرقه وتخرج منه وهي تبتسم للكاميرات!!"
      }
    ]
  },
  {
    title: "«خريطة» ترامب العقارية.. وغواصات «البانيو» في طهران!",
    subtitle: "واشنطن تبيع المظلة النووية بنظام الأقساط المريحة.. والكرملين يحتفل بانتصار «الفودكا» على الكرواسون الفرنسي!",
    tags: ["أمريكا وترامب", "طهران", "روسيا وأوكرانيا", "أوروبا والناتو"],
    paragraphs: [
      {
        id: "p1",
        topic: "واشنطن / دونالد ترامب",
        headline: "الكرة الأرضية.. للإيجار شامل الماء والكهرباء!",
        sourceNews: "ترامب يصرح بأن قادة العالم يتصلون به يومياً لطلب النصيحة ويهدد بفرض رسوم جمركية جديدة على الحلفاء.",
        text: "خرج الرئيس الأمريكي دونالد ترامب ليؤكد أن زعماء العالم يقفون على «خط الانتظار» في هاتفه الخاص لاستشارته في إدارة شؤون بلادهم، وأنه لا يرد إلا على من يدفع «رسوم المكالمة» مقدماً! ترامب يتعامل مع رئاسة القطب الأوحد بنفس روحية «دلال العقار» الذي يفرش خرايط أراضٍ وهمية في جاخور ويقنع الزبائن بأن هذه الصحراء القاحلة سيمر من فوقها «مترو أنفاق» ومطار دولي بعد أسبوعين! الأدهى من ذلك أنه كلما التقى برئيس دولة أوروبية حليفة، نظر إليه من فوق لتحت وكأنه «كفيل» يراجع إقامة مندوب مبيعات متأخر عن تحقيق التارجت، ثم يربت على كتفه قائلاً: (إنتوا خوش ناس وأحبكم وايد.. بس ادفعوا ضريبة الحماية خمسين مليار دولار قبل يوم الخميس وإلا ترى أعطي رقم تلفونكم حق بوتين يتفاهم وياكم)!!"
      },
      {
        id: "p2",
        topic: "طهران / الاقتصاد والتصريحات",
        headline: "استعراضات عسكرية.. وثلاجة بطعم الليمون اليابس!",
        sourceNews: "تصريحات رسمية في طهران عن تحقيق الاكتفاء الذاتي التسليحي بالتزامن مع أزمة معيشية وتضخم قياسي.",
        text: "في طهران، لا يزال المسؤولون يتحدثون يومياً عن خطط تصدير التكنولوجيا الفضائية والمفاعلات إلى قارات العالم، وذلك في نفس الأسبوع الذي أعلنت فيه البلدية عن قطع المياه والكهرباء المبرمج عن الأحياء السكنية! المشهد يذكرك بذلك الشخص «الكشخة» الذي يرتدي بشتاً مطرزاً بالذهب المقلد ويرش نص زجاجة عطر فرنسي مقلد، بينما ثلاجته في البيت ليس فيها سوى «ليمونة يابسة» ونصف علبة معجون طماطم منتهية الصلاحية.. فإذا سأله الجيران عن سر رائحة العطر القوية، رفع حاجبه وقال: (عشان الأعداء يعرفون إننا نعيش في رخاء استراتيجي)!!"
      },
      {
        id: "p3",
        topic: "بروكسل وموسكو / حزم العقوبات",
        headline: "العقوبة الجديدة.. ومنع استيراد «المخلل» الروسي!",
        sourceNews: "الاتحاد الأوروبي يناقش حزمة عقوبات اقتصادية إضافية ضد روسيا وسط خلافات داخلية حول الغاز.",
        text: "الاتحاد الأوروبي أعلن بكل فخر عن تجهيز حزمة جديدة من العقوبات الاقتصادية الساحقة ضد روسيا! عندما تصل العقوبات إلى هذا العدد الفلكي وما زال الخصم يتحرك ويبيع الغاز والنفط، فهذا يعني أن الحزم السابقة كانت عبارة عن «أكياس مكسرات» وليست عقوبات دولية! المفوضية الأوروبية في بروكسل لم يعد لديها شيء تعاقب به موسكو سوى إصدار قرار الشهر القادم لمنع القطط السيامية في برلين من مواء أغاني «تشايكوفسكي»، أو منع المطاعم في باريس من تقديم «سلطة البطاطس الروسية» واستبدالها بـ «سلطة الناتو الديمقراطية»! حالهم مع بوتين يشبه تماماً ذلك الملاكم الهزيل الذي يتلقى «علقه ساخنة» في الحلبة حتى تتورم عيناه، وفي الاستراحة بين الجولات يهمس لمدربه بكل ثقة: (خله يطقني بعد جولتين.. ترى إيده راح تعوره من كثر الطق وينسحب بروحه)!!"
      },
      {
        id: "p4",
        topic: "بيونغ يانغ / كيم جونغ أون والتقشف",
        headline: "رجيم ثوري للشعب.. وكرش نووي للزعيم!",
        sourceNews: "كيم جونغ أون يدعو الشعب الكوري الشمالي إلى التقشف ومضاعفة ساعات العمل لمواجهة التحديات الاقتصادية.",
        text: "زعيم كوريا الشمالية «كيم جونغ أون» خرج في خطاب توجيهي جديد يدعو فيه جماهير الشعب الكوري الكادح إلى «شد الحزام على البطون» وتقليل استهلاك الطعام ومضاعفة ساعات العمل الوطني لمواجهة المؤامرات الكونية! الطريف أن الشخص الوحيد في كوريا الشمالية الذي يحتاج فعلياً إلى «حزام بطن» بطول ثلاثة أمتار هو الزعيم نفسه، الذي يزداد وزنه خمسة كيلوغرامات مع كل تجربة صاروخية جديدة، بينما يزداد شعبه نحافة وشفافية حتى كاد المواطن الكوري أن يختفي عن شاشات الرادار بدون تكنولوجيا التخفي! دعوة «كيم» لشعبه الجائع بشد الحزام تذكرك بفيلم «اللمبي» حين يقف أمام رجل غارق في البحر ويصرخ فيه بنصيحة ذهبية: (إوعى تتبل يا كابتن.. المية مالحة وبتبوظ القميص)!!"
      }
    ]
  },
  {
    title: "«فيتو» مجلس الأمن.. ودبلوماسية «السبانخ» الأوروبية!",
    subtitle: "واشنطن وبكين تتصارعان على الرقائق الذكية بعقلية «الفريج».. وزيلينسكي يبحث عن كفيل غارم في بروكسل!",
    tags: ["الصين وتايوان", "الأمم المتحدة", "روسيا وأوكرانيا", "طهران"],
    paragraphs: [
      {
        id: "p1",
        topic: "واشنطن وبكين / حرب الرقائق والمعادن",
        headline: "مقاطعة إلكترونية.. بصناعة صينية!",
        sourceNews: "واشنطن تفرض قيوداً إضافية على تصدير رقائق الذكاء الاصطناعي إلى الصين وبكين ترد بمنع تصدير المعادن النادرة.",
        text: "الحرب التجارية والتكنولوجية بين واشنطن وبكين وصلت إلى مرحلة كوميدية تشبه «زعل الجيران» في الفرجان القديمة؛ فأمريكا تصدر قراراً بمنع بيع «الرقائق الإلكترونية الذكية» للصين بحجة الأمن القومي، فترد الصين في اليوم التالي بمنع تصدير «المعادن النادرة» التي تصنع منها أمريكا هذه الرقائق أصلاً! والمفاجأة المضحكة هي أن الموظف الأمريكي في وزارة التجارة بواشنطن يطبع قرار «مقاطعة البضائع الصينية» على كمبيوتر مصنوع في مدينة «شينزن» الصينية، ويشرب قهوته في كوب خزفي مكتوب في أسفله (Made in China)، ثم يخرج في المساء ليشتري لأولاده ألعاباً صينية من «وول مارت».. تماماً مثل ذلك الرجل الذي حلف يميناً مغلظة ألا يدخل «البقالة» التي في آخر الشارع لأن صاحبها غشه في «كرتون بيض»، ثم في الليل يرسل ولده الصغير من الباب الخلفي ويقول له: (قول حق راعي البقالة يعطينا جبن وزيتون على الحساب بس لا تقول إن أبوي اللي مطرشك)!!"
      },
      {
        id: "p2",
        topic: "طهران / تصريحات الملاحة الدولية",
        headline: "طرادات بحرية.. بمجاديف خشبية!",
        sourceNews: "تصريحات عسكرية في طهران حول إرسال قطع بحرية إلى المحيط الأطلسي لحماية الملاحة الدولية.",
        text: "أعلن مسؤول بحري في طهران أن أسطولهم الحربي يستعد للإبحار نحو «المحيط الأطلسي» والوصول إلى القرب من السواحل الأمريكية في مهمة استعراضية تاريخية! هذا التصريح يثير الإعجاب الشديد فعلاً، ليس بسبب القوة البحرية، بل بسبب «الثقة بالنفس» لدى قبطان السفينة التي غالباً ما تعمل بمحرك ديزل قديم يحتاج إلى «تنتيع» كل ثلاث ساعات، وإذا ارتفعت الأمواج مترين في المحيط الهندي بدأ البحارة بغرف الماء من أرضية السفينة بـ «سطل بلاستيك»! التهديد بعبور المحيط الأطلسي بهذه الإمكانيات يشبه ذلك السائق الذي يمتلك سيارة «بيجو 504» موديل 1979 بدون مكيف والحرارة فيها واصلة حرف (H)، ويقف عند الإشارة الضوئية بجانب سيارة «فيراري» حديثة ثم يضغط على البنزين ويهز رأسه للسائق الآخر قائلاً: (تقاوم لي خط الوفره واللي يسبق ياخذ استمارة الثاني؟)!!"
      },
      {
        id: "p3",
        topic: "بروكسل وكييف / تمويل الحرب الأوكرانية",
        headline: "قطّية «الديوانية» الأوروبية لزيلينسكي!",
        sourceNews: "خلافات حادة داخل اجتماعات الاتحاد الأوروبي حول حصص الدول في تمويل حزمة المساعدات الجديدة لأوكرانيا.",
        text: "اجتماعات قادة الاتحاد الأوروبي في بروكسل لجمع تبرعات عسكرية ومالية للرئيس الأوكراني «زيلينسكي» أصبحت تشبه بـ «الضبط» مشهد جمع «قطّية العشاء» في ديوانية يرتادها عشرون شخصاً من البخلاء! ففرنسا تقول إنها دفعت الأسبوع الماضي ثمن «الخبز والبيبسي»، وألمانيا تحلف أن محفظتها ضاعت في القطار، وإيطاليا تتظاهر بأنها مشغولة بمكالمة هاتفية طارئة في الممر حتى يغادر عامل المطعم، بينما يقف «زيلينسكي» عند الباب ومعه «فاتورة الحرب» الطويلة وهو ينظر إليهم بحسرة! في النهاية يتفق الأوروبيون على حل عبقري يرضي الجميع: يمنحون زيلينسكي «قرضاً مالياً» بضمان الأراضي الأوكرانية التي يحتلها الجيش الروسي حالياً، ويقولون له بابتسامة عريضة: (شد حيلك وحرر الأرض من بوتين.. عشان تحصل فلوس القرض وتسدد لنا الفوائد مع أول الشهر)!!"
      },
      {
        id: "p4",
        topic: "نيويورك / مسرحية الفيتو في مجلس الأمن",
        headline: "رفع الأيدي.. لتمرين عضلات الكتف!",
        sourceNews: "جلسة طارئة لمجلس الأمن الدولي تنتهي بتبادل استخدام حق النقض (الفيتو) دون صدور أي قرار.",
        text: "مرة أخرى يجتمع مجلس الأمن الدولي في نيويورك، ومرة أخرى تنتهي الجلسة برفع المندوب الأمريكي يده بـ «الفيتو» في الصباح، ورفع المندوب الروسي يده بـ «الفيتو» في المساء، بينما يكتفي المندوب الصيني بشرب الشاي الأخضر والابتسام للطرفين! هذه الجلسات لم يعد لها أي فائدة سياسية على وجه الأرض سوى أنها «تمرين علاج طبيعي» ممتاز لعضلات الكتف والمفاصل لدى السفراء الكبار في السن نتيجة رفع الأيدي المتكرر كل أربع وعشرين ساعة! ولو قامت الأمم المتحدة بتأجير قاعة مجلس الأمن الفخمة في عطلة نهاية الأسبوع لإقامة «حفلات أعراس» أو معارض للعطور والبخور، لوَفّرت على الأقل رواتب المترجمين الفوريين الذين يقضون أعمارهم في ترجمة جملة واحدة بخمس لغات رسمية: (نحن نشعر بالقلق العميق.. ونقترح تأجيل القلق إلى يوم الاثنين القادم)!!"
      }
    ]
  }
];

function readStoredArticles() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    try {
      return require('../data/articles.json');
    } catch (_) {
      return [];
    }
  }
}

function saveStoredArticles(articles) {
  const jsonStr = JSON.stringify(articles, null, 2);
  let saved = false;
  try {
    fs.writeFileSync(DATA_FILE, jsonStr, 'utf8');
    saved = true;
  } catch (_) {}
  try {
    fs.writeFileSync(PUBLIC_DATA_FILE, jsonStr, 'utf8');
  } catch (_) {}
  return saved;
}

function getArticlesWithDailyAutoUnlock() {
  const stored = readStoredArticles();
  if (stored.length === 0) return [];

  const newest = stored[0];
  const lastMilestone = normalizeTo10PmMilestone(newest.publishedAt);
  const currentMilestone = getLatest10PmKuwaitMilestone(new Date());

  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((currentMilestone.getTime() - lastMilestone.getTime()) / msPerDay);

  if (diffDays >= 1) {
    const unlocked = [...stored];
    const existingTitles = new Set(unlocked.map(a => a.title));

    for (let d = 1; d <= diffDays; d++) {
      const milestoneDate = new Date(lastMilestone.getTime() + d * msPerDay);
      const nextEditionNum = unlocked[0].editionNumber + 1;
      const unused = UPCOMING_EDITIONS_POOL.find(t => !existingTitles.has(t.title));
      const template = unused || UPCOMING_EDITIONS_POOL[(nextEditionNum - 1) % UPCOMING_EDITIONS_POOL.length];
      existingTitles.add(template.title);

      const kwInfo = getKuwaitTimeInfo(milestoneDate);

      const autoArticle = {
        id: `ed-${kwInfo.isoDate}-${nextEditionNum}`,
        editionNumber: nextEditionNum,
        title: template.title,
        subtitle: template.subtitle,
        publishedAt: milestoneDate.toISOString(),
        kuwaitDateStr: kwInfo.arabicDate,
        tags: template.tags,
        paragraphs: template.paragraphs.map((p, idx) => ({
          id: `p${idx + 1}`,
          topic: p.topic,
          headline: p.headline,
          sourceNews: p.sourceNews || '',
          text: p.text,
          reactions: {
            laugh: 45 + ((nextEditionNum * 17 + idx * 9) % 70),
            fire: 30 + ((nextEditionNum * 13 + idx * 7) % 50),
            bullseye: 38 + ((nextEditionNum * 19 + idx * 11) % 60)
          }
        }))
      };
      unlocked.unshift(autoArticle);
    }
    saveStoredArticles(unlocked);
    return unlocked;
  }

  return stored;
}

// Masterclass Deep Satirical System Prompt (Two-Stage Editorial Reasoning + Gold-Standard Few-Shot)
const SATIRE_SYSTEM_PROMPT = `أنت الكاتب الصحفي الساخر والمخضرم لعمود «( بين قوسين )» اليومي الذي ينشر الساعة 10:00 مساءً بتوقيت الكويت.
أسلوبك مستلهم من قمة مدرسة المشاغبين الصحفية الكويتية الساخرة (نفس عمود «علامة تعجب !» لفؤاد الهاشم في عصره الذهبي من حيث الجرأة، سلاطة اللسان الذكية، المفارقات العجيبة، التشبيهات الشعبية الكويتية بين قوسين، وإسقاطات الأفلام المصرية الكلاسيكية والتراث)، ولكن بهوية «( بين قوسين )» المستقلة.

⚠️ القاعدة الزمنية الصارمة (حاسمة جداً):
- يُمنع منعاً باتاً استحضار أي أخبار أو أحداث قديمة من ذاكرتك التدريبية مرّ عليها أكثر من 20 يوماً (لا تذكر أحداث السنوات الماضية، ولا المناطيد القديمة، ولا أخبار مر عليها شهور أو سنوات).
- يجب أن تبني كل فقرة من الفقرات الأربع حصرياً ومباشرةً على واحد من الأخبار الحية المرفقة لك في القائمة أدناه (والتي وقعت جميعها خلال آخر 20 يوماً فقط).
- اذكر الخبر الحديث وتاريخه في حقل "sourceNews"، ثم شرّحه بمشرط السخرية!

🎨 الهندسة الأسلوبية الإلزامية لكل شذرة (فقرة):
1. طول كل فقرة يجب أن يكون غنياً ومشبعاً (بين 110 إلى 155 كلمة لكل فقرة)؛ جمل متدفقة طويلة النفس، ساخرة، غير مقتضبة.
2. تبدأ الفقرة بذكر التصريح أو الحدث السياسي العالمي الجديد، ثم تكشف التناقض المضحك فيه، وتتشعب منه إلى مشهد كاريكاتوري (مثل تاجر الشنطة، مقاول الصحية، جمعية تعاونية، ديوانية متقاعدين، دلال عقار، أو مشهد لعبدالفتاح القصري أو إسماعيل ياسين أو عادل إمام أو توفيق الدقن أو اللمبي).
3. طعّم كل فقرة بجملة أو تعبير كويتي/خليجي شعبي لاذع موضوع بين قوسين هكذا: ( ... ) واستخدم علامات التنصيص المزدوجة هكذا: « ... » حول الألقاب الساخرة.
4. اختم كل فقرة بضربة ساخرة قاتلة (Punchline) تفرغ التصريح السياسي من محتواه تماماً وتنتهي بعلامتي تعجب !!.

💎 نموذج مرجعي للبصمة الأسلوبية المطلوبة (اكتب بنفس هذا المستوى الإبداعي والعمق الكوميدي):
"الرئيس الأمريكي دونالد ترامب قضى أسبوعاً كاملاً يهدد بفرض رسوم جمركية ساحقة على الصين وأوروبا وكندا والمكسيك وحتى على «البطاريق» في القطب الجنوبي إذا لم تشترِ منتجات أمريكية، ثم خرج أمس ليعلن تأجيل القرار لأنه تلقى «مكالمة هاتفية لطيفة جداً»! ترامب يدير أعظم دولة نووية في العالم بنفس عقلية «تاجر الشنطة» الذي يفرش بضاعته على الرصيف ويحلف بالطلاق أن سعر القطعة «عشرة دنانير نهائي ومو ربحان فيها فلس»، فإذا مشى الزبون وتركه، ركض وراءه في الشارع وصاح: (تعال يا الطيب.. أخذها بدينارين ونص وعليها قلاص جبن هدية)! المشكلة أن مستشاريه في البيت الأبيض يقفون خلفه في المؤتمر الصحفي وهم يهزون رؤوسهم بإعجاب شديد كلما غير رأيه بين الدقيقة والأخرى، في مشهد يذكرك ببطانة «السلطان المخلوع» في المسلسلات التاريخية الرخيصة، حيث يصرخ السلطان: «أعدموا هذا الرجل!»، فيصيح الحاشية: «عين العقل يا مولاي!»، فإذا قال بعد ثانية: «بل زوجوه ابنتي وعينوه وزيراً للمالية!»، صاحوا بنفس الحماس: «يا لحكمتك التي تخرّ لها الجبال يا طويل العمر»!!"

🛑 الخطوط الحمراء الثلاثة الصارمة (حظر تام):
- ممنوع تماماً التطرق للشؤون الداخلية للدول العربية أو الخليجية أو حكوماتها.
- ممنوع تماماً التطرق للدين أو المذاهب الإسلامية أو الرموز الدينية (نقد طهران يكون سياسياً وعسكرياً واقتصادياً بحتاً).
- ممنوع الألفاظ الخادشة للحياء العام.

أخرج النتيجة بصيغة JSON فقط بهذا الشكل الدقيق:
{
  "title": "عنوان العمود الرئيسي الساخر والجذاب (يحتوي على «...» وعلامة !)",
  "subtitle": "عنوان فرعي ساخر يلخص أبرز مفارقتين في العمود!",
  "tags": ["وسم1", "وسم2", "وسم3", "وسم4"],
  "paragraphs": [
    {
      "topic": "العاصمة / الشخصية السياسية",
      "headline": "عنوان فرعي لاذع للشذرة!",
      "sourceNews": "[تاريخ الخبر] ملخص الخبر الحديث الذي وقعت أحداثه خلال آخر 20 يوماً",
      "satiricalAngle": "تحليل داخلي مختصر للمفارقة الكوميدية والتشبيه المستخدم",
      "text": "نص الفقرة الساخرة الكاملة (110-155 كلمة) بنفس روح علامة تعجب وهوية بين قوسين..."
    }
  ]
}`;

/**
 * Fetches live global political news across 4 international axes,
 * strictly enforcing that `<pubDate>` is within the last 20 days!
 */
async function fetchLiveGlobalHeadlines() {
  const axesFeeds = [
    {
      axis: 'محور أمريكا وترامب والبيت الأبيض',
      url: 'https://news.google.com/rss/search?q=(%D8%AA%D8%B1%D8%A7%D9%85%D8%A8+OR+%22%D8%A7%D9%84%D8%A8%D9%8A%D8%AA+%D8%A7%D9%84%D8%A3%D8%A8%D9%8A%D8%B6%22+OR+%D8%A7%D9%84%D8%A8%D9%86%D8%AA%D8%A7%D8%BA%D9%88%D9%86+OR+%D9%88%D8%A7%D8%B4%D9%86%D8%B7%D9%86)+when:14d&hl=ar&gl=KW&ceid=KW:ar'
    },
    {
      axis: 'محور إيران وطهران والاقتصاد',
      url: 'https://news.google.com/rss/search?q=(%D8%B7%D9%87%D8%B1%D8%A7%D9%86+OR+%D8%A5%D9%8A%D8%B1%D8%A7%D9%86+OR+%22%D8%A7%D9%84%D8%AD%D8%B1%D8%B3+%D8%A7%D9%84%D8%AB%D9%88%D8%B1%D9%8A%22+OR+%D8%A7%D9%84%D8%AA%D9%88%D9%85%D8%A7%D9%86)+when:14d&hl=ar&gl=KW&ceid=KW:ar'
    },
    {
      axis: 'محور روسيا وأوكرانيا وأوروبا والناتو',
      url: 'https://news.google.com/rss/search?q=(%D8%A8%D9%88%D8%AA%D9%8A%D9%86+OR+%D8%B2%D9%8A%D9%84%D9%8A%D9%86%D8%B3%D9%83%D9%8A+OR+%D8%A3%D9%88%D9%83%D8%B1%D8%A7%D9%86%D9%8A%D8%A7+OR+%D8%A7%D9%84%D9%86%D8%A7%D8%AA%D9%88+OR+%D9%85%D8%A7%D9%83%D8%B1%D9%88%D9%86+OR+%D8%A7%D9%84%D8%A7%D8%AA%D8%AD%D8%A7%D8%AF+%D8%A7%D9%84%D8%A3%D9%88%D8%B1%D9%88%D8%A8%D9%8A)+when:14d&hl=ar&gl=KW&ceid=KW:ar'
    },
    {
      axis: 'محور الصين وكوريا الشمالية والأمم المتحدة والترند الدولي',
      url: 'https://news.google.com/rss/search?q=(%22%D9%83%D9%88%D8%B1%D9%8A%D8%A7+%D8%A7%D9%84%D8%B4%D9%85%D8%A7%D9%84%D9%8A%D8%A9%22+OR+%D8%A7%D9%84%D8%B5%D9%8A%D9%86+OR+%D9%83%D9%8A%D9%85+%D8%AC%D9%88%D9%86%D8%BA+OR+%22%D9%85%D8%AC%D9%84%D8%B3+%D8%A7%D9%84%D8%A3%D9%85%D9%86%22+OR+%D9%85%D8%A7%D8%B3%D9%83)+when:14d&hl=ar&gl=KW&ceid=KW:ar'
    },
    {
      axis: 'BBC World Arabic',
      url: 'https://feeds.bbci.co.uk/arabic/world/rss.xml'
    }
  ];

  const allItems = [];

  for (const feed of axesFeeds) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(feed.url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BaynQawsaynBot/2.0)' }
      });
      clearTimeout(timeout);
      if (!res.ok) continue;

      const xml = await res.text();
      const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

      for (const block of itemBlocks) {
        const titleMatch = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
        const pubDateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/);
        if (!titleMatch) continue;

        let rawTitle = (titleMatch[1] || titleMatch[2] || '')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&')
          .trim();

        // Extract source name if at the end "- BBC"
        let sourceName = feed.axis;
        const dashIdx = rawTitle.lastIndexOf(' - ');
        if (dashIdx > 15) {
          sourceName = rawTitle.slice(dashIdx + 3).trim();
          rawTitle = rawTitle.slice(0, dashIdx).trim();
        }

        if (!rawTitle || !isHeadlineSafeAndGlobal(rawTitle)) continue;

        const pubDateObj = pubDateMatch ? new Date(pubDateMatch[1]) : new Date();
        if (isNaN(pubDateObj.getTime())) continue;

        allItems.push({
          axis: feed.axis,
          source: sourceName,
          headline: rawTitle,
          pubDateMs: pubDateObj.getTime(),
          dateLabel: formatShortArabicDate(pubDateObj)
        });
      }
    } catch (_) {}
  }

  if (allItems.length === 0) return [];

  // Reference newest timestamp from the live feeds (avoids any clock skew issues)
  const newestFeedMs = Math.max(...allItems.map(i => i.pubDateMs));

  // Strictly filter out ANY news item older than 20 days from the newest feed timestamp!
  const recent20DaysItems = allItems
    .filter(item => (newestFeedMs - item.pubDateMs) <= MAX_NEWS_AGE_MS && (newestFeedMs - item.pubDateMs) >= -86400000)
    .sort((a, b) => b.pubDateMs - a.pubDateMs);

  // Pick up to 4 newest unique headlines per axis so all 4 global axes are equally represented!
  const seenPrefixes = new Set();
  const axisCounts = {};
  const balancedSelection = [];

  for (const item of recent20DaysItems) {
    const prefix = item.headline.slice(0, 26);
    if (seenPrefixes.has(prefix)) continue;
    const countForAxis = axisCounts[item.axis] || 0;
    if (countForAxis >= 4) continue;

    seenPrefixes.add(prefix);
    axisCounts[item.axis] = countForAxis + 1;
    balancedSelection.push(item);
    if (balancedSelection.length >= 16) break;
  }

  return balancedSelection;
}

async function generateNewDailyEdition({ force = false } = {}) {
  const articles = readStoredArticles();
  const currentMilestone = getLatest10PmKuwaitMilestone(new Date());

  // Prevent duplicate generation on the same 10 PM milestone unless forced
  if (!force && articles.length > 0) {
    const lastMilestone = normalizeTo10PmMilestone(articles[0].publishedAt);
    if (currentMilestone.getTime() <= lastMilestone.getTime()) {
      console.log(`Edition for milestone ${currentMilestone.toISOString()} already exists (#${articles[0].editionNumber}). Skipping duplicate.`);
      return articles[0];
    }
  }

  const existingTitles = new Set(articles.map(a => a.title));
  const recentTopicsSummary = articles
    .slice(0, 4)
    .map(a => `- ${a.title} (${(a.paragraphs || []).map(p => p.headline).join(' / ')})`)
    .join('\n');

  const nextEditionNumber = (articles[0]?.editionNumber || 1) + 1;
  const kwTime = getKuwaitTimeInfo(currentMilestone);
  const apiKey = process.env.GEMINI_API_KEY;

  let generatedData = null;

  if (apiKey) {
    const freshNewsItems = await fetchLiveGlobalHeadlines();
    console.log(`Fetched ${freshNewsItems.length} date-verified global headlines (strictly <= 20 days old).`);

    const newsPrompt = freshNewsItems.length >= 4
      ? freshNewsItems
          .map((item, i) => `${i + 1}. [تاريخ الخبر: ${item.dateLabel} | ${item.source}] ${item.headline}`)
          .join('\n')
      : 'أحدث تطورات الأسبوع الحالي في: البيت الأبيض وتصريحات دونالد ترامب، المفاوضات والأوضاع الاقتصادية في طهران، تطورات حرب روسيا وأوكرانيا والناتو، والصين وكوريا الشمالية.';

    // Try flagship reasoning/creative models first (gemini-2.5-pro is free within 50 req/day quota!), then fast models
    const modelsToTry = [
      'gemini-2.5-pro',
      'gemini-3-flash-preview',
      'gemini-2.5-flash',
      'gemini-flash-latest'
    ];

    for (const modelName of modelsToTry) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: SATIRE_SYSTEM_PROMPT }] },
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: `اكتب عمود الليلة رقم (#${nextEditionNumber}) من «( بين قوسين )» بتاريخ (${kwTime.arabicDate}).

إليك قائمة الأخبار العالمية الحية والحديثة المرصودة خلال آخر 20 يوماً فقط (اختر منها 4 أخبار متنوعة ومختلفة تماماً لبناء الشذرات الأربع، ولا تستخدم أي خبر قديم من خارج هذه القائمة):
${newsPrompt}

تجنب تكرار عناوين أو قفشات الأعمدة السابقة التالية:
${recentTopicsSummary}

تذكر: نريد أعلى درجة من الإبداع الساخر، التشبيهات الشعبية الكويتية بين قوسين ( ... )، النفس الصحفي الطويل، والقفلات القاتلة المنتهية بـ !!.`
                    }
                  ]
                }
              ],
              generationConfig: {
                temperature: 0.95,
                responseMimeType: 'application/json'
              }
            })
          }
        );

        if (response.ok) {
          const result = await response.json();
          let rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
            const parsed = JSON.parse(rawText);
            if (parsed && parsed.title && Array.isArray(parsed.paragraphs) && parsed.paragraphs.length >= 3) {
              generatedData = parsed;
              console.log(`Successfully generated live AI column using ${modelName}`);
              break;
            }
          }
        } else {
          const errText = await response.text();
          console.warn(`Model ${modelName} HTTP ${response.status}: ${errText.slice(0, 180)}`);
        }
      } catch (err) {
        console.error(`Model ${modelName} error:`, err.message);
      }
    }
  }

  if (!generatedData) {
    const unused = UPCOMING_EDITIONS_POOL.find(t => !existingTitles.has(t.title));
    generatedData = unused || UPCOMING_EDITIONS_POOL[(nextEditionNumber - 1) % UPCOMING_EDITIONS_POOL.length];
  }

  const newArticle = {
    id: `ed-${kwTime.isoDate}-${nextEditionNumber}`,
    editionNumber: nextEditionNumber,
    title: generatedData.title,
    subtitle: generatedData.subtitle,
    publishedAt: currentMilestone.toISOString(),
    kuwaitDateStr: kwTime.arabicDate,
    tags: generatedData.tags || ['السياسة العالمية'],
    paragraphs: (generatedData.paragraphs || []).map((p, idx) => ({
      id: `p${idx + 1}`,
      topic: p.topic || `المحور العالمي ${idx + 1}`,
      headline: p.headline || 'بين قوسين!',
      sourceNews: p.sourceNews || '',
      text: p.text,
      reactions: { laugh: 18, fire: 12, bullseye: 15 }
    }))
  };

  articles.unshift(newArticle);
  saveStoredArticles(articles);
  return newArticle;
}

module.exports = {
  getKuwaitTimeInfo,
  getLatest10PmKuwaitMilestone,
  fetchLiveGlobalHeadlines,
  readStoredArticles,
  saveStoredArticles,
  getArticlesWithDailyAutoUnlock,
  generateNewDailyEdition
};
