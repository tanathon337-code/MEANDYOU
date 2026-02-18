import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BackgroundService {
  private defaultColors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#F7FFF7', '#FF9F1C'];
  private darkColors = ['#0f172a', '#1f2937', '#4b5563', '#0b1120', '#020617', '#111827'];
  private readonly THEME_KEY = 'app_theme';
  theme = signal<'light' | 'dark'>(this.loadInitialTheme());
  
  // Signals for state management
  colors = signal<string[]>([...this.defaultColors]);
  
  private renderer: any;
  private scene: any;
  private camera: any;
  private material: any;
  private animationId: any;
  private THREE: any;

  constructor() {
    this.applyThemeClass(this.theme());
    if (this.theme() === 'dark') {
      this.updateColors(this.darkColors);
    } else {
      this.updateColors(this.defaultColors);
    }
  }

  private loadInitialTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') {
      return 'light';
    }
    const stored = localStorage.getItem(this.THEME_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return 'light';
  }

  private applyThemeClass(theme: 'light' | 'dark') {
    if (typeof document === 'undefined') {
      return;
    }
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
  }

  setTheme(theme: 'light' | 'dark') {
    this.theme.set(theme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.THEME_KEY, theme);
    }
    this.applyThemeClass(theme);
    if (theme === 'dark') {
      this.updateColors(this.darkColors);
    } else {
      this.updateColors(this.defaultColors);
    }
  }

  toggleTheme() {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  init(container: HTMLElement, THREE_LIB: any) {
    this.THREE = THREE_LIB;
    if (!container || !this.THREE) return;

    // Clean up existing if any
    this.cleanup();

    this.scene = new this.THREE.Scene();
    this.camera = new this.THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.renderer = new this.THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    const geometry = new this.THREE.PlaneGeometry(2, 2);
    
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec3 uColors[6];
      varying vec2 vUv;

      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute( permute( permute(
                  i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        float n_ = 0.142857142857;
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                      dot(p2,x2), dot(p3,x3) ) );
      }

      void main() {
        vec2 uv = vUv;
        float noise = snoise(vec3(uv * 2.0, uTime * 0.2));
        
        vec3 color = uColors[0];
        color = mix(color, uColors[1], smoothstep(-0.5, 0.5, snoise(vec3(uv * 1.5, uTime * 0.1))));
        color = mix(color, uColors[2], smoothstep(-0.2, 0.8, snoise(vec3(uv * 2.5, uTime * 0.15))));
        color = mix(color, uColors[3], smoothstep(0.1, 0.9, snoise(vec3(uv * 1.2, uTime * 0.05))));
        color = mix(color, uColors[4], smoothstep(-0.8, 0.2, snoise(vec3(uv * 3.0, uTime * 0.25))));
        color = mix(color, uColors[5], smoothstep(0.3, 1.0, snoise(vec3(uv * 2.0, uTime * 0.1))));
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    this.material = new this.THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new this.THREE.Vector2(window.innerWidth, window.innerHeight) },
        uColors: { value: this.colors().map((c: string) => new this.THREE.Color(c)) }
      },
      vertexShader,
      fragmentShader
    });

    const mesh = new this.THREE.Mesh(geometry, this.material);
    this.scene.add(mesh);

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      if (this.material) {
        this.material.uniforms.uTime.value += 0.01;
      }
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };

    animate();

    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize() {
    if (this.renderer && this.material) {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    }
  }

  updateColors(newColors: string[]) {
    this.colors.set([...newColors]);
    if (this.material && this.THREE) {
      this.material.uniforms.uColors.value = newColors.map(c => new this.THREE.Color(c));
    }
  }

  cleanup() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.handleResize);
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
    this.material = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
  }
}
