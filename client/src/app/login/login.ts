import { Component, inject, signal, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { PasswordMatchValidator, PasswordValidator } from '../_helpers/password-validator'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { Router } from '@angular/router'
import { PassportService } from '../_services/passport-service'
import { CommonModule, isPlatformBrowser } from '@angular/common'
import { NgxSpinnerService } from 'ngx-spinner'

declare var THREE: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, MatCardModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit, OnDestroy {
  platformId = inject(PLATFORM_ID);
  
  // Interactive Gradient properties
  colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#F7FFF7', '#FF9F1C'];
  private renderer: any;
  private scene: any;
  private camera: any;
  private material: any;
  private animationId: any;
  private usernameMinLength = 4
  private usernameMaxLength = 10

  private passwordMinLength = 8
  private passwordMaxLength = 10

  private displaynameMinLength = 3

  mode: 'login' | ' register' = 'login'
  form: FormGroup

  errorMsg = {
    username: signal(''),
    password: signal(''),
    cf_password: signal(''),
    displayname: signal(''),
  }
  errorFromServer = signal('')

  private _router = inject(Router)
  private _passport = inject(PassportService)
  private _spinner = inject(NgxSpinnerService)

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initLiquidGradient();
    }
  }

  ngOnDestroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  private initLiquidGradient() {
    const container = document.getElementById('liquid-gradient-container');
    if (!container || typeof THREE === 'undefined') return;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.renderer = new THREE.WebGLRenderer({ alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);

    const geometry = new THREE.PlaneGeometry(2, 2);
    
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

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uColors: { value: this.colors.map(c => new THREE.Color(c)) }
      },
      vertexShader,
      fragmentShader
    });

    const mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(mesh);

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      this.material.uniforms.uTime.value += 0.01;
      this.renderer.render(this.scene, this.camera);
    };

    animate();

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    });
  }

  constructor() {
    this.form = new FormGroup({
      username: new FormControl(null, [
        Validators.required,
        Validators.minLength(this.usernameMinLength),
        Validators.maxLength(this.usernameMaxLength),
      ]),
      password: new FormControl(null, [
        Validators.required,
        PasswordValidator(this.passwordMinLength, this.passwordMaxLength)
      ])
    })
  }

  toggleMode() {
    this.mode = this.mode === 'login' ? ' register' : 'login'
    this.updateForm()
  }

  updateForm() {
    if (this.mode === 'login') {
      this.form.removeControl('cf_password')
      this.form.removeValidators(PasswordMatchValidator('password', 'cf_password'))

      this.form.removeControl('display_name')
    } else {
      this.form.addControl('cf_password', new FormControl(null, [Validators.required]))
      this.form.addValidators(PasswordMatchValidator('password', 'cf_password'))

      this.form.addControl('display_name', new FormControl(null, [Validators.required, Validators.minLength(this.displaynameMinLength)]))
    }
  }

  updateErrorMsg(ctrlName: string): void | null {
    const ctrl = this.form.controls[ctrlName]
    if (!ctrl) return null

    switch (ctrlName) {
      case 'username':
        if (ctrl.hasError('required')) this.errorMsg.username.set('required')

        else if (ctrl.hasError('minlength')) this.errorMsg.username.set(`must be at least ${this.usernameMinLength} characters long`)

        else if (ctrl.hasError('maxlength')) this.errorMsg.username.set(`must be  ${this.usernameMaxLength} characters or fewer`)

        else this.errorMsg.username.set('')

        break

      case 'password':
        if (ctrl.hasError('required')) this.errorMsg.password.set('required')
        else if (ctrl.hasError('invalidLength')) this.errorMsg.password.set(`must be ${this.passwordMinLength} - ${this.passwordMaxLength} characters long`)
        else if (ctrl.hasError('invalidLowerCase')) this.errorMsg.password.set(`must contain minimum of 1 lower-case letter [a-z]`)
        else if (ctrl.hasError('invalidUpperCase')) this.errorMsg.password.set(`must contain minimum of 1 upper-case letter [A-Z]`)
        else if (ctrl.hasError('invalidNumeric')) this.errorMsg.password.set(`must contain minimum of 1 numeric [0-9]`)
        else if (ctrl.hasError('invalidSpecialChar')) this.errorMsg.password.set(`must contain minimum of 1 special character [!@#$%^&*(),.?:{}|<>]`)
        else this.errorMsg.password.set('')
        break

      case 'cf_password':
        if (ctrl.hasError('required')) this.errorMsg.cf_password.set('required')
        else if (ctrl.hasError('mismatch')) this.errorMsg.cf_password.set('do not match password')
        else this.errorMsg.cf_password.set('')
        break

      case 'display_name':
        if (ctrl.hasError('required')) this.errorMsg.displayname.set('required')
        else if (ctrl.hasError('minlength')) this.errorMsg.displayname.set(`must be at least ${this.displaynameMinLength} characters long`)
        else this.errorMsg.displayname.set('')
        break
    }
  }

  async onSubmit() {
    if (this.form.invalid) return;

    this._spinner.show()
    this.errorFromServer.set('')
    
    // จำลองการหน่วงเวลา 1 วินาที
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    let error: string | null = null;

    if (this.mode === 'login') {
      // ตรวจสอบ Login
      error = this._passport.mockLogin(this.form.value.username, this.form.value.password);
    } else {
      // ตรวจสอบ Register
      error = this._passport.mockRegister({
        username: this.form.value.username,
        password: this.form.value.password,
        display_name: this.form.value.display_name
      });
    }

    this._spinner.hide()

    if (error) {
      this.errorFromServer.set(error);
    } else {
      this._router.navigate(['/'])
    }
  }
}