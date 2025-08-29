import './style.css';
import * as PIXI from 'pixi.js';

// ----- Local storage helpers -----
const LS_KEY = 'starfield.posts.v1';
type Post = { id: string; title: string; text: string; imageUrl: string; createdAt: number };

function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

function loadPosts(): Post[]{
  try {
    if (!isLocalStorageAvailable()) {
      console.warn('localStorage غير متوفر، سيتم استخدام البيانات المؤقتة فقط');
      return [];
    }
    
    const data = localStorage.getItem(LS_KEY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      console.warn('بيانات localStorage تالفة، سيتم إعادة تعيينها');
      return [];
    }
    
    console.log('تم تحميل', parsed.length, 'منشور من localStorage');
    return parsed as Post[];
  } catch (error) {
    console.error('خطأ في تحميل المنشورات:', error);
    return [];
  }
}

function savePosts(posts: Post[]): boolean {
  try {
    if (!isLocalStorageAvailable()) {
      console.warn('localStorage غير متوفر، لا يمكن حفظ البيانات');
      return false;
    }
    
    const dataStr = JSON.stringify(posts);
    
    // تحقق من حجم البيانات (localStorage له حد أقصى حوالي 5-10MB)
    if (dataStr.length > 5 * 1024 * 1024) {
      console.warn('البيانات كبيرة جداً للحفظ في localStorage');
      // احتفظ بآخر 100 منشور فقط
      const recentPosts = posts.slice(-100);
      localStorage.setItem(LS_KEY, JSON.stringify(recentPosts));
      console.log('تم حفظ آخر 100 منشور فقط');
      return true;
    }
    
    localStorage.setItem(LS_KEY, dataStr);
    console.log('تم حفظ', posts.length, 'منشور في localStorage');
    return true;
  } catch (error) {
    console.error('خطأ في حفظ المنشورات:', error);
    
    // في حالة امتلاء localStorage، احذف المنشورات القديمة
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      try {
        const recentPosts = posts.slice(-50);
        localStorage.setItem(LS_KEY, JSON.stringify(recentPosts));
        console.log('تم حفظ آخر 50 منشور بعد حذف القديمة');
        return true;
      } catch {
        console.error('فشل في حفظ البيانات نهائياً');
      }
    }
    
    return false;
  }
}

// Seed with some demo posts if empty
let posts: Post[] = loadPosts();
if (!posts.length) {
  posts = Array.from({ length: 300 }, (_, i) => ({
    id: crypto.randomUUID(),
    title: `نجمة #${i+1}`,
    text: 'نص قصير يصف هذه النجمة ورسالتها المميزة.',
    imageUrl: `https://picsum.photos/seed/${i+11}/800/500`,
    createdAt: Date.now() - (300 - i) * 1000 * 10
  }));
  savePosts(posts);
}

// ----- PixiJS setup -----
const app = new PIXI.Application({ resizeTo: window, backgroundAlpha: 0, antialias: true });
document.getElementById('app')!.appendChild(app.view as HTMLCanvasElement);

const stage = new PIXI.Container();
app.stage.addChild(stage);

// Star texture (soft glow via radial gradient)
function makeGlowTexture(size=64){
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const r = size/2; const cx = r, cy = r;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(156,195,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
  return PIXI.Texture.from(c);
}
const starTexture = makeGlowTexture(64);

type Star = PIXI.Sprite & { vx:number; vy:number; wobble:number; w:number; msg:Post; __oldScale?:number; __oldTint?:number };
const stars: Star[] = [] as unknown as Star[];
const W = () => app.renderer.width; const H = () => app.renderer.height;
function rand(a:number,b:number){ return a + Math.random()*(b-a) }

function addStar(msg: Post){
  const sp = new PIXI.Sprite(starTexture) as Star;
  const scale = rand(0.18, 0.7);
  sp.scale.set(scale);
  sp.alpha = rand(0.6, 1);
  (sp as any).baseAlpha = sp.alpha;
  sp.tint = 0x9cc3ff;
  sp.x = rand(-100, W()+100);
  sp.y = rand(-100, H()+100);
  sp.vx = rand(-0.3, 0.3) || 0.1;
  sp.vy = rand(-0.25, 0.25) || -0.1;
  sp.wobble = rand(0, Math.PI*2); sp.w = rand(0.001, 0.004);
  sp.eventMode = 'static'; sp.cursor = 'pointer'; sp.msg = msg;
  sp.on('pointerover', () => { sp.__oldScale = sp.scale.x; sp.__oldTint = sp.tint as number; sp.scale.set(sp.scale.x*1.6); sp.tint = 0xffffff; });
  sp.on('pointerout', () => { sp.scale.set(sp.__oldScale || scale); sp.tint = (sp.__oldTint || 0x9cc3ff) as any; });
  sp.on('pointertap', () => openModal(sp.msg));
  stage.addChild(sp); stars.push(sp);
}

// Background tiny stars
const bg = new PIXI.Graphics();
bg.alpha = 0.35;
function drawBackground(){
  bg.clear();
  for (let i=0;i<450;i++){
    const x = Math.random()*app.renderer.width;
    const y = Math.random()*app.renderer.height;
    const r = Math.random()*1.2;
    bg.beginFill(0x6ea8ff).drawCircle(x,y,r).endFill();
  }
}
drawBackground();
app.stage.addChildAt(bg, 0);

// Initialize stars for existing posts
for (const p of posts) addStar(p);

// ----- Modal elements -----
const modal = document.getElementById('modal') as HTMLDivElement;
const mImg = document.getElementById('mImg') as HTMLImageElement;
const mText = document.getElementById('mText') as HTMLParagraphElement;
const mTitle = document.getElementById('mTitle') as HTMLHeadingElement;
const closeBtn = document.getElementById('closeBtn') as HTMLButtonElement;
function openModal(msg: Post){
  mTitle.textContent = msg.title;
  mText.textContent = msg.text;
  mImg.src = msg.imageUrl;
  modal.style.display = 'flex';
}
function closeModal(){ modal.style.display = 'none'; mImg.src = '' }
modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });
closeBtn.addEventListener('click', closeModal);
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); formSheet.classList.remove('open'); } });

// ----- Submit Sheet -----
const formSheet = document.getElementById('formSheet') as HTMLDivElement;
const addBtnTop = document.getElementById('addBtnTop') as HTMLButtonElement;
const sheetClose = document.getElementById('sheetClose') as HTMLButtonElement;
const starForm = document.getElementById('starForm') as HTMLFormElement;
const titleInput = document.getElementById('titleInput') as HTMLInputElement;
const textInput = document.getElementById('textInput') as HTMLTextAreaElement;
const imageInput = document.getElementById('imageInput') as HTMLInputElement;
const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
const toast = document.getElementById('toast') as HTMLDivElement;

// التحقق من وجود العناصر
console.log('Form elements check:', {
  formSheet: !!formSheet,
  addBtnTop: !!addBtnTop,
  sheetClose: !!sheetClose,
  starForm: !!starForm,
  titleInput: !!titleInput,
  textInput: !!textInput,
  imageInput: !!imageInput,
  clearBtn: !!clearBtn,
  toast: !!toast
});

// التحقق من دعم localStorage
if (!isLocalStorageAvailable()) {
  console.warn('localStorage غير مدعوم في هذا المتصفح');
  showToast('تحذير: التخزين المحلي غير مدعوم، البيانات ستُفقد عند إعادة تحميل الصفحة', 'warning');
}

addBtnTop.addEventListener('click', () => {
  console.log('Add button clicked'); // تتبع
  formSheet.classList.add('open');
});
sheetClose.addEventListener('click', () => {
  console.log('Close button clicked'); // تتبع
  formSheet.classList.remove('open');
});

// optional: close sheet when clicking outside (on the parallax/backdrop)
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (formSheet.classList.contains('open')){
    const inside = formSheet.contains(target) || (target.id === 'addBtnTop');
    if (!inside) formSheet.classList.remove('open');
  }
});

clearBtn.addEventListener('click', () => { 
  titleInput.value=''; 
  textInput.value=''; 
  imageInput.value='';
  console.log('Form cleared');
});

// إضافة مستمع لتغيير الصورة للتحقق من صحتها
imageInput.addEventListener('change', (e) => {
  const files = (e.target as HTMLInputElement).files;
  if (files && files[0]) {
    const file = files[0];
    console.log('File selected:', file.name, file.type, file.size);
    
    // تحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      showToast('يرجى اختيار ملف صورة صالح', 'error');
      imageInput.value = '';
      return;
    }
    
    // تحقق من حجم الملف (أقل من 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast('حجم الصورة كبير جداً (يجب أن يكون أقل من 10MB)', 'error');
      imageInput.value = '';
      return;
    }
    
    // عرض معلومات الملف
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    console.log(`صورة صالحة: ${file.name} (${sizeMB}MB)`);
  }
});

starForm.addEventListener('submit', async (e) => {
  console.log('Form submit triggered!'); // تتبع
  e.preventDefault();
  
  // تعطيل زر الإرسال أثناء المعالجة
  const submitBtn = starForm.querySelector('button[type="submit"]') as HTMLButtonElement;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري النشر...';
    submitBtn.classList.add('loading');
  }
  
  try {
    const files = imageInput.files;
    console.log('Form data:', {
      title: titleInput.value,
      text: textInput.value,
      hasFile: files && files[0] ? true : false
    }); // تتبع
    
    // basic validation
    if (!titleInput.value.trim()) {
      showToast('يرجى إدخال عنوان للمنشور', 'warning');
      return;
    }
    
    if (!textInput.value.trim()) {
      showToast('يرجى إدخال نص للمنشور', 'warning');
      return;
    }
    
    if (!files || !files[0]) {
      showToast('يرجى اختيار صورة للمنشور', 'warning');
      return;
    }
    
    console.log('Converting image...'); // تتبع
    const file = files[0];
    
    let dataUrl: string;
    try {
      dataUrl = await fileToDataUrl(file, 1200, 0.85);
    } catch (imageError) {
      console.error('خطأ في تحويل الصورة:', imageError);
      showToast('خطأ في معالجة الصورة: ' + (imageError instanceof Error ? imageError.message : 'خطأ غير معروف'), 'error');
      return;
    }
    
    const post: Post = {
      id: crypto.randomUUID(),
      title: titleInput.value.trim(),
      text: textInput.value.trim(),
      imageUrl: dataUrl,
      createdAt: Date.now()
    };
    
    console.log('Saving post...', post); // تتبع
    posts.push(post);
    
    const saveSuccess = savePosts(posts);
    if (!saveSuccess) {
      showToast('تم إنشاء المنشور ولكن فشل في حفظه (سيختفي عند إعادة تحميل الصفحة)', 'warning');
    }
    
    addStar(post);
    starForm.reset();
    formSheet.classList.remove('open');
    showToast('تم النشر بنجاح! ✨');
    console.log('Post published successfully!'); // تتبع
    
  } catch (error) {
    console.error('خطأ عام في النشر:', error);
    showToast('حدث خطأ أثناء النشر، يرجى المحاولة مرة أخرى', 'error');
  } finally {
    // إعادة تفعيل زر الإرسال
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'نشر';
      submitBtn.classList.remove('loading');
    }
  }
});

async function fileToDataUrl(file: File, maxDim=1200, quality=0.85): Promise<string>{
  try {
    console.log('Converting file:', file.name, file.type, file.size);
    
    // تحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      throw new Error('الملف المحدد ليس صورة صالحة');
    }
    
    // تحقق من حجم الملف (أقل من 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('حجم الصورة كبير جداً (يجب أن يكون أقل من 10MB)');
    }
    
    // استخدام طريقة بديلة أكثر موثوقية
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('فشل في إنشاء canvas context'));
            return;
          }
          
          // حساب الأبعاد الجديدة
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          
          // رسم الصورة
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // تحويل إلى data URL
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          console.log('Image converted successfully, size:', dataUrl.length);
          resolve(dataUrl);
        } catch (error) {
          console.error('Error in canvas operations:', error);
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('فشل في تحميل الصورة'));
      };
      
      // تحميل الصورة
      img.src = URL.createObjectURL(file);
    });
  } catch (error) {
    console.error('Error in fileToDataUrl:', error);
    throw error;
  }
}

app.ticker.add((ticker: PIXI.Ticker) => {
  const delta = ticker.deltaTime as number;
  const w = W(), h = H();
  for (const sp of stars) {
    sp.wobble += sp.w * delta;
    sp.x += sp.vx * delta + Math.cos(sp.wobble) * 0.05 * delta;
    sp.y += sp.vy * delta + Math.sin(sp.wobble) * 0.05 * delta;
    // twinkle
    const base = (sp as any).baseAlpha ?? 0.8;
    const tw = 0.2 * Math.sin(sp.wobble * 1.5);
    sp.alpha = Math.max(0.4, Math.min(1, base + tw));
    const pad = 120;
    if (sp.x < -pad) sp.x = w + pad;
    if (sp.x > w + pad) sp.x = -pad;
    if (sp.y < -pad) sp.y = h + pad;
    if (sp.y > h + pad) sp.y = -pad;
  }
});

let resizeTimer: number | undefined;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => drawBackground(), 200);
});

// ----- Parallax planets -----
const parallax = document.getElementById('parallax') as HTMLDivElement;
const p1 = parallax?.querySelector('.p1') as HTMLDivElement | null;
const p2 = parallax?.querySelector('.p2') as HTMLDivElement | null;
const p3 = parallax?.querySelector('.p3') as HTMLDivElement | null;
let mouseX = 0, mouseY = 0;
window.addEventListener('pointermove', (e) => {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = (e.clientY / window.innerHeight) * 2 - 1;
});
app.ticker.add(() => {
  if (!p1 || !p2 || !p3) return;
  p1.style.transform = `translate(${mouseX * -10}px, ${mouseY * -6}px)`;
  p2.style.transform = `translate(${mouseX * 14}px, ${mouseY * 10}px)`;
  p3.style.transform = `translate(${mouseX * 6}px, ${mouseY * 4}px)`;
});

function showToast(msg: string, type: 'success' | 'error' | 'warning' = 'success'){
  console.log('Showing toast:', msg, 'type:', type); // تتبع
  if (!toast) {
    console.log('Toast element not found!'); // تتبع
    // fallback: عرض رسالة في alert إذا لم يوجد toast
    alert(msg);
    return;
  }
  
  toast.textContent = msg;
  
  // إزالة جميع الفئات السابقة
  toast.className = 'toast show';
  
  // إضافة فئة حسب النوع
  if (type === 'error') {
    toast.style.backgroundColor = 'rgba(220, 38, 38, 0.9)';
    toast.style.borderColor = '#dc2626';
  } else if (type === 'warning') {
    toast.style.backgroundColor = 'rgba(245, 158, 11, 0.9)';
    toast.style.borderColor = '#f59e0b';
  } else {
    toast.style.backgroundColor = 'rgba(16,24,39,.9)';
    toast.style.borderColor = 'var(--border)';
  }
  
  console.log('Toast classes:', toast.className); // تتبع
  
  setTimeout(() => {
    toast.classList.remove('show');
    console.log('Toast hidden'); // تتبع
  }, type === 'error' ? 3000 : 1800); // أخطاء تظهر لفترة أطول
}
