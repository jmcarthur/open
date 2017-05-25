$(function(){
  var uuid = null;
  var dashdos = {};
  var submitTimer = null;

  var uuidLoop = function() {
    $.get("/uuid").done(function(data) {
      if (uuid != data) {
        uuid = data;
        // (re)load dashdo titles
        $.getJSON("titles")
         .done(function(json) {
          // create the title links
          var items = [];
          json.forEach(function(dashdo) {
            items.push('<li class="sidebar-list">'
              + '<a class="dashdo-link" href="' + dashdo.did + '">' + dashdo.title
              + '<i class="fa fa-tachometer menu-icon" /></a></li>');
          });
          $('.sidebar-list:has(.dashdo-link)').remove();
          $('.sidebar-title').after(items.join(""));

          // update the dashdos array
          var newDashdos = {};
          json.forEach(function(dashdo) {
            var did = dashdo.did;
            if (did in dashdos) {
              newDashdos[did] = dashdos[did];
              newDashdos[did].needsReload = true;
            }
          });
          dashdos = newDashdos;

          // reload current or go to first dashdo
          var did = $('#dashdo-form').attr('href');
          if (typeof did == 'undefined' || !(did in dashdos))
            did = $('.dashdo-link').first().attr('href');
          switchDashdo(did);
        });
      }
    }).always(function() {
      setTimeout(uuidLoop, 1000);
    });
  };

  var switchDashdo = function(did) {
    if (did in dashdos) {
      $('#dashdo-main').replaceWith(dashdos[did].main);
      $('#dashdo-sidebar').replaceWith(dashdos[did].sidebar);
      $('#dashdo-form').attr('href', did);
      $('#dashdo-title').text($('.dashdo-link[href="'+did+'"]').text());

      // set up periodic submit
      clearTimeout(submitTimer);
      var timeout = Math.min(
          $(dashdos[did].main).find('.dashdo-periodic-submit')
          .map(function() { return $(this).attr('value'); }).get());
      if (timeout > 0) {
        submitTimer = setTimeout(function() {
          if ($('#dashdo-form').attr('href') == did) {
            loadDashdo(did, $('#dashdo-form').serialize());
          }
        }, timeout);
      }
      if (dashdos[did].needsReload) {
        loadDashdo(did, $('#dashdo-form').serialize());
      }
    } else {
      loadDashdo(did, "");
    }
  };

  var loadDashdo = function(did, data) {
    $('#spinner').addClass('fa-spin');
    $.ajax({
      type: "POST",
      url: did,
      data: data,
      success: function(r) {
        dashdos[did] = {};
        dashdos[did].main = $('<div id="dashdo-main"></div>')
          .append($.parseHTML(r, document, true));
        dashdos[did].sidebar = $('<div id="dashdo-sidebar"></div>')
          .append($(dashdos[did].main).find('.dashdo-sidebar').remove());
        $('#spinner').removeClass('fa-spin');
        switchDashdo(did);
      }
    });
  };

  // add click handlers for sidebar links
  $('#sidebar-wrapper').on('click', '.dashdo-link', function(e) {
    e.preventDefault();
    switchDashdo($(this).attr('href'));
  });

  // add change handler for input elements
  $('#dashdo-form').on('change', 'input,select', function(e) {
    if ($(':submit').length == 0) {
      loadDashdo($('#dashdo-form').attr('href'), $('#dashdo-form').serialize());
      e.preventDefault();
    }
  });

  uuidLoop();
});
