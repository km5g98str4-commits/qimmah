// ============================================================================
// راستَرايزر برمجي — يرسم مثلّثات بتظليل Gouraud وعُمق z لكل بكسل.
//
// لماذا لا نستخدم رسم المضلّعات في canvas مباشرة؟ لأن كل وجه يأخذ لونًا واحدًا،
// فتظهر الشبكة كـ«بلاط» على الجسم. هنا نُقحم اللون بين رؤوس المثلّث بكسلًا بكسل،
// فيصبح السطح ناعمًا تمامًا وتذوب حدود العضلات بتدرّج طبيعي.
//
// إضافةً لذلك، مخزن العمق يحلّ الحجب بدقّة (لا حاجة لترتيب رسّام تقريبي)،
// ومخزن معرّف العضلة يعطي التقاطًا دقيقًا بالبكسل عند اللمس.
//
// كل المخازن تُخصَّص مرّة واحدة ويُعاد استخدامها — صفر تخصيص أثناء الدوران.
// ============================================================================

/** عمق «لا شيء» — أي بكسل لم يُرسم بعد. */
const FAR = -1e30

export class SoftRaster {
  width = 0
  height = 0
  /** RGBA لكل بكسل (alpha = 0 حيث لا جسم، فتظهر خلفية البطاقة). */
  private data = new Uint8ClampedArray(0)
  private depth = new Float32Array(0)
  /** معرّف العضلة لكل بكسل (-1 = لا عضلة) — للالتقاط الدقيق. */
  private mid = new Int8Array(0)
  /** سعة المخازن بالبكسل — تنمو ولا تتقلّص، فلا يُعاد التخصيص عند تبديل الدقّة. */
  private capacity = 0
  private img: ImageData | null = null
  /** أصغر مستطيل يحوي ما رُسم — يقصر تنعيم الحواف على منطقة الجسم فقط. */
  bbMinX = 0
  bbMinY = 0
  bbMaxX = 0
  bbMaxY = 0

  /**
   * يضبط أبعاد المخزن. السعة تنمو ولا تتقلّص: التبديل بين دقّة السحب ودقّة
   * الاستقرار يحدث عشرات المرّات في الجلسة، وإعادة تخصيص ميغابايتات في كل مرّة
   * تُنتج ضغط جامع قمامة محسوسًا — فنُبقي أكبر مخزن مطلوب ونعيد استخدامه.
   */
  resize(w: number, h: number): void {
    if (w === this.width && h === this.height) return
    this.width = w
    this.height = h
    const n = w * h
    if (n > this.capacity) {
      this.capacity = n
      this.data = new Uint8ClampedArray(n * 4)
      this.depth = new Float32Array(n)
      this.mid = new Int8Array(n)
    }
    this.img = null
  }

  clear(): void {
    // نمسح المنطقة المستخدمة فقط — لا كامل السعة.
    const n = this.width * this.height
    this.data.fill(0, 0, n * 4)
    this.depth.fill(FAR, 0, n)
    this.mid.fill(-1, 0, n)
    this.bbMinX = this.width
    this.bbMinY = this.height
    this.bbMaxX = 0
    this.bbMaxY = 0
  }

  /**
   * يرسم مثلّثًا واحدًا. الإحداثيات بالبكسل داخل المخزن، z أكبر = أقرب للناظر.
   * الألوان 0..255 لكل رأس وتُقحم خطيًا (Gouraud).
   * يُستبعد المثلّث إن كان لفّه معاكسًا (وجه خلفي).
   */
  triangle(
    x0: number, y0: number, z0: number, r0: number, g0: number, b0: number,
    x1: number, y1: number, z1: number, r1: number, g1: number, b1: number,
    x2: number, y2: number, z2: number, r2: number, g2: number, b2: number,
    muscle: number,
  ): void {
    // مساحة بإشارة: السالب = وجه أمامي (إحداثيات الشاشة y لأسفل).
    const area = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0)
    if (area >= -0.02) return

    const W = this.width
    const H = this.height

    let minX = Math.floor(Math.min(x0, x1, x2))
    let maxX = Math.ceil(Math.max(x0, x1, x2))
    let minY = Math.floor(Math.min(y0, y1, y2))
    let maxY = Math.ceil(Math.max(y0, y1, y2))
    if (minX < 0) minX = 0
    if (minY < 0) minY = 0
    if (maxX > W - 1) maxX = W - 1
    if (maxY > H - 1) maxY = H - 1
    if (minX > maxX || minY > maxY) return
    if (minX < this.bbMinX) this.bbMinX = minX
    if (minY < this.bbMinY) this.bbMinY = minY
    if (maxX > this.bbMaxX) this.bbMaxX = maxX
    if (maxY > this.bbMaxY) this.bbMaxY = maxY

    // مستويات الإقحام: v(x,y) = v2 + dvdx·(x−x2) + dvdy·(y−y2)
    const den = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
    if (den === 0) return
    const inv = 1 / den
    const p0x = x0 - x2
    const p0y = y0 - y2
    const p1x = x1 - x2
    const p1y = y1 - y2

    // معاملات مستوى الإقحام لكل سمة (مفكوكة يدويًا — لا تخصيص ذاكرة في المسار الساخن).
    const dz0 = z0 - z2
    const dz1 = z1 - z2
    const zdx = (dz0 * p1y - dz1 * p0y) * inv
    const zdy = (dz1 * p0x - dz0 * p1x) * inv
    const dr0 = r0 - r2
    const dr1 = r1 - r2
    const rdx = (dr0 * p1y - dr1 * p0y) * inv
    const rdy = (dr1 * p0x - dr0 * p1x) * inv
    const dg0 = g0 - g2
    const dg1 = g1 - g2
    const gdx = (dg0 * p1y - dg1 * p0y) * inv
    const gdy = (dg1 * p0x - dg0 * p1x) * inv
    const db0 = b0 - b2
    const db1 = b1 - b2
    const bdx = (db0 * p1y - db1 * p0y) * inv
    const bdy = (db1 * p0x - db0 * p1x) * inv

    // دوال الحدود للاختبار الداخلي (تزايد تدريجي لكل بكسل).
    const e0dx = y1 - y0
    const e0dy = x0 - x1
    const e1dx = y2 - y1
    const e1dy = x1 - x2
    const e2dx = y0 - y2
    const e2dy = x2 - x0

    const px = minX + 0.5
    const py = minY + 0.5
    let e0row = (px - x0) * e0dx + (py - y0) * e0dy
    let e1row = (px - x1) * e1dx + (py - y1) * e1dy
    let e2row = (px - x2) * e2dx + (py - y2) * e2dy

    const dxs = px - x2
    let zrow = z2 + zdx * dxs + zdy * (py - y2)
    let rrow = r2 + rdx * dxs + rdy * (py - y2)
    let grow = g2 + gdx * dxs + gdy * (py - y2)
    let brow = b2 + bdx * dxs + bdy * (py - y2)

    const data = this.data
    const dep = this.depth
    const mids = this.mid

    for (let y = minY; y <= maxY; y++) {
      let e0 = e0row
      let e1 = e1row
      let e2 = e2row
      let z = zrow
      let r = rrow
      let g = grow
      let b = brow
      const row = y * W

      for (let x = minX; x <= maxX; x++) {
        // المساحة سالبة (وجه أمامي) ⇒ الداخل عندما تكون كل دوال الحدود ≥ 0.
        if (e0 >= 0 && e1 >= 0 && e2 >= 0) {
          const i = row + x
          if (z > dep[i]) {
            dep[i] = z
            const o = i * 4
            data[o] = r
            data[o + 1] = g
            data[o + 2] = b
            data[o + 3] = 255
            mids[i] = muscle
          }
        }
        e0 += e0dx
        e1 += e1dx
        e2 += e2dx
        z += zdx
        r += rdx
        g += gdx
        b += bdx
      }

      e0row += e0dy
      e1row += e1dy
      e2row += e2dy
      zrow += zdy
      rrow += rdy
      grow += gdy
      brow += bdy
    }
  }

  /**
   * يُنعّم حدود الظِلّ الخارجي: أي بكسل شفّاف مجاور لبكسلين معتمين أو أكثر
   * يأخذ متوسطهما بشفافية جزئية — تنعيم حواف رخيص يلغي «التسنين».
   */
  antialiasEdges(minX: number, minY: number, maxX: number, maxY: number): void {
    const W = this.width
    const H = this.height
    const d = this.data
    const dep = this.depth
    const x0 = Math.max(1, minX)
    const y0 = Math.max(1, minY)
    const x1 = Math.min(W - 2, maxX)
    const y1 = Math.min(H - 2, maxY)
    for (let y = y0; y <= y1; y++) {
      const row = y * W
      for (let x = x0; x <= x1; x++) {
        const i = row + x
        if (dep[i] !== FAR) continue
        let n = 0
        let r = 0
        let g = 0
        let b = 0
        let j = i - 1
        if (dep[j] !== FAR) { const o = j * 4; r += d[o]; g += d[o + 1]; b += d[o + 2]; n++ }
        j = i + 1
        if (dep[j] !== FAR) { const o = j * 4; r += d[o]; g += d[o + 1]; b += d[o + 2]; n++ }
        j = i - W
        if (dep[j] !== FAR) { const o = j * 4; r += d[o]; g += d[o + 1]; b += d[o + 2]; n++ }
        j = i + W
        if (dep[j] !== FAR) { const o = j * 4; r += d[o]; g += d[o + 1]; b += d[o + 2]; n++ }
        if (n >= 2) {
          const o = i * 4
          d[o] = r / n
          d[o + 1] = g / n
          d[o + 2] = b / n
          d[o + 3] = n >= 3 ? 215 : 135
        }
      }
    }
  }

  /** ينقل المخزن إلى الـcanvas. */
  blit(ctx: CanvasRenderingContext2D): void {
    if (!this.img || this.img.width !== this.width || this.img.height !== this.height) {
      this.img = new ImageData(this.width, this.height)
    }
    // المخزن قد يكون أكبر من الإطار الحالي (سعة محفوظة) — ننسخ الجزء المستخدم فقط.
    this.img.data.set(this.data.subarray(0, this.width * this.height * 4))
    ctx.putImageData(this.img, 0, 0)
  }

  /** معرّف العضلة عند بكسل (أو -1). */
  muscleAtPixel(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return -1
    return this.mid[y * this.width + x]
  }

  /** هل رُسم جسم عند هذا البكسل؟ */
  hasSurface(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false
    return this.depth[y * this.width + x] !== FAR
  }
}
