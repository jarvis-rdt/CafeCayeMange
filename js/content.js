/* Fetches hours + menu + hero photo from Sanity and renders them into the page.
   If Sanity isn't configured, or the request fails, the static markup already
   in the HTML is left untouched as a fallback.
   (The previous Supabase-backed version of this file lives on, unused, at
   js/content-supabase.js — the Supabase project/admin panel still work, they
   just no longer feed these public pages.) */
(function () {
  if (!window.SANITY_PROJECT_ID || !window.SANITY_DATASET) return;

  var QUERY = '{' +
    '"hours": *[_type == "hours"][0]{days},' +
    '"categories": *[_type == "menuCategory"] | order(order asc){_id, name, "slug": slug.current, description, order},' +
    '"items": *[_type == "menuItem" && available == true] | order(order asc){_id, name, description, price, tag, tagColor, order, subgroup, "categoryId": category._ref},' +
    '"settings": *[_type == "siteSettings"][0]{"heroUrl": heroImage.asset->url, address, phone, phoneLink, email, socials},' +
    '"fanFavorites": *[_type == "fanFavorite"] | order(order asc){_id, name, description, "imageUrl": image.asset->url, tag, tagColor, badge},' +
    '"reviews": *[_type == "review"] | order(order asc){_id, quote, authorName, authorLocation, rating, "photoUrl": photo.asset->url},' +
    '"galleryImages": *[_type == "galleryImage"] | order(order asc){_id, "imageUrl": image.asset->url, alt}' +
  '}';

  var endpoint = 'https://' + window.SANITY_PROJECT_ID + '.apicdn.sanity.io/v2024-01-01/data/query/' +
    window.SANITY_DATASET + '?query=' + encodeURIComponent(QUERY);

  var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday..Sunday

  function fmtTime(t, short) {
    if (!t) return '';
    var parts = t.split(':');
    var h = parseInt(parts[0], 10);
    var m = parts[1];
    var ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12; if (h === 0) h = 12;
    if (short && m === '00') return h + ' ' + ampm;
    return h + ':' + m + ' ' + ampm;
  }

  function timeRange(row, short) {
    return fmtTime(row.openTime, short) + ' – ' + fmtTime(row.closeTime, short);
  }

  function groupDays(byDow) {
    var groups = [];
    DISPLAY_ORDER.forEach(function (dow) {
      var row = byDow[dow];
      if (!row) return;
      var sig = row.isClosed ? 'closed' : row.openTime + '-' + row.closeTime;
      var last = groups[groups.length - 1];
      if (last && last.sig === sig) {
        last.days.push(dow);
      } else {
        groups.push({ sig: sig, days: [dow], row: row });
      }
    });
    return groups;
  }

  function groupLabel(group) {
    var first = DAY_NAMES[group.days[0]];
    if (group.days.length === 1) return first;
    var last = DAY_NAMES[group.days[group.days.length - 1]];
    return first + ' – ' + last;
  }

  function joinWithAnd(labels) {
    if (labels.length <= 1) return labels.join('');
    if (labels.length === 2) return labels.join(' & ');
    return labels.slice(0, -1).join(', ') + ' & ' + labels[labels.length - 1];
  }

  function renderHoursRows(byDow) {
    var today = DAY_NAMES[new Date().getDay()].toLowerCase();
    document.querySelectorAll('.hours-row[data-day]').forEach(function (rowEl) {
      var dow = DAY_NAMES.findIndex(function (d) { return d.toLowerCase() === rowEl.dataset.day; });
      var row = byDow[dow];
      if (!row) return;
      var timeEl = rowEl.querySelector('.hours-row__time');
      if (timeEl) {
        timeEl.textContent = row.isClosed ? 'Closed' : timeRange(row, false);
        timeEl.classList.toggle('closed', !!row.isClosed);
      }
      rowEl.classList.toggle('open', rowEl.dataset.day === today);
    });
  }

  function renderFooterHours(groups) {
    document.querySelectorAll('[data-hours-footer]').forEach(function (wrap) {
      wrap.innerHTML = '';
      groups.forEach(function (g) {
        var row = document.createElement('div');
        row.className = 'footer__hours-row' + (g.row.isClosed ? '' : ' open');
        var dayLabel = document.createElement('span');
        dayLabel.textContent = groupLabel(g);
        var timeLabel = document.createElement('span');
        timeLabel.className = 'hours-time';
        timeLabel.textContent = g.row.isClosed ? 'Closed' : timeRange(g.row, true);
        row.appendChild(dayLabel);
        row.appendChild(timeLabel);
        wrap.appendChild(row);
      });
    });
  }

  function renderHeroBadge(groups) {
    var el = document.querySelector('[data-hero-hours]');
    if (!el) return;
    var openGroups = groups.filter(function (g) { return !g.row.isClosed; });
    if (!openGroups.length) {
      el.textContent = 'Currently closed';
      return;
    }
    var strong = document.createElement('strong');
    strong.textContent = joinWithAnd(openGroups.map(groupLabel));
    el.textContent = 'Open ';
    el.appendChild(strong);
    el.appendChild(document.createTextNode(' · ' + timeRange(openGroups[0].row, true)));
  }

  function renderHours(hoursDoc) {
    if (!hoursDoc || !hoursDoc.days || !hoursDoc.days.length) return;
    var byDow = {};
    hoursDoc.days.forEach(function (r) { byDow[r.dayOfWeek] = r; });
    var groups = groupDays(byDow);
    renderHoursRows(byDow);
    renderFooterHours(groups);
    renderHeroBadge(groups);
  }

  function renderHeroPhoto(heroUrl) {
    if (!heroUrl) return;
    var bg = document.querySelector('.hero__bg');
    if (!bg) return;
    bg.style.backgroundImage = "url('" + heroUrl + "?w=1920&auto=format')";
  }

  function buildMenuItemCard(it) {
    var card = document.createElement('div');
    card.className = 'menu-item';
    if (it.tagColor) card.style.borderColor = 'var(--' + it.tagColor + ')';

    var info = document.createElement('div');
    info.className = 'menu-item__info';

    var nameEl = document.createElement('div');
    nameEl.className = 'menu-item__name';
    nameEl.appendChild(document.createTextNode(it.name));
    if (it.tag) {
      var tagEl = document.createElement('span');
      tagEl.className = 'tag tag--' + (it.tagColor || 'gold');
      tagEl.style.cssText = 'margin-left:.5rem;font-size:.58rem;';
      tagEl.textContent = it.tag;
      nameEl.appendChild(tagEl);
    }
    info.appendChild(nameEl);

    if (it.description) {
      var descEl = document.createElement('div');
      descEl.className = 'menu-item__desc';
      descEl.textContent = it.description;
      info.appendChild(descEl);
    }
    card.appendChild(info);

    if (it.price != null) {
      var priceEl = document.createElement('span');
      priceEl.className = 'menu-item__price';
      priceEl.textContent = '$' + Number(it.price).toFixed(2);
      card.appendChild(priceEl);
    }
    return card;
  }

  function renderMenu(cats, items) {
    var tabsNav = document.querySelector('.menu-tabs');
    var catsWrap = document.getElementById('menu-categories');
    if (!tabsNav || !catsWrap || !cats || !cats.length) return;

    tabsNav.innerHTML = '';
    catsWrap.innerHTML = '';

    cats.forEach(function (cat, idx) {
      var tab = document.createElement('button');
      tab.className = 'menu-tab' + (idx === 0 ? ' active' : '');
      tab.dataset.target = cat.slug;
      tab.textContent = cat.name;
      tabsNav.appendChild(tab);

      var catEl = document.createElement('div');
      catEl.className = 'menu-category' + (idx === 0 ? ' active' : '');
      catEl.id = cat.slug;

      var h2 = document.createElement('h2');
      h2.className = 'menu-category-title';
      h2.textContent = cat.name;
      catEl.appendChild(h2);

      if (cat.description) {
        var p = document.createElement('p');
        p.style.cssText = 'margin-bottom:1.5rem;color:var(--gray-cool);font-size:.875rem;';
        p.textContent = cat.description;
        catEl.appendChild(p);
      }

      var catItems = items.filter(function (it) { return it.categoryId === cat._id; });

      var subgroups = [];
      catItems.forEach(function (it) {
        var sg = it.subgroup || null;
        if (sg && subgroups.indexOf(sg) === -1) subgroups.push(sg);
      });

      if (!subgroups.length) subgroups.push(null);

      subgroups.forEach(function (sg) {
        if (sg) {
          var h3 = document.createElement('h3');
          h3.style.cssText = 'font-family:var(--font-serif);font-size:1.3rem;margin-bottom:1rem;color:var(--dark);';
          h3.textContent = sg;
          catEl.appendChild(h3);
        }

        var grid = document.createElement('div');
        grid.className = 'menu-items-grid';
        if (subgroups.length > 1) grid.style.marginBottom = '2rem';

        catItems.filter(function (it) { return (it.subgroup || null) === sg; }).forEach(function (it) {
          grid.appendChild(buildMenuItemCard(it));
        });

        catEl.appendChild(grid);
      });

      catsWrap.appendChild(catEl);
    });

    tabsNav.querySelectorAll('.menu-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabsNav.querySelectorAll('.menu-tab').forEach(function (t) { t.classList.remove('active'); });
        catsWrap.querySelectorAll('.menu-category').forEach(function (c) { c.classList.remove('active'); });
        tab.classList.add('active');
        document.getElementById(tab.dataset.target).classList.add('active');
      });
    });
  }

  var SOCIAL_PLATFORMS = ['instagram', 'facebook', 'threads', 'twitter', 'youtube'];

  function renderContactInfo(settings) {
    if (!settings) return;

    if (settings.phone) {
      document.querySelectorAll('[data-cm-phone-text]').forEach(function (el) {
        el.textContent = settings.phone;
      });
    }
    if (settings.phoneLink) {
      document.querySelectorAll('[data-cm-phone-link]').forEach(function (el) {
        el.href = 'tel:' + settings.phoneLink;
      });
    }
    if (settings.email) {
      document.querySelectorAll('[data-cm-email-text]').forEach(function (el) {
        el.textContent = settings.email;
      });
      document.querySelectorAll('[data-cm-email-link]').forEach(function (el) {
        el.href = 'mailto:' + settings.email;
      });
    }

    var addr = settings.address;
    if (addr) {
      if (addr.mapUrl) {
        document.querySelectorAll('[data-cm-map-link]').forEach(function (el) {
          el.href = addr.mapUrl;
        });
      }
      document.querySelectorAll('[data-cm-address-short]').forEach(function (el) {
        el.textContent = [addr.street, [addr.city, addr.region].filter(Boolean).join(' ')].filter(Boolean).join(', ');
      });
      document.querySelectorAll('[data-cm-address-full]').forEach(function (el) {
        el.innerHTML = '';
        if (addr.street) el.appendChild(document.createTextNode(addr.street));
        el.appendChild(document.createElement('br'));
        el.appendChild(document.createTextNode(
          [addr.city, addr.region].filter(Boolean).join(' ') +
          (addr.postalCode ? ', Canada ' + addr.postalCode : '')
        ));
      });
    }
  }

  function renderSocials(settings) {
    var socials = settings && settings.socials;
    SOCIAL_PLATFORMS.forEach(function (platform) {
      var url = socials && socials[platform];
      document.querySelectorAll('[data-cm-social="' + platform + '"]').forEach(function (el) {
        if (url) {
          el.href = url;
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      });
    });
  }

  function buildFanFavoriteCard(fav) {
    var article = document.createElement('article');
    article.className = 'dish-card reveal';

    var imgWrap = document.createElement('div');
    imgWrap.className = 'dish-card__img-wrap';
    if (fav.imageUrl) {
      var img = document.createElement('img');
      img.className = 'dish-card__img';
      img.src = fav.imageUrl + '?w=700&h=525&fit=crop&auto=format';
      img.alt = fav.name || '';
      img.loading = 'lazy';
      img.width = 700; img.height = 525;
      imgWrap.appendChild(img);
    }
    article.appendChild(imgWrap);

    var body = document.createElement('div');
    body.className = 'dish-card__body';

    var top = document.createElement('div');
    top.className = 'dish-card__top';
    var name = document.createElement('h3');
    name.className = 'dish-card__name';
    name.textContent = fav.name || '';
    top.appendChild(name);
    if (fav.badge) {
      var badge = document.createElement('span');
      badge.className = 'tag tag--gold';
      badge.style.fontSize = '.6rem';
      badge.textContent = fav.badge;
      top.appendChild(badge);
    }
    body.appendChild(top);

    if (fav.description) {
      var desc = document.createElement('p');
      desc.className = 'dish-card__desc';
      desc.textContent = fav.description;
      body.appendChild(desc);
    }

    var footer = document.createElement('div');
    footer.className = 'dish-card__footer';
    if (fav.tag) {
      var tagEl = document.createElement('span');
      tagEl.className = 'tag' + (fav.tagColor ? ' tag--' + fav.tagColor : '');
      tagEl.textContent = fav.tag;
      footer.appendChild(tagEl);
    }
    var vegan = document.createElement('span');
    vegan.className = 'vegan-note';
    vegan.textContent = '100% Vegan';
    footer.appendChild(vegan);
    body.appendChild(footer);

    article.appendChild(body);
    return article;
  }

  function renderFanFavorites(list) {
    if (!list || !list.length) return;
    var grid = document.querySelector('.featured__grid');
    if (!grid) return;
    grid.innerHTML = '';
    list.forEach(function (fav) { grid.appendChild(buildFanFavoriteCard(fav)); });
  }

  function initials(name) {
    return (name || '').split(/\s+/).filter(Boolean).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
  }

  function buildReviewCard(review) {
    var article = document.createElement('article');
    article.className = 'testimonial-card reveal';

    var rating = review.rating || 5;
    var stars = document.createElement('div');
    stars.className = 'testimonial-stars';
    stars.setAttribute('aria-label', rating + ' out of 5 stars');
    stars.textContent = '★★★★★'.slice(0, rating);
    article.appendChild(stars);

    var quote = document.createElement('blockquote');
    quote.className = 'testimonial-quote';
    quote.textContent = '“' + (review.quote || '') + '”';
    article.appendChild(quote);

    var author = document.createElement('div');
    author.className = 'testimonial-author';

    if (review.photoUrl) {
      var img = document.createElement('img');
      img.src = review.photoUrl + '?w=80&h=80&fit=crop&auto=format';
      img.width = 40; img.height = 40;
      img.style.cssText = 'width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0;';
      img.alt = review.authorName || '';
      author.appendChild(img);
    } else {
      var avatar = document.createElement('div');
      avatar.className = 'testimonial-author-avatar';
      avatar.textContent = initials(review.authorName);
      author.appendChild(avatar);
    }

    var meta = document.createElement('div');
    var nameEl = document.createElement('div');
    nameEl.className = 'testimonial-author-name';
    nameEl.textContent = review.authorName || '';
    meta.appendChild(nameEl);
    if (review.authorLocation) {
      var locEl = document.createElement('div');
      locEl.className = 'testimonial-author-loc';
      locEl.textContent = review.authorLocation;
      meta.appendChild(locEl);
    }
    author.appendChild(meta);
    article.appendChild(author);

    return article;
  }

  function renderReviews(list) {
    if (!list || !list.length) return;
    var grid = document.querySelector('.testimonials-grid');
    if (!grid) return;
    grid.innerHTML = '';
    list.forEach(function (review) { grid.appendChild(buildReviewCard(review)); });
  }

  function buildGalleryCell(photo) {
    var cell = document.createElement('div');
    cell.className = 'gallery-cell';
    if (photo.imageUrl) {
      var img = document.createElement('img');
      img.src = photo.imageUrl + '?w=700&auto=format';
      img.alt = photo.alt || '';
      img.loading = 'lazy';
      img.width = 700; img.height = 500;
      cell.appendChild(img);
    }
    var overlay = document.createElement('div');
    overlay.className = 'gallery-cell__overlay';
    cell.appendChild(overlay);
    return cell;
  }

  function renderGallery(list) {
    if (!list || !list.length) return;
    var grid = document.querySelector('.gallery-grid');
    if (!grid) return;
    grid.innerHTML = '';
    list.forEach(function (photo) { grid.appendChild(buildGalleryCell(photo)); });
  }

  async function init() {
    try {
      var res = await fetch(endpoint);
      if (!res.ok) return;
      var json = await res.json();
      var result = json.result || {};
      renderHours(result.hours);
      renderMenu(result.categories || [], result.items || []);
      renderHeroPhoto(result.settings && result.settings.heroUrl);
      renderContactInfo(result.settings);
      renderSocials(result.settings);
      renderFanFavorites(result.fanFavorites);
      renderReviews(result.reviews);
      renderGallery(result.galleryImages);
    } catch (e) {
      // Network/parse failure: leave the static HTML fallback in place.
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
