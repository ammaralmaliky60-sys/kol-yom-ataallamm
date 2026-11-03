const purple = '#7760d7';
const ink = '#35314f';
const muted = '#77738a';
const text = (x, y, label, size = 15, fill = ink, weight = 500) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="inherit" font-size="${size}" font-weight="${weight}" fill="${fill}">${label}</text>`;
const box = (x, y, width, height, fill = '#f0ebfc', stroke = '#d8cfee', radius = 12) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`;
const line = (x1, y1, x2, y2, color = '#bdb0df') => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${color}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
function frame(label, content, caption, height = 300) {
  return `<figure class="learning-diagram" style="margin:22px 0;padding:18px;background:#faf9fd;border:1px solid #eae5f3;border-radius:18px"><svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}" viewBox="0 0 640 ${height}" style="display:block;width:100%;max-height:360px;height:auto">${content}</svg><figcaption style="text-align:center;color:#77738a;font-size:13px;line-height:1.9;padding-top:12px">${caption}</figcaption></figure>`;
}
function computer() {
  const content = box(30, 15, 580, 255, '#f6f2ff', '#cfc1ed', 20)
    + text(320, 43, 'اللوحة الأم: تربط المكونات وتتيح تبادل البيانات', 18, purple, 700)
    + line(182, 126, 280, 126) + line(360, 126, 458, 126) + line(320, 158, 320, 198)
    + box(65, 83, 155, 87, '#fff', '#cfc1ed') + text(143, 115, 'RAM', 21, purple, 700) + text(143, 144, 'ذاكرة العمل المؤقتة', 14)
    + box(262, 82, 116, 88, '#e5dbfa', '#a992da') + text(320, 116, 'CPU', 23, purple, 700) + text(320, 146, 'ينفذ التعليمات', 14)
    + box(420, 83, 155, 87, '#fff', '#cfc1ed') + text(497, 115, 'SSD', 21, purple, 700) + text(497, 144, 'يحفظ الملفات', 14)
    + box(226, 199, 188, 48, '#fff', '#cfc1ed') + text(320, 230, 'منافذ الأجهزة الخارجية', 15);
  return frame('رسم مبسط للوحة الأم والمعالج وذاكرة RAM ووحدة تخزين SSD', content, 'رسم تصوّري للعلاقات، وليس تخطيطاً كهربائياً. تفقد RAM بياناتها عند انقطاع الطاقة، بينما يحتفظ SSD بالملفات.');
}
function files() {
  const content = line(320, 66, 320, 104) + line(130, 104, 510, 104) + line(130, 104, 130, 136) + line(320, 104, 320, 136) + line(510, 104, 510, 136)
    + box(240, 14, 160, 52, '#e9e0fa', '#c7b5e6') + text(320, 47, 'مجلد: تعلّمي', 18, purple, 700)
    + box(50, 136, 160, 52) + text(130, 169, 'مجلد: مستندات', 16)
    + box(240, 136, 160, 52) + text(320, 169, 'مجلد: صور', 16)
    + box(430, 136, 160, 52) + text(510, 169, 'مجلد: تمارين', 16)
    + line(130, 188, 130, 220) + line(320, 188, 320, 220) + line(510, 188, 510, 220)
    + box(50, 220, 160, 44, '#fff', '#e2dbea') + text(130, 248, 'ملخص.docx', 16)
    + box(240, 220, 160, 44, '#fff', '#e2dbea') + text(320, 248, 'رحلة.jpg', 16)
    + box(430, 220, 160, 44, '#fff', '#e2dbea') + text(510, 248, 'ميزانية.xlsx', 16);
  return frame('شجرة ملفات: مجلد رئيسي وثلاثة مجلدات فرعية تحتوي مستنداً وصورة وجدولاً', content, 'المجلد ينظّم الملفات والمجلدات الفرعية. الامتداد مثل .docx أو .jpg يدل غالباً على نوع الملف؛ تغيير اسمه لا يحوّل محتواه.');
}
function network() {
  const content = line(160, 160, 265, 160) + line(375, 160, 476, 160)
    + '<path d="M320 111V65H160V92M320 65H480V92" fill="none" stroke="#b5d9d2" stroke-width="3" stroke-dasharray="6 5"/>'
    + box(265, 112, 110, 96, '#e5f3f0', '#9ccbc0') + '<path d="M288 128V102M352 128V102" stroke="#469788" stroke-width="4" stroke-linecap="round"/>'
    + text(320, 160, 'الموجّه', 19, '#398d7e', 700) + text(320, 187, 'Router', 14, '#398d7e')
    + box(40, 121, 120, 78, '#fff', '#cfc1ed') + text(100, 155, 'الإنترنت', 18, purple, 700) + text(100, 180, 'عبر مزوّد الخدمة', 12, muted)
    + box(476, 121, 124, 78, '#fff', '#cfc1ed') + text(538, 155, 'حاسوب', 18) + text(538, 180, 'كابل شبكة', 12, muted)
    + box(102, 18, 116, 74, '#fff', '#b5d9d2') + text(160, 50, 'هاتف', 18) + text(160, 76, 'Wi-Fi', 13, '#398d7e')
    + box(422, 18, 116, 74, '#fff', '#b5d9d2') + text(480, 50, 'حاسوب محمول', 15) + text(480, 76, 'Wi-Fi', 13, '#398d7e')
    + text(320, 252, 'الأجهزة تتصل بالموجّه لتبادل البيانات والوصول إلى الإنترنت', 16);
  return frame('شبكة منزلية تربط هاتفاً وحاسوبين بالموجّه عبر واي فاي أو كابل، والموجّه متصل بالإنترنت', content, 'Wi-Fi وسيلة اتصال لاسلكي بالشبكة المحلية. الاتصال بالموجّه وحده لا يضمن وجود خدمة إنترنت.');
}
function spreadsheet() {
  let content = box(84, 15, 472, 244, '#fff', '#d8cfee', 8)
    + '<path d="M84 61H556M84 108H556M84 155H556M84 202H556M155 15V259M356 15V259" stroke="#ded6ec" stroke-width="1.5"/>'
    + '<path d="M85 16H555V61H85Z" fill="#e9e1f8"/>'
    + text(120, 45, '#', 17, purple, 700) + text(256, 45, 'A — البند', 17, purple, 700) + text(456, 45, 'B — المبلغ', 17, purple, 700)
    + text(120, 91, '2') + text(256, 91, 'كتب') + text(456, 91, '120')
    + text(120, 138, '3') + text(256, 138, 'قرطاسية') + text(456, 138, '80')
    + text(120, 185, '4') + text(256, 185, 'تنقّل') + text(456, 185, '50')
    + text(120, 235, '5') + text(256, 235, 'المجموع', 16, purple, 700) + text(456, 235, '250', 19, purple, 700)
    + text(320, 292, '=SUM(B2:B4)', 22, purple, 600);
  return frame('مثال جدول نفقات يجمع الخلايا B2 إلى B4 باستخدام SUM، والناتج 250', content, 'الصيغة تبدأ بعلامة =. النطاق B2:B4 يشمل الخلايا B2 وB3 وB4؛ المجموع هنا 120 + 80 + 50 = 250.', 310);
}
function budget() {
  const content = box(205, 14, 230, 60, '#e9e1f8', '#c9b9e5') + text(320, 40, 'دخل افتراضي شهري', 16) + text(320, 63, '1000', 22, purple, 700)
    + line(320, 74, 320, 110) + line(125, 110, 515, 110) + line(125, 110, 125, 145) + line(320, 110, 320, 145) + line(515, 110, 515, 145)
    + box(45, 145, 160, 92, '#fbe9ee', '#f0c4d0') + text(125, 174, 'احتياجات أساسية', 15) + text(125, 209, '600', 26, '#c5718e', 700)
    + box(240, 145, 160, 92, '#e7f3ef', '#bcdbcd') + text(320, 174, 'ادخار', 16) + text(320, 209, '200', 26, '#4f9d83', 700)
    + box(435, 145, 160, 92, '#fff0de', '#ebd4b5') + text(515, 174, 'مصروفات مرنة', 15) + text(515, 209, '200', 26, '#c49758', 700)
    + text(320, 275, 'المجموع المخصّص = الدخل، مع مراجعة الميزانية عند تغيّر الظروف', 15);
  return frame('مثال ميزانية دخلها ألف وحدة: ستمئة للاحتياجات ومئتان للادخار ومئتان لمصروفات مرنة', content, 'الأرقام توضيحية بوحدة نقدية افتراضية، وليست نسباً إلزامية أو نصيحة استثمارية. عدّل التوزيع وفق احتياجاتك والتزاماتك.');
}
function earth() {
  const content = '<circle cx="320" cy="142" r="113" fill="#e9f2fc" stroke="#b3cce3" stroke-width="2"/><ellipse cx="320" cy="142" rx="113" ry="40" fill="none" stroke="#a2bfd9" stroke-width="2"/><ellipse cx="320" cy="142" rx="45" ry="113" fill="none" stroke="#9cbbd7" stroke-width="2"/><path d="M207 142H433" stroke="#dd9fae" stroke-width="3"/><path d="M320 29V255" stroke="#9cbbd7" stroke-width="2"/>'
    + text(320, 18, 'القطب الشمالي', 14, purple)
    + text(320, 281, 'القطب الجنوبي', 14, purple)
    + line(433, 142, 490, 142, '#dd9fae') + text(547, 138, 'خط الاستواء', 16, '#bd6e84') + text(547, 161, 'دائرة عرض 0°', 13, muted)
    + line(284, 71, 185, 61) + text(118, 56, 'خطوط الطول', 17, purple) + text(118, 80, 'بين القطبين', 13, muted)
    + line(218, 180, 173, 203) + text(102, 211, 'دوائر العرض', 17, purple) + text(102, 234, 'موازية للاستواء', 13, muted);
  return frame('كرة أرضية مبسطة توضح القطبين وخط الاستواء وخطوط الطول ودوائر العرض', content, 'هذه خطوط تصوّرية لتحديد المواقع. يقاس العرض شمال خط الاستواء أو جنوبه، والطول شرق خط غرينتش أو غربه.');
}
function cell() {
  const content = '<path d="M201 81C220 31 361 20 419 72c57 53 33 148-39 173-61 22-157 2-181-50-17-35-17-79 2-114Z" fill="#f0e7fc" stroke="#ad91d4" stroke-width="4"/><ellipse cx="309" cy="144" rx="43" ry="38" fill="#bb9edc" stroke="#9879bd" stroke-width="2"/><ellipse cx="314" cy="140" rx="15" ry="13" fill="#8b6bae"/><path d="M230 100c-12-7-26 12-15 23 13 14 37-8 15-23Zm153 72c-18-10-33 15-19 27 16 15 44-14 19-27Z" fill="#f3b8ad" stroke="#d8948a" stroke-width="2"/><path d="m216 110 6 5 4-6 5 4m133 71 7 4 4-7 7 4" stroke="#c6837b" stroke-width="2" fill="none"/><circle cx="368" cy="97" r="5" fill="#d3bfe8"/><circle cx="261" cy="196" r="5" fill="#d3bfe8"/><circle cx="351" cy="213" r="4" fill="#d3bfe8"/>'
    + line(202, 81, 149, 53) + text(91, 50, 'الغشاء الخلوي', 16, purple) + text(91, 75, 'ينظّم دخول المواد', 12, muted)
    + line(311, 145, 454, 113) + text(542, 111, 'النواة', 18, purple, 700) + text(542, 137, 'تحوي معظم المادة الوراثية', 12, muted)
    + line(377, 188, 459, 218, '#d8948a') + text(542, 220, 'الميتوكوندريا', 16, '#bf8178') + text(542, 245, 'تنتج معظم طاقة الخلية', 12, muted)
    + line(242, 175, 163, 218) + text(87, 218, 'السيتوبلازم', 16, purple) + text(87, 243, 'وسط توجد فيه العضيات', 12, muted);
  return frame('رسم مبسط لخلية حيوانية يوضح الغشاء والنواة والميتوكوندريا والسيتوبلازم', content, 'نموذج تعليمي لخلية حيوانية، ولا يمثل جميع أنواع الخلايا أو أحجام العضيات الحقيقية. الخلية النباتية تضم أيضاً جداراً خلوياً وبلاستيدات في الأجزاء الخضراء.');
}

/** Returns a general educational illustration for a supported content visual key. */
export function learningDiagram(visual, lesson = {}) {
  switch (visual) {
    case 'computer': return computer();
    case 'files': return files();
    case 'network': return network();
    case 'finance': return lesson.track === 'computer' ? spreadsheet() : budget();
    case 'earth': return earth();
    case 'cell': return cell();
    default: return '';
  }
}
