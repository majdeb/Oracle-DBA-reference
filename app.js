(function(){
  'use strict';

  var state = { sheets: [], active: null, query: '' };

  var dirEl = document.getElementById('dirlisting');
  var contentEl = document.getElementById('content');
  var searchInput = document.getElementById('searchInput');
  var clearBtn = document.getElementById('clearBtn');
  var matchCountEl = document.getElementById('matchCount');
  var totalCountEl = document.getElementById('totalCount');
  var totalCatsEl = document.getElementById('totalCats');
  var sidebar = document.getElementById('sidebar');
  var scrim = document.getElementById('scrim');
  var hamburger = document.getElementById('hamburger');

  var URL_RE = /(https?:\/\/[^\s]+)/i;
  var LOOKS_URL_RE = /^(https?:\/\/|www\.)/i;

  function escapeHtml(s){
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function linkify(text){
    var esc = escapeHtml(text);
    return esc.replace(/(https?:\/\/[^\s<]+)/gi, function(m){
      var clean = m.replace(/[),.]+$/,'');
      var trail = m.slice(clean.length);
      return '<a href="'+clean+'" target="_blank" rel="noopener noreferrer">'+clean+'</a>'+trail;
    });
  }

  function highlight(html, q){
    if(!q) return html;
    try{
      var re = new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig');
      // avoid breaking existing tags by only touching text nodes via a temp container
      var tmp = document.createElement('div');
      tmp.innerHTML = html;
      walk(tmp, re);
      return tmp.innerHTML;
    }catch(e){ return html; }
  }

  function walk(node, re){
    var children = Array.prototype.slice.call(node.childNodes);
    children.forEach(function(child){
      if(child.nodeType === 3){
        var val = child.nodeValue;
        if(re.test(val)){
          re.lastIndex = 0;
          var span = document.createElement('span');
          span.innerHTML = val.replace(re, '<mark>$1</mark>');
          child.replaceWith(span);
        }
      } else if(child.nodeType === 1 && child.tagName !== 'A'){
        walk(child, re);
      } else if(child.nodeType === 1 && child.tagName === 'A'){
        // still allow highlighting inside link text
        walk(child, re);
      }
    });
  }

  function classifyCell(cell){
    if(LOOKS_URL_RE.test(cell.trim())) return 'url';
    if(/^[A-Za-z0-9._\/\- ]{2,18}$/.test(cell.trim()) && cell.trim().split(' ').length <= 3 &&
       /(linux|solaris|aix|hp-?ux|unix|windows|tru64|dec-unix|exadata|rac|asm|rman|all|11g|12c|19c|21c)/i.test(cell)){
      return 'os';
    }
    return null;
  }

  function renderEntry(row, q){
    var title = row[0];
    var rest = row.slice(1);
    var div = document.createElement('div');
    div.className = 'entry';

    var titleEl = document.createElement('div');
    titleEl.className = 'entry-title';
    titleEl.innerHTML = highlight(linkify(title), q);
    div.appendChild(titleEl);

    if(rest.length){
      var body = document.createElement('div');
      body.className = 'entry-body';
      rest.forEach(function(cell){
        var line = document.createElement('div');
        line.className = 'entry-line';

        var tagType = classifyCell(cell);
        if(tagType){
          var tag = document.createElement('span');
          tag.className = 'line-tag ' + tagType;
          tag.textContent = tagType === 'url' ? 'LINK' : cell.trim();
          if(tagType === 'os'){
            line.appendChild(tag);
            var codeEmpty = document.createElement('span');
            codeEmpty.className = 'line-code';
            codeEmpty.style.display = 'none';
            body.appendChild(line);
            return;
          }
        }

        var code = document.createElement('div');
        code.className = 'line-code' + (LOOKS_URL_RE.test(cell.trim()) ? ' is-url' : '');
        code.innerHTML = highlight(linkify(cell), q);
        line.appendChild(code);

        if(cell.length > 6){
          var btn = document.createElement('button');
          btn.className = 'copy-btn';
          btn.type = 'button';
          btn.textContent = 'copy';
          btn.addEventListener('click', function(){
            navigator.clipboard.writeText(cell).then(function(){
              btn.textContent = 'copied';
              btn.classList.add('copied');
              setTimeout(function(){ btn.textContent='copy'; btn.classList.remove('copied'); }, 1100);
            });
          });
          line.appendChild(btn);
        }
        body.appendChild(line);
      });
      div.appendChild(body);
    }
    return div;
  }

  function renderDivider(text, q){
    var d = document.createElement('div');
    d.className = 'section-divider';
    d.innerHTML = highlight(escapeHtml(text), q);
    return d;
  }

  function sheetEntryCount(sheet){
    return sheet.rows.filter(function(r){ return r.length > 1; }).length;
  }

  function buildSidebar(){
    dirEl.innerHTML = '';
    var homeBtn = document.createElement('button');
    homeBtn.className = 'dir-item' + (state.active === null ? ' active' : '');
    homeBtn.innerHTML = '<span class="dname">index</span>';
    homeBtn.addEventListener('click', function(){ setActive(null); });
    dirEl.appendChild(homeBtn);

    state.sheets.forEach(function(sheet){
      var btn = document.createElement('button');
      btn.className = 'dir-item' + (state.active === sheet.name ? ' active' : '');
      btn.innerHTML = '<span class="dname">'+escapeHtml(sheet.name.toLowerCase().replace(/\s+/g,'_'))+'</span><span class="dcount">'+sheetEntryCount(sheet)+'</span>';
      btn.addEventListener('click', function(){ setActive(sheet.name); closeSidebarMobile(); });
      dirEl.appendChild(btn);
    });
  }

  function setActive(name){
    state.active = name;
    buildSidebar();
    render();
  }

  function closeSidebarMobile(){
    sidebar.classList.remove('open');
    scrim.classList.remove('show');
  }

  function renderHome(){
    contentEl.innerHTML = '';
    var hero = document.createElement('div');
    hero.className = 'home-hero';
    hero.innerHTML =
      '<div class="eyebrow">// 30 categories, 1,200+ field-tested entries</div>' +
      '<h2>Everything you grep for at 2am, in one place.</h2>' +
      '<p>Unix, Exadata, RAC, ASM, RMAN, tuning, and SQL commands collected over years of production incidents. Search across everything, or browse a category from the left.</p>';
    contentEl.appendChild(hero);

    var grid = document.createElement('div');
    grid.className = 'home-grid';
    state.sheets.forEach(function(sheet){
      var card = document.createElement('button');
      card.className = 'home-card';
      card.innerHTML = '<span class="n">'+sheetEntryCount(sheet)+'</span><span class="label">'+escapeHtml(sheet.name)+'</span>';
      card.addEventListener('click', function(){ setActive(sheet.name); });
      grid.appendChild(card);
    });
    contentEl.appendChild(grid);
  }

  function renderCategory(sheet, q){
    contentEl.innerHTML = '';
    var heading = document.createElement('div');
    heading.className = 'cat-heading';
    heading.innerHTML = '<h2>'+escapeHtml(sheet.name)+'</h2><span class="cat-tag">'+sheetEntryCount(sheet)+' entries</span>';
    contentEl.appendChild(heading);

    var meta = document.createElement('p');
    meta.className = 'cat-meta';
    meta.textContent = 'Category ' + (state.sheets.indexOf(sheet)+1) + ' of ' + state.sheets.length;
    contentEl.appendChild(meta);

    var shown = 0;
    sheet.rows.forEach(function(row){
      var matches = !q || row.join(' ').toLowerCase().indexOf(q) !== -1;
      if(row.length === 1){
        if(!q || matches) contentEl.appendChild(renderDivider(row[0], q));
        return;
      }
      if(!matches) return;
      shown++;
      contentEl.appendChild(renderEntry(row, q));
    });

    if(shown === 0 && q){
      var ne = document.createElement('div');
      ne.className = 'no-results';
      ne.innerHTML = '<span class="glyph">¯\\_(ツ)_/¯</span>No matches for &ldquo;'+escapeHtml(q)+'&rdquo; in '+escapeHtml(sheet.name)+'.';
      contentEl.appendChild(ne);
    }
  }

  function renderSearchAll(q){
    contentEl.innerHTML = '';
    var totalMatches = 0;
    var any = false;
    state.sheets.forEach(function(sheet){
      var matchingRows = sheet.rows.filter(function(r){ return r.length > 1 && r.join(' ').toLowerCase().indexOf(q) !== -1; });
      if(!matchingRows.length) return;
      any = true;
      totalMatches += matchingRows.length;
      var heading = document.createElement('div');
      heading.className = 'cat-heading';
      heading.style.marginTop = '30px';
      heading.innerHTML = '<h2 style="font-size:19px;cursor:pointer" data-cat="'+escapeHtml(sheet.name)+'">'+escapeHtml(sheet.name)+'</h2><span class="cat-tag">'+matchingRows.length+'</span>';
      heading.querySelector('h2').addEventListener('click', function(){ setActive(sheet.name); });
      contentEl.appendChild(heading);
      matchingRows.forEach(function(row){ contentEl.appendChild(renderEntry(row, q)); });
    });
    if(!any){
      var ne = document.createElement('div');
      ne.className = 'no-results';
      ne.innerHTML = '<span class="glyph">¯\\_(ツ)_/¯</span>No matches for &ldquo;'+escapeHtml(q)+'&rdquo; across the whole sheet.';
      contentEl.appendChild(ne);
    }
    matchCountEl.innerHTML = totalMatches ? '<span class="n">'+totalMatches+'</span> matches' : '';
  }

  function render(){
    var q = state.query.trim().toLowerCase();
    if(q){
      if(state.active){
        var sheet = state.sheets.filter(function(s){return s.name===state.active;})[0];
        renderCategory(sheet, q);
        var count = sheet.rows.filter(function(r){return r.length>1 && r.join(' ').toLowerCase().indexOf(q)!==-1;}).length;
        matchCountEl.innerHTML = '<span class="n">'+count+'</span> matches in ' + sheet.name;
      } else {
        renderSearchAll(q);
      }
      return;
    }
    matchCountEl.innerHTML = '';
    if(state.active){
      var s = state.sheets.filter(function(x){return x.name===state.active;})[0];
      renderCategory(s, '');
    } else {
      renderHome();
    }
  }

  searchInput.addEventListener('input', function(){
    state.query = searchInput.value;
    clearBtn.classList.toggle('show', !!state.query);
    render();
  });
  clearBtn.addEventListener('click', function(){
    searchInput.value = '';
    state.query = '';
    clearBtn.classList.remove('show');
    searchInput.focus();
    render();
  });
  hamburger.addEventListener('click', function(){
    sidebar.classList.toggle('open');
    scrim.classList.toggle('show');
  });
  scrim.addEventListener('click', closeSidebarMobile);

  document.addEventListener('keydown', function(e){
    if((e.key === '/' ) && document.activeElement !== searchInput){
      e.preventDefault();
      searchInput.focus();
    }
    if(e.key === 'Escape'){
      searchInput.blur();
    }
  });

  fetch('data.json').then(function(r){ return r.json(); }).then(function(d){
    state.sheets = d.sheets;
    totalCountEl.textContent = state.sheets.reduce(function(a,s){return a+sheetEntryCount(s);},0);
    totalCatsEl.textContent = state.sheets.length;
    buildSidebar();
    render();
  }).catch(function(err){
    contentEl.innerHTML = '<div class="no-results">Could not load data.json — '+escapeHtml(String(err))+'</div>';
  });
})();
