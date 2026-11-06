from pathlib import Path
import re,html
root=Path(__file__).resolve().parent.parent

def inline(text):
 text=html.escape(text)
 text=re.sub(r'`([^`]+)`',r'<code dir="ltr">\1</code>',text)
 text=re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',text)
 text=re.sub(r'\[([^]]+)\]\(([^)]+)\)',lambda m:'<span>'+m[1]+'</span>' if m[2].endswith('.md') else '<a href="'+m[2]+'">'+m[1]+'</a>',text)
 return text

def render(source):
 result=[];listing=None;code=False;code_lines=[];table=[]
 def close_list():
  nonlocal listing
  if listing: result.append('</'+listing+'>');listing=None
 def close_table():
  nonlocal table
  if table:
   result.append('<div class="table-scroll"><table>')
   for i,row in enumerate(table):
    if all(re.fullmatch(r'[:\- ]+',cell) for cell in row):continue
    tag='th' if i==0 else 'td'
    result.append('<tr>'+''.join('<'+tag+'>'+inline(cell)+'</'+tag+'>' for cell in row)+'</tr>')
   result.append('</table></div>');table=[]
 for line in source.splitlines():
  if line.startswith('```'):
   close_list();close_table()
   if code:result.append('<pre dir="ltr"><code>'+html.escape('\n'.join(code_lines))+'</code></pre>');code_lines=[]
   code=not code;continue
  if code:code_lines.append(line);continue
  if line.startswith('|'):
   close_list();table.append([s.strip() for s in line.strip('|').split('|')]);continue
  close_table()
  heading=re.match(r'^(#{1,4}) (.+)',line)
  bullet=re.match(r'^(-|\d+\.) (.+)',line)
  if heading:
   close_list();n=len(heading[1]);result.append(f'<h{n}>'+inline(heading[2])+f'</h{n}>')
  elif bullet:
   kind='ul' if bullet[1]=='-' else 'ol'
   if listing!=kind:close_list();result.append('<'+kind+'>');listing=kind
   result.append('<li>'+inline(bullet[2])+'</li>')
  elif not line.strip():close_list()
  else:close_list();result.append('<p>'+inline(line)+'</p>')
 close_list();close_table()
 return '\n'.join(result)

chapters=['LEARNER_GUIDE.md','DEVELOPMENT_GUIDE.md']
body=''.join('<article id="chapter'+str(i)+'">'+render((root/'docs'/file).read_text())+'</article>' for i,file in enumerate(chapters))
page='''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>دليل كل يوم أتعلم — الاستخدام والتطوير</title><link rel="stylesheet" href="./fonts.css"><style>
*{box-sizing:border-box}body{margin:0;background:#f7f6fb;color:#493d59;font:15px/2 'IBM Plex Sans Arabic',Tahoma,sans-serif}.guide-cover{background:#efe8fa;color:#684e91;padding:45px 35px;border-radius:0 0 24px 24px;max-width:970px;margin:auto}.guide-cover .brand{font-size:18px;color:#9073b7;margin-bottom:16px}.guide-cover h1{font-size:38px;line-height:1.6;margin:0}.guide-cover p{max-width:700px;color:#917ca6}.counts{display:flex;gap:14px;margin-top:25px}.counts>span{background:#fff9;border-radius:10px;padding:10px 20px;font-size:14px}.guide-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:25px}.guide-actions a,.guide-actions button{border:1px solid #d8c8e9;background:#fff;border-radius:7px;padding:9px 16px;font:inherit;font-size:13px;text-decoration:none;color:#8664a7;cursor:pointer}.guide-actions a.primary{background:#8865b2;color:#fff;border-color:#8865b2}main{max-width:970px;background:#fff;margin:24px auto 50px;padding:30px 45px;border-radius:16px}article+article{margin-top:50px;border-top:2px solid #e6daef;padding-top:30px}h1{font-size:28px;color:#73508e}h2{font-size:21px;color:#8962a4;border-bottom:1px solid #efe7f5;padding-bottom:8px;margin-top:35px}h3{font-size:17px;color:#a07bb8}p{margin:12px 0}li{margin:6px 0}ul,ol{padding-right:25px}a{color:#8b62ab}strong{color:#73508e}code{font-family:'DM Sans',monospace;color:#80579d;unicode-bidi:embed;font-size:.9em}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f8f4fc;padding:15px;border-radius:8px;text-align:left;line-height:1.7;font-size:12px;border:1px solid #eee4f5;break-inside:avoid}.table-scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:13px}th,td{border:1px solid #eadef1;padding:9px 12px;text-align:right;vertical-align:top}th{background:#f6effc;color:#86609e}footer{text-align:center;font-size:12px;color:#a68bb9;padding:15px 0}@page{size:A4;margin:17mm 15mm}@media print{body{background:white;font-size:11px;line-height:1.9}.guide-actions{display:none}.guide-cover{padding:30px 22px;border-radius:10px;margin-bottom:25px}.guide-cover h1{font-size:30px}.guide-cover p{font-size:13px}.counts>span{font-size:11px;padding:7px 15px}.counts{gap:9px}main{margin:0;padding:0;border-radius:0}h1{font-size:23px}h2{font-size:17px;margin-top:20px;break-after:avoid}h3{font-size:14px;break-after:avoid}p{margin:8px 0}li{margin:4px 0}article+article{break-before:page;border:0;margin-top:0;padding:0}table{font-size:10px}tr{break-inside:avoid}pre{font-size:9px}footer{font-size:10px}}
@media(max-width:600px){.guide-cover{padding:28px 22px}.guide-cover h1{font-size:29px}.counts{gap:7px;flex-wrap:wrap}.counts>span{font-size:12px;padding:8px 13px}main{margin:16px;padding:22px;font-size:14px}h1{font-size:24px}h2{font-size:20px}td,th{padding:8px;font-size:11px}}

/* Site-wide typography: 700 weight for all Arabic/Latin content and controls.
 * Existing IBM Plex Sans Arabic and DM Sans bold font files remain local/offline. */
body,body *,body input::placeholder,body textarea::placeholder{font-weight:700!important}
</style></head><body><header class="guide-cover"><div class="brand">كل يوم أتعلم · دليل عملي</div><h1>مدرستك الشخصية،<br>من أول درس إلى تطوير المنصة</h1><p>دليل عربي لاستخدام الدروس والاختبارات والتدريب الصوتي، مع خطة تعلم وتطبيقات عملية، ومرجع لتشغيل المشروع وتوسيعه ونشره.</p><div class="counts"><span>١٤٦ درساً</span><span>٥٨٤ سؤالاً</span><span>٣ مسارات تعليمية</span></div><nav class="guide-actions"><a class="primary" href="#chapter0">دليل المتعلم</a><a href="#chapter1">دليل التطوير</a><a href="./guide.pdf" download>تنزيل PDF</a><button onclick="window.print()">طباعة الدليل</button><a href="./project.zip" download>تنزيل ملفات المشروع</a><a href="./">العودة إلى المدرسة</a></nav></header><main>'''+body+'''</main><footer>كل يوم أتعلم — معرفة تنمو بالممارسة · النتائج محفوظة محلياً · المستويات تعليمية وغير معتمدة</footer></body></html>'''
(root/'dist'/'guide.html').write_text(page)
print('Generated dist/guide.html from two Arabic guides')
