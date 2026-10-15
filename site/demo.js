;(function () {
  /* —— Theme —— */
  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
  }

  function setTheme(mode) {
    document.documentElement.setAttribute('data-theme', mode)
    try {
      localStorage.setItem('ql-site-theme', mode)
    } catch (e) {}
    document.querySelectorAll('[data-theme-set]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-theme-set') === mode)
    })
  }

  document.getElementById('theme-toggle').addEventListener('click', function () {
    setTheme(currentTheme() === 'dark' ? 'light' : 'dark')
  })
  document.querySelectorAll('[data-theme-set]').forEach(function (b) {
    b.addEventListener('click', function () {
      setTheme(b.getAttribute('data-theme-set'))
    })
  })
  setTheme(currentTheme())

  /* —— Lottie splash —— */
  var el = document.getElementById('hero-lottie')
  document.documentElement.classList.add('ready')

  function reveal() {
    document.documentElement.classList.add('splash-done')
  }

  if (!el || !window.lottie) {
    reveal()
  } else {
    var anim = window.lottie.loadAnimation({
      container: el,
      renderer: 'svg',
      loop: false,
      autoplay: true,
      path: './money-stack.json'
    })
    anim.addEventListener('DOMLoaded', function () {
      el.classList.add('is-loaded')
    })
    anim.addEventListener('data_failed', reveal)
    anim.addEventListener('complete', reveal)
    window.setTimeout(reveal, 3200)
  }

  /* —— Sample portfolio (fictional) —— */
  var periods = {
    '1m': {
      deltaHtml:
        '<span class="gain">+4&nbsp;180,00&nbsp;zł · +0.9%</span> <span class="muted">1M · 4 snapshots</span>',
      chip: '1M · 4',
      line: 'M0 88 C80 84, 140 80, 220 72 C300 64, 380 70, 460 52 C520 40, 580 44, 640 36',
      area: 'M0 88 C80 84, 140 80, 220 72 C300 64, 380 70, 460 52 C520 40, 580 44, 640 36 L640 150 L0 150 Z'
    },
    ytd: {
      deltaHtml:
        '<span class="gain">+14&nbsp;960,00&nbsp;zł · +3.2%</span> <span class="muted">YTD · 6 snapshots</span>',
      chip: 'YTD · 6',
      line: 'M0 105 C70 100, 130 96, 200 88 C280 78, 340 84, 420 60 C500 40, 560 46, 640 30',
      area: 'M0 105 C70 100, 130 96, 200 88 C280 78, 340 84, 420 60 C500 40, 560 46, 640 30 L640 150 L0 150 Z'
    },
    '1y': {
      deltaHtml:
        '<span class="gain">+16&nbsp;840,00&nbsp;zł · +3.6%</span> <span class="muted">1Y · 7 snapshots</span>',
      chip: '1Y · 7',
      line: 'M0 112 C60 108, 120 100, 180 94 C250 86, 310 90, 380 68 C450 48, 520 52, 640 28',
      area: 'M0 112 C60 108, 120 100, 180 94 C250 86, 310 90, 380 68 C450 48, 520 52, 640 28 L640 150 L0 150 Z'
    },
    all: {
      deltaHtml:
        '<span class="gain">+18&nbsp;420,00&nbsp;zł · +3.9%</span> <span class="muted">All · 8 snapshots</span>',
      chip: 'All · 8',
      line: 'M0 120 C55 116, 110 110, 170 102 C240 92, 300 98, 370 72 C440 50, 510 56, 640 26',
      area: 'M0 120 C55 116, 110 110, 170 102 C240 92, 300 98, 370 72 C440 50, 510 56, 640 26 L640 150 L0 150 Z'
    }
  }

  var holdings = [
    {
      name: 'Global Equity ETF',
      sub: 'ETFs · market',
      value: '168&nbsp;420,00',
      share: 34.6,
      gain: '+12.4%',
      gainClass: 'gain'
    },
    {
      name: 'Riverside loft (sample)',
      sub: 'Apartment · manual',
      value: '145&nbsp;000,00',
      share: 29.8,
      gain: '+6.2%',
      gainClass: 'gain'
    },
    {
      name: 'Emergency cash PLN',
      sub: 'Cash',
      value: '92&nbsp;500,00',
      share: 19.0,
      gain: '—',
      gainClass: 'muted'
    },
    {
      name: 'Used hatchback (sample)',
      sub: 'Car · market',
      value: '48&nbsp;200,00',
      share: 9.9,
      gain: '−8.1%',
      gainClass: 'loss'
    },
    {
      name: 'Short-term bond fund',
      sub: 'Funds · market',
      value: '32&nbsp;120,50',
      share: 6.6,
      gain: '+1.8%',
      gainClass: 'gain'
    }
  ]

  var snaps = [
    { d: '1 Mar', v: '468k' },
    { d: '15 Apr', v: '472k' },
    { d: '1 Jun', v: '471k' },
    { d: '20 Jul', v: '476k' },
    { d: '12 Aug', v: '479k' },
    { d: '5 Sep', v: '481k' },
    { d: '28 Sep', v: '483k' },
    { d: '15 Oct', v: '486k', on: true }
  ]

  var months = [
    {
      label: 'August 2026',
      left: '3&nbsp;860,00&nbsp;zł',
      income: '16&nbsp;800 zł',
      expense: '8&nbsp;700 zł',
      inst: '4&nbsp;240 zł',
      rows: [
        { t: 'Salary', a: '+14&nbsp;200 zł', k: 'in' },
        { t: 'Freelance', a: '+2&nbsp;600 zł', k: 'in' },
        { t: 'Rent share', a: '−2&nbsp;400 zł', k: 'out' },
        { t: 'Mortgage sample', a: '−2&nbsp;640 zł', k: 'inst' },
        { t: 'Car loan sample', a: '−1&nbsp;600 zł', k: 'inst' },
        { t: 'Groceries', a: '−1&nbsp;820 zł', k: 'out' }
      ]
    },
    {
      label: 'September 2026',
      left: '5&nbsp;640,00&nbsp;zł',
      income: '16&nbsp;800 zł',
      expense: '6&nbsp;920 zł',
      inst: '4&nbsp;240 zł',
      rows: [
        { t: 'Salary', a: '+14&nbsp;200 zł', k: 'in' },
        { t: 'Freelance', a: '+2&nbsp;600 zł', k: 'in' },
        { t: 'Rent share', a: '−2&nbsp;400 zł', k: 'out' },
        { t: 'Mortgage sample', a: '−2&nbsp;640 zł', k: 'inst' },
        { t: 'Car loan sample', a: '−1&nbsp;600 zł', k: 'inst' },
        { t: 'Utilities', a: '−720 zł', k: 'out' }
      ]
    },
    {
      label: 'October 2026',
      left: '5&nbsp;140,00&nbsp;zł',
      income: '16&nbsp;800 zł',
      expense: '7&nbsp;420 zł',
      inst: '4&nbsp;240 zł',
      rows: [
        { t: 'Salary', a: '+14&nbsp;200 zł', k: 'in' },
        { t: 'Freelance', a: '+2&nbsp;600 zł', k: 'in' },
        { t: 'Rent share', a: '−2&nbsp;400 zł', k: 'out' },
        { t: 'Mortgage sample', a: '−2&nbsp;640 zł', k: 'inst' },
        { t: 'Car loan sample', a: '−1&nbsp;600 zł', k: 'inst' },
        { t: 'Insurance', a: '−980 zł', k: 'out' }
      ]
    }
  ]

  var demo = document.getElementById('demo')
  if (!demo) return

  var line = document.getElementById('chart-line')
  var area = document.getElementById('chart-area')
  var monthIdx = 2

  function renderHoldings() {
    document.getElementById('holdings').innerHTML = holdings
      .map(function (h) {
        return (
          '<li>' +
          '<div class="h-name"><b>' +
          h.name +
          '</b><span>' +
          h.sub +
          '</span></div>' +
          '<div class="h-val sens">' +
          h.value +
          '&nbsp;zł</div>' +
          '<div class="h-share"><i style="width:' +
          h.share +
          '%"></i><span class="sens">' +
          h.share.toFixed(1) +
          '%</span></div>' +
          '<div class="h-gain ' +
          h.gainClass +
          ' sens">' +
          h.gain +
          '</div>' +
          '</li>'
        )
      })
      .join('')
  }

  function renderTimeline() {
    document.getElementById('timeline').innerHTML = snaps
      .map(function (s) {
        return (
          '<div class="snap' +
          (s.on ? ' on' : '') +
          '"><i></i><span>' +
          s.d +
          '</span><em class="sens">' +
          s.v +
          '</em></div>'
        )
      })
      .join('')
  }

  function setPeriod(id) {
    var p = periods[id]
    if (!p) return
    document.querySelectorAll('.periods button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-period') === id)
    })
    document.getElementById('nw-delta').innerHTML = p.deltaHtml
    document.getElementById('period-chip').textContent = p.chip
    line.setAttribute('d', p.line)
    area.setAttribute('d', p.area)
    line.classList.remove('redraw')
    void line.offsetWidth
    line.classList.add('redraw')
  }

  function renderMonth() {
    var m = months[monthIdx]
    demo.querySelector('[data-panel="cashflow"] .badge').textContent = m.label
    document.getElementById('cf-left').innerHTML = m.left
    document.getElementById('cf-income').textContent = m.income
    document.getElementById('cf-expense').textContent = m.expense
    document.getElementById('cf-inst').textContent = m.inst
    document.getElementById('cf-list').innerHTML = m.rows
      .map(function (r) {
        return (
          '<li class="' +
          r.k +
          '"><b>' +
          r.t +
          '</b><span class="sens">' +
          r.a +
          '</span></li>'
        )
      })
      .join('')
  }

  function setView(view) {
    demo.querySelectorAll('.rail-item').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-view') === view)
    })
    demo.querySelectorAll('.view').forEach(function (p) {
      p.classList.toggle('hidden', p.getAttribute('data-panel') !== view)
    })
  }

  demo.querySelectorAll('.rail-item').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setView(btn.getAttribute('data-view'))
    })
  })

  demo.querySelectorAll('.periods button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setPeriod(btn.getAttribute('data-period'))
    })
  })

  document.getElementById('cf-prev').addEventListener('click', function () {
    monthIdx = (monthIdx + months.length - 1) % months.length
    renderMonth()
  })
  document.getElementById('cf-next').addEventListener('click', function () {
    monthIdx = (monthIdx + 1) % months.length
    renderMonth()
  })

  document.getElementById('privacy-btn').addEventListener('click', function () {
    demo.classList.toggle('masked')
    this.classList.toggle('on', demo.classList.contains('masked'))
  })

  demo.querySelectorAll('.toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var on = !btn.classList.contains('on')
      btn.classList.toggle('on', on)
      btn.setAttribute('aria-pressed', on ? 'true' : 'false')
    })
  })

  renderHoldings()
  renderTimeline()
  setPeriod('all')
  renderMonth()
})()
