import './style.css';
import * as PIXI from 'pixi.js';
import { loadPosts, addPost, type Post } from './supabase';

// ----- Load only user-created posts (no demo data) -----
let posts: Post[] = [];

// ----- Background Music Setup -----
const backgroundMusic = document.getElementById('backgroundMusic') as HTMLAudioElement;
const musicToggle = document.getElementById('musicToggle') as HTMLButtonElement;
let musicEnabled = false;
let userInteracted = false;

// Music control functions
function playMusic() {
  if (backgroundMusic && userInteracted) {
    backgroundMusic.volume = 0.3; // Set to 30% volume for ambient effect
    backgroundMusic.play().then(() => {
      musicEnabled = true;
      updateMusicButton();
      console.log('Background music started');
    }).catch(error => {
      console.log('Could not play music:', error);
    });
  }
}

function pauseMusic() {
  if (backgroundMusic) {
    backgroundMusic.pause();
    musicEnabled = false;
    updateMusicButton();
    console.log('Background music paused');
  }
}

function toggleMusic() {
  userInteracted = true;
  if (musicEnabled) {
    pauseMusic();
  } else {
    playMusic();
  }
}

function updateMusicButton() {
  if (musicToggle) {
    if (musicEnabled) {
      musicToggle.textContent = '🎵';
      musicToggle.classList.add('playing');
      musicToggle.title = 'إيقاف الموسيقى';
    } else {
      musicToggle.textContent = '🎵';
      musicToggle.classList.remove('playing');
      musicToggle.title = 'تشغيل الموسيقى';
    }
  }
}

// Setup music controls
if (musicToggle) {
  musicToggle.addEventListener('click', toggleMusic);
}

// Music loading and error handling
if (backgroundMusic) {
  backgroundMusic.addEventListener('loadstart', () => {
    console.log('Loading background music...');
  });

  backgroundMusic.addEventListener('canplaythrough', () => {
    console.log('Background music ready to play');
    updateMusicButton();
  });

  backgroundMusic.addEventListener('error', (e) => {
    console.error('Error loading background music:', e);
    if (musicToggle) {
      musicToggle.style.display = 'none'; // Hide button if music fails to load
    }
  });

  backgroundMusic.addEventListener('ended', () => {
    // Music will loop automatically due to 'loop' attribute
    console.log('Background music loop');
  });
}

// Auto-start music on first user interaction
function startMusicOnFirstInteraction() {
  if (!userInteracted) {
    userInteracted = true;
    // Start music and show welcome
    setTimeout(() => {
      if (backgroundMusic && backgroundMusic.readyState >= 2) { // HAVE_CURRENT_DATA
        playMusic();
        console.log('🎵 Welcome to Meno Augusta! Music is now playing');
      } else {
        console.log('Welcome to Meno Augusta! ✨');
      }
    }, 500); // Small delay for better UX
  }
}

// Listen for various user interactions to enable music
['click', 'touchstart', 'keydown'].forEach(event => {
  document.addEventListener(event, startMusicOnFirstInteraction, { once: true });
});

async function initializePosts() {
  try {
    console.log('Loading posts from Supabase...');
    posts = await loadPosts();
    console.log('Loaded user posts:', posts.length);
  } catch (error) {
    console.error('Failed to load posts from Supabase:', error);
    console.log('Starting with empty posts array');
    posts = [];
  }
}

// ----- PixiJS setup (async initialization) -----
async function initPixiApp() {
  const app = new PIXI.Application();
  
  try {
    await app.init({ resizeTo: window, backgroundAlpha: 0, antialias: true });
    
    // Get canvas element safely
    const canvasElement = app.canvas;
    
    if (canvasElement) {
      document.getElementById('app')!.appendChild(canvasElement);
      console.log('PixiJS canvas successfully added to DOM');
    } else {
      throw new Error('Canvas element not found');
    }
    
    const stage = new PIXI.Container();
    app.stage.addChild(stage);
    
    return { app, stage };
  } catch (error) {
    console.error('Failed to initialize PixiJS:', error);
    
    // Create fallback message
    const fallback = document.createElement('div');
    fallback.textContent = 'Failed to initialize graphics. Please refresh the page.';
    fallback.style.color = 'white';
    fallback.style.textAlign = 'center';
    fallback.style.marginTop = '50px';
    document.getElementById('app')!.appendChild(fallback);
    
    throw error;
  }
}

// Initialize PixiJS and continue with the rest of the app
initPixiApp().then(({ app, stage }) => {
app.stage.addChild(stage);

// Mobile-friendly canvas interaction
app.stage.eventMode = 'static';
app.stage.hitArea = app.screen;

// Add canvas click/tap handler for mobile-friendly star creation
app.stage.on('pointertap', (event) => {
  // Check if click was on empty space (not on a star)
  const target = event.target;
  if (target === app.stage) {
    // Mobile-friendly: open the form sheet on canvas tap
    console.log('Canvas tapped - opening form sheet');
    const formSheet = document.getElementById('formSheet') as HTMLDivElement;
    if (formSheet) {
      formSheet.classList.add('open');
    }
  }
});

// Augusta-inspired star texture with golden glow
function makeGlowTexture(size=100){
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const r = size/2; const cx = r, cy = r;
  
  // Create Augusta-style golden star gradient
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); // Bright white center
  grad.addColorStop(0.2, 'rgba(255,235,180,0.9)'); // Warm golden inner
  grad.addColorStop(0.5, 'rgba(212,175,55,0.7)'); // Augusta gold
  grad.addColorStop(0.8, 'rgba(184,134,11,0.3)'); // Deeper gold
  grad.addColorStop(1, 'rgba(255,255,255,0)'); // Transparent edge
  
  ctx.fillStyle = grad; 
  ctx.beginPath(); 
  ctx.arc(cx, cy, r, 0, Math.PI*2); 
  ctx.fill();
  
  return PIXI.Texture.from(c);
}
const starTexture = makeGlowTexture(100);

type Star = PIXI.Sprite & { vx:number; vy:number; wobble:number; w:number; msg:Post; __oldScale?:number; __oldTint?:number };
const stars: Star[] = [] as unknown as Star[];
const W = () => app.renderer.width; const H = () => app.renderer.height;
function rand(a:number,b:number){ return a + Math.random()*(b-a) }

function addStar(msg: Post){
  const sp = new PIXI.Sprite(starTexture) as Star;
  const scale = rand(0.4, 1.2); // Varied sizes for visual interest
  sp.scale.set(scale);
  sp.alpha = rand(0.85, 1); // High visibility
  (sp as any).baseAlpha = sp.alpha;
  sp.tint = 0xffd700; // Augusta golden color
  // Use stored position if available, otherwise random
  sp.x = msg.x !== undefined ? msg.x : rand(-100, W()+100);
  sp.y = msg.y !== undefined ? msg.y : rand(-100, H()+100);
  sp.vx = rand(-0.3, 0.3) || 0.1; // Gentle floating motion
  sp.vy = rand(-0.2, 0.2) || -0.1;
  sp.wobble = rand(0, Math.PI*2); sp.w = rand(0.001, 0.005); // Subtle pulse
  sp.eventMode = 'static'; sp.cursor = 'pointer'; sp.msg = msg;
  
  // Augusta-style hover effects
  sp.on('pointerover', () => { 
    sp.__oldScale = sp.scale.x; 
    sp.__oldTint = sp.tint as number; 
    sp.scale.set(sp.scale.x*1.5); 
    sp.tint = 0xffffff; // Bright white on hover
  });
  sp.on('pointerout', () => { 
    sp.scale.set(sp.__oldScale || scale); 
    sp.tint = (sp.__oldTint || 0xffd700) as any; 
  });
  sp.on('pointertap', () => openModal(sp.msg));
  
  stage.addChild(sp);
  stars.push(sp);
  
  console.log('Augusta star added:', msg.title, 'Total stars:', stars.length);
}

// Function to render all stars from posts
function renderAllStars(){
  // Clear existing stars
  stars.forEach(star => {
    stage.removeChild(star);
  });
  stars.length = 0;
  
  // Add stars for all loaded posts
  posts.forEach(post => {
    addStar(post);
  });
  
  console.log('Rendered all stars:', posts.length);
}

// Minimal Augusta-inspired background stars
const bg = new PIXI.Graphics();
bg.alpha = 0.15; // Very subtle background
function drawBackground(){
  bg.clear();
  // Fewer, more elegant background stars
  for (let i=0;i<80;i++){ 
    const x = Math.random()*app.renderer.width;
    const y = Math.random()*app.renderer.height;
    const r = Math.random()*0.5 + 0.2; // Small and consistent
    // Use Augusta color palette for background stars
    const color = Math.random() > 0.7 ? 0xd4af37 : 0x4a9eff; // Gold or blue
    bg.beginFill(color).drawCircle(x,y,r).endFill();
  }
}
drawBackground();
app.stage.addChildAt(bg, 0); // Keep in background

// Initialize stars for existing posts
console.log('Creating stars for', posts.length, 'posts');
for (const p of posts) addStar(p);
console.log('Total stars created:', stars.length);

// ----- Modal elements -----
const modal = document.getElementById('modal') as HTMLDivElement;
const mImg = document.getElementById('mImg') as HTMLImageElement;
const mText = document.getElementById('mText') as HTMLParagraphElement;
const mTitle = document.getElementById('mTitle') as HTMLHeadingElement;
const closeBtn = document.getElementById('closeBtn') as HTMLButtonElement;
function openModal(msg: Post){
  mTitle.textContent = msg.title;
  mText.textContent = msg.text;
  
  // Handle optional image
  if (msg.image && msg.image.trim()) {
    mImg.src = msg.image;
    mImg.style.display = 'block';
  } else {
    mImg.src = '';
    mImg.style.display = 'none';
  }
  
  modal.style.display = 'flex';
}
function closeModal(){ 
  modal.style.display = 'none'; 
  mImg.src = '';
  mImg.style.display = 'none';
}
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

// Initialize posts from Supabase and render stars
initializePosts().then(() => {
  // Render all loaded stars after posts are loaded
  renderAllStars();
  
  // Show welcome message with music info after everything is loaded
  setTimeout(() => {
    if (musicEnabled && backgroundMusic && !backgroundMusic.paused) {
      showToast('🎵 مرحباً بك في مجرة الرسائل! الموسيقى تعزف الآن', 'success');
    } else if (userInteracted) {
      showToast('مرحباً بك في مجرة الرسائل! اضغط 🎵 لتشغيل الموسيقى', 'success');
    }
  }, 1000);
});

// Mobile-friendly: prevent form sheet from closing when tapping inside on mobile
const isMobile = window.innerWidth <= 768;
if (isMobile) {
  // Add mobile-specific welcome message
  console.log('Mobile device detected - optimized UI loaded');
  
  // Prevent accidental form closure on mobile
  document.addEventListener('touchstart', (e) => {
    const target = e.target as HTMLElement;
    if (formSheet.classList.contains('open')) {
      const inside = formSheet.contains(target) || (target.id === 'addBtnTop');
      // On mobile, only close if user taps the close button or outside the sheet
      if (!inside && !target.closest('.sheet')) {
        formSheet.classList.remove('open');
      }
    }
  });
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
    showToast(`تم اختيار الصورة: ${file.name} (${sizeMB}MB)`, 'success');
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
    
    // Image is now optional
    let dataUrl: string | undefined = undefined;
    
    if (files && files[0]) {
      console.log('Converting image...'); // تتبع
      const file = files[0];
      
      try {
        dataUrl = await fileToDataUrl(file, 1200, 0.85);
      } catch (imageError) {
        console.error('خطأ في تحويل الصورة:', imageError);
        showToast('خطأ في معالجة الصورة: ' + (imageError instanceof Error ? imageError.message : 'خطأ غير معروف'), 'error');
        return;
      }
    } else {
      console.log('No image provided - creating star without image');
    }
    
    // Get random position for the star
    const x = Math.random() * app.renderer.width;
    const y = Math.random() * app.renderer.height;
    
    const newPost: Omit<Post, 'id' | 'created_at'> = {
      title: titleInput.value.trim(),
      text: textInput.value.trim(),
      image: dataUrl,
      x: x,
      y: y
    };
    
    console.log('Saving post to Supabase...'); // تتبع
    
    try {
      const savedPost = await addPost(newPost);
      
      if (savedPost) {
        posts.push(savedPost);
        addStar(savedPost);
        starForm.reset();
        formSheet.classList.remove('open');
        showToast('تم النشر بنجاح! ✨');
        console.log('Post published successfully to Supabase!'); // تتبع
      } else {
        throw new Error('Failed to save post to Supabase');
      }
    } catch (supabaseError) {
      console.error('Supabase error:', supabaseError);
      showToast('خطأ في حفظ البيانات على الخادم، يرجى المحاولة مرة أخرى', 'error');
    }
    
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

// Mobile-friendly parallax - less intense on touch devices
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const parallaxMultiplier = isTouchDevice ? 0.3 : 1; // Reduce parallax on mobile

window.addEventListener('pointermove', (e) => {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = (e.clientY / window.innerHeight) * 2 - 1;
});

app.ticker.add(() => {
  if (!p1 || !p2 || !p3) return;
  p1.style.transform = `translate(${mouseX * -10 * parallaxMultiplier}px, ${mouseY * -6 * parallaxMultiplier}px)`;
  p2.style.transform = `translate(${mouseX * 14 * parallaxMultiplier}px, ${mouseY * 10 * parallaxMultiplier}px)`;
  p3.style.transform = `translate(${mouseX * 6 * parallaxMultiplier}px, ${mouseY * 4 * parallaxMultiplier}px)`;
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
  
  // Mobile-friendly: longer timeout for easier reading on mobile
  const baseTimeout = type === 'error' ? 3000 : 1800;
  const timeoutDuration = isTouchDevice ? baseTimeout + 1000 : baseTimeout;
  
  setTimeout(() => {
    toast.classList.remove('show');
    console.log('Toast hidden'); // تتبع
  }, timeoutDuration);
}

}).catch(error => {
  console.error('Failed to initialize application:', error);
});
