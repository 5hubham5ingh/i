// Progressive enhancement: turn the manuscript into a paginated book.
//
// The content is authored once, in reading order, inside #manuscript. This
// script clones it, flows it into full-screen pages, and pairs those pages into
// spreads:
//
//   * a chapter's title always lands on a left-hand page, so a blank right page
//     is inserted whenever the flow would otherwise strand a title on the right;
//   * anything taller than one page (a long poem, a long milestone card) is
//     split across pages at a safe boundary;
//   * the spreads are stacked in the document and the page scrolls through
//     them, snapping one spread (or one page, on a phone) at a time.
//
// If anything goes wrong, the script bows out and the manuscript is revealed as
// the ordinary scrolling layout.

(() => {
  'use strict';

  const doc = document;
  const html = doc.documentElement;
  const body = doc.body;
  const manuscript = doc.getElementById('manuscript');
  const book = doc.getElementById('book');

  if (!manuscript || !book) {
    html.classList.remove('has-js');
    return;
  }

  const state = {
    pages: [],
    spreads: [],
    slugs: new Map(),
    current: 0,
    twoUp: false
  };

  // ------------------------------------------------------------- geometry --

  function measureViewport() {
    // clientWidth excludes the scrollbar, which the stylesheet always reserves,
    // so the measurement stays stable while the pages are being built.
    const vw = html.clientWidth;
    const vh = window.innerHeight;
    const twoUp = vw >= 1000 && vw / vh >= 1;
    const width = twoUp ? Math.round(vw / 2) : vw;

    html.style.setProperty('--page-w', width + 'px');
    // Lets the title page scale with the paper so it always fits one page.
    html.style.setProperty('--page-scale', String(Math.round((width / 560) * 1000) / 1000));
    state.twoUp = twoUp;
    body.classList.toggle('one-up', !twoUp);
  }

  // ------------------------------------------------------ prepare content --

  // Rewrite the cloned manuscript so it can be broken up cleanly:
  //   * every poem line becomes its own element, so a poem can be split;
  //   * the photographs are grouped into rows, so they flow two-up;
  //   * ids are moved to data-slug (the pages must not duplicate them).
  function prepare(root) {
    root.querySelectorAll('[id]').forEach((el) => {
      el.setAttribute('data-slug', el.id.toLowerCase());
      el.removeAttribute('id');
    });

    root.querySelectorAll('p.poem-body').forEach((poemBody) => {
      const fragment = doc.createDocumentFragment();
      poemBody.textContent.split('\n').forEach((line) => {
        const span = doc.createElement('span');
        span.className = 'poem-line';
        span.textContent = line;
        fragment.appendChild(span);
      });
      poemBody.replaceWith(fragment);
    });

    // Every poem after the first opens on a fresh left page; the first one runs
    // on from the Philology heading.
    root.querySelectorAll('article.poem').forEach((poem, i) => {
      if (i > 0) poem.classList.add('poem--verso');
    });

    root.querySelectorAll('.plates').forEach((plates) => {
      const figures = Array.from(plates.children);
      // Wide screenshots read better one to a row; photographs pair up.
      const single = plates.classList.contains('plates--single');
      const perRow = single ? 1 : 2;
      const rows = [];
      for (let i = 0; i < figures.length; i += perRow) {
        const row = doc.createElement('div');
        if (single) {
          row.className = 'plate-row plate-row--single';
        } else {
          // Alternating rows pin their photographs down the other way, so the
          // gallery reads as a scrapbook page rather than a grid.
          row.className = rows.length % 2 ? 'plate-row plate-row--b' : 'plate-row';
        }
        figures.slice(i, i + perRow).forEach((figure) => row.appendChild(figure));
        rows.push(row);
      }
      plates.replaceWith(...rows);
    });

    // The travel gallery is short; fetch it while the reader is still near the
    // start so the plates are decoded by the time that spread is reached.
    // Project screenshots stay lazy: there are many of them.
    root.querySelectorAll('.plate:not(.plate--project) img').forEach((img) => { img.loading = 'eager'; });

    // Lift the items out of the lists inside split-able blocks, so a block can
    // break between two bullets instead of forcing the whole list onto a page.
    // `pour` re-wraps them, keeping the list's classes.
    root.querySelectorAll('article.milestone ul, .intro ul, .toc-list').forEach((list) => {
      const className = list.getAttribute('class') || '';
      const items = Array.from(list.children);
      items.forEach((item) => item.setAttribute('data-list', className));
      list.replaceWith(...items);
    });

    return root;
  }

  // A flat list of blocks in reading order. `breakBefore` forces a new page,
  // `pageSide` pins a block to a left or right page, `splittable` allows a block
  // to be broken when it cannot fit on a page of its own.
  function collect(root) {
    const items = [];
    // A chapter opens with its title page alone; the first block that follows
    // it must start a fresh page, so the title never shares a page with prose.
    let pendingBreak = false;

    const push = (item) => {
      if (pendingBreak) {
        item.breakBefore = true;
        pendingBreak = false;
      }
      items.push(item);
    };

    const visit = (container, chapter) => {
      Array.from(container.children).forEach((el) => {
        const cls = el.classList;

        if (el.tagName === 'HR') return;                       // ornaments are dropped
        if (cls.contains('entry')) return visit(el, chapter);
        if (cls.contains('chapter')) return visit(el, el);
        if (cls.contains('plate-row')) return push({ node: el });

        if (cls.contains('chapter-head')) {
          // A chapter opens with its title page alone: the block that follows
          // must start a fresh page, so the title never shares a page with
          // prose. The closing chapter is the exception — it keeps its heading
          // and its content together on the book's last leaf.
          const closing = chapter && chapter.classList.contains('chapter--closing');

          push({
            node: el,
            breakBefore: true,
            pageSide: 'left',
            slug: chapter ? chapter.getAttribute('data-slug') : null
          });
          if (!closing) pendingBreak = true;                   // the title page stands alone
          return;
        }
        if (cls.contains('cover')) {
          return push({ node: el, breakBefore: true, pageSide: 'left', splittable: true, slug: 'cover' });
        }
        if (cls.contains('intro')) {
          return push({ node: el, breakBefore: true, splittable: true, slug: 'intro' });
        }
        if (cls.contains('toc')) {
          // The entries are always rebuilt through `pour`, so the lifted list
          // items are re-wrapped in their list even when they all fit one page.
          return push({ node: el, breakBefore: true, pageSide: 'right', alwaysPour: true, slug: 'contents' });
        }
        if (cls.contains('poem') || cls.contains('milestone')) {
          // Poems open on a fresh left page (all but the first, which follows
          // the Philology heading); a stanza that runs long still flows over.
          const verso = cls.contains('poem--verso');
          return push({
            node: el,
            splittable: true,
            breakBefore: verso,
            pageSide: verso ? 'left' : undefined
          });
        }
        if (cls.contains('project')) {
          // Projects flow on from the Poiesis introduction and from one
          // another; a gallery that runs long simply continues overleaf.
          return push({ node: el, splittable: true });
        }
        if (cls.contains('entry-title')) {
          // A subsection may open on a fresh left page: the gloss and the body
          // that follow it run on from there.
          const verso = cls.contains('entry-title--verso');
          return push({
            node: el,
            breakBefore: verso,
            pageSide: verso ? 'left' : undefined,
            slug: el.getAttribute('data-slug') || undefined,
            keepWithNext: true                                 // never end a page with just a heading
          });
        }
        push({ node: el });
      });
    };

    visit(root, null);
    return items;
  }

  // ----------------------------------------------------------- pagination --

  function paginate(items) {
    const openPage = () => {
      const index = state.pages.length;
      const spreadIndex = index >> 1;
      let spread = state.spreads[spreadIndex];

      if (!spread) {
        const spreadEl = doc.createElement('div');
        spreadEl.className = 'spread';
        spreadEl.setAttribute('data-spread', String(spreadIndex));
        book.appendChild(spreadEl);
        spread = { el: spreadEl, pages: [] };
        state.spreads[spreadIndex] = spread;
      }

      const pageEl = doc.createElement('section');
      pageEl.className = 'page';
      pageEl.setAttribute('data-side', index % 2 === 0 ? 'left' : 'right');

      const content = doc.createElement('div');
      content.className = 'page-content';

      pageEl.appendChild(content);
      spread.el.appendChild(pageEl);

      const page = { index, side: pageEl.getAttribute('data-side'), el: pageEl, content, blank: false };
      state.pages.push(page);
      spread.pages.push(page);
      return page;
    };

    const current = () => state.pages[state.pages.length - 1];
    const filled = (page) => page.content.childElementCount > 0;

    // Clearance kept at the foot of a page for a row of taped prints.
    const PLATE_CLEARANCE = 16;

    const fits = (page, node) => {
      page.content.appendChild(node);
      let ok = page.content.scrollHeight <= page.content.clientHeight + 1;
      // Rotated, taped prints sit a little outside their layout box and the
      // last row's margin is not counted by `scrollHeight`; a gallery row needs
      // clearance at the foot of the page so nothing is cut off.
      if (ok && node.classList.contains('plate-row')) {
        const bounds = page.content.getBoundingClientRect();
        ok = node.getBoundingClientRect().bottom <= bounds.bottom - PLATE_CLEARANCE;
      }
      page.content.removeChild(node);
      return ok;
    };

    // How much of a page is actually covered by type. The content box is a fixed
    // height, so `scrollHeight` cannot answer this; measure the blocks.
    const used = (page) => {
      const content = page.content;
      const height = content.clientHeight;
      if (!height || !content.childElementCount) return 0;

      const top = content.getBoundingClientRect().top;
      let bottom = 0;
      Array.from(content.children).forEach((child) => {
        bottom = Math.max(bottom, child.getBoundingClientRect().bottom - top);
      });
      return bottom / height;
    };

    // Below this much type, a page reads as blank paper.
    const SPARSE = 0.5;

    // Split a container across as many pages as it needs, breaking between its
    // children. Consecutive list items are re-wrapped in a list per page.
    const pour = (page, container) => {
      let parts = Array.from(container.children);
      let first = true;

      const buildFrom = (list) => {
        const chunk = container.cloneNode(false);
        let nextList = null;

        list.forEach((part) => {
          if (!first && part.classList.contains('poem-title')) return;
          if (part.tagName === 'LI') {
            if (!nextList) {
              nextList = doc.createElement('ul');
              nextList.className = part.getAttribute('data-list') || 'milestone-list';
              chunk.appendChild(nextList);
            }
            nextList.appendChild(part.cloneNode(true));
          } else {
            nextList = null;
            chunk.appendChild(part.cloneNode(true));
          }
        });
        return chunk;
      };

      const build = (count) => buildFrom(parts.slice(0, count));

      // A heading inside a block (a company, a role) must not be left at the
      // foot of a page; hand it to the next page with the lines it introduces.
      const isHead = (part) => part.tagName === 'H4' || part.classList.contains('milestone-role');

      // A single paragraph or bullet can itself be taller than a page. Break it
      // at a word boundary and carry the rest on to the next page.
      const splitPart = (part) => {
        if (part.tagName !== 'LI' && part.tagName !== 'P') return null;

        const points = [];
        const walker = doc.createTreeWalker(part, NodeFilter.SHOW_TEXT);
        let text = walker.nextNode();
        while (text) {
          for (let i = 1; i < text.data.length; i += 1) {
            if (/\s/.test(text.data[i - 1])) points.push([text, i]);
          }
          text = walker.nextNode();
        }
        if (!points.length) return null;

        const piece = (from, to) => {
          const range = doc.createRange();
          if (from) range.setStart(from[0], from[1]);
          else range.setStart(part, 0);
          if (to) range.setEnd(to[0], to[1]);
          else range.setEnd(part, part.childNodes.length);

          const el = part.cloneNode(false);
          el.appendChild(range.cloneContents());
          return el;
        };

        const head = (point) => piece(null, point);
        if (!fits(page, buildFrom([head(points[0])]))) return null;

        let lo = 0;
        let hi = points.length - 1;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          if (fits(page, buildFrom([head(points[mid])]))) lo = mid; else hi = mid - 1;
        }

        const rest = piece(points[lo], null);
        if (!rest.textContent.trim()) return null;
        return [head(points[lo]), rest];
      };

      while (parts.length) {
        if (fits(page, build(parts.length))) {
          page.content.appendChild(build(parts.length));
          return;
        }

        let lo = 0;
        let hi = parts.length - 1;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          if (fits(page, build(mid))) lo = mid; else hi = mid - 1;
        }
        while (lo > 0 && isHead(parts[lo - 1])) lo -= 1;

        if (lo === 0) {
          if (filled(page)) { page = openPage(); continue; }

          const split = splitPart(parts[0]);
          if (split) {
            parts = split.concat(parts.slice(1));
            continue;
          }
          lo = 1;                                             // never stall
        }

        page.content.appendChild(build(lo));
        parts = parts.slice(lo);
        first = false;
        if (parts.length) page = openPage();
      }
    };

    openPage();

    items.forEach((item, index) => {
      const next = items[index + 1];
      let page = current();

      if (item.breakBefore || item.pageSide) {
        if (filled(page)) page = openPage();
      }
      // Pin the block to the side it belongs on, padding with a blank page when
      // the flow has arrived on the wrong one. Only a two-page spread has sides;
      // stacked one-up pages would just show a blank screen, so break instead.
      if (item.pageSide && state.twoUp) {
        while (page.side !== item.pageSide) {
          page.blank = true;
          page = openPage();
        }
      }

      // A block that must always be rebuilt as it flows (the contents list,
      // whose items were lifted out of their <ol>) still gets its wrappers.
      if (item.alwaysPour) {
        const landing = page;
        pour(page, item.node);
        if (item.slug) state.slugs.set(item.slug, landing.index);
        return;
      }

      // A heading must not be left stranded at the foot of a page: place it and
      // the block after it together, or move the heading on.
      if (item.keepWithNext && next) {
        page.content.appendChild(item.node);
        if (fits(page, next.node)) {
          if (item.slug) state.slugs.set(item.slug, page.index);
          return;
        }
        page.content.removeChild(item.node);
        if (filled(page)) page = openPage();
        page.content.appendChild(item.node);
        if (item.slug) state.slugs.set(item.slug, page.index);
        return;
      }

      if (!fits(page, item.node)) {
        // A block that spills past a single page may as well start on the
        // current one when that page is barely used — a section that opens
        // with a heading and a line or two, say. The block runs on either way,
        // so giving it a page of its own only leaves paper blank.
        const canStartHere = item.splittable && filled(page) && used(page) < SPARSE;

        if (!canStartHere && filled(page)) page = openPage();

        if (!fits(page, item.node)) {
          if (item.splittable) {
            const landing = page;
            pour(page, item.node);
            if (item.slug) state.slugs.set(item.slug, landing.index);
            return;
          }
          // Unsplittable and taller than a page: place it rather than lose it.
          if (filled(page)) page = openPage();
          page.content.appendChild(item.node);
          if (item.slug) state.slugs.set(item.slug, page.index);
          return;
        }
      }

      page.content.appendChild(item.node);
      if (item.slug) state.slugs.set(item.slug, page.index);
    });

    state.pages.forEach((page) => {
      if (page.blank) page.el.classList.add('page--blank');

      const first = page.content.firstElementChild;
      if (first && first.classList.contains('cover')) page.el.classList.add('page--title');
      else if (first && first.classList.contains('intro')) page.el.classList.add('page--intro');
      else if (first && first.classList.contains('chapter-head')) page.el.classList.add('page--chapter');
    });
  }

  // -------------------------------------------------------------- building --

  function build() {
    measureViewport();
    book.textContent = '';
    state.pages = [];
    state.spreads = [];
    state.slugs = new Map();

    const clone = prepare(manuscript.cloneNode(true));
    paginate(collect(clone));
  }

  // ------------------------------------------------------------ navigation --

  function spreadFor(pageIndex) {
    return state.spreads[pageIndex >> 1];
  }

  function writeHash(index) {
    const hash = '#/p/' + (index + 1);
    if (window.location.hash === hash) return;
    try {
      window.history.replaceState({ page: index + 1 }, '', hash);
    } catch (error) {
      /* file:// and sandboxed frames refuse history edits; the book still works. */
    }
  }

  function scrollToPage(index, smooth) {
    const count = state.pages.length;
    if (!count) return;

    let i = Math.max(0, Math.min(index, count - 1));
    if (state.twoUp) i -= i % 2;                             // a spread is the unit
    state.current = i;

    const target = state.twoUp ? spreadFor(i).el : state.pages[i].el;
    if (smooth) {
      target.scrollIntoView({ block: 'start', behavior: 'smooth' });
    } else {
      // `behavior: auto` follows the CSS (smooth), so cancel it for this jump.
      html.style.scrollBehavior = 'auto';
      target.scrollIntoView({ block: 'start', behavior: 'auto' });
      html.style.scrollBehavior = '';
    }
    writeHash(i);
  }

  function step(direction) {
    const delta = state.twoUp ? 2 : 1;
    scrollToPage(state.current + direction * delta, true);
  }

  function resolveHash() {
    const raw = decodeURIComponent(window.location.hash || '');
    const match = /^#\/p\/(\d+)$/.exec(raw);
    if (match) return Number(match[1]) - 1;

    const slug = raw.replace(/^#\/?/, '').toLowerCase();
    if (slug && state.slugs.has(slug)) return state.slugs.get(slug);
    return null;
  }

  // Which spread (or, on a phone, which page) owns the middle of the viewport.
  function indexFromScroll() {
    const elements = state.twoUp
      ? state.spreads.map((spread) => spread.el)
      : state.pages.map((page) => page.el);
    const middle = window.innerHeight / 2;
    let best = 0;

    elements.forEach((el, i) => {
      if (el.getBoundingClientRect().top <= middle) best = i;
    });

    return state.twoUp ? best * 2 : best;
  }

  function slugOfCurrentPage() {
    let best = null;
    state.slugs.forEach((index, slug) => {
      if (index <= state.current && (best === null || index > state.slugs.get(best))) best = slug;
    });
    return best;
  }

  let scrollFrame = 0;

  function onScroll() {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0;
      if (!body.classList.contains('paged')) return;
      const index = indexFromScroll();
      if (index !== state.current) {
        state.current = index;
        writeHash(index);
      }
    });
  }

  // ----------------------------------------------------------------- boot --

  let booted = false;

  function boot() {
    if (booted) return;
    booted = true;
    try {
      html.classList.add('paged');
      body.classList.add('paged');
      build();
      const target = resolveHash();
      scrollToPage(target === null ? 0 : target, false);
    } catch (error) {
      html.classList.remove('paged');
      body.classList.remove('paged');
      body.classList.remove('one-up');
      html.classList.remove('has-js');
      if (window.console) console.error('Book pagination failed; showing the scrolling layout.', error);
    }
  }

  function repaginate() {
    if (!body.classList.contains('paged')) return;

    // Keep the reader in the same stretch of the same chapter, as closely as a
    // new page size allows.
    const anchor = slugOfCurrentPage();
    const offset = anchor !== null ? state.current - state.slugs.get(anchor) : 0;

    build();

    let target = 0;
    if (anchor !== null && state.slugs.has(anchor)) {
      target = state.slugs.get(anchor) + Math.max(0, offset);
      const starts = Array.from(state.slugs.values()).filter((i) => i > state.slugs.get(anchor));
      if (starts.length) target = Math.min(target, Math.min(...starts) - 1);
    }
    scrollToPage(target, false);
  }

  // Measuring before the web font has swapped in produces overflowing pages, so
  // wait for it — but never hang on it. If the safety net wins the race, re-flow
  // again once the real metrics are available.
  window.setTimeout(boot, 3000);
  const fontsReady = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
  fontsReady.then(() => {
    if (!booted) { boot(); return; }
    repaginate();
  }, boot);

  // ------------------------------------------------------------- controls --

  doc.addEventListener('keydown', (event) => {
    if (!body.classList.contains('paged')) return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown') step(1);
    else if (event.key === 'ArrowLeft' || event.key === 'PageUp') step(-1);
  });

  // The table of contents lives inside a generated page now, so a click on a
  // chapter link scrolls to that chapter instead of following the anchor.
  doc.addEventListener('click', (event) => {
    if (!body.classList.contains('paged')) return;
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const slug = link.getAttribute('href').slice(1).toLowerCase();
    if (!state.slugs.has(slug)) return;
    event.preventDefault();
    scrollToPage(state.slugs.get(slug), true);
  });

  window.addEventListener('scroll', onScroll, { passive: true });

  window.addEventListener('hashchange', () => {
    if (!body.classList.contains('paged')) return;
    const target = resolveHash();
    if (target !== null) scrollToPage(target, true);
  });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    if (!body.classList.contains('paged')) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(repaginate, 200);
  });
})();
